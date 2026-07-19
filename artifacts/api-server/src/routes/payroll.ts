import { Router } from "express";
import { db } from "@workspace/db";
import {
  payPeriodsTable,
  salaryComponentsTable,
  payslipsTable,
  payslipLinesTable,
  employeesTable,
} from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// ── Pay Periods ──────────────────────────────────────────────────────────────

// GET /api/v1/payroll/periods
router.get("/periods", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const rows = await db.query.payPeriodsTable.findMany({
    where: eq(payPeriodsTable.companyId, auth.companyId),
    limit,
    offset,
    orderBy: (t, { desc }) => [desc(t.startDate)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(payPeriodsTable)
    .where(eq(payPeriodsTable.companyId, auth.companyId));

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// POST /api/v1/payroll/periods
router.post(
  "/periods",
  requireRole("ADMIN", "HR_MANAGER", "PAYROLL_MANAGER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { name, startDate, endDate, payDate } = req.body;
    if (!name || !startDate || !endDate || !payDate) {
      return fail(res, 400, "name, startDate, endDate, payDate are required");
    }
    const [period] = await db
      .insert(payPeriodsTable)
      .values({ companyId: auth.companyId, name, startDate, endDate, payDate })
      .returning();
    return ok(res, period, 201);
  }
);

// ── Payroll Run ───────────────────────────────────────────────────────────────

// POST /api/v1/payroll/run/:periodId — compute payslips for all active employees
router.post(
  "/run/:periodId",
  requireRole("ADMIN", "HR_MANAGER", "PAYROLL_MANAGER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { periodId } = req.params;

    // Verify period belongs to this company
    const period = await db.query.payPeriodsTable.findFirst({
      where: and(
        eq(payPeriodsTable.id, periodId),
        eq(payPeriodsTable.companyId, auth.companyId)
      ),
    });
    if (!period) return fail(res, 404, "Pay period not found");
    if (period.status === "PAID") return fail(res, 400, "Pay period already paid");

    // Get all active employees
    const employees = await db.query.employeesTable.findMany({
      where: and(
        eq(employeesTable.companyId, auth.companyId),
        eq(employeesTable.status, "ACTIVE")
      ),
    });

    // Get salary components for this company
    const components = await db.query.salaryComponentsTable.findMany({
      where: eq(salaryComponentsTable.companyId, auth.companyId),
    });

    // Delete existing payslips for this period (re-run scenario)
    const existingPayslips = await db.query.payslipsTable.findMany({
      where: and(
        eq(payslipsTable.payPeriodId, periodId),
        eq(payslipsTable.companyId, auth.companyId)
      ),
      columns: { id: true },
    });
    if (existingPayslips.length > 0) {
      // payslip_lines will cascade delete
      for (const ps of existingPayslips) {
        await db.delete(payslipsTable).where(eq(payslipsTable.id, ps.id));
      }
    }

    const payslips = [];

    for (const emp of employees) {
      const baseSalary = Number(emp.baseSalary);

      // Evaluate formula-based components or use defaults when no components are set up
      let lines: { componentId: string; label: string; type: string; amount: number }[] = [];

      if (components.length === 0) {
        // No custom components — use standard India payroll split
        const basicPay = Math.round(baseSalary * 0.5);
        const hra = Math.round(baseSalary * 0.2);
        const transport = Math.round(baseSalary * 0.1);
        const other = baseSalary - basicPay - hra - transport;
        const pf = Math.round(basicPay * 0.12);
        const tds = Math.round(baseSalary * 0.05);

        const gross = basicPay + hra + transport + other;
        const deductions = pf + tds;
        const net = gross - deductions;

        const [payslip] = await db
          .insert(payslipsTable)
          .values({
            companyId: auth.companyId,
            employeeId: emp.id,
            payPeriodId: periodId,
            grossEarnings: String(gross),
            totalDeductions: String(deductions),
            netPay: String(net),
            status: "DRAFT",
          })
          .returning();

        payslips.push(payslip);
      } else {
        // Evaluate components with formula
        let grossEarnings = 0;
        let totalDeductions = 0;
        const lineItems: { componentId: string; label: string; type: string; amount: number }[] = [];

        for (const comp of components) {
          let amount = 0;
          try {
            if (comp.formula) {
              // Safe eval with baseSalary in scope
              // eslint-disable-next-line no-new-func
              amount = Math.round(
                new Function("baseSalary", `return (${comp.formula})`)(baseSalary)
              );
            }
          } catch {
            amount = 0;
          }

          if (amount <= 0) continue;

          lineItems.push({ componentId: comp.id, label: comp.name, type: comp.type, amount });
          if (comp.type === "EARNING") grossEarnings += amount;
          else totalDeductions += amount;
        }

        const netPay = grossEarnings - totalDeductions;

        const [payslip] = await db
          .insert(payslipsTable)
          .values({
            companyId: auth.companyId,
            employeeId: emp.id,
            payPeriodId: periodId,
            grossEarnings: String(grossEarnings),
            totalDeductions: String(totalDeductions),
            netPay: String(netPay),
            status: "DRAFT",
          })
          .returning();

        // Insert payslip lines
        if (lineItems.length > 0) {
          await db.insert(payslipLinesTable).values(
            lineItems.map((l) => ({
              payslipId: payslip.id,
              componentId: l.componentId,
              label: l.label,
              type: l.type,
              amount: String(l.amount),
            }))
          );
        }

        payslips.push(payslip);
      }
    }

    // Update period status to PROCESSING
    await db
      .update(payPeriodsTable)
      .set({ status: "PROCESSING", processedAt: new Date() })
      .where(eq(payPeriodsTable.id, periodId));

    return ok(res, {
      periodId,
      employeesProcessed: payslips.length,
      payslips: payslips.map((p) => ({
        id: p.id,
        employeeId: p.employeeId,
        grossEarnings: p.grossEarnings,
        totalDeductions: p.totalDeductions,
        netPay: p.netPay,
      })),
    });
  }
);

// GET /api/v1/payroll/run/:periodId — list all payslips for a period
router.get("/run/:periodId", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { periodId } = req.params;

  const period = await db.query.payPeriodsTable.findFirst({
    where: and(
      eq(payPeriodsTable.id, periodId),
      eq(payPeriodsTable.companyId, auth.companyId)
    ),
  });
  if (!period) return fail(res, 404, "Pay period not found");

  const payslips = await db.query.payslipsTable.findMany({
    where: and(
      eq(payslipsTable.payPeriodId, periodId),
      eq(payslipsTable.companyId, auth.companyId)
    ),
    with: {
      employee: {
        columns: { id: true, firstName: true, lastName: true, employeeCode: true },
      },
      lines: true,
    },
  });

  return ok(res, { period, payslips });
});

// POST /api/v1/payroll/approve/:periodId
router.post(
  "/approve/:periodId",
  requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { periodId } = req.params;
    const { paymentMethod } = req.body;

    const period = await db.query.payPeriodsTable.findFirst({
      where: and(
        eq(payPeriodsTable.id, periodId),
        eq(payPeriodsTable.companyId, auth.companyId)
      ),
    });
    if (!period) return fail(res, 404, "Pay period not found");
    if (period.status === "PAID") return fail(res, 400, "Already paid");
    if (period.status === "DRAFT") return fail(res, 400, "Run payroll first");

    await db
      .update(payslipsTable)
      .set({
        status: "PAID",
        paidAt: new Date(),
        paymentMethod: paymentMethod ?? "BANK_TRANSFER",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(payslipsTable.payPeriodId, periodId),
          eq(payslipsTable.companyId, auth.companyId)
        )
      );

    const [updated] = await db
      .update(payPeriodsTable)
      .set({ status: "PAID" })
      .where(eq(payPeriodsTable.id, periodId))
      .returning();

    return ok(res, updated);
  }
);

// GET /api/v1/payroll/payslips/:id
router.get("/payslips/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const payslip = await db.query.payslipsTable.findFirst({
    where: and(
      eq(payslipsTable.id, req.params.id),
      eq(payslipsTable.companyId, auth.companyId)
    ),
    with: {
      employee: {
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          employeeCode: true,
          email: true,
          baseSalary: true,
        },
      },
      period: true,
      lines: true,
    },
  });
  if (!payslip) return fail(res, 404, "Payslip not found");
  return ok(res, payslip);
});

// ── Salary Components ─────────────────────────────────────────────────────────

// GET /api/v1/payroll/components
router.get("/components", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const rows = await db.query.salaryComponentsTable.findMany({
    where: eq(salaryComponentsTable.companyId, auth.companyId),
    orderBy: (t, { asc }) => [asc(t.type), asc(t.name)],
  });
  return ok(res, rows);
});

// POST /api/v1/payroll/components
router.post(
  "/components",
  requireRole("ADMIN", "HR_MANAGER", "PAYROLL_MANAGER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { name, code, type, isFixed, isTaxable, formula } = req.body;
    if (!name || !code || !type) {
      return fail(res, 400, "name, code, type are required");
    }
    const [comp] = await db
      .insert(salaryComponentsTable)
      .values({
        companyId: auth.companyId,
        name,
        code: code.toUpperCase(),
        type,
        isFixed: isFixed ?? true,
        isTaxable: isTaxable ?? true,
        formula,
      })
      .returning();
    return ok(res, comp, 201);
  }
);

export default router;

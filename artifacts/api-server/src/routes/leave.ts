import { Router } from "express";
import { db } from "@workspace/db";
import {
  leavePoliciesTable,
  leaveBalancesTable,
  leaveRequestsTable,
  employeesTable,
} from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

/* ── Leave Policies ─────────────────────────────────────── */

router.get("/policies", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const rows = await db.query.leavePoliciesTable.findMany({
    where: and(eq(leavePoliciesTable.companyId, auth.companyId), eq(leavePoliciesTable.isActive, true)),
  });
  return ok(res, rows);
});

router.get("/policies/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const row = await db.query.leavePoliciesTable.findFirst({
    where: and(eq(leavePoliciesTable.id, req.params.id), eq(leavePoliciesTable.companyId, auth.companyId)),
  });
  if (!row) return fail(res, 404, "Policy not found");
  return ok(res, row);
});

router.post("/policies", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { name, type, daysPerYear, carryForward, maxCarryForward, accrualMethod, description } = req.body;
  if (!name || !type || !daysPerYear) return fail(res, 400, "name, type, daysPerYear required");
  const [row] = await db.insert(leavePoliciesTable).values({
    companyId: auth.companyId, name, type, daysPerYear,
    carryForward: carryForward ?? false,
    maxCarryForward: maxCarryForward ?? 0,
    accrualMethod: accrualMethod ?? "UPFRONT",
    description,
  }).returning();
  return ok(res, row, 201);
});

router.put("/policies/:id", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { name, daysPerYear, carryForward, maxCarryForward, accrualMethod, description } = req.body;
  const [row] = await db.update(leavePoliciesTable)
    .set({ name, daysPerYear, carryForward, maxCarryForward, accrualMethod, description, updatedAt: new Date() })
    .where(and(eq(leavePoliciesTable.id, req.params.id), eq(leavePoliciesTable.companyId, auth.companyId)))
    .returning();
  if (!row) return fail(res, 404, "Policy not found");
  return ok(res, row);
});

/* ── Leave Balances ─────────────────────────────────────── */

router.get("/balances", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { employeeId, year } = req.query as Record<string, string>;
  const conditions = [eq(leaveBalancesTable.companyId, auth.companyId)];
  if (employeeId) conditions.push(eq(leaveBalancesTable.employeeId, employeeId));
  if (year) conditions.push(eq(leaveBalancesTable.year, Number(year)));
  const rows = await db.query.leaveBalancesTable.findMany({
    where: and(...conditions),
    with: { policy: { columns: { name: true, type: true } } },
  });
  return ok(res, rows);
});

/* ── Leave Requests ─────────────────────────────────────── */

router.get("/requests", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { employeeId, status } = req.query as Record<string, string>;

  const conditions = [eq(leaveRequestsTable.companyId, auth.companyId)];
  if (employeeId) conditions.push(eq(leaveRequestsTable.employeeId, employeeId));
  if (status) conditions.push(eq(leaveRequestsTable.status, status as any));

  const rows = await db.query.leaveRequestsTable.findMany({
    where: and(...conditions),
    with: {
      employee: { columns: { id: true, firstName: true, lastName: true, employeeCode: true } },
      policy: { columns: { name: true, type: true } },
    },
    limit,
    offset,
    orderBy: (t, { desc }) => desc(t.createdAt),
  });
  const [{ value: total }] = await db.select({ value: count() }).from(leaveRequestsTable).where(and(...conditions));
  return paginated(res, rows, { page, limit, total: Number(total) });
});

router.get("/requests/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const row = await db.query.leaveRequestsTable.findFirst({
    where: and(eq(leaveRequestsTable.id, req.params.id), eq(leaveRequestsTable.companyId, auth.companyId)),
    with: { employee: true, policy: true },
  });
  if (!row) return fail(res, 404, "Leave request not found");
  return ok(res, row);
});

router.post("/requests", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { employeeId, policyId, startDate, endDate, days, type, reason } = req.body;
  if (!employeeId || !policyId || !startDate || !endDate || !days || !type) {
    return fail(res, 400, "Required fields missing");
  }
  const emp = await db.query.employeesTable.findFirst({
    where: and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, auth.companyId)),
  });
  if (!emp) return fail(res, 400, "Invalid employee");

  const [row] = await db.insert(leaveRequestsTable).values({
    companyId: auth.companyId, employeeId, policyId,
    startDate, endDate, days: String(days), type, reason,
  }).returning();

  // Increment pending balance
  const year = new Date(startDate).getFullYear();
  await db.update(leaveBalancesTable)
    .set({ pending: sql`${leaveBalancesTable.pending} + ${String(days)}`, updatedAt: new Date() })
    .where(and(
      eq(leaveBalancesTable.employeeId, employeeId),
      eq(leaveBalancesTable.policyId, policyId),
      eq(leaveBalancesTable.year, year),
    ));

  return ok(res, row, 201);
});

router.post("/requests/:id/approve", requireRole("ADMIN", "HR_MANAGER", "MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;

  // Fetch the request first to get days/policyId/employeeId for balance update
  const existing = await db.query.leaveRequestsTable.findFirst({
    where: and(eq(leaveRequestsTable.id, req.params.id), eq(leaveRequestsTable.companyId, auth.companyId)),
  });
  if (!existing) return fail(res, 404, "Leave request not found");
  if (existing.status !== "PENDING") return fail(res, 400, `Cannot approve a ${existing.status.toLowerCase()} request`);

  const [row] = await db.update(leaveRequestsTable)
    .set({ status: "APPROVED", approvedBy: auth.sub, approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(leaveRequestsTable.id, req.params.id))
    .returning();

  // Move days from pending → used in leave balance
  const year = new Date(existing.startDate).getFullYear();
  await db.update(leaveBalancesTable)
    .set({
      used: sql`${leaveBalancesTable.used} + ${existing.days}`,
      pending: sql`GREATEST(0, ${leaveBalancesTable.pending} - ${existing.days})`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(leaveBalancesTable.employeeId, existing.employeeId),
      eq(leaveBalancesTable.policyId, existing.policyId),
      eq(leaveBalancesTable.year, year),
    ));

  return ok(res, row);
});

router.post("/requests/:id/reject", requireRole("ADMIN", "HR_MANAGER", "MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { reason } = req.body;

  const existing = await db.query.leaveRequestsTable.findFirst({
    where: and(eq(leaveRequestsTable.id, req.params.id), eq(leaveRequestsTable.companyId, auth.companyId)),
  });
  if (!existing) return fail(res, 404, "Leave request not found");
  if (existing.status !== "PENDING") return fail(res, 400, `Cannot reject a ${existing.status.toLowerCase()} request`);

  const [row] = await db.update(leaveRequestsTable)
    .set({ status: "REJECTED", rejectedReason: reason, updatedAt: new Date() })
    .where(eq(leaveRequestsTable.id, req.params.id))
    .returning();

  // Release pending balance back
  const year = new Date(existing.startDate).getFullYear();
  await db.update(leaveBalancesTable)
    .set({
      pending: sql`GREATEST(0, ${leaveBalancesTable.pending} - ${existing.days})`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(leaveBalancesTable.employeeId, existing.employeeId),
      eq(leaveBalancesTable.policyId, existing.policyId),
      eq(leaveBalancesTable.year, year),
    ));

  return ok(res, row);
});

router.post("/requests/:id/cancel", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const [row] = await db.update(leaveRequestsTable)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(and(eq(leaveRequestsTable.id, req.params.id), eq(leaveRequestsTable.companyId, auth.companyId)))
    .returning();
  if (!row) return fail(res, 404, "Leave request not found");
  return ok(res, row);
});

// GET /api/leave/calendar
router.get("/calendar", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { month, year } = req.query as Record<string, string>;
  const y = year ?? new Date().getFullYear().toString();
  const m = month ?? String(new Date().getMonth() + 1).padStart(2, "0");
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const to = `${y}-${String(m).padStart(2, "0")}-31`;

  const rows = await db.query.leaveRequestsTable.findMany({
    where: and(
      eq(leaveRequestsTable.companyId, auth.companyId),
      eq(leaveRequestsTable.status, "APPROVED")
    ),
    with: { employee: { columns: { id: true, firstName: true, lastName: true } } },
  });
  return ok(res, rows);
});

export default router;

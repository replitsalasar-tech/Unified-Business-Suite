import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoicesTable,
  paymentsTable,
  customersTable,
} from "@workspace/db";
import { eq, and, count, desc, lt, inArray } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/v1/invoices/overdue — must come before /:id
router.get("/overdue", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const now = new Date();

  const rows = await db.query.invoicesTable.findMany({
    where: and(
      eq(invoicesTable.companyId, auth.companyId),
      lt(invoicesTable.dueDate, now)
    ),
    orderBy: (t, { asc }) => [asc(t.dueDate)],
  });

  // Filter to only SENT, VIEWED, PARTIAL in JS (avoids inArray import complexity)
  const overdueStatuses = ["SENT", "VIEWED", "PARTIAL"];
  const overdue = rows.filter((r) => overdueStatuses.includes(r.status));

  return ok(res, overdue);
});

// GET /api/v1/invoices
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { customerId, status } = req.query as Record<string, string>;

  const conditions: any[] = [eq(invoicesTable.companyId, auth.companyId)];
  if (customerId) conditions.push(eq(invoicesTable.customerId, customerId));
  if (status) conditions.push(eq(invoicesTable.status, status as any));

  const where = and(...conditions);

  const rows = await db.query.invoicesTable.findMany({
    where,
    limit,
    offset,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(invoicesTable)
    .where(where);

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// POST /api/v1/invoices
router.post(
  "/",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { customerId, orderId, subtotal, taxAmount, discountAmount, totalAmount, dueDate, notes, termsAndConditions, currency } = req.body;

    if (!customerId || totalAmount === undefined || !dueDate) {
      return fail(res, 400, "customerId, totalAmount, dueDate are required");
    }

    const customer = await db.query.customersTable.findFirst({
      where: and(eq(customersTable.id, customerId), eq(customersTable.companyId, auth.companyId)),
    });
    if (!customer) return fail(res, 404, "Customer not found");

    const [{ value: invCount }] = await db
      .select({ value: count() })
      .from(invoicesTable)
      .where(eq(invoicesTable.companyId, auth.companyId));

    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(Number(invCount) + 1).padStart(4, "0")}`;

    const total = Number(totalAmount);
    const disc = Number(discountAmount ?? 0);
    const tax = Number(taxAmount ?? 0);
    const sub = Number(subtotal ?? total - tax + disc);

    const [invoice] = await db
      .insert(invoicesTable)
      .values({
        companyId: auth.companyId,
        invoiceNumber,
        orderId,
        customerId,
        status: "DRAFT",
        subtotal: String(sub),
        taxAmount: String(tax),
        discountAmount: String(disc),
        totalAmount: String(total),
        amountPaid: "0",
        amountDue: String(total),
        currency: currency ?? "INR",
        dueDate: new Date(dueDate),
        notes,
        termsAndConditions,
      })
      .returning();

    return ok(res, invoice, 201);
  }
);

// GET /api/v1/invoices/:id
router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const invoice = await db.query.invoicesTable.findFirst({
    where: and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.companyId, auth.companyId)),
  });
  if (!invoice) return fail(res, 404, "Invoice not found");

  const payments = await db.query.paymentsTable.findMany({
    where: and(eq(paymentsTable.invoiceId, req.params.id), eq(paymentsTable.companyId, auth.companyId)),
    orderBy: (t, { desc }) => [desc(t.paidAt)],
  });

  return ok(res, { ...invoice, payments });
});

// PATCH /api/v1/invoices/:id/status
router.patch(
  "/:id/status",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { status } = req.body;

    const validStatuses = ["DRAFT", "SENT", "VIEWED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      return fail(res, 400, `status must be one of: ${validStatuses.join(", ")}`);
    }

    const [invoice] = await db
      .update(invoicesTable)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.companyId, auth.companyId)))
      .returning();

    if (!invoice) return fail(res, 404, "Invoice not found");
    return ok(res, invoice);
  }
);

// POST /api/v1/invoices/:id/payment
router.post(
  "/:id/payment",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { amount, method, reference, notes } = req.body;

    if (amount === undefined || !method) {
      return fail(res, 400, "amount and method are required");
    }

    const invoice = await db.query.invoicesTable.findFirst({
      where: and(eq(invoicesTable.id, req.params.id), eq(invoicesTable.companyId, auth.companyId)),
    });
    if (!invoice) return fail(res, 404, "Invoice not found");
    if (invoice.status === "CANCELLED") return fail(res, 400, "Cannot record payment on a cancelled invoice");
    if (invoice.status === "PAID") return fail(res, 400, "Invoice already fully paid");

    const paymentAmount = Number(amount);
    const currentPaid = Number(invoice.amountPaid);
    const totalAmount = Number(invoice.totalAmount);

    const newAmountPaid = currentPaid + paymentAmount;
    const newAmountDue = Math.max(0, totalAmount - newAmountPaid);
    const newStatus = newAmountDue <= 0 ? "PAID" : newAmountPaid > 0 ? "PARTIAL" : invoice.status;

    // Record payment
    const [payment] = await db
      .insert(paymentsTable)
      .values({
        companyId: auth.companyId,
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        customerId: invoice.customerId,
        amount: String(paymentAmount),
        currency: invoice.currency,
        method,
        reference,
        notes,
        createdBy: auth.sub,
      })
      .returning();

    // Update invoice
    const [updatedInvoice] = await db
      .update(invoicesTable)
      .set({
        amountPaid: String(newAmountPaid),
        amountDue: String(newAmountDue),
        status: newStatus as any,
        paidDate: newAmountDue <= 0 ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(invoicesTable.id, req.params.id))
      .returning();

    return ok(res, { invoice: updatedInvoice, payment });
  }
);

export default router;

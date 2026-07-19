import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  invoicesTable,
  customersTable,
} from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/v1/orders
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { customerId, status, paymentStatus } = req.query as Record<string, string>;

  const conditions: any[] = [eq(ordersTable.companyId, auth.companyId)];
  if (customerId) conditions.push(eq(ordersTable.customerId, customerId));
  if (status) conditions.push(eq(ordersTable.status, status as any));
  if (paymentStatus) conditions.push(eq(ordersTable.paymentStatus, paymentStatus as any));

  const where = and(...conditions);

  const rows = await db.query.ordersTable.findMany({
    where,
    limit,
    offset,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(ordersTable)
    .where(where);

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// POST /api/v1/orders
router.post(
  "/",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { customerId, items, notes, expectedDate, shippingAddress, billingAddress } = req.body;

    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return fail(res, 400, "customerId and items are required");
    }

    const customer = await db.query.customersTable.findFirst({
      where: and(eq(customersTable.id, customerId), eq(customersTable.companyId, auth.companyId)),
    });
    if (!customer) return fail(res, 404, "Customer not found");

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    const lineItems: any[] = [];

    for (const item of items) {
      const qty = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const discount = Number(item.discount ?? 0);
      const taxRate = Number(item.taxRate ?? 0);

      const lineTotal = qty * unitPrice * (1 - discount / 100);
      const lineTax = lineTotal * (taxRate / 100);

      subtotal += lineTotal;
      taxAmount += lineTax;

      lineItems.push({
        productId: item.productId,
        quantity: qty,
        unitPrice: String(unitPrice),
        discount: String(discount),
        taxRate: String(taxRate),
        lineTotal: String(lineTotal),
        notes: item.notes,
      });
    }

    const totalAmount = subtotal + taxAmount;

    // Generate order number
    const [{ value: orderCount }] = await db
      .select({ value: count() })
      .from(ordersTable)
      .where(eq(ordersTable.companyId, auth.companyId));

    const year = new Date().getFullYear();
    const orderNumber = `ORD-${year}-${String(Number(orderCount) + 1).padStart(4, "0")}`;

    const [order] = await db
      .insert(ordersTable)
      .values({
        companyId: auth.companyId,
        orderNumber,
        customerId,
        status: "DRAFT",
        paymentStatus: "PENDING",
        subtotal: String(subtotal),
        taxAmount: String(taxAmount),
        discountAmount: "0",
        shippingCost: "0",
        totalAmount: String(totalAmount),
        currency: "INR",
        shippingAddress,
        billingAddress,
        notes,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        createdBy: auth.sub,
      })
      .returning();

    await db.insert(orderItemsTable).values(
      lineItems.map((li) => ({ orderId: order.id, ...li }))
    );

    return ok(res, order, 201);
  }
);

// GET /api/v1/orders/:id
router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const order = await db.query.ordersTable.findFirst({
    where: and(eq(ordersTable.id, req.params.id), eq(ordersTable.companyId, auth.companyId)),
    with: {
      items: true,
      shipments: true,
      invoices: true,
    } as any,
  });
  if (!order) return fail(res, 404, "Order not found");
  return ok(res, order);
});

// PATCH /api/v1/orders/:id
router.patch(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;

    const order = await db.query.ordersTable.findFirst({
      where: and(eq(ordersTable.id, req.params.id), eq(ordersTable.companyId, auth.companyId)),
    });
    if (!order) return fail(res, 404, "Order not found");
    if (order.status !== "DRAFT") return fail(res, 400, "Only DRAFT orders can be updated");

    const { notes, expectedDate, shippingAddress, billingAddress } = req.body;

    const [updated] = await db
      .update(ordersTable)
      .set({
        notes,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        shippingAddress,
        billingAddress,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, req.params.id))
      .returning();

    return ok(res, updated);
  }
);

// POST /api/v1/orders/:id/confirm
router.post(
  "/:id/confirm",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;

    const order = await db.query.ordersTable.findFirst({
      where: and(eq(ordersTable.id, req.params.id), eq(ordersTable.companyId, auth.companyId)),
    });
    if (!order) return fail(res, 404, "Order not found");
    if (order.status !== "DRAFT") return fail(res, 400, "Only DRAFT orders can be confirmed");

    const [updated] = await db
      .update(ordersTable)
      .set({ status: "CONFIRMED", updatedAt: new Date() })
      .where(eq(ordersTable.id, req.params.id))
      .returning();

    return ok(res, updated);
  }
);

// POST /api/v1/orders/:id/cancel
router.post(
  "/:id/cancel",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;

    const order = await db.query.ordersTable.findFirst({
      where: and(eq(ordersTable.id, req.params.id), eq(ordersTable.companyId, auth.companyId)),
    });
    if (!order) return fail(res, 404, "Order not found");
    if (order.status === "CANCELLED") return fail(res, 400, "Order already cancelled");
    if (order.status === "DELIVERED") return fail(res, 400, "Cannot cancel a delivered order");

    const [updated] = await db
      .update(ordersTable)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(ordersTable.id, req.params.id))
      .returning();

    return ok(res, updated);
  }
);

// POST /api/v1/orders/:id/invoice
router.post(
  "/:id/invoice",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;

    const order = await db.query.ordersTable.findFirst({
      where: and(eq(ordersTable.id, req.params.id), eq(ordersTable.companyId, auth.companyId)),
    });
    if (!order) return fail(res, 404, "Order not found");
    if (order.status === "DRAFT") return fail(res, 400, "Confirm the order before generating an invoice");
    if (order.status === "CANCELLED") return fail(res, 400, "Cannot invoice a cancelled order");

    // Generate invoice number
    const [{ value: invCount }] = await db
      .select({ value: count() })
      .from(invoicesTable)
      .where(eq(invoicesTable.companyId, auth.companyId));

    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(Number(invCount) + 1).padStart(4, "0")}`;

    // Due date based on customer payment terms (default 30 days)
    const customer = await db.query.customersTable.findFirst({
      where: eq(customersTable.id, order.customerId),
    });
    const paymentTerms = customer?.paymentTerms ?? 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);

    const [invoice] = await db
      .insert(invoicesTable)
      .values({
        companyId: auth.companyId,
        invoiceNumber,
        orderId: order.id,
        customerId: order.customerId,
        status: "DRAFT",
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        discountAmount: order.discountAmount,
        totalAmount: order.totalAmount,
        amountPaid: "0",
        amountDue: order.totalAmount,
        currency: order.currency,
        dueDate,
        notes: req.body.notes,
      })
      .returning();

    return ok(res, invoice, 201);
  }
);

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import {
  customersTable,
  customerContactsTable,
  customerActivitiesTable,
} from "@workspace/db";
import { eq, and, count, ilike } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/v1/customers
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { search, isActive } = req.query as Record<string, string>;

  const conditions: any[] = [eq(customersTable.companyId, auth.companyId)];
  if (search) conditions.push(ilike(customersTable.name, `%${search}%`));
  if (isActive !== undefined) conditions.push(eq(customersTable.isActive, isActive === "true"));

  const where = and(...conditions);

  const rows = await db.query.customersTable.findMany({
    where,
    limit,
    offset,
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(customersTable)
    .where(where);

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// POST /api/v1/customers
router.post(
  "/",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const {
      name, contactName, email, phone, address, billingAddress, shippingAddress,
      taxId, paymentTerms, creditLimit, currency, priceListId, salesRepId, notes,
    } = req.body;

    if (!name) return fail(res, 400, "name is required");

    const [{ value: custCount }] = await db
      .select({ value: count() })
      .from(customersTable)
      .where(eq(customersTable.companyId, auth.companyId));

    const code = `CUST-${String(Number(custCount) + 1).padStart(4, "0")}`;

    const [customer] = await db
      .insert(customersTable)
      .values({
        companyId: auth.companyId,
        code,
        name,
        contactName,
        email,
        phone,
        address,
        billingAddress,
        shippingAddress,
        taxId,
        paymentTerms: paymentTerms ?? 30,
        creditLimit: creditLimit !== undefined ? String(creditLimit) : undefined,
        currency: currency ?? "INR",
        priceListId,
        salesRepId,
        notes,
      })
      .returning();

    return ok(res, customer, 201);
  }
);

// GET /api/v1/customers/:id
router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const customer = await db.query.customersTable.findFirst({
    where: and(eq(customersTable.id, req.params.id), eq(customersTable.companyId, auth.companyId)),
  });
  if (!customer) return fail(res, 404, "Customer not found");

  const contacts = await db.query.customerContactsTable.findMany({
    where: eq(customerContactsTable.customerId, req.params.id),
  });

  const recentActivities = await db.query.customerActivitiesTable.findMany({
    where: eq(customerActivitiesTable.customerId, req.params.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 5,
  });

  return ok(res, { ...customer, contacts, recentActivities });
});

// PATCH /api/v1/customers/:id
router.patch(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const {
      name, contactName, email, phone, address, billingAddress, shippingAddress,
      taxId, paymentTerms, creditLimit, currency, priceListId, salesRepId, isActive, notes,
    } = req.body;

    const [customer] = await db
      .update(customersTable)
      .set({
        name,
        contactName,
        email,
        phone,
        address,
        billingAddress,
        shippingAddress,
        taxId,
        paymentTerms,
        creditLimit: creditLimit !== undefined ? String(creditLimit) : undefined,
        currency,
        priceListId,
        salesRepId,
        isActive,
        notes,
        updatedAt: new Date(),
      })
      .where(and(eq(customersTable.id, req.params.id), eq(customersTable.companyId, auth.companyId)))
      .returning();

    if (!customer) return fail(res, 404, "Customer not found");
    return ok(res, customer);
  }
);

// POST /api/v1/customers/:id/contacts
router.post(
  "/:id/contacts",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const customer = await db.query.customersTable.findFirst({
      where: and(eq(customersTable.id, req.params.id), eq(customersTable.companyId, auth.companyId)),
      columns: { id: true },
    });
    if (!customer) return fail(res, 404, "Customer not found");

    const { name, email, phone, role, isPrimary } = req.body;
    if (!name) return fail(res, 400, "name is required");

    const [contact] = await db
      .insert(customerContactsTable)
      .values({
        customerId: req.params.id,
        name,
        email,
        phone,
        role,
        isPrimary: isPrimary ?? false,
      })
      .returning();

    return ok(res, contact, 201);
  }
);

// GET /api/v1/customers/:id/activities
router.get("/:id/activities", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const customer = await db.query.customersTable.findFirst({
    where: and(eq(customersTable.id, req.params.id), eq(customersTable.companyId, auth.companyId)),
    columns: { id: true },
  });
  if (!customer) return fail(res, 404, "Customer not found");

  const activities = await db.query.customerActivitiesTable.findMany({
    where: eq(customerActivitiesTable.customerId, req.params.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return ok(res, activities);
});

// POST /api/v1/customers/:id/activities
router.post("/:id/activities", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const customer = await db.query.customersTable.findFirst({
    where: and(eq(customersTable.id, req.params.id), eq(customersTable.companyId, auth.companyId)),
    columns: { id: true },
  });
  if (!customer) return fail(res, 404, "Customer not found");

  const { type, subject, notes, outcome, scheduledAt, completedAt } = req.body;
  if (!type || !subject) return fail(res, 400, "type and subject are required");

  const [activity] = await db
    .insert(customerActivitiesTable)
    .values({
      customerId: req.params.id,
      type,
      subject,
      notes,
      outcome,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      completedAt: completedAt ? new Date(completedAt) : undefined,
      userId: auth.sub,
    })
    .returning();

  return ok(res, activity, 201);
});

export default router;

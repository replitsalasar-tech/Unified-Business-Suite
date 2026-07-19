import { Router } from "express";
import { db } from "@workspace/db";
import {
  suppliersTable,
  supplierProductsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
  inventoryItemsTable,
  stockMovementsTable,
  productsTable,
  warehousesTable,
} from "@workspace/db";
import { eq, and, count, desc, ilike } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/v1/suppliers/purchase-orders
router.get("/purchase-orders", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { supplierId, status } = req.query as Record<string, string>;

  const conditions: any[] = [eq(purchaseOrdersTable.companyId, auth.companyId)];
  if (supplierId) conditions.push(eq(purchaseOrdersTable.supplierId, supplierId));
  if (status) conditions.push(eq(purchaseOrdersTable.status, status));

  const where = and(...conditions);

  const rows = await db.query.purchaseOrdersTable.findMany({
    where,
    limit,
    offset,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(purchaseOrdersTable)
    .where(where);

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// POST /api/v1/suppliers/purchase-orders
router.post(
  "/purchase-orders",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { supplierId, warehouseId, expectedDate, notes, items } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return fail(res, 400, "supplierId and items are required");
    }

    // Verify supplier belongs to company
    const supplier = await db.query.suppliersTable.findFirst({
      where: and(eq(suppliersTable.id, supplierId), eq(suppliersTable.companyId, auth.companyId)),
    });
    if (!supplier) return fail(res, 404, "Supplier not found");

    // Generate PO number
    const [{ value: poCount }] = await db
      .select({ value: count() })
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.companyId, auth.companyId));

    const year = new Date().getFullYear();
    const poNumber = `PO-${year}-${String(Number(poCount) + 1).padStart(4, "0")}`;

    // Calculate total
    const totalAmount = items.reduce((sum: number, item: any) => {
      return sum + Number(item.quantity) * Number(item.unitCost);
    }, 0);

    const [po] = await db
      .insert(purchaseOrdersTable)
      .values({
        companyId: auth.companyId,
        poNumber,
        supplierId,
        warehouseId,
        status: "DRAFT",
        totalAmount: String(totalAmount),
        currency: "INR",
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
        createdBy: auth.sub,
      })
      .returning();

    // Insert PO items
    await db.insert(purchaseOrderItemsTable).values(
      items.map((item: any) => ({
        purchaseOrderId: po.id,
        productId: item.productId,
        quantity: Number(item.quantity),
        unitCost: String(item.unitCost),
        totalCost: String(Number(item.quantity) * Number(item.unitCost)),
        receivedQty: 0,
      }))
    );

    return ok(res, po, 201);
  }
);

// GET /api/v1/suppliers/purchase-orders/:id
router.get("/purchase-orders/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const po = await db.query.purchaseOrdersTable.findFirst({
    where: and(eq(purchaseOrdersTable.id, req.params.id), eq(purchaseOrdersTable.companyId, auth.companyId)),
    with: {
      items: true,
    } as any,
  });
  if (!po) return fail(res, 404, "Purchase order not found");
  return ok(res, po);
});

// PATCH /api/v1/suppliers/purchase-orders/:id
router.patch(
  "/purchase-orders/:id",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { status, expectedDate, notes, warehouseId } = req.body;

    const [po] = await db
      .update(purchaseOrdersTable)
      .set({
        status,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
        warehouseId,
        updatedAt: new Date(),
      })
      .where(and(eq(purchaseOrdersTable.id, req.params.id), eq(purchaseOrdersTable.companyId, auth.companyId)))
      .returning();

    if (!po) return fail(res, 404, "Purchase order not found");
    return ok(res, po);
  }
);

// POST /api/v1/suppliers/purchase-orders/:id/receive
router.post(
  "/purchase-orders/:id/receive",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;

    const po = await db.query.purchaseOrdersTable.findFirst({
      where: and(eq(purchaseOrdersTable.id, req.params.id), eq(purchaseOrdersTable.companyId, auth.companyId)),
      with: { items: true } as any,
    });
    if (!po) return fail(res, 404, "Purchase order not found");
    if (po.status === "RECEIVED" || po.status === "CANCELLED") {
      return fail(res, 400, `Cannot receive a PO with status ${po.status}`);
    }

    const warehouseId = req.body.warehouseId ?? (po as any).warehouseId;
    if (!warehouseId) return fail(res, 400, "warehouseId is required to receive PO");

    // Verify warehouse belongs to company
    const warehouse = await db.query.warehousesTable.findFirst({
      where: and(eq(warehousesTable.id, warehouseId), eq(warehousesTable.companyId, auth.companyId)),
    });
    if (!warehouse) return fail(res, 404, "Warehouse not found");

    // Update inventory for each item
    const items = (po as any).items as any[];
    for (const item of items) {
      const existing = await db.query.inventoryItemsTable.findFirst({
        where: and(
          eq(inventoryItemsTable.productId, item.productId),
          eq(inventoryItemsTable.warehouseId, warehouseId)
        ),
      });

      if (existing) {
        const newQty = existing.quantity + item.quantity;
        const newAvailable = newQty - existing.reservedQty;
        await db
          .update(inventoryItemsTable)
          .set({ quantity: newQty, availableQty: newAvailable, updatedAt: new Date() })
          .where(eq(inventoryItemsTable.id, existing.id));
      } else {
        await db.insert(inventoryItemsTable).values({
          productId: item.productId,
          warehouseId,
          quantity: item.quantity,
          reservedQty: 0,
          availableQty: item.quantity,
        });
      }

      // Record stock movement
      await db.insert(stockMovementsTable).values({
        companyId: auth.companyId,
        productId: item.productId,
        warehouseId,
        type: "PURCHASE",
        quantity: item.quantity,
        reference: (po as any).poNumber,
        notes: `Received from PO ${(po as any).poNumber}`,
        performedBy: auth.sub,
      });

      // Update received qty on item
      await db
        .update(purchaseOrderItemsTable)
        .set({ receivedQty: item.quantity })
        .where(eq(purchaseOrderItemsTable.id, item.id));
    }

    const [updated] = await db
      .update(purchaseOrdersTable)
      .set({ status: "RECEIVED", receivedDate: new Date(), updatedAt: new Date() })
      .where(eq(purchaseOrdersTable.id, req.params.id))
      .returning();

    return ok(res, updated);
  }
);

// GET /api/v1/suppliers
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { search, isActive } = req.query as Record<string, string>;

  const conditions: any[] = [eq(suppliersTable.companyId, auth.companyId)];
  if (search) conditions.push(ilike(suppliersTable.name, `%${search}%`));
  if (isActive !== undefined) conditions.push(eq(suppliersTable.isActive, isActive === "true"));

  const where = and(...conditions);

  const rows = await db.query.suppliersTable.findMany({
    where,
    limit,
    offset,
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(suppliersTable)
    .where(where);

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// POST /api/v1/suppliers
router.post(
  "/",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { name, contactName, email, phone, address, taxId, paymentTerms, currency, rating, notes } = req.body;

    if (!name) return fail(res, 400, "name is required");

    const [{ value: supCount }] = await db
      .select({ value: count() })
      .from(suppliersTable)
      .where(eq(suppliersTable.companyId, auth.companyId));

    const code = `SUP-${String(Number(supCount) + 1).padStart(4, "0")}`;

    const [supplier] = await db
      .insert(suppliersTable)
      .values({
        companyId: auth.companyId,
        code,
        name,
        contactName,
        email,
        phone,
        address,
        taxId,
        paymentTerms: paymentTerms ?? 30,
        currency: currency ?? "INR",
        rating: rating !== undefined ? String(rating) : undefined,
        notes,
      })
      .returning();

    return ok(res, supplier, 201);
  }
);

// GET /api/v1/suppliers/:id
router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const supplier = await db.query.suppliersTable.findFirst({
    where: and(eq(suppliersTable.id, req.params.id), eq(suppliersTable.companyId, auth.companyId)),
  });
  if (!supplier) return fail(res, 404, "Supplier not found");

  const purchaseOrders = await db.query.purchaseOrdersTable.findMany({
    where: and(
      eq(purchaseOrdersTable.supplierId, req.params.id),
      eq(purchaseOrdersTable.companyId, auth.companyId)
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: 10,
  });

  return ok(res, { ...supplier, purchaseOrders });
});

// PATCH /api/v1/suppliers/:id
router.patch(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { name, contactName, email, phone, address, taxId, paymentTerms, currency, rating, isActive, notes } = req.body;

    const [supplier] = await db
      .update(suppliersTable)
      .set({
        name,
        contactName,
        email,
        phone,
        address,
        taxId,
        paymentTerms,
        currency,
        rating: rating !== undefined ? String(rating) : undefined,
        isActive,
        notes,
        updatedAt: new Date(),
      })
      .where(and(eq(suppliersTable.id, req.params.id), eq(suppliersTable.companyId, auth.companyId)))
      .returning();

    if (!supplier) return fail(res, 404, "Supplier not found");
    return ok(res, supplier);
  }
);

// GET /api/v1/suppliers/:id/products
router.get("/:id/products", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const supplier = await db.query.suppliersTable.findFirst({
    where: and(eq(suppliersTable.id, req.params.id), eq(suppliersTable.companyId, auth.companyId)),
    columns: { id: true },
  });
  if (!supplier) return fail(res, 404, "Supplier not found");

  const rows = await db.query.supplierProductsTable.findMany({
    where: eq(supplierProductsTable.supplierId, req.params.id),
  });

  return ok(res, rows);
});

// POST /api/v1/suppliers/:id/products
router.post(
  "/:id/products",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const supplier = await db.query.suppliersTable.findFirst({
      where: and(eq(suppliersTable.id, req.params.id), eq(suppliersTable.companyId, auth.companyId)),
      columns: { id: true },
    });
    if (!supplier) return fail(res, 404, "Supplier not found");

    const { productId, supplierSku, costPrice, leadTimeDays, minOrderQty, isPreferred } = req.body;
    if (!productId || costPrice === undefined) {
      return fail(res, 400, "productId and costPrice are required");
    }

    const [sp] = await db
      .insert(supplierProductsTable)
      .values({
        supplierId: req.params.id,
        productId,
        supplierSku,
        costPrice: String(costPrice),
        leadTimeDays: leadTimeDays ?? 7,
        minOrderQty: minOrderQty ?? 1,
        isPreferred: isPreferred ?? false,
      })
      .returning();

    return ok(res, sp, 201);
  }
);

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  warehousesTable,
  inventoryItemsTable,
  stockMovementsTable,
} from "@workspace/db";
import { eq, and, count, desc, asc, sql, lte } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/v1/inventory/warehouses
router.get("/warehouses", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const rows = await db.query.warehousesTable.findMany({
    where: eq(warehousesTable.companyId, auth.companyId),
    orderBy: (t, { asc }) => [asc(t.name)],
  });
  return ok(res, rows);
});

// POST /api/v1/inventory/warehouses
router.post(
  "/warehouses",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { name, code, address, isDefault, managerId } = req.body;
    if (!name || !code) {
      return fail(res, 400, "name and code are required");
    }
    const [warehouse] = await db
      .insert(warehousesTable)
      .values({ companyId: auth.companyId, name, code: code.toUpperCase(), address, isDefault: isDefault ?? false, managerId })
      .returning();
    return ok(res, warehouse, 201);
  }
);

// GET /api/v1/inventory/low-stock
router.get("/low-stock", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;

  // Get products with their reorder levels, then cross with inventory
  const products = await db.query.productsTable.findMany({
    where: and(eq(productsTable.companyId, auth.companyId), eq(productsTable.isActive, true), eq(productsTable.trackInventory, true)),
  });

  const result = [];
  for (const product of products) {
    const items = await db.query.inventoryItemsTable.findMany({
      where: eq(inventoryItemsTable.productId, product.id),
      with: { warehouse: { columns: { id: true, name: true, code: true } } } as any,
    });
    const totalAvailable = items.reduce((sum, i) => sum + i.availableQty, 0);
    if (totalAvailable <= product.reorderLevel) {
      result.push({ ...product, totalAvailable, inventoryItems: items });
    }
  }

  return ok(res, result);
});

// GET /api/v1/inventory/movements
router.get("/movements", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { productId, warehouseId, type } = req.query as Record<string, string>;

  const conditions: any[] = [eq(stockMovementsTable.companyId, auth.companyId)];
  if (productId) conditions.push(eq(stockMovementsTable.productId, productId));
  if (warehouseId) conditions.push(eq(stockMovementsTable.warehouseId, warehouseId));
  if (type) conditions.push(eq(stockMovementsTable.type, type as any));

  const where = and(...conditions);

  const rows = await db.query.stockMovementsTable.findMany({
    where,
    limit,
    offset,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(stockMovementsTable)
    .where(where);

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// POST /api/v1/inventory/adjust
router.post(
  "/adjust",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { productId, warehouseId, quantity, type, notes } = req.body;

    if (!productId || !warehouseId || quantity === undefined || !type) {
      return fail(res, 400, "productId, warehouseId, quantity, type are required");
    }

    // Verify product belongs to company
    const product = await db.query.productsTable.findFirst({
      where: and(eq(productsTable.id, productId), eq(productsTable.companyId, auth.companyId)),
    });
    if (!product) return fail(res, 404, "Product not found");

    // Verify warehouse belongs to company
    const warehouse = await db.query.warehousesTable.findFirst({
      where: and(eq(warehousesTable.id, warehouseId), eq(warehousesTable.companyId, auth.companyId)),
    });
    if (!warehouse) return fail(res, 404, "Warehouse not found");

    // Upsert inventory item
    const existing = await db.query.inventoryItemsTable.findFirst({
      where: and(eq(inventoryItemsTable.productId, productId), eq(inventoryItemsTable.warehouseId, warehouseId)),
    });

    const qty = Number(quantity);

    if (existing) {
      const newQty = existing.quantity + qty;
      const newAvailable = Math.max(0, newQty - existing.reservedQty);
      await db
        .update(inventoryItemsTable)
        .set({ quantity: newQty, availableQty: newAvailable, updatedAt: new Date() })
        .where(eq(inventoryItemsTable.id, existing.id));
    } else {
      const newQty = Math.max(0, qty);
      await db
        .insert(inventoryItemsTable)
        .values({ productId, warehouseId, quantity: newQty, reservedQty: 0, availableQty: newQty });
    }

    // Record movement
    const [movement] = await db
      .insert(stockMovementsTable)
      .values({
        companyId: auth.companyId,
        productId,
        warehouseId,
        type: type as any,
        quantity: qty,
        notes,
        performedBy: auth.sub,
      })
      .returning();

    return ok(res, movement, 201);
  }
);

// GET /api/v1/inventory/valuation
router.get("/valuation", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;

  // Get all active products with their purchase prices
  const products = await db.query.productsTable.findMany({
    where: and(eq(productsTable.companyId, auth.companyId), eq(productsTable.isActive, true)),
  });

  let totalValue = 0;
  const breakdown = [];

  for (const product of products) {
    const items = await db.query.inventoryItemsTable.findMany({
      where: eq(inventoryItemsTable.productId, product.id),
    });
    const totalQty = items.reduce((sum, i) => sum + i.availableQty, 0);
    const value = totalQty * Number(product.purchasePrice);
    totalValue += value;
    breakdown.push({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      totalQty,
      purchasePrice: product.purchasePrice,
      value,
    });
  }

  return ok(res, { totalValue, currency: "INR", breakdown });
});

// GET /api/v1/inventory
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { warehouseId, lowStock } = req.query as Record<string, string>;

  const products = await db.query.productsTable.findMany({
    where: and(eq(productsTable.companyId, auth.companyId), eq(productsTable.isActive, true)),
    limit,
    offset,
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(productsTable)
    .where(and(eq(productsTable.companyId, auth.companyId), eq(productsTable.isActive, true)));

  const result = [];
  for (const product of products) {
    const invConditions: any[] = [eq(inventoryItemsTable.productId, product.id)];
    if (warehouseId) invConditions.push(eq(inventoryItemsTable.warehouseId, warehouseId));

    const items = await db.query.inventoryItemsTable.findMany({
      where: and(...invConditions),
    });

    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalAvailable = items.reduce((sum, i) => sum + i.availableQty, 0);
    const isLowStock = totalAvailable <= product.reorderLevel;

    if (lowStock === "true" && !isLowStock) continue;

    result.push({ ...product, totalQty, totalAvailable, isLowStock, inventoryItems: items });
  }

  return paginated(res, result, { page, limit, total: Number(total) });
});

export default router;

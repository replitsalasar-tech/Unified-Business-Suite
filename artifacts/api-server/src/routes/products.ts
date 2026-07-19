import { Router } from "express";
import { db } from "@workspace/db";
import {
  categoriesTable,
  productsTable,
} from "@workspace/db";
import { eq, and, count, ilike } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/v1/products/categories
router.get("/categories", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const rows = await db.query.categoriesTable.findMany({
    where: eq(categoriesTable.companyId, auth.companyId),
    orderBy: (t, { asc }) => [asc(t.name)],
  });
  return ok(res, rows);
});

// POST /api/v1/products/categories
router.post(
  "/categories",
  requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { name, slug, parentId, description, imageUrl } = req.body;
    if (!name || !slug) {
      return fail(res, 400, "name and slug are required");
    }
    const [cat] = await db
      .insert(categoriesTable)
      .values({ companyId: auth.companyId, name, slug, parentId, description, imageUrl })
      .returning();
    return ok(res, cat, 201);
  }
);

// GET /api/v1/products
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { search, categoryId, isActive } = req.query as Record<string, string>;

  const conditions: any[] = [eq(productsTable.companyId, auth.companyId)];
  if (search) conditions.push(ilike(productsTable.name, `%${search}%`));
  if (categoryId) conditions.push(eq(productsTable.categoryId, categoryId));
  if (isActive !== undefined) conditions.push(eq(productsTable.isActive, isActive === "true"));

  const where = and(...conditions);

  const rows = await db.query.productsTable.findMany({
    where,
    limit,
    offset,
    orderBy: (t, { asc }) => [asc(t.name)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(productsTable)
    .where(where);

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// POST /api/v1/products
router.post(
  "/",
  requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const {
      sku, name, description, categoryId, unit, purchasePrice, sellingPrice,
      taxRate, reorderLevel, maxStockLevel, weight, dimensions, imageUrl,
      barcode, isActive, trackInventory,
    } = req.body;

    if (!sku || !name || purchasePrice === undefined || sellingPrice === undefined) {
      return fail(res, 400, "sku, name, purchasePrice, sellingPrice are required");
    }

    const [product] = await db
      .insert(productsTable)
      .values({
        companyId: auth.companyId,
        sku,
        name,
        description,
        categoryId,
        unit: unit ?? "PIECE",
        purchasePrice: String(purchasePrice),
        sellingPrice: String(sellingPrice),
        taxRate: taxRate !== undefined ? String(taxRate) : "0",
        reorderLevel: reorderLevel ?? 10,
        maxStockLevel,
        weight: weight !== undefined ? String(weight) : undefined,
        dimensions,
        imageUrl,
        barcode,
        isActive: isActive ?? true,
        trackInventory: trackInventory ?? true,
      })
      .returning();

    return ok(res, product, 201);
  }
);

// GET /api/v1/products/:id
router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const product = await db.query.productsTable.findFirst({
    where: and(eq(productsTable.id, req.params.id), eq(productsTable.companyId, auth.companyId)),
  });
  if (!product) return fail(res, 404, "Product not found");
  return ok(res, product);
});

// PATCH /api/v1/products/:id
router.patch(
  "/:id",
  requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const {
      sku, name, description, categoryId, unit, purchasePrice, sellingPrice,
      taxRate, reorderLevel, maxStockLevel, weight, dimensions, imageUrl,
      barcode, isActive, trackInventory,
    } = req.body;

    const [product] = await db
      .update(productsTable)
      .set({
        sku,
        name,
        description,
        categoryId,
        unit,
        purchasePrice: purchasePrice !== undefined ? String(purchasePrice) : undefined,
        sellingPrice: sellingPrice !== undefined ? String(sellingPrice) : undefined,
        taxRate: taxRate !== undefined ? String(taxRate) : undefined,
        reorderLevel,
        maxStockLevel,
        weight: weight !== undefined ? String(weight) : undefined,
        dimensions,
        imageUrl,
        barcode,
        isActive,
        trackInventory,
        updatedAt: new Date(),
      })
      .where(and(eq(productsTable.id, req.params.id), eq(productsTable.companyId, auth.companyId)))
      .returning();

    if (!product) return fail(res, 404, "Product not found");
    return ok(res, product);
  }
);

// DELETE /api/v1/products/:id — soft delete
router.delete(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const [product] = await db
      .update(productsTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(productsTable.id, req.params.id), eq(productsTable.companyId, auth.companyId)))
      .returning();
    if (!product) return fail(res, 404, "Product not found");
    return ok(res, { deleted: true, id: product.id });
  }
);

export default router;

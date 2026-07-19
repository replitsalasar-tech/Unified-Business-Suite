import { Router } from "express";
import { db } from "@workspace/db";
import {
  shipmentsTable,
  shipmentItemsTable,
  ordersTable,
  warehousesTable,
  stockMovementsTable,
} from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/v1/shipments
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { orderId, status } = req.query as Record<string, string>;

  const conditions: any[] = [eq(shipmentsTable.companyId, auth.companyId)];
  if (orderId) conditions.push(eq(shipmentsTable.orderId, orderId));
  if (status) conditions.push(eq(shipmentsTable.status, status as any));

  const where = and(...conditions);

  const rows = await db.query.shipmentsTable.findMany({
    where,
    limit,
    offset,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(shipmentsTable)
    .where(where);

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// POST /api/v1/shipments
router.post(
  "/",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { orderId, warehouseId, carrier, trackingNumber, trackingUrl, items, weight, dimensions, shippingCost, notes, estimatedArrival } = req.body;

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return fail(res, 400, "orderId and items are required");
    }

    // Verify order belongs to company
    const order = await db.query.ordersTable.findFirst({
      where: and(eq(ordersTable.id, orderId), eq(ordersTable.companyId, auth.companyId)),
    });
    if (!order) return fail(res, 404, "Order not found");
    if (order.status === "CANCELLED") return fail(res, 400, "Cannot ship a cancelled order");

    // Generate shipment number
    const [{ value: shipCount }] = await db
      .select({ value: count() })
      .from(shipmentsTable)
      .where(eq(shipmentsTable.companyId, auth.companyId));

    const year = new Date().getFullYear();
    const shipmentNumber = `SHP-${year}-${String(Number(shipCount) + 1).padStart(4, "0")}`;

    const [shipment] = await db
      .insert(shipmentsTable)
      .values({
        companyId: auth.companyId,
        shipmentNumber,
        orderId,
        warehouseId,
        status: "PENDING",
        carrier,
        trackingNumber,
        trackingUrl,
        weight: weight !== undefined ? String(weight) : undefined,
        dimensions,
        shippingCost: shippingCost !== undefined ? String(shippingCost) : undefined,
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : undefined,
        notes,
      })
      .returning();

    // Insert shipment items
    await db.insert(shipmentItemsTable).values(
      items.map((item: any) => ({
        shipmentId: shipment.id,
        productId: item.productId,
        quantity: Number(item.quantity),
      }))
    );

    return ok(res, shipment, 201);
  }
);

// GET /api/v1/shipments/:id
router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const shipment = await db.query.shipmentsTable.findFirst({
    where: and(eq(shipmentsTable.id, req.params.id), eq(shipmentsTable.companyId, auth.companyId)),
    with: {
      items: true,
    } as any,
  });
  if (!shipment) return fail(res, 404, "Shipment not found");
  return ok(res, shipment);
});

// PATCH /api/v1/shipments/:id
router.patch(
  "/:id",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { carrier, trackingNumber, trackingUrl, status, estimatedArrival, weight, shippingCost, notes } = req.body;

    const [shipment] = await db
      .update(shipmentsTable)
      .set({
        carrier,
        trackingNumber,
        trackingUrl,
        status: status as any,
        estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : undefined,
        weight: weight !== undefined ? String(weight) : undefined,
        shippingCost: shippingCost !== undefined ? String(shippingCost) : undefined,
        notes,
        updatedAt: new Date(),
      })
      .where(and(eq(shipmentsTable.id, req.params.id), eq(shipmentsTable.companyId, auth.companyId)))
      .returning();

    if (!shipment) return fail(res, 404, "Shipment not found");
    return ok(res, shipment);
  }
);

// POST /api/v1/shipments/:id/dispatch
router.post(
  "/:id/dispatch",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;

    const shipment = await db.query.shipmentsTable.findFirst({
      where: and(eq(shipmentsTable.id, req.params.id), eq(shipmentsTable.companyId, auth.companyId)),
    });
    if (!shipment) return fail(res, 404, "Shipment not found");
    if (shipment.status === "DISPATCHED" || shipment.status === "DELIVERED") {
      return fail(res, 400, `Shipment already ${shipment.status.toLowerCase()}`);
    }

    const [updated] = await db
      .update(shipmentsTable)
      .set({ status: "DISPATCHED", shippedAt: new Date(), updatedAt: new Date() })
      .where(eq(shipmentsTable.id, req.params.id))
      .returning();

    // Update order status to SHIPPED
    await db
      .update(ordersTable)
      .set({ status: "SHIPPED", updatedAt: new Date() })
      .where(and(eq(ordersTable.id, shipment.orderId), eq(ordersTable.companyId, auth.companyId)));

    // Record stock movements for items shipped
    if (shipment.warehouseId) {
      const shipmentItems = await db.query.shipmentItemsTable.findMany({
        where: eq(shipmentItemsTable.shipmentId, req.params.id),
      });
      for (const item of shipmentItems) {
        await db.insert(stockMovementsTable).values({
          companyId: auth.companyId,
          productId: item.productId,
          warehouseId: shipment.warehouseId,
          type: "SALE",
          quantity: -item.quantity,
          reference: shipment.shipmentNumber,
          notes: `Dispatched via shipment ${shipment.shipmentNumber}`,
          performedBy: auth.sub,
        });
      }
    }

    return ok(res, updated);
  }
);

// POST /api/v1/shipments/:id/deliver
router.post(
  "/:id/deliver",
  requireRole("ADMIN", "SUPER_ADMIN", "DISTRIBUTOR_ADMIN", "HR_MANAGER"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;

    const shipment = await db.query.shipmentsTable.findFirst({
      where: and(eq(shipmentsTable.id, req.params.id), eq(shipmentsTable.companyId, auth.companyId)),
    });
    if (!shipment) return fail(res, 404, "Shipment not found");
    if (shipment.status === "DELIVERED") return fail(res, 400, "Shipment already delivered");

    const now = new Date();

    const [updated] = await db
      .update(shipmentsTable)
      .set({ status: "DELIVERED", deliveredAt: now, updatedAt: now })
      .where(eq(shipmentsTable.id, req.params.id))
      .returning();

    // Update order status to DELIVERED
    await db
      .update(ordersTable)
      .set({ status: "DELIVERED", deliveredAt: now, updatedAt: now })
      .where(and(eq(ordersTable.id, shipment.orderId), eq(ordersTable.companyId, auth.companyId)));

    return ok(res, updated);
  }
);

export default router;

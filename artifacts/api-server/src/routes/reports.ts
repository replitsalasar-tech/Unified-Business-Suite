import { Router } from "express";
import { db } from "@workspace/db";
import {
  ordersTable,
  orderItemsTable,
  invoicesTable,
  productsTable,
  inventoryItemsTable,
  customersTable,
  employeesTable,
  departmentsTable,
} from "@workspace/db";
import { eq, and, count, desc, gte, lte, sql } from "drizzle-orm";
import { ok, fail } from "../lib/response";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/v1/reports/erp/sales
router.get("/erp/sales", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { from, to } = req.query as Record<string, string>;

  const conditions: any[] = [eq(ordersTable.companyId, auth.companyId)];
  if (from) conditions.push(gte(ordersTable.createdAt, new Date(from)));
  if (to) conditions.push(lte(ordersTable.createdAt, new Date(to)));

  const where = and(...conditions);

  const orders = await db.query.ordersTable.findMany({ where });

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return ok(res, { totalOrders, totalRevenue, avgOrderValue, currency: "INR" });
});

// GET /api/v1/reports/erp/inventory
router.get("/erp/inventory", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;

  const products = await db.query.productsTable.findMany({
    where: and(eq(productsTable.companyId, auth.companyId), eq(productsTable.isActive, true)),
  });

  let totalValue = 0;
  let lowStockCount = 0;

  for (const product of products) {
    const items = await db.query.inventoryItemsTable.findMany({
      where: eq(inventoryItemsTable.productId, product.id),
    });
    const totalAvailable = items.reduce((sum, i) => sum + i.availableQty, 0);
    totalValue += totalAvailable * Number(product.purchasePrice);
    if (totalAvailable <= product.reorderLevel) lowStockCount++;
  }

  return ok(res, {
    totalProducts: products.length,
    totalValue,
    lowStockCount,
    currency: "INR",
  });
});

// GET /api/v1/reports/erp/customers
router.get("/erp/customers", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;

  const customers = await db.query.customersTable.findMany({
    where: eq(customersTable.companyId, auth.companyId),
  });

  const customerTotals: { customerId: string; name: string; code: string; totalValue: number; orderCount: number }[] = [];

  for (const customer of customers) {
    const orders = await db.query.ordersTable.findMany({
      where: and(eq(ordersTable.customerId, customer.id), eq(ordersTable.companyId, auth.companyId)),
    });
    const totalValue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    customerTotals.push({
      customerId: customer.id,
      name: customer.name,
      code: customer.code,
      totalValue,
      orderCount: orders.length,
    });
  }

  customerTotals.sort((a, b) => b.totalValue - a.totalValue);
  return ok(res, customerTotals.slice(0, 10));
});

// GET /api/v1/reports/erp/revenue
router.get("/erp/revenue", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const orders = await db.query.ordersTable.findMany({
    where: and(
      eq(ordersTable.companyId, auth.companyId),
      gte(ordersTable.createdAt, twelveMonthsAgo)
    ),
  });

  // Group by month
  const monthlyMap: Record<string, { month: string; revenue: number; orderCount: number }> = {};

  for (const order of orders) {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyMap[key]) {
      monthlyMap[key] = { month: key, revenue: 0, orderCount: 0 };
    }
    monthlyMap[key].revenue += Number(order.totalAmount);
    monthlyMap[key].orderCount++;
  }

  const result = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
  return ok(res, result);
});

// GET /api/v1/reports/hr/headcount
router.get("/hr/headcount", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;

  const employees = await db.query.employeesTable.findMany({
    where: and(eq(employeesTable.companyId, auth.companyId), eq(employeesTable.status, "ACTIVE")),
  });

  const departments = await db.query.departmentsTable.findMany({
    where: eq(departmentsTable.companyId, auth.companyId),
  });

  const deptMap: Record<string, { departmentId: string; name: string; count: number }> = {};
  for (const dept of departments) {
    deptMap[dept.id] = { departmentId: dept.id, name: dept.name, count: 0 };
  }

  let unassigned = 0;
  for (const emp of employees) {
    if (emp.departmentId && deptMap[emp.departmentId]) {
      deptMap[emp.departmentId].count++;
    } else {
      unassigned++;
    }
  }

  const result = Object.values(deptMap).filter((d) => d.count > 0);
  if (unassigned > 0) result.push({ departmentId: "none", name: "Unassigned", count: unassigned });

  return ok(res, { totalActive: employees.length, byDepartment: result });
});

// GET /api/v1/reports/dashboard
router.get("/dashboard", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  // Orders this month
  const ordersThisMonth = await db.query.ordersTable.findMany({
    where: and(
      eq(ordersTable.companyId, auth.companyId),
      gte(ordersTable.createdAt, thisMonthStart)
    ),
  });

  const revenueThisMonth = ordersThisMonth.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  // Total customers
  const [{ value: totalCustomers }] = await db
    .select({ value: count() })
    .from(customersTable)
    .where(and(eq(customersTable.companyId, auth.companyId), eq(customersTable.isActive, true)));

  // Total products
  const [{ value: totalProducts }] = await db
    .select({ value: count() })
    .from(productsTable)
    .where(and(eq(productsTable.companyId, auth.companyId), eq(productsTable.isActive, true)));

  // Active employees
  const [{ value: activeEmployees }] = await db
    .select({ value: count() })
    .from(employeesTable)
    .where(and(eq(employeesTable.companyId, auth.companyId), eq(employeesTable.status, "ACTIVE")));

  // Pending invoices (SENT + PARTIAL)
  const pendingInvoices = await db.query.invoicesTable.findMany({
    where: eq(invoicesTable.companyId, auth.companyId),
  });
  const pending = pendingInvoices.filter((i) => ["SENT", "VIEWED", "PARTIAL"].includes(i.status));
  const pendingRevenue = pending.reduce((sum, i) => sum + Number(i.amountDue), 0);

  // Low stock products
  const products = await db.query.productsTable.findMany({
    where: and(eq(productsTable.companyId, auth.companyId), eq(productsTable.isActive, true), eq(productsTable.trackInventory, true)),
  });

  let lowStockCount = 0;
  for (const product of products) {
    const items = await db.query.inventoryItemsTable.findMany({
      where: eq(inventoryItemsTable.productId, product.id),
    });
    const totalAvailable = items.reduce((sum, i) => sum + i.availableQty, 0);
    if (totalAvailable <= product.reorderLevel) lowStockCount++;
  }

  return ok(res, {
    erp: {
      ordersThisMonth: ordersThisMonth.length,
      revenueThisMonth,
      totalCustomers: Number(totalCustomers),
      totalProducts: Number(totalProducts),
      pendingInvoicesCount: pending.length,
      pendingRevenue,
      lowStockCount,
    },
    hr: {
      activeEmployees: Number(activeEmployees),
    },
    currency: "INR",
  });
});

export default router;

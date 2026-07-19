import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { companiesTable } from "./companies";
import { productsTable, warehousesTable } from "./erp-products";

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const suppliersTable = pgTable("suppliers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // SUP-0001
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: jsonb("address"),
  taxId: text("tax_id"),
  paymentTerms: integer("payment_terms").notNull().default(30), // days
  currency: text("currency").notNull().default("INR"),
  rating: numeric("rating", { precision: 3, scale: 2 }), // 0–5
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Supplier Products ─────────────────────────────────────────────────────────

export const supplierProductsTable = pgTable("supplier_products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliersTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  supplierSku: text("supplier_sku"),
  costPrice: numeric("cost_price", { precision: 15, scale: 2 }).notNull(),
  leadTimeDays: integer("lead_time_days").notNull().default(7),
  minOrderQty: integer("min_order_qty").notNull().default(1),
  isPreferred: boolean("is_preferred").notNull().default(false),
});

// ── Purchase Orders ───────────────────────────────────────────────────────────

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  poNumber: text("po_number").notNull(), // PO-2025-0001
  supplierId: text("supplier_id")
    .notNull()
    .references(() => suppliersTable.id, { onDelete: "restrict" }),
  warehouseId: text("warehouse_id").references(() => warehousesTable.id, {
    onDelete: "set null",
  }),
  status: text("status").notNull().default("DRAFT"), // DRAFT, SENT, CONFIRMED, RECEIVED, CANCELLED
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  currency: text("currency").notNull().default("INR"),
  expectedDate: timestamp("expected_date"),
  receivedDate: timestamp("received_date"),
  notes: text("notes"),
  createdBy: text("created_by"), // user id
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Purchase Order Items ──────────────────────────────────────────────────────

export const purchaseOrderItemsTable = pgTable("purchase_order_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  purchaseOrderId: text("purchase_order_id")
    .notNull()
    .references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 15, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 15, scale: 2 }).notNull(),
  receivedQty: integer("received_qty").notNull().default(0),
});

// ── Type exports ──────────────────────────────────────────────────────────────

export type Supplier = typeof suppliersTable.$inferSelect;
export type InsertSupplier = typeof suppliersTable.$inferInsert;
export type SupplierProduct = typeof supplierProductsTable.$inferSelect;
export type InsertSupplierProduct = typeof supplierProductsTable.$inferInsert;
export type PurchaseOrder = typeof purchaseOrdersTable.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrdersTable.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItemsTable.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItemsTable.$inferInsert;

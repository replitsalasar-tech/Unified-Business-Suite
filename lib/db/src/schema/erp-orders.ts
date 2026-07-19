import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { companiesTable } from "./companies";
import { productsTable, warehousesTable } from "./erp-products";
import { customersTable } from "./erp-customers";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const orderStatusEnum = pgEnum("order_status", [
  "DRAFT",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "REFUNDED",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "SENT",
  "VIEWED",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "PENDING",
  "PACKED",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "RETURNED",
]);

// ── Orders ────────────────────────────────────────────────────────────────────

export const ordersTable = pgTable("orders", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  orderNumber: text("order_number").notNull(), // ORD-2025-0001
  customerId: text("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "restrict" }),
  status: orderStatusEnum("status").notNull().default("DRAFT"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull().default("0"),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  shippingCost: numeric("shipping_cost", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("INR"),
  shippingAddress: jsonb("shipping_address"),
  billingAddress: jsonb("billing_address"),
  notes: text("notes"),
  expectedDate: timestamp("expected_date"),
  deliveredAt: timestamp("delivered_at"),
  createdBy: text("created_by"), // user id
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Order Items ───────────────────────────────────────────────────────────────

export const orderItemsTable = pgTable("order_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  orderId: text("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"), // percentage
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  lineTotal: numeric("line_total", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
});

// ── Invoices ──────────────────────────────────────────────────────────────────

export const invoicesTable = pgTable("invoices", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull(), // INV-2025-0001
  orderId: text("order_id").references(() => ordersTable.id, {
    onDelete: "set null",
  }),
  customerId: text("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "restrict" }),
  status: invoiceStatusEnum("status").notNull().default("DRAFT"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  discountAmount: numeric("discount_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 15, scale: 2 }).notNull().default("0"),
  amountDue: numeric("amount_due", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  dueDate: timestamp("due_date").notNull(),
  issuedDate: timestamp("issued_date").notNull().defaultNow(),
  paidDate: timestamp("paid_date"),
  notes: text("notes"),
  termsAndConditions: text("terms_and_conditions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Payments ──────────────────────────────────────────────────────────────────

export const paymentsTable = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  invoiceId: text("invoice_id").references(() => invoicesTable.id, {
    onDelete: "set null",
  }),
  orderId: text("order_id").references(() => ordersTable.id, {
    onDelete: "set null",
  }),
  customerId: text("customer_id").references(() => customersTable.id, {
    onDelete: "set null",
  }),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  method: text("method").notNull(), // CASH, BANK_TRANSFER, CHEQUE, CARD, UPI
  reference: text("reference"), // bank ref, cheque number, transaction id
  paidAt: timestamp("paid_at").notNull().defaultNow(),
  notes: text("notes"),
  createdBy: text("created_by"), // user id
});

// ── Shipments ─────────────────────────────────────────────────────────────────

export const shipmentsTable = pgTable("shipments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  shipmentNumber: text("shipment_number").notNull(), // SHP-2025-0001
  orderId: text("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "restrict" }),
  warehouseId: text("warehouse_id").references(() => warehousesTable.id, {
    onDelete: "set null",
  }),
  status: shipmentStatusEnum("status").notNull().default("PENDING"),
  carrier: text("carrier"), // FedEx, Delhivery, etc.
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  shippedAt: timestamp("shipped_at"),
  estimatedArrival: timestamp("estimated_arrival"),
  deliveredAt: timestamp("delivered_at"),
  weight: numeric("weight", { precision: 10, scale: 3 }),
  dimensions: jsonb("dimensions"),
  shippingCost: numeric("shipping_cost", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Shipment Items ────────────────────────────────────────────────────────────

export const shipmentItemsTable = pgTable("shipment_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  shipmentId: text("shipment_id")
    .notNull()
    .references(() => shipmentsTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
});

// ── Type exports ──────────────────────────────────────────────────────────────

export type Order = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type InsertOrderItem = typeof orderItemsTable.$inferInsert;
export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertInvoice = typeof invoicesTable.$inferInsert;
export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
export type Shipment = typeof shipmentsTable.$inferSelect;
export type InsertShipment = typeof shipmentsTable.$inferInsert;
export type ShipmentItem = typeof shipmentItemsTable.$inferSelect;
export type InsertShipmentItem = typeof shipmentItemsTable.$inferInsert;

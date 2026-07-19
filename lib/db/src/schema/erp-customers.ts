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
import { productsTable } from "./erp-products";

// ── Customers ─────────────────────────────────────────────────────────────────

export const customersTable = pgTable("customers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // CUST-0001
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: jsonb("address"),
  billingAddress: jsonb("billing_address"),
  shippingAddress: jsonb("shipping_address"),
  taxId: text("tax_id"),
  paymentTerms: integer("payment_terms").notNull().default(30), // days
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("INR"),
  priceListId: text("price_list_id"), // FK added after priceListsTable
  salesRepId: text("sales_rep_id"), // user id
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Customer Contacts ─────────────────────────────────────────────────────────

export const customerContactsTable = pgTable("customer_contacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"), // CEO, Purchase Manager, etc.
  isPrimary: boolean("is_primary").notNull().default(false),
});

// ── Customer Activities ───────────────────────────────────────────────────────

export const customerActivitiesTable = pgTable("customer_activities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // CALL, EMAIL, MEETING, NOTE, DEMO
  subject: text("subject").notNull(),
  notes: text("notes"),
  outcome: text("outcome"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  userId: text("user_id"), // who performed the activity
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Price Lists ───────────────────────────────────────────────────────────────

export const priceListsTable = pgTable("price_lists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("INR"),
  discount: numeric("discount", { precision: 5, scale: 2 }).notNull().default("0"), // % off standard price
  isDefault: boolean("is_default").notNull().default(false),
  validFrom: timestamp("valid_from"),
  validTo: timestamp("valid_to"),
});

// ── Price List Items ──────────────────────────────────────────────────────────

export const priceListItemsTable = pgTable("price_list_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  priceListId: text("price_list_id")
    .notNull()
    .references(() => priceListsTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 15, scale: 2 }).notNull(), // override price
});

// ── Type exports ──────────────────────────────────────────────────────────────

export type Customer = typeof customersTable.$inferSelect;
export type InsertCustomer = typeof customersTable.$inferInsert;
export type CustomerContact = typeof customerContactsTable.$inferSelect;
export type InsertCustomerContact = typeof customerContactsTable.$inferInsert;
export type CustomerActivity = typeof customerActivitiesTable.$inferSelect;
export type InsertCustomerActivity = typeof customerActivitiesTable.$inferInsert;
export type PriceList = typeof priceListsTable.$inferSelect;
export type InsertPriceList = typeof priceListsTable.$inferInsert;
export type PriceListItem = typeof priceListItemsTable.$inferSelect;
export type InsertPriceListItem = typeof priceListItemsTable.$inferInsert;

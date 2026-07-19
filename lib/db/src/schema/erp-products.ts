import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  integer,
  jsonb,
  pgEnum,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { companiesTable } from "./companies";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "PURCHASE",
  "SALE",
  "RETURN",
  "ADJUSTMENT",
  "TRANSFER",
  "DAMAGE",
]);

// ── Categories ────────────────────────────────────────────────────────────────

export const categoriesTable = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  parentId: text("parent_id"), // self-reference, no FK to avoid circular
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Products ──────────────────────────────────────────────────────────────────

export const productsTable = pgTable("products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: text("category_id").references(() => categoriesTable.id, {
    onDelete: "set null",
  }),
  unit: text("unit").notNull().default("PIECE"), // PIECE, KG, LITRE, BOX
  purchasePrice: numeric("purchase_price", { precision: 15, scale: 2 }).notNull(),
  sellingPrice: numeric("selling_price", { precision: 15, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  reorderLevel: integer("reorder_level").notNull().default(10),
  maxStockLevel: integer("max_stock_level"),
  weight: numeric("weight", { precision: 10, scale: 3 }),
  dimensions: jsonb("dimensions"), // {l, w, h, unit}
  imageUrl: text("image_url"),
  barcode: text("barcode"),
  isActive: boolean("is_active").notNull().default(true),
  trackInventory: boolean("track_inventory").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Warehouses ────────────────────────────────────────────────────────────────

export const warehousesTable = pgTable("warehouses", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  address: jsonb("address"),
  isDefault: boolean("is_default").notNull().default(false),
  managerId: text("manager_id"), // user id
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Inventory Items ───────────────────────────────────────────────────────────

export const inventoryItemsTable = pgTable("inventory_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehousesTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(0),
  reservedQty: integer("reserved_qty").notNull().default(0),
  availableQty: integer("available_qty").notNull().default(0),
  batchNumber: text("batch_number"),
  expiryDate: date("expiry_date"),
  locationCode: text("location_code"), // bin/rack in warehouse
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Stock Movements ───────────────────────────────────────────────────────────

export const stockMovementsTable = pgTable("stock_movements", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "restrict" }),
  warehouseId: text("warehouse_id")
    .notNull()
    .references(() => warehousesTable.id, { onDelete: "restrict" }),
  type: stockMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(), // positive for IN, negative for OUT
  reference: text("reference"), // order number, PO number, etc.
  notes: text("notes"),
  performedBy: text("performed_by"), // user id
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Type exports ──────────────────────────────────────────────────────────────

export type Category = typeof categoriesTable.$inferSelect;
export type InsertCategory = typeof categoriesTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
export type Warehouse = typeof warehousesTable.$inferSelect;
export type InsertWarehouse = typeof warehousesTable.$inferInsert;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
export type InsertInventoryItem = typeof inventoryItemsTable.$inferInsert;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
export type InsertStockMovement = typeof stockMovementsTable.$inferInsert;

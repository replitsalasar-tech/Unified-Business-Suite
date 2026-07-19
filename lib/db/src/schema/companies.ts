import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const companyPlanEnum = pgEnum("company_plan", [
  "TRIAL",
  "STARTER",
  "GROWTH",
  "ENTERPRISE",
]);

export const companiesTable = pgTable("companies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: companyPlanEnum("plan").notNull().default("TRIAL"),
  /** Month number 1-12. India default: 4 (April) */
  fiscalYearStart: integer("fiscal_year_start").notNull().default(4),
  currency: text("currency").notNull().default("INR"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  logoUrl: text("logo_url"),
  address: text("address"),
  phone: text("phone"),
  website: text("website"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Company = typeof companiesTable.$inferSelect;
export type InsertCompany = typeof companiesTable.$inferInsert;

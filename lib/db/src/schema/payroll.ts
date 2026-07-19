import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";

export const payrollStatusEnum = pgEnum("payroll_status", [
  "DRAFT",
  "PROCESSING",
  "APPROVED",
  "PAID",
  "CANCELLED",
]);

export const payPeriodsTable = pgTable("pay_periods", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "January 2025"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  payDate: date("pay_date").notNull(),
  status: payrollStatusEnum("status").notNull().default("DRAFT"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const salaryComponentsTable = pgTable("salary_components", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Basic Pay", "HRA", "Income Tax"
  code: text("code").notNull(), // BASIC, HRA, TRANSPORT, PF, TDS
  type: text("type").notNull().default("EARNING"), // EARNING | DEDUCTION
  isFixed: boolean("is_fixed").notNull().default(true),
  isTaxable: boolean("is_taxable").notNull().default(true),
  formula: text("formula"), // e.g. "baseSalary * 0.40" for HRA
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payslipsTable = pgTable("payslips", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employeesTable.id),
  payPeriodId: text("pay_period_id")
    .notNull()
    .references(() => payPeriodsTable.id, { onDelete: "cascade" }),
  grossEarnings: numeric("gross_earnings", { precision: 15, scale: 2 }).notNull(),
  totalDeductions: numeric("total_deductions", { precision: 15, scale: 2 }).notNull(),
  netPay: numeric("net_pay", { precision: 15, scale: 2 }).notNull(),
  status: payrollStatusEnum("status").notNull().default("DRAFT"),
  paidAt: timestamp("paid_at"),
  paymentMethod: text("payment_method"), // BANK_TRANSFER, CHEQUE, CASH
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payslipLinesTable = pgTable("payslip_lines", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  payslipId: text("payslip_id")
    .notNull()
    .references(() => payslipsTable.id, { onDelete: "cascade" }),
  componentId: text("component_id")
    .notNull()
    .references(() => salaryComponentsTable.id),
  label: text("label").notNull(),
  type: text("type").notNull(), // EARNING | DEDUCTION
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
});

export type PayPeriod = typeof payPeriodsTable.$inferSelect;
export type InsertPayPeriod = typeof payPeriodsTable.$inferInsert;
export type SalaryComponent = typeof salaryComponentsTable.$inferSelect;
export type InsertSalaryComponent = typeof salaryComponentsTable.$inferInsert;
export type Payslip = typeof payslipsTable.$inferSelect;
export type InsertPayslip = typeof payslipsTable.$inferInsert;
export type PayslipLine = typeof payslipLinesTable.$inferSelect;

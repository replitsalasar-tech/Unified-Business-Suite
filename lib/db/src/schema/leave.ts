import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";

export const leaveTypeEnum = pgEnum("leave_type", [
  "ANNUAL",
  "SICK",
  "CASUAL",
  "MATERNITY",
  "PATERNITY",
  "BEREAVEMENT",
  "UNPAID",
  "COMPENSATORY",
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
]);

export const accrualMethodEnum = pgEnum("accrual_method", [
  "UPFRONT",
  "MONTHLY",
  "QUARTERLY",
]);

export const leavePoliciesTable = pgTable("leave_policies", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: leaveTypeEnum("type").notNull(),
  daysPerYear: integer("days_per_year").notNull(),
  carryForward: boolean("carry_forward").notNull().default(false),
  maxCarryForward: integer("max_carry_forward").notNull().default(0),
  accrualMethod: accrualMethodEnum("accrual_method")
    .notNull()
    .default("UPFRONT"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leaveBalancesTable = pgTable("leave_balances", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  policyId: text("policy_id")
    .notNull()
    .references(() => leavePoliciesTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  allocated: numeric("allocated", { precision: 6, scale: 1 }).notNull(),
  used: numeric("used", { precision: 6, scale: 1 }).notNull().default("0"),
  pending: numeric("pending", { precision: 6, scale: 1 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leaveRequestsTable = pgTable("leave_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  policyId: text("policy_id")
    .notNull()
    .references(() => leavePoliciesTable.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  days: numeric("days", { precision: 6, scale: 1 }).notNull(),
  type: leaveTypeEnum("type").notNull(),
  reason: text("reason"),
  status: leaveStatusEnum("status").notNull().default("PENDING"),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type LeavePolicy = typeof leavePoliciesTable.$inferSelect;
export type LeaveBalance = typeof leaveBalancesTable.$inferSelect;
export type LeaveRequest = typeof leaveRequestsTable.$inferSelect;
export type InsertLeaveRequest = typeof leaveRequestsTable.$inferInsert;

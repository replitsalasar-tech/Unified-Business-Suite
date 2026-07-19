import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "ON_LEAVE",
  "HOLIDAY",
  "WEEKEND",
]);

export const attendanceSourceEnum = pgEnum("attendance_source", [
  "MANUAL",
  "BIOMETRIC",
  "MOBILE",
  "WEB",
]);

export const attendanceTable = pgTable("attendance", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employeesTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  status: attendanceStatusEnum("status").notNull().default("PRESENT"),
  notes: text("notes"),
  source: attendanceSourceEnum("source").notNull().default("MANUAL"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const holidaysTable = pgTable("holidays", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  date: date("date").notNull(),
  type: text("type").notNull().default("NATIONAL"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Attendance = typeof attendanceTable.$inferSelect;
export type InsertAttendance = typeof attendanceTable.$inferInsert;
export type Holiday = typeof holidaysTable.$inferSelect;

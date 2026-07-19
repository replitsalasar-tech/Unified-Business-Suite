import {
  pgTable,
  text,
  timestamp,
  numeric,
  jsonb,
  pgEnum,
  date,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { companiesTable } from "./companies";
import { departmentsTable } from "./departments";
import { jobTitlesTable } from "./jobTitles";
import { usersTable } from "./users";

export const employeeStatusEnum = pgEnum("employee_status", [
  "ACTIVE",
  "PROBATION",
  "ON_LEAVE",
  "SUSPENDED",
  "TERMINATED",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERN",
  "CONSULTANT",
]);

export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER"]);

export const employeesTable = pgTable("employees", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  employeeCode: text("employee_code").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  gender: genderEnum("gender"),
  dateOfBirth: date("date_of_birth"),
  departmentId: text("department_id")
    .notNull()
    .references(() => departmentsTable.id),
  jobTitleId: text("job_title_id")
    .notNull()
    .references(() => jobTitlesTable.id),
  managerId: text("manager_id"),
  status: employeeStatusEnum("status").notNull().default("ACTIVE"),
  employmentType: employmentTypeEnum("employment_type")
    .notNull()
    .default("FULL_TIME"),
  hireDate: date("hire_date").notNull(),
  probationEndDate: date("probation_end_date"),
  terminationDate: date("termination_date"),
  baseSalary: numeric("base_salary", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  address: jsonb("address"),
  emergencyContact: jsonb("emergency_contact"),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Employee = typeof employeesTable.$inferSelect;
export type InsertEmployee = typeof employeesTable.$inferInsert;

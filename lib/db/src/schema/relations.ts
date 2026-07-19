import { relations } from "drizzle-orm";
import { companiesTable } from "./companies";
import { usersTable } from "./users";
import { refreshTokensTable, passwordResetsTable } from "./auth";
import { departmentsTable } from "./departments";
import { jobTitlesTable } from "./jobTitles";
import { employeesTable } from "./employees";
import { attendanceTable } from "./attendance";
import {
  leavePoliciesTable,
  leaveBalancesTable,
  leaveRequestsTable,
} from "./leave";

export const companiesRelations = relations(companiesTable, ({ many }) => ({
  users: many(usersTable),
  employees: many(employeesTable),
  departments: many(departmentsTable),
  jobTitles: many(jobTitlesTable),
}));

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [usersTable.companyId],
    references: [companiesTable.id],
  }),
  refreshTokens: many(refreshTokensTable),
}));

export const refreshTokensRelations = relations(refreshTokensTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [refreshTokensTable.userId],
    references: [usersTable.id],
  }),
}));

export const departmentsRelations = relations(departmentsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [departmentsTable.companyId],
    references: [companiesTable.id],
  }),
  employees: many(employeesTable),
}));

export const jobTitlesRelations = relations(jobTitlesTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [jobTitlesTable.companyId],
    references: [companiesTable.id],
  }),
  employees: many(employeesTable),
}));

export const employeesRelations = relations(employeesTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [employeesTable.companyId],
    references: [companiesTable.id],
  }),
  user: one(usersTable, {
    fields: [employeesTable.userId],
    references: [usersTable.id],
  }),
  department: one(departmentsTable, {
    fields: [employeesTable.departmentId],
    references: [departmentsTable.id],
  }),
  jobTitle: one(jobTitlesTable, {
    fields: [employeesTable.jobTitleId],
    references: [jobTitlesTable.id],
  }),
  attendance: many(attendanceTable),
  leaveRequests: many(leaveRequestsTable),
  leaveBalances: many(leaveBalancesTable),
}));

export const attendanceRelations = relations(attendanceTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [attendanceTable.companyId],
    references: [companiesTable.id],
  }),
  employee: one(employeesTable, {
    fields: [attendanceTable.employeeId],
    references: [employeesTable.id],
  }),
}));

export const leavePoliciesRelations = relations(leavePoliciesTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [leavePoliciesTable.companyId],
    references: [companiesTable.id],
  }),
  balances: many(leaveBalancesTable),
  requests: many(leaveRequestsTable),
}));

export const leaveBalancesRelations = relations(leaveBalancesTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [leaveBalancesTable.companyId],
    references: [companiesTable.id],
  }),
  employee: one(employeesTable, {
    fields: [leaveBalancesTable.employeeId],
    references: [employeesTable.id],
  }),
  policy: one(leavePoliciesTable, {
    fields: [leaveBalancesTable.policyId],
    references: [leavePoliciesTable.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequestsTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [leaveRequestsTable.companyId],
    references: [companiesTable.id],
  }),
  employee: one(employeesTable, {
    fields: [leaveRequestsTable.employeeId],
    references: [employeesTable.id],
  }),
  policy: one(leavePoliciesTable, {
    fields: [leaveRequestsTable.policyId],
    references: [leavePoliciesTable.id],
  }),
}));

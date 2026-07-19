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
import {
  payPeriodsTable,
  salaryComponentsTable,
  payslipsTable,
  payslipLinesTable,
} from "./payroll";
import { reviewCyclesTable, performanceReviewsTable } from "./performance";
import { jobsTable, applicationsTable, interviewsTable } from "./recruitment";

export const companiesRelations = relations(companiesTable, ({ many }) => ({
  users: many(usersTable),
  employees: many(employeesTable),
  departments: many(departmentsTable),
  jobTitles: many(jobTitlesTable),
  payPeriods: many(payPeriodsTable),
  salaryComponents: many(salaryComponentsTable),
  reviewCycles: many(reviewCyclesTable),
  jobs: many(jobsTable),
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
  jobs: many(jobsTable),
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
  payslips: many(payslipsTable),
  reviewsAsEmployee: many(performanceReviewsTable, { relationName: "reviewedEmployee" }),
  reviewsAsReviewer: many(performanceReviewsTable, { relationName: "reviewer" }),
  jobsAsHiringManager: many(jobsTable),
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

// ── Payroll Relations ─────────────────────────────────────────────────────────

export const payPeriodsRelations = relations(payPeriodsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [payPeriodsTable.companyId],
    references: [companiesTable.id],
  }),
  payslips: many(payslipsTable),
}));

export const salaryComponentsRelations = relations(salaryComponentsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [salaryComponentsTable.companyId],
    references: [companiesTable.id],
  }),
  payslipLines: many(payslipLinesTable),
}));

export const payslipsRelations = relations(payslipsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [payslipsTable.companyId],
    references: [companiesTable.id],
  }),
  employee: one(employeesTable, {
    fields: [payslipsTable.employeeId],
    references: [employeesTable.id],
  }),
  period: one(payPeriodsTable, {
    fields: [payslipsTable.payPeriodId],
    references: [payPeriodsTable.id],
  }),
  lines: many(payslipLinesTable),
}));

export const payslipLinesRelations = relations(payslipLinesTable, ({ one }) => ({
  payslip: one(payslipsTable, {
    fields: [payslipLinesTable.payslipId],
    references: [payslipsTable.id],
  }),
  component: one(salaryComponentsTable, {
    fields: [payslipLinesTable.componentId],
    references: [salaryComponentsTable.id],
  }),
}));

// ── Performance Relations ─────────────────────────────────────────────────────

export const reviewCyclesRelations = relations(reviewCyclesTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [reviewCyclesTable.companyId],
    references: [companiesTable.id],
  }),
  reviews: many(performanceReviewsTable),
}));

export const performanceReviewsRelations = relations(performanceReviewsTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [performanceReviewsTable.companyId],
    references: [companiesTable.id],
  }),
  cycle: one(reviewCyclesTable, {
    fields: [performanceReviewsTable.cycleId],
    references: [reviewCyclesTable.id],
  }),
  employee: one(employeesTable, {
    fields: [performanceReviewsTable.employeeId],
    references: [employeesTable.id],
    relationName: "reviewedEmployee",
  }),
  reviewer: one(employeesTable, {
    fields: [performanceReviewsTable.reviewerId],
    references: [employeesTable.id],
    relationName: "reviewer",
  }),
}));

// ── Recruitment Relations ─────────────────────────────────────────────────────

export const jobsRelations = relations(jobsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [jobsTable.companyId],
    references: [companiesTable.id],
  }),
  department: one(departmentsTable, {
    fields: [jobsTable.departmentId],
    references: [departmentsTable.id],
  }),
  hiringManager: one(employeesTable, {
    fields: [jobsTable.hiringManagerId],
    references: [employeesTable.id],
  }),
  applications: many(applicationsTable),
}));

export const applicationsRelations = relations(applicationsTable, ({ one, many }) => ({
  job: one(jobsTable, {
    fields: [applicationsTable.jobId],
    references: [jobsTable.id],
  }),
  interviews: many(interviewsTable),
}));

export const interviewsRelations = relations(interviewsTable, ({ one }) => ({
  application: one(applicationsTable, {
    fields: [interviewsTable.applicationId],
    references: [applicationsTable.id],
  }),
}));

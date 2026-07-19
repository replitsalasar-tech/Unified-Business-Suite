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
// Phase 3 — ERP
import {
  categoriesTable,
  productsTable,
  warehousesTable,
  inventoryItemsTable,
  stockMovementsTable,
} from "./erp-products";
import {
  suppliersTable,
  supplierProductsTable,
  purchaseOrdersTable,
  purchaseOrderItemsTable,
} from "./erp-suppliers";
import {
  customersTable,
  customerContactsTable,
  customerActivitiesTable,
  priceListsTable,
  priceListItemsTable,
} from "./erp-customers";
import {
  ordersTable,
  orderItemsTable,
  invoicesTable,
  paymentsTable,
  shipmentsTable,
  shipmentItemsTable,
} from "./erp-orders";

// ── HRM Relations ─────────────────────────────────────────────────────────────

export const companiesRelations = relations(companiesTable, ({ many }) => ({
  users: many(usersTable),
  employees: many(employeesTable),
  departments: many(departmentsTable),
  jobTitles: many(jobTitlesTable),
  payPeriods: many(payPeriodsTable),
  salaryComponents: many(salaryComponentsTable),
  reviewCycles: many(reviewCyclesTable),
  jobs: many(jobsTable),
  // ERP
  categories: many(categoriesTable),
  products: many(productsTable),
  warehouses: many(warehousesTable),
  suppliers: many(suppliersTable),
  purchaseOrders: many(purchaseOrdersTable),
  customers: many(customersTable),
  orders: many(ordersTable),
  invoices: many(invoicesTable),
  payments: many(paymentsTable),
  shipments: many(shipmentsTable),
  priceLists: many(priceListsTable),
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

// ── ERP: Products & Inventory Relations ──────────────────────────────────────

export const categoriesRelations = relations(categoriesTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [categoriesTable.companyId],
    references: [companiesTable.id],
  }),
  products: many(productsTable),
}));

export const productsRelations = relations(productsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [productsTable.companyId],
    references: [companiesTable.id],
  }),
  category: one(categoriesTable, {
    fields: [productsTable.categoryId],
    references: [categoriesTable.id],
  }),
  inventoryItems: many(inventoryItemsTable),
  stockMovements: many(stockMovementsTable),
  orderItems: many(orderItemsTable),
  supplierProducts: many(supplierProductsTable),
  purchaseOrderItems: many(purchaseOrderItemsTable),
  shipmentItems: many(shipmentItemsTable),
  priceListItems: many(priceListItemsTable),
}));

export const warehousesRelations = relations(warehousesTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [warehousesTable.companyId],
    references: [companiesTable.id],
  }),
  inventoryItems: many(inventoryItemsTable),
  stockMovements: many(stockMovementsTable),
  purchaseOrders: many(purchaseOrdersTable),
  shipments: many(shipmentsTable),
}));

export const inventoryItemsRelations = relations(inventoryItemsTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [inventoryItemsTable.productId],
    references: [productsTable.id],
  }),
  warehouse: one(warehousesTable, {
    fields: [inventoryItemsTable.warehouseId],
    references: [warehousesTable.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovementsTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [stockMovementsTable.companyId],
    references: [companiesTable.id],
  }),
  product: one(productsTable, {
    fields: [stockMovementsTable.productId],
    references: [productsTable.id],
  }),
  warehouse: one(warehousesTable, {
    fields: [stockMovementsTable.warehouseId],
    references: [warehousesTable.id],
  }),
}));

// ── ERP: Suppliers Relations ──────────────────────────────────────────────────

export const suppliersRelations = relations(suppliersTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [suppliersTable.companyId],
    references: [companiesTable.id],
  }),
  supplierProducts: many(supplierProductsTable),
  purchaseOrders: many(purchaseOrdersTable),
}));

export const supplierProductsRelations = relations(supplierProductsTable, ({ one }) => ({
  supplier: one(suppliersTable, {
    fields: [supplierProductsTable.supplierId],
    references: [suppliersTable.id],
  }),
  product: one(productsTable, {
    fields: [supplierProductsTable.productId],
    references: [productsTable.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrdersTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [purchaseOrdersTable.companyId],
    references: [companiesTable.id],
  }),
  supplier: one(suppliersTable, {
    fields: [purchaseOrdersTable.supplierId],
    references: [suppliersTable.id],
  }),
  warehouse: one(warehousesTable, {
    fields: [purchaseOrdersTable.warehouseId],
    references: [warehousesTable.id],
  }),
  items: many(purchaseOrderItemsTable),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItemsTable, ({ one }) => ({
  purchaseOrder: one(purchaseOrdersTable, {
    fields: [purchaseOrderItemsTable.purchaseOrderId],
    references: [purchaseOrdersTable.id],
  }),
  product: one(productsTable, {
    fields: [purchaseOrderItemsTable.productId],
    references: [productsTable.id],
  }),
}));

// ── ERP: Customers Relations ──────────────────────────────────────────────────

export const customersRelations = relations(customersTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [customersTable.companyId],
    references: [companiesTable.id],
  }),
  contacts: many(customerContactsTable),
  activities: many(customerActivitiesTable),
  orders: many(ordersTable),
  invoices: many(invoicesTable),
  payments: many(paymentsTable),
}));

export const customerContactsRelations = relations(customerContactsTable, ({ one }) => ({
  customer: one(customersTable, {
    fields: [customerContactsTable.customerId],
    references: [customersTable.id],
  }),
}));

export const customerActivitiesRelations = relations(customerActivitiesTable, ({ one }) => ({
  customer: one(customersTable, {
    fields: [customerActivitiesTable.customerId],
    references: [customersTable.id],
  }),
}));

export const priceListsRelations = relations(priceListsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [priceListsTable.companyId],
    references: [companiesTable.id],
  }),
  items: many(priceListItemsTable),
}));

export const priceListItemsRelations = relations(priceListItemsTable, ({ one }) => ({
  priceList: one(priceListsTable, {
    fields: [priceListItemsTable.priceListId],
    references: [priceListsTable.id],
  }),
  product: one(productsTable, {
    fields: [priceListItemsTable.productId],
    references: [productsTable.id],
  }),
}));

// ── ERP: Orders Relations ─────────────────────────────────────────────────────

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [ordersTable.companyId],
    references: [companiesTable.id],
  }),
  customer: one(customersTable, {
    fields: [ordersTable.customerId],
    references: [customersTable.id],
  }),
  items: many(orderItemsTable),
  invoices: many(invoicesTable),
  shipments: many(shipmentsTable),
  payments: many(paymentsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.orderId],
    references: [ordersTable.id],
  }),
  product: one(productsTable, {
    fields: [orderItemsTable.productId],
    references: [productsTable.id],
  }),
}));

export const invoicesRelations = relations(invoicesTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [invoicesTable.companyId],
    references: [companiesTable.id],
  }),
  order: one(ordersTable, {
    fields: [invoicesTable.orderId],
    references: [ordersTable.id],
  }),
  customer: one(customersTable, {
    fields: [invoicesTable.customerId],
    references: [customersTable.id],
  }),
  payments: many(paymentsTable),
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [paymentsTable.companyId],
    references: [companiesTable.id],
  }),
  invoice: one(invoicesTable, {
    fields: [paymentsTable.invoiceId],
    references: [invoicesTable.id],
  }),
  order: one(ordersTable, {
    fields: [paymentsTable.orderId],
    references: [ordersTable.id],
  }),
  customer: one(customersTable, {
    fields: [paymentsTable.customerId],
    references: [customersTable.id],
  }),
}));

export const shipmentsRelations = relations(shipmentsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [shipmentsTable.companyId],
    references: [companiesTable.id],
  }),
  order: one(ordersTable, {
    fields: [shipmentsTable.orderId],
    references: [ordersTable.id],
  }),
  warehouse: one(warehousesTable, {
    fields: [shipmentsTable.warehouseId],
    references: [warehousesTable.id],
  }),
  items: many(shipmentItemsTable),
}));

export const shipmentItemsRelations = relations(shipmentItemsTable, ({ one }) => ({
  shipment: one(shipmentsTable, {
    fields: [shipmentItemsTable.shipmentId],
    references: [shipmentsTable.id],
  }),
  product: one(productsTable, {
    fields: [shipmentItemsTable.productId],
    references: [productsTable.id],
  }),
}));

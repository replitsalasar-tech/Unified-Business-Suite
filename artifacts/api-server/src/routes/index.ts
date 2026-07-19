import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import companiesRouter from "./companies";
import departmentsRouter from "./departments";
import jobTitlesRouter from "./jobTitles";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import leaveRouter from "./leave";
import dashboardRouter from "./dashboard";
import payrollRouter from "./payroll";
import performanceRouter from "./performance";
import recruitmentRouter from "./recruitment";
import productsRouter from "./products";
import inventoryRouter from "./inventory";
import suppliersRouter from "./suppliers";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import invoicesRouter from "./invoices";
import shipmentsRouter from "./shipments";
import reportsRouter from "./reports";

const router: IRouter = Router();

// Health check lives at /api/healthz (no versioning)
router.use(healthRouter);

// Versioned API routes — all under /api/v1/...
router.use("/v1/auth", authRouter);
router.use("/v1/companies", companiesRouter);
router.use("/v1/departments", departmentsRouter);
router.use("/v1/job-titles", jobTitlesRouter);
router.use("/v1/employees", employeesRouter);
router.use("/v1/attendance", attendanceRouter);
router.use("/v1/leave", leaveRouter);
router.use("/v1/dashboard", dashboardRouter);
router.use("/v1/payroll", payrollRouter);
router.use("/v1/performance", performanceRouter);
router.use("/v1/recruitment", recruitmentRouter);
router.use("/v1/products", productsRouter);
router.use("/v1/inventory", inventoryRouter);
router.use("/v1/suppliers", suppliersRouter);
router.use("/v1/customers", customersRouter);
router.use("/v1/orders", ordersRouter);
router.use("/v1/invoices", invoicesRouter);
router.use("/v1/shipments", shipmentsRouter);
router.use("/v1/reports", reportsRouter);

export default router;

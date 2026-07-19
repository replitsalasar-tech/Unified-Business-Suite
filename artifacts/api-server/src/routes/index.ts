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

export default router;

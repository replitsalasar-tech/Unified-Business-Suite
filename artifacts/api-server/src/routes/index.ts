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

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/companies", companiesRouter);
router.use("/departments", departmentsRouter);
router.use("/job-titles", jobTitlesRouter);
router.use("/employees", employeesRouter);
router.use("/attendance", attendanceRouter);
router.use("/leave", leaveRouter);
router.use("/dashboard", dashboardRouter);

export default router;

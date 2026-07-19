import { Router } from "express";
import { db } from "@workspace/db";
import {
  employeesTable,
  attendanceTable,
  leaveRequestsTable,
} from "@workspace/db";
import { eq, and, count, sql, gte } from "drizzle-orm";
import { ok } from "../lib/response";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

router.get("/stats", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const companyId = auth.companyId;
  const today = new Date().toISOString().split("T")[0];
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  const monthStart = thisMonthStart.toISOString().split("T")[0];

  const [
    [{ totalEmployees }],
    [{ activeEmployees }],
    [{ onLeaveToday }],
    [{ presentToday }],
    [{ pendingLeave }],
    [{ newHires }],
  ] = await Promise.all([
    db.select({ totalEmployees: count() }).from(employeesTable).where(eq(employeesTable.companyId, companyId)),
    db.select({ activeEmployees: count() }).from(employeesTable).where(and(eq(employeesTable.companyId, companyId), eq(employeesTable.status, "ACTIVE"))),
    db.select({ onLeaveToday: count() }).from(attendanceTable).where(and(eq(attendanceTable.companyId, companyId), eq(attendanceTable.date, today), eq(attendanceTable.status, "ON_LEAVE"))),
    db.select({ presentToday: count() }).from(attendanceTable).where(and(eq(attendanceTable.companyId, companyId), eq(attendanceTable.date, today), eq(attendanceTable.status, "PRESENT"))),
    db.select({ pendingLeave: count() }).from(leaveRequestsTable).where(and(eq(leaveRequestsTable.companyId, companyId), eq(leaveRequestsTable.status, "PENDING"))),
    db.select({ newHires: count() }).from(employeesTable).where(and(eq(employeesTable.companyId, companyId), gte(employeesTable.hireDate, monthStart))),
  ]);

  const totalPresent = Number(presentToday);
  const totalActive = Number(activeEmployees);
  const attendanceRate = totalActive > 0 ? Math.round((totalPresent / totalActive) * 100) : 0;

  return ok(res, {
    totalEmployees: Number(totalEmployees),
    activeEmployees: Number(activeEmployees),
    onLeaveToday: Number(onLeaveToday),
    presentToday: Number(presentToday),
    absentToday: Math.max(0, Number(activeEmployees) - Number(presentToday) - Number(onLeaveToday)),
    pendingLeaveRequests: Number(pendingLeave),
    newHiresThisMonth: Number(newHires),
    attendanceRateThisMonth: attendanceRate,
    trend: [],
  });
});

export default router;

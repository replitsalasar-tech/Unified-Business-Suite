import { Router } from "express";
import { db } from "@workspace/db";
import { attendanceTable, employeesTable } from "@workspace/db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/attendance?employeeId=&from=&to=&page=1&limit=20
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 31));
  const offset = (page - 1) * limit;
  const { employeeId, from, to } = req.query as Record<string, string>;

  const conditions = [eq(attendanceTable.companyId, auth.companyId)];
  if (employeeId) conditions.push(eq(attendanceTable.employeeId, employeeId));
  if (from) conditions.push(gte(attendanceTable.date, from));
  if (to) conditions.push(lte(attendanceTable.date, to));

  const rows = await db.query.attendanceTable.findMany({
    where: and(...conditions),
    with: { employee: { columns: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    limit,
    offset,
    orderBy: (t, { desc }) => desc(t.date),
  });

  const [{ value: total }] = await db.select({ value: count() }).from(attendanceTable).where(and(...conditions));
  return paginated(res, rows, { page, limit, total: Number(total) });
});

// GET /api/attendance/:id
router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const row = await db.query.attendanceTable.findFirst({
    where: and(eq(attendanceTable.id, req.params.id), eq(attendanceTable.companyId, auth.companyId)),
  });
  if (!row) return fail(res, 404, "Attendance record not found");
  return ok(res, row);
});

// POST /api/attendance — log attendance (check-in or create record)
router.post("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { employeeId, date, checkIn, checkOut, status, notes, source } = req.body;
  if (!employeeId || !date) return fail(res, 400, "employeeId and date required");

  // Verify employee belongs to company
  const emp = await db.query.employeesTable.findFirst({
    where: and(eq(employeesTable.id, employeeId), eq(employeesTable.companyId, auth.companyId)),
  });
  if (!emp) return fail(res, 400, "Invalid employee");

  const [row] = await db.insert(attendanceTable).values({
    companyId: auth.companyId,
    employeeId,
    date,
    checkIn: checkIn ? new Date(checkIn) : undefined,
    checkOut: checkOut ? new Date(checkOut) : undefined,
    status: status ?? "PRESENT",
    notes,
    source: source ?? "MANUAL",
    createdBy: auth.sub,
  }).returning();
  return ok(res, row, 201);
});

// PUT /api/attendance/:id
router.put("/:id", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { checkIn, checkOut, status, notes } = req.body;
  const [row] = await db.update(attendanceTable)
    .set({
      checkIn: checkIn ? new Date(checkIn) : undefined,
      checkOut: checkOut ? new Date(checkOut) : undefined,
      status,
      notes,
      updatedAt: new Date(),
    })
    .where(and(eq(attendanceTable.id, req.params.id), eq(attendanceTable.companyId, auth.companyId)))
    .returning();
  if (!row) return fail(res, 404, "Attendance record not found");
  return ok(res, row);
});

// GET /api/attendance/summary — aggregated stats for a date range
router.get("/summary/stats", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { from, to, employeeId } = req.query as Record<string, string>;
  const conditions = [eq(attendanceTable.companyId, auth.companyId)];
  if (from) conditions.push(gte(attendanceTable.date, from));
  if (to) conditions.push(lte(attendanceTable.date, to));
  if (employeeId) conditions.push(eq(attendanceTable.employeeId, employeeId));

  const rows = await db.query.attendanceTable.findMany({ where: and(...conditions) });
  const summary = {
    total: rows.length,
    present: rows.filter(r => r.status === "PRESENT").length,
    absent: rows.filter(r => r.status === "ABSENT").length,
    halfDay: rows.filter(r => r.status === "HALF_DAY").length,
    onLeave: rows.filter(r => r.status === "ON_LEAVE").length,
    holiday: rows.filter(r => r.status === "HOLIDAY").length,
  };
  return ok(res, summary);
});

export default router;

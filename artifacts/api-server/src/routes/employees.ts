import { Router } from "express";
import { db } from "@workspace/db";
import {
  employeesTable,
  usersTable,
  departmentsTable,
  jobTitlesTable,
} from "@workspace/db";
import { eq, and, or, ilike, count, sql } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { hashPassword } from "../lib/password";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/employees?page=1&limit=20&search=&status=&departmentId=
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { search, status, departmentId } = req.query as Record<string, string>;

  const conditions = [eq(employeesTable.companyId, auth.companyId)];
  if (status) conditions.push(eq(employeesTable.status, status as any));
  if (departmentId) conditions.push(eq(employeesTable.departmentId, departmentId));
  const baseWhere = and(...conditions);

  const rows = await db.query.employeesTable.findMany({
    where: search
      ? and(
          ...conditions,
          or(
            ilike(employeesTable.firstName, `%${search}%`),
            ilike(employeesTable.lastName, `%${search}%`),
            ilike(employeesTable.email, `%${search}%`),
            ilike(employeesTable.employeeCode, `%${search}%`),
          )
        )
      : baseWhere,
    with: {
      department: { columns: { id: true, name: true } },
      jobTitle: { columns: { id: true, title: true, level: true } },
    },
    limit,
    offset,
    orderBy: (t, { asc }) => [asc(t.firstName), asc(t.lastName)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(employeesTable)
    .where(baseWhere);

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// GET /api/employees/:id
router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const emp = await db.query.employeesTable.findFirst({
    where: and(eq(employeesTable.id, req.params.id), eq(employeesTable.companyId, auth.companyId)),
    with: {
      department: true,
      jobTitle: true,
    },
  });
  if (!emp) return fail(res, 404, "Employee not found");
  return ok(res, emp);
});

// POST /api/employees
router.post("/", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const {
    firstName, lastName, email, password, role,
    phone, gender, dateOfBirth, departmentId, jobTitleId,
    managerId, employmentType, hireDate, probationEndDate,
    baseSalary, currency, address, emergencyContact,
  } = req.body;

  if (!firstName || !lastName || !email || !password || !departmentId || !jobTitleId || !hireDate || !baseSalary) {
    return fail(res, 400, "Required fields missing");
  }

  // Verify dept/job belong to same company
  const dept = await db.query.departmentsTable.findFirst({
    where: and(eq(departmentsTable.id, departmentId), eq(departmentsTable.companyId, auth.companyId)),
  });
  if (!dept) return fail(res, 400, "Invalid department");

  // Generate employee code
  const [{ value: empCount }] = await db
    .select({ value: count() })
    .from(employeesTable)
    .where(eq(employeesTable.companyId, auth.companyId));
  const employeeCode = `EMP${String(Number(empCount) + 1).padStart(4, "0")}`;

  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    companyId: auth.companyId,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: role ?? "EMPLOYEE",
    firstName,
    lastName,
  }).returning();

  const [emp] = await db.insert(employeesTable).values({
    companyId: auth.companyId,
    userId: user.id,
    employeeCode,
    firstName,
    lastName,
    email: email.toLowerCase().trim(),
    phone,
    gender,
    dateOfBirth,
    departmentId,
    jobTitleId,
    managerId,
    employmentType: employmentType ?? "FULL_TIME",
    hireDate,
    probationEndDate,
    baseSalary: String(baseSalary),
    currency: currency ?? "INR",
    address,
    emergencyContact,
  }).returning();

  return ok(res, emp, 201);
});

// PUT /api/employees/:id
router.put("/:id", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const {
    firstName, lastName, phone, gender, dateOfBirth,
    departmentId, jobTitleId, managerId, employmentType,
    status, probationEndDate, baseSalary, address, emergencyContact,
  } = req.body;
  const [emp] = await db.update(employeesTable)
    .set({
      firstName, lastName, phone, gender, dateOfBirth,
      departmentId, jobTitleId, managerId, employmentType,
      status, probationEndDate, baseSalary: baseSalary ? String(baseSalary) : undefined,
      address, emergencyContact, updatedAt: new Date(),
    })
    .where(and(eq(employeesTable.id, req.params.id), eq(employeesTable.companyId, auth.companyId)))
    .returning();
  if (!emp) return fail(res, 404, "Employee not found");
  return ok(res, emp);
});

// POST /api/employees/:id/terminate
router.post("/:id/terminate", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { terminationDate, reason } = req.body;
  const [emp] = await db.update(employeesTable)
    .set({ status: "TERMINATED", terminationDate: terminationDate ?? new Date().toISOString().split("T")[0], updatedAt: new Date() })
    .where(and(eq(employeesTable.id, req.params.id), eq(employeesTable.companyId, auth.companyId)))
    .returning();
  if (!emp) return fail(res, 404, "Employee not found");
  return ok(res, emp);
});

// GET /api/employees/org-chart
router.get("/org-chart/tree", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const emps = await db.query.employeesTable.findMany({
    where: and(eq(employeesTable.companyId, auth.companyId), sql`status != 'TERMINATED'`),
    columns: { id: true, employeeCode: true, firstName: true, lastName: true, managerId: true, photoUrl: true },
    with: { jobTitle: { columns: { title: true } }, department: { columns: { name: true } } },
  });
  return ok(res, emps);
});

export default router;

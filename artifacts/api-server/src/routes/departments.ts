import { Router } from "express";
import { db } from "@workspace/db";
import { departmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// GET /api/departments
router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const rows = await db.query.departmentsTable.findMany({
    where: and(eq(departmentsTable.companyId, auth.companyId), eq(departmentsTable.isActive, true)),
    orderBy: (t, { asc }) => asc(t.name),
  });
  return ok(res, rows);
});

// GET /api/departments/:id
router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const dept = await db.query.departmentsTable.findFirst({
    where: and(eq(departmentsTable.id, req.params.id), eq(departmentsTable.companyId, auth.companyId)),
  });
  if (!dept) return fail(res, 404, "Department not found");
  return ok(res, dept);
});

// POST /api/departments
router.post("/", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { name, code, parentId, managerId, description } = req.body;
  if (!name) return fail(res, 400, "Name is required");
  const [dept] = await db.insert(departmentsTable)
    .values({ companyId: auth.companyId, name, code, parentId, managerId, description })
    .returning();
  return ok(res, dept, 201);
});

// PUT /api/departments/:id
router.put("/:id", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { name, code, parentId, managerId, description } = req.body;
  const [dept] = await db.update(departmentsTable)
    .set({ name, code, parentId, managerId, description, updatedAt: new Date() })
    .where(and(eq(departmentsTable.id, req.params.id), eq(departmentsTable.companyId, auth.companyId)))
    .returning();
  if (!dept) return fail(res, 404, "Department not found");
  return ok(res, dept);
});

// DELETE /api/departments/:id
router.delete("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const [dept] = await db.update(departmentsTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(departmentsTable.id, req.params.id), eq(departmentsTable.companyId, auth.companyId)))
    .returning();
  if (!dept) return fail(res, 404, "Department not found");
  return ok(res, { message: "Department deactivated" });
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { jobTitlesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { ok, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const rows = await db.query.jobTitlesTable.findMany({
    where: and(eq(jobTitlesTable.companyId, auth.companyId), eq(jobTitlesTable.isActive, true)),
    orderBy: (t, { asc }) => [asc(t.level), asc(t.title)],
  });
  return ok(res, rows);
});

router.get("/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const row = await db.query.jobTitlesTable.findFirst({
    where: and(eq(jobTitlesTable.id, req.params.id), eq(jobTitlesTable.companyId, auth.companyId)),
  });
  if (!row) return fail(res, 404, "Job title not found");
  return ok(res, row);
});

router.post("/", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { title, level, description } = req.body;
  if (!title) return fail(res, 400, "Title is required");
  const [row] = await db.insert(jobTitlesTable)
    .values({ companyId: auth.companyId, title, level: level ?? 1, description })
    .returning();
  return ok(res, row, 201);
});

router.put("/:id", requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { title, level, description } = req.body;
  const [row] = await db.update(jobTitlesTable)
    .set({ title, level, description, updatedAt: new Date() })
    .where(and(eq(jobTitlesTable.id, req.params.id), eq(jobTitlesTable.companyId, auth.companyId)))
    .returning();
  if (!row) return fail(res, 404, "Job title not found");
  return ok(res, row);
});

router.delete("/:id", requireRole("ADMIN", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const [row] = await db.update(jobTitlesTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(jobTitlesTable.id, req.params.id), eq(jobTitlesTable.companyId, auth.companyId)))
    .returning();
  if (!row) return fail(res, 404, "Job title not found");
  return ok(res, { message: "Job title deactivated" });
});

export default router;

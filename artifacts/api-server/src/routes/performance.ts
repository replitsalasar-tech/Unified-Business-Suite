import { Router } from "express";
import { db } from "@workspace/db";
import {
  reviewCyclesTable,
  performanceReviewsTable,
  employeesTable,
} from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// ── Review Cycles ─────────────────────────────────────────────────────────────

// GET /api/v1/performance/cycles
router.get("/cycles", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const rows = await db.query.reviewCyclesTable.findMany({
    where: eq(reviewCyclesTable.companyId, auth.companyId),
    orderBy: (t, { desc }) => [desc(t.startDate)],
  });
  return ok(res, rows);
});

// POST /api/v1/performance/cycles
router.post(
  "/cycles",
  requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { name, startDate, endDate, isActive } = req.body;
    if (!name || !startDate || !endDate) {
      return fail(res, 400, "name, startDate, endDate are required");
    }
    const [cycle] = await db
      .insert(reviewCyclesTable)
      .values({
        companyId: auth.companyId,
        name,
        startDate,
        endDate,
        isActive: isActive ?? true,
      })
      .returning();
    return ok(res, cycle, 201);
  }
);

// PATCH /api/v1/performance/cycles/:id
router.patch(
  "/cycles/:id",
  requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const { name, startDate, endDate, isActive } = req.body;
    const [cycle] = await db
      .update(reviewCyclesTable)
      .set({ name, startDate, endDate, isActive })
      .where(
        and(
          eq(reviewCyclesTable.id, req.params.id),
          eq(reviewCyclesTable.companyId, auth.companyId)
        )
      )
      .returning();
    if (!cycle) return fail(res, 404, "Review cycle not found");
    return ok(res, cycle);
  }
);

// ── Performance Reviews ───────────────────────────────────────────────────────

// GET /api/v1/performance/reviews?cycleId=&employeeId=
router.get("/reviews", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const conditions = [eq(performanceReviewsTable.companyId, auth.companyId)];
  if (req.query.cycleId)
    conditions.push(eq(performanceReviewsTable.cycleId, String(req.query.cycleId)));
  if (req.query.employeeId)
    conditions.push(eq(performanceReviewsTable.employeeId, String(req.query.employeeId)));

  const rows = await db.query.performanceReviewsTable.findMany({
    where: and(...conditions),
    with: {
      employee: { columns: { id: true, firstName: true, lastName: true, employeeCode: true } },
      reviewer: { columns: { id: true, firstName: true, lastName: true } },
      cycle: { columns: { id: true, name: true, isActive: true } },
    },
    limit,
    offset,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(performanceReviewsTable)
    .where(and(...conditions));

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// GET /api/v1/performance/reviews/:id
router.get("/reviews/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const review = await db.query.performanceReviewsTable.findFirst({
    where: and(
      eq(performanceReviewsTable.id, req.params.id),
      eq(performanceReviewsTable.companyId, auth.companyId)
    ),
    with: {
      employee: true,
      reviewer: { columns: { id: true, firstName: true, lastName: true } },
      cycle: true,
    },
  });
  if (!review) return fail(res, 404, "Review not found");
  return ok(res, review);
});

// POST /api/v1/performance/reviews
router.post(
  "/reviews",
  requireRole("ADMIN", "HR_MANAGER", "DEPARTMENT_HEAD", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const {
      cycleId,
      employeeId,
      reviewerId,
      rating,
      score,
      goals,
      strengths,
      improvements,
      comments,
    } = req.body;

    if (!cycleId || !employeeId || !reviewerId) {
      return fail(res, 400, "cycleId, employeeId, reviewerId are required");
    }

    // Verify cycle belongs to this company
    const cycle = await db.query.reviewCyclesTable.findFirst({
      where: and(
        eq(reviewCyclesTable.id, cycleId),
        eq(reviewCyclesTable.companyId, auth.companyId)
      ),
    });
    if (!cycle) return fail(res, 404, "Review cycle not found");

    const [review] = await db
      .insert(performanceReviewsTable)
      .values({
        companyId: auth.companyId,
        cycleId,
        employeeId,
        reviewerId,
        rating,
        score: score ? String(score) : undefined,
        goals,
        strengths,
        improvements,
        comments,
      })
      .returning();

    return ok(res, review, 201);
  }
);

// PATCH /api/v1/performance/reviews/:id
router.patch("/reviews/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const {
    rating,
    score,
    goals,
    strengths,
    improvements,
    comments,
    submittedAt,
  } = req.body;

  const existing = await db.query.performanceReviewsTable.findFirst({
    where: and(
      eq(performanceReviewsTable.id, req.params.id),
      eq(performanceReviewsTable.companyId, auth.companyId)
    ),
  });
  if (!existing) return fail(res, 404, "Review not found");

  const [review] = await db
    .update(performanceReviewsTable)
    .set({
      rating,
      score: score ? String(score) : undefined,
      goals,
      strengths,
      improvements,
      comments,
      submittedAt: submittedAt ? new Date(submittedAt) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(performanceReviewsTable.id, req.params.id))
    .returning();

  return ok(res, review);
});

// POST /api/v1/performance/reviews/:id/submit
router.post("/reviews/:id/submit", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const existing = await db.query.performanceReviewsTable.findFirst({
    where: and(
      eq(performanceReviewsTable.id, req.params.id),
      eq(performanceReviewsTable.companyId, auth.companyId)
    ),
  });
  if (!existing) return fail(res, 404, "Review not found");

  const [review] = await db
    .update(performanceReviewsTable)
    .set({ submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(performanceReviewsTable.id, req.params.id))
    .returning();

  return ok(res, review);
});

export default router;

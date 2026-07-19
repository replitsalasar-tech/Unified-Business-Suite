import { Router } from "express";
import { db } from "@workspace/db";
import {
  jobsTable,
  applicationsTable,
  interviewsTable,
  departmentsTable,
} from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { ok, paginated, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";

const router = Router();
router.use(requireAuth);

// ── Jobs ──────────────────────────────────────────────────────────────────────

// GET /api/v1/recruitment/jobs
router.get("/jobs", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const rows = await db.query.jobsTable.findMany({
    where: eq(jobsTable.companyId, auth.companyId),
    with: {
      department: { columns: { id: true, name: true } },
      hiringManager: { columns: { id: true, firstName: true, lastName: true } },
    },
    limit,
    offset,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(jobsTable)
    .where(eq(jobsTable.companyId, auth.companyId));

  return paginated(res, rows, { page, limit, total: Number(total) });
});

// GET /api/v1/recruitment/jobs/:id
router.get("/jobs/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const job = await db.query.jobsTable.findFirst({
    where: and(eq(jobsTable.id, req.params.id), eq(jobsTable.companyId, auth.companyId)),
    with: {
      department: true,
      hiringManager: { columns: { id: true, firstName: true, lastName: true } },
      applications: {
        orderBy: (t, { desc }) => [desc(t.appliedAt)],
      },
    },
  });
  if (!job) return fail(res, 404, "Job not found");
  return ok(res, job);
});

// POST /api/v1/recruitment/jobs
router.post(
  "/jobs",
  requireRole("ADMIN", "HR_MANAGER", "DEPARTMENT_HEAD", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const {
      title,
      departmentId,
      hiringManagerId,
      description,
      requirements,
      type,
      location,
      salaryMin,
      salaryMax,
      isPublished,
      closingDate,
    } = req.body;

    if (!title || !description || !requirements) {
      return fail(res, 400, "title, description, requirements are required");
    }

    if (departmentId) {
      const dept = await db.query.departmentsTable.findFirst({
        where: and(eq(departmentsTable.id, departmentId), eq(departmentsTable.companyId, auth.companyId)),
      });
      if (!dept) return fail(res, 400, "Invalid department");
    }

    const [job] = await db
      .insert(jobsTable)
      .values({
        companyId: auth.companyId,
        title,
        departmentId,
        hiringManagerId,
        description,
        requirements,
        type: type ?? "FULL_TIME",
        location,
        salaryMin: salaryMin ? String(salaryMin) : undefined,
        salaryMax: salaryMax ? String(salaryMax) : undefined,
        isPublished: isPublished ?? false,
        closingDate,
      })
      .returning();

    return ok(res, job, 201);
  }
);

// PATCH /api/v1/recruitment/jobs/:id
router.patch(
  "/jobs/:id",
  requireRole("ADMIN", "HR_MANAGER", "DEPARTMENT_HEAD", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const {
      title,
      departmentId,
      hiringManagerId,
      description,
      requirements,
      type,
      location,
      salaryMin,
      salaryMax,
      isPublished,
      closingDate,
    } = req.body;

    const [job] = await db
      .update(jobsTable)
      .set({
        title,
        departmentId,
        hiringManagerId,
        description,
        requirements,
        type,
        location,
        salaryMin: salaryMin ? String(salaryMin) : undefined,
        salaryMax: salaryMax ? String(salaryMax) : undefined,
        isPublished,
        closingDate,
        updatedAt: new Date(),
      })
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.companyId, auth.companyId)))
      .returning();

    if (!job) return fail(res, 404, "Job not found");
    return ok(res, job);
  }
);

// DELETE /api/v1/recruitment/jobs/:id
router.delete(
  "/jobs/:id",
  requireRole("ADMIN", "HR_MANAGER", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const [job] = await db
      .delete(jobsTable)
      .where(and(eq(jobsTable.id, req.params.id), eq(jobsTable.companyId, auth.companyId)))
      .returning();
    if (!job) return fail(res, 404, "Job not found");
    return ok(res, { deleted: true });
  }
);

// ── Applications ──────────────────────────────────────────────────────────────

// GET /api/v1/recruitment/jobs/:id/applications
router.get("/jobs/:id/applications", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const job = await db.query.jobsTable.findFirst({
    where: and(eq(jobsTable.id, req.params.id), eq(jobsTable.companyId, auth.companyId)),
    columns: { id: true },
  });
  if (!job) return fail(res, 404, "Job not found");

  const apps = await db.query.applicationsTable.findMany({
    where: eq(applicationsTable.jobId, req.params.id),
    with: {
      interviews: { orderBy: (t, { asc }) => [asc(t.scheduledAt)] },
    },
    orderBy: (t, { desc }) => [desc(t.appliedAt)],
  });

  return ok(res, apps);
});

// POST /api/v1/recruitment/jobs/:id/applications
router.post("/jobs/:id/applications", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const job = await db.query.jobsTable.findFirst({
    where: and(eq(jobsTable.id, req.params.id), eq(jobsTable.companyId, auth.companyId)),
    columns: { id: true },
  });
  if (!job) return fail(res, 404, "Job not found");

  const { candidateName, candidateEmail, phone, resumeUrl, coverLetter } = req.body;
  if (!candidateName || !candidateEmail) {
    return fail(res, 400, "candidateName and candidateEmail are required");
  }

  const [app] = await db
    .insert(applicationsTable)
    .values({
      jobId: req.params.id,
      candidateName,
      candidateEmail,
      phone,
      resumeUrl,
      coverLetter,
    })
    .returning();

  return ok(res, app, 201);
});

// GET /api/v1/recruitment/applications — list all applications across all jobs for this company
router.get("/applications", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  // Get all job IDs for this company
  const jobs = await db.query.jobsTable.findMany({
    where: eq(jobsTable.companyId, auth.companyId),
    columns: { id: true },
  });
  const jobIds = jobs.map((j) => j.id);

  if (jobIds.length === 0) return paginated(res, [], { page, limit, total: 0 });

  const { status } = req.query as Record<string, string>;

  // Build conditions — can't use inArray without importing it, use findMany with a join approach
  const allApps = await db.query.applicationsTable.findMany({
    where: status
      ? and(eq(applicationsTable.status, status))
      : undefined,
    with: {
      job: { columns: { id: true, title: true, companyId: true } },
      interviews: { columns: { id: true, scheduledAt: true, status: true } },
    },
    orderBy: (t, { desc }) => [desc(t.appliedAt)],
  });

  // Filter by company's job IDs in JS (simpler than complex SQL join)
  const filtered = allApps.filter((a) => jobIds.includes(a.job.id));
  const paginated_ = filtered.slice(offset, offset + limit);

  return paginated(res, paginated_, { page, limit, total: filtered.length });
});

// PATCH /api/v1/recruitment/applications/:id/status
router.patch("/applications/:id/status", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { status, notes } = req.body;
  if (!status) return fail(res, 400, "status is required");

  const validStatuses = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];
  if (!validStatuses.includes(status)) {
    return fail(res, 400, `status must be one of: ${validStatuses.join(", ")}`);
  }

  // Verify the application belongs to this company via job
  const app = await db.query.applicationsTable.findFirst({
    where: eq(applicationsTable.id, req.params.id),
    with: { job: { columns: { companyId: true } } },
  });
  if (!app || app.job.companyId !== auth.companyId) {
    return fail(res, 404, "Application not found");
  }

  const [updated] = await db
    .update(applicationsTable)
    .set({ status, notes: notes ?? app.notes, updatedAt: new Date() })
    .where(eq(applicationsTable.id, req.params.id))
    .returning();

  return ok(res, updated);
});

// ── Interviews ────────────────────────────────────────────────────────────────

// GET /api/v1/recruitment/applications/:id/interviews
router.get("/applications/:id/interviews", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const app = await db.query.applicationsTable.findFirst({
    where: eq(applicationsTable.id, req.params.id),
    with: { job: { columns: { companyId: true } } },
  });
  if (!app || app.job.companyId !== auth.companyId) {
    return fail(res, 404, "Application not found");
  }

  const interviews = await db.query.interviewsTable.findMany({
    where: eq(interviewsTable.applicationId, req.params.id),
    orderBy: (t, { asc }) => [asc(t.scheduledAt)],
  });
  return ok(res, interviews);
});

// POST /api/v1/recruitment/applications/:id/interviews
router.post(
  "/applications/:id/interviews",
  requireRole("ADMIN", "HR_MANAGER", "DEPARTMENT_HEAD", "SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    const auth = (req as AuthRequest).auth;
    const app = await db.query.applicationsTable.findFirst({
      where: eq(applicationsTable.id, req.params.id),
      with: { job: { columns: { companyId: true } } },
    });
    if (!app || app.job.companyId !== auth.companyId) {
      return fail(res, 404, "Application not found");
    }

    const { scheduledAt, durationMins, type, location, meetingLink } = req.body;
    if (!scheduledAt) return fail(res, 400, "scheduledAt is required");

    const [interview] = await db
      .insert(interviewsTable)
      .values({
        applicationId: req.params.id,
        scheduledAt: new Date(scheduledAt),
        durationMins: durationMins ?? 60,
        type: type ?? "VIDEO",
        location,
        meetingLink,
      })
      .returning();

    return ok(res, interview, 201);
  }
);

// PATCH /api/v1/recruitment/interviews/:id
router.patch("/interviews/:id", async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { feedback, rating, status, scheduledAt, durationMins, type, location, meetingLink } =
    req.body;

  // Verify ownership via application → job → company
  const interview = await db.query.interviewsTable.findFirst({
    where: eq(interviewsTable.id, req.params.id),
    with: {
      application: {
        with: { job: { columns: { companyId: true } } },
      },
    },
  });
  if (!interview || interview.application.job.companyId !== auth.companyId) {
    return fail(res, 404, "Interview not found");
  }

  const [updated] = await db
    .update(interviewsTable)
    .set({
      feedback,
      rating,
      status,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      durationMins,
      type,
      location,
      meetingLink,
    })
    .where(eq(interviewsTable.id, req.params.id))
    .returning();

  return ok(res, updated);
});

export default router;

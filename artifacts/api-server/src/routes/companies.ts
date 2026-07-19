import { Router } from "express";
import { db } from "@workspace/db";
import { companiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ok, fail } from "../lib/response";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";
import { createId } from "@paralleldrive/cuid2";
import { hashPassword } from "../lib/password";
import { usersTable } from "@workspace/db";

const router = Router();

// POST /api/companies — register a new company (public onboarding)
router.post("/", async (req: Request, res: Response) => {
  const { name, slug, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;
  if (!name || !slug || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
    return fail(res, 400, "All fields required: name, slug, adminEmail, adminPassword, adminFirstName, adminLastName");
  }

  const existing = await db.query.companiesTable.findFirst({ where: eq(companiesTable.slug, slug.toLowerCase()) });
  if (existing) return fail(res, 409, "Slug already taken");

  const company = await db.insert(companiesTable).values({
    name,
    slug: slug.toLowerCase(),
  }).returning().then(r => r[0]);

  const passwordHash = await hashPassword(adminPassword);
  const user = await db.insert(usersTable).values({
    companyId: company.id,
    email: adminEmail.toLowerCase().trim(),
    passwordHash,
    role: "ADMIN",
    firstName: adminFirstName,
    lastName: adminLastName,
  }).returning().then(r => r[0]);

  const { passwordHash: _, mfaSecret: __, ...safeUser } = user;
  return ok(res, { company, user: safeUser }, 201);
});

// GET /api/companies/me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const company = await db.query.companiesTable.findFirst({
    where: eq(companiesTable.id, auth.companyId),
  });
  if (!company) return fail(res, 404, "Company not found");
  return ok(res, company);
});

// PUT /api/companies/me
router.put("/me", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { name, currency, timezone, fiscalYearStart, logoUrl, address, phone, website } = req.body;
  const [updated] = await db.update(companiesTable)
    .set({ name, currency, timezone, fiscalYearStart, logoUrl, address, phone, website, updatedAt: new Date() })
    .where(eq(companiesTable.id, auth.companyId))
    .returning();
  return ok(res, updated);
});

export default router;

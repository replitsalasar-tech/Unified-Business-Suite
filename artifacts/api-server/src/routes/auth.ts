import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  refreshTokensTable,
  companiesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { signAccessToken, signRefreshToken, verifyRefreshToken, hashToken } from "../lib/jwt";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../lib/password";
import { ok, fail } from "../lib/response";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { createId } from "@paralleldrive/cuid2";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 400, "Email and password required");

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email.toLowerCase().trim()),
    with: { company: true },
  }).catch(() => null);

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail(res, 401, "Invalid credentials");
  }
  if (!user.isActive) return fail(res, 403, "Account deactivated");

  if (user.mfaEnabled) {
    // Return partial token — frontend should call /verify-mfa
    return ok(res, { requiresMfa: true, userId: user.id });
  }

  const { token: refreshToken, jti } = signRefreshToken({ sub: user.id, companyId: user.companyId });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokensTable).values({
    userId: user.id,
    companyId: user.companyId,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  const accessToken = signAccessToken({ sub: user.id, companyId: user.companyId, role: user.role });

  return ok(res, {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, companyId: user.companyId },
  });
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return fail(res, 400, "refreshToken required");

  let payload;
  try { payload = verifyRefreshToken(refreshToken); }
  catch { return fail(res, 401, "Invalid or expired refresh token"); }

  const stored = await db.query.refreshTokensTable.findFirst({
    where: and(
      eq(refreshTokensTable.tokenHash, hashToken(refreshToken)),
      eq(refreshTokensTable.userId, payload.sub)
    ),
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return fail(res, 401, "Refresh token invalid or revoked");
  }

  // Rotate: revoke old, issue new
  await db.update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.id, stored.id));

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, payload.sub) });
  if (!user || !user.isActive) return fail(res, 401, "User not found or inactive");

  const { token: newRefreshToken } = signRefreshToken({ sub: user.id, companyId: user.companyId });
  await db.insert(refreshTokensTable).values({
    userId: user.id,
    companyId: user.companyId,
    tokenHash: hashToken(newRefreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  const accessToken = signAccessToken({ sub: user.id, companyId: user.companyId, role: user.role });
  return ok(res, { accessToken, refreshToken: newRefreshToken });
});

// POST /api/auth/logout
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.tokenHash, hashToken(refreshToken)));
  }
  return ok(res, { message: "Logged out" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, auth.sub) });
  if (!user) return fail(res, 404, "User not found");
  const { passwordHash: _, mfaSecret: __, ...safe } = user;
  return ok(res, safe);
});

// PUT /api/auth/me
router.put("/me", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { firstName, lastName, phone } = req.body;
  const [updated] = await db.update(usersTable)
    .set({ firstName, lastName, updatedAt: new Date() })
    .where(eq(usersTable.id, auth.sub))
    .returning();
  const { passwordHash: _, mfaSecret: __, ...safe } = updated;
  return ok(res, safe);
});

// POST /api/auth/change-password
router.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { currentPassword, newPassword } = req.body;
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, auth.sub) });
  if (!user) return fail(res, 404, "User not found");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return fail(res, 400, "Current password is incorrect");
  }
  const err = validatePasswordStrength(newPassword);
  if (err) return fail(res, 400, err);
  await db.update(usersTable)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(usersTable.id, auth.sub));
  return ok(res, { message: "Password changed" });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req: Request, res: Response) => {
  // TODO: send email via email provider
  return ok(res, { message: "If that email is registered, a reset link has been sent" });
});

// POST /api/auth/reset-password
router.post("/reset-password", async (_req: Request, res: Response) => {
  // TODO: implement token lookup and password reset
  return fail(res, 501, "Not implemented — wire up email provider first");
});

// POST /api/auth/mfa/setup
router.post("/mfa/setup", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, auth.sub) });
  if (!user) return fail(res, 404, "User not found");
  const secret = speakeasy.generateSecret({ name: `HRM-ERP (${user.email})` });
  await db.update(usersTable).set({ mfaSecret: secret.base32 }).where(eq(usersTable.id, auth.sub));
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);
  return ok(res, { secret: secret.base32, qrCode: qrCodeUrl });
});

// POST /api/auth/mfa/verify
router.post("/mfa/verify", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { totp } = req.body;
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, auth.sub) });
  if (!user || !user.mfaSecret) return fail(res, 400, "MFA not set up");
  const verified = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: "base32", token: totp, window: 1 });
  if (!verified) return fail(res, 400, "Invalid TOTP code");
  await db.update(usersTable).set({ mfaEnabled: true }).where(eq(usersTable.id, auth.sub));
  return ok(res, { message: "MFA enabled" });
});

// POST /api/auth/mfa/disable
router.post("/mfa/disable", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { totp } = req.body;
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, auth.sub) });
  if (!user || !user.mfaSecret) return fail(res, 400, "MFA not active");
  const verified = speakeasy.totp.verify({ secret: user.mfaSecret, encoding: "base32", token: totp, window: 1 });
  if (!verified) return fail(res, 400, "Invalid TOTP code");
  await db.update(usersTable).set({ mfaEnabled: false, mfaSecret: null }).where(eq(usersTable.id, auth.sub));
  return ok(res, { message: "MFA disabled" });
});

export default router;

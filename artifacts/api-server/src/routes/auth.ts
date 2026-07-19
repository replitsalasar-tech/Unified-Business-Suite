import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  refreshTokensTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  signAccessToken,
  signRefreshToken,
  signMfaToken,
  verifyMfaToken,
  verifyRefreshToken,
  hashToken,
} from "../lib/jwt";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../lib/password";
import { ok, fail } from "../lib/response";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import type { Request, Response } from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";

const router = Router();

// POST /api/v1/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 400, "Email and password required");

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ?? req.socket.remoteAddress ?? "";

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email.toLowerCase().trim()),
    with: { company: true },
  }).catch(() => null);

  if (!user) return fail(res, 401, "Invalid credentials", "INVALID_CREDENTIALS");

  // Account lockout check
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return fail(res, 429, `Account locked. Try again in ${minutesLeft} minute(s).`, "ACCOUNT_LOCKED");
  }

  const passwordValid = await verifyPassword(password, user.passwordHash);

  if (!passwordValid) {
    const newCount = user.failedLoginCount + 1;
    const shouldLock = newCount >= 5;
    await db.update(usersTable).set({
      failedLoginCount: newCount,
      lockedUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null,
      updatedAt: new Date(),
    }).where(eq(usersTable.id, user.id));
    return fail(res, 401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  if (!user.isActive) return fail(res, 403, "Account deactivated", "ACCOUNT_DEACTIVATED");

  // Reset failed count on successful password check
  await db.update(usersTable).set({
    failedLoginCount: 0,
    lockedUntil: null,
    lastLoginAt: new Date(),
    lastLoginIp: ip,
    updatedAt: new Date(),
  }).where(eq(usersTable.id, user.id));

  // MFA challenge — return a short-lived token instead of full access
  if (user.mfaEnabled) {
    const mfaToken = signMfaToken({ sub: user.id, companyId: user.companyId });
    return ok(res, { requiresMfa: true, mfaToken });
  }

  // Issue full tokens
  const { token: refreshToken } = signRefreshToken({ sub: user.id, companyId: user.companyId });
  await db.insert(refreshTokensTable).values({
    userId: user.id,
    companyId: user.companyId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const accessToken = signAccessToken({ sub: user.id, companyId: user.companyId, role: user.role });

  return ok(res, {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
    },
  });
});

// POST /api/v1/auth/mfa/verify — complete MFA login challenge
// Accepts mfaToken (from login) + TOTP code; no requireAuth
router.post("/mfa/verify", async (req: Request, res: Response) => {
  const { mfaToken, code } = req.body;
  if (!mfaToken || !code) return fail(res, 400, "mfaToken and code required");

  let payload;
  try {
    payload = verifyMfaToken(mfaToken);
  } catch {
    return fail(res, 401, "Invalid or expired MFA token", "INVALID_MFA_TOKEN");
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, payload.sub),
  });
  if (!user || !user.mfaSecret || !user.mfaEnabled) {
    return fail(res, 400, "MFA not set up for this account");
  }

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: code,
    window: 1,
  });
  if (!verified) return fail(res, 400, "Invalid TOTP code", "INVALID_TOTP");

  // Issue full tokens
  const { token: refreshToken } = signRefreshToken({ sub: user.id, companyId: user.companyId });
  await db.insert(refreshTokensTable).values({
    userId: user.id,
    companyId: user.companyId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  const accessToken = signAccessToken({ sub: user.id, companyId: user.companyId, role: user.role });

  return ok(res, {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
    },
  });
});

// POST /api/v1/auth/refresh
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

// POST /api/v1/auth/logout
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.update(refreshTokensTable)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokensTable.tokenHash, hashToken(refreshToken)));
  }
  return ok(res, { message: "Logged out" });
});

// GET /api/v1/auth/me
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, auth.sub) });
  if (!user) return fail(res, 404, "User not found");
  const { passwordHash: _, mfaSecret: __, ...safe } = user;
  return ok(res, safe);
});

// PATCH /api/v1/auth/me
router.patch("/me", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { firstName, lastName, phone } = req.body;
  const [updated] = await db.update(usersTable)
    .set({ firstName, lastName, updatedAt: new Date() })
    .where(eq(usersTable.id, auth.sub))
    .returning();
  const { passwordHash: _, mfaSecret: __, ...safe } = updated;
  return ok(res, safe);
});

// PUT /api/v1/auth/me (alias for PATCH)
router.put("/me", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const { firstName, lastName } = req.body;
  const [updated] = await db.update(usersTable)
    .set({ firstName, lastName, updatedAt: new Date() })
    .where(eq(usersTable.id, auth.sub))
    .returning();
  const { passwordHash: _, mfaSecret: __, ...safe } = updated;
  return ok(res, safe);
});

// POST /api/v1/auth/change-password
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

// PATCH /api/v1/auth/change-password (alias)
router.patch("/change-password", requireAuth, async (req: Request, res: Response) => {
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

// POST /api/v1/auth/forgot-password
router.post("/forgot-password", async (_req: Request, res: Response) => {
  // TODO: send email via email provider (intentionally deferred — wire up nodemailer first)
  return ok(res, { message: "If that email is registered, a reset link has been sent" });
});

// POST /api/v1/auth/reset-password
router.post("/reset-password", async (_req: Request, res: Response) => {
  // TODO: implement token lookup and password reset
  return fail(res, 501, "Not implemented — wire up email provider first");
});

// POST /api/v1/auth/mfa/setup — generate TOTP secret for authenticated user
router.post("/mfa/setup", requireAuth, async (req: Request, res: Response) => {
  const auth = (req as AuthRequest).auth;
  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, auth.sub) });
  if (!user) return fail(res, 404, "User not found");
  const secret = speakeasy.generateSecret({ name: `HRM-ERP (${user.email})` });
  await db.update(usersTable).set({ mfaSecret: secret.base32 }).where(eq(usersTable.id, auth.sub));
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);
  return ok(res, { secret: secret.base32, qrCode: qrCodeUrl });
});

// POST /api/v1/auth/mfa/disable — disable MFA for authenticated user
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

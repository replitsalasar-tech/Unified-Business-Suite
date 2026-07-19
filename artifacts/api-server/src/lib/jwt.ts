import jwt from "jsonwebtoken";
import crypto from "crypto";

export interface AccessTokenPayload {
  sub: string; // userId
  companyId: string;
  role: string;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  companyId: string;
  jti: string; // unique token ID
  type: "refresh";
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

function getSecret(name: string, value: string | undefined): string {
  if (!value)
    throw new Error(`${name} environment variable is required but not set`);
  return value;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  return jwt.sign(
    { ...payload, type: "access" },
    getSecret("JWT_ACCESS_SECRET", ACCESS_SECRET),
    { expiresIn: "15m" }
  );
}

export function signRefreshToken(
  payload: Omit<RefreshTokenPayload, "type" | "jti">
): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { ...payload, jti, type: "refresh" },
    getSecret("JWT_REFRESH_SECRET", REFRESH_SECRET),
    { expiresIn: "7d" }
  );
  return { token, jti };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(
    token,
    getSecret("JWT_ACCESS_SECRET", ACCESS_SECRET)
  ) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(
    token,
    getSecret("JWT_REFRESH_SECRET", REFRESH_SECRET)
  ) as RefreshTokenPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

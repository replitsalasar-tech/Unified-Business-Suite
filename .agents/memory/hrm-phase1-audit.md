---
name: Phase 1 Audit — Gaps Fixed
description: All gaps found and fixed during Phase 1 blueprint audit (July 2026)
---

# Phase 1 Blueprint Audit — Fixed Items

## Critical Fixes Applied

### Route Prefix Mismatch (was blocking ALL frontend API calls)
Generated hooks call /api/v1/... but Express was mounted at /api/...
**Fix:** routes/index.ts now mounts all routes under /v1/... prefix. Health stays at /api/healthz, all others at /api/v1/...

### Account Lockout — missing from users table + login logic
**Fix:** Added failedLoginCount (int default 0), lockedUntil (timestamp), lastLoginIp (text) to lib/db/src/schema/users.ts. Pushed to DB.
Login increments counter on wrong password, locks 30min after 5 failures, resets on success.

### MFA Login Flow — was broken (returned raw userId, verify required full auth)
**Fix:** Login returns { requiresMfa: true, mfaToken } (5m JWT type=mfa_required).
/mfa/verify now accepts { mfaToken, code } without requireAuth — verifies token type, checks TOTP, issues full tokens.
Added signMfaToken/verifyMfaToken to lib/jwt.ts.

### Missing Roles for Phase 2+
**Fix:** Added PAYROLL_MANAGER, DEPARTMENT_HEAD, DISTRIBUTOR_ADMIN, DISTRIBUTOR_MANAGER, SALES_REP, CUSTOMER_PORTAL to userRoleEnum.

### Employee Search/Filter — query params were ignored
**Fix:** GET /api/v1/employees now supports ?search= (ilike on firstName/lastName/email/code), ?status=, ?departmentId=

### Leave Balance Tracking — balances never updated
**Fix:** Submit → increments pending. Approve → moves pending→used. Reject → releases pending.

### Leave Page Field Mismatches — frontend was reading nonexistent fields
**Fix:** leave.employeeName → leave.employee.firstName/lastName, leave.leaveType → leave.type, leave.totalDays → leave.days

### Employee Edit Page — missing from blueprint
**Fix:** artifacts/hrm-erp/src/pages/employees/edit.tsx created. Route /employees/:id/edit added to App.tsx.

### fail() Error Envelope — missing timestamp
**Fix:** Now returns { success: false, error, code?, timestamp }

### XSS Sanitization — absent
**Fix:** sanitizeValue middleware added to app.ts — strips script tags and event handlers from req.body strings.

## Verified Correct (no changes needed)
- Dashboard stats: real DB queries
- Multi-tenant isolation: all queries filter by companyId from JWT
- Response envelope: { success, data, timestamp }
- Token rotation on refresh
- Rate limiting: 200/15min global, 20/15min on login
- Seed: admin@acme-india.com / Admin@1234, rahul.v@acme-india.com / Employee@1234

## Acceptable Deferrals
- Redis-backed rate limiter (in-memory fine for single instance)
- Forgot-password email flow (placeholder, intentional per user)
- Profile/forgot-password frontend pages
- CSV export, bulk attendance import

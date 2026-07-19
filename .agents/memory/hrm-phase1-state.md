---
name: Phase 1 Build State
description: What exists after Phase 1 build — DB schema, routes, frontend, seed creds, and open items
---

## What's Built

### Backend (artifacts/api-server)
- JWT auth: signAccessToken (15m), signRefreshToken (7d), hashToken — src/lib/jwt.ts
- Bcrypt password hashing cost 12 — src/lib/password.ts
- Auth middleware: requireAuth, requireRole — src/middlewares/auth.ts
- Routes: /api/auth, /api/companies, /api/departments, /api/job-titles, /api/employees, /api/attendance, /api/leave, /api/dashboard/stats
- MFA via speakeasy (TOTP) — setup/verify/disable endpoints

### Database (lib/db)
Tables: companies, users, refresh_tokens, password_resets, audit_logs, departments, job_titles, employees, attendance, holidays, leave_policies, leave_balances, leave_requests
All scoped by companyId. Drizzle relations in lib/db/src/schema/relations.ts.

### Frontend (artifacts/hrm-erp)
Pages: /login, /dashboard, /employees, /employees/new, /employees/:id, /departments, /job-titles, /attendance, /leave, /settings
Design: deep slate/indigo command center, Plus Jakarta Sans + Spline Sans Mono, dense data tables
AuthContext: accessToken in memory, refreshToken in localStorage. Bearer injected by custom-fetch via setAuthTokenGetter.

### Seed Data
Company: Acme India Pvt Ltd (slug: acme-india)
Admin: admin@acme-india.com / Admin@1234 (role: ADMIN)
Employee: rahul.v@acme-india.com / Employee@1234 (role: EMPLOYEE)
Run again: pnpm --filter @workspace/api-server run seed

## Open Items
1. JWT secrets: JWT_ACCESS_SECRET + JWT_REFRESH_SECRET must be added as Replit Secrets — auth won't sign tokens without them
2. After secrets set: restart api-server workflow
3. Email/forgot-password: returns 501 until an email provider is wired

## Codegen Note
Avoid format:email (generates zod.email()) and nullable:true on objects (generates zod.looseObject()) — both are Zod v4-only methods not available on the default zod@3.x import path.
Fix: remove format:email, use additionalProperties:false on object schemas, never use nullable:true at schema level.

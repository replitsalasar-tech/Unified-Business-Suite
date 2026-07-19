---
name: HRM ERP Development Rules
description: Non-negotiable rules for all development on this project
---

# Development Rules

## Never do
- Never import @replit/* in hrm artifact production code (ok in mockup-sandbox only)
- Never hardcode credentials, API keys, or secrets anywhere
- Never use Replit object storage — use S3-compatible interface behind env vars
- Never use Replit auth — use custom JWT as per blueprint
- Never use console.log in server code — use req.log or the pino logger singleton
- Never use Prisma — use Drizzle ORM (monorepo standard)

## Always do
- Scope all DB queries by companyId extracted from JWT (multi-tenant rule)
- Use blueprint Section 6 API response envelope: { success: true, data, meta?, timestamp }
- Use error envelope: { success: false, error: { message, code }, timestamp }
- Keep integration services behind env-var feature flags (graceful degradation when unconfigured)
- Use drizzle-zod for DB insert/update schema validation
- Follow blueprint RBAC permissions map for all protected routes
- All API routes under /api/v1/... prefix

## DB Conventions (Drizzle)
- Table names: snake_case plural (users, employees, leave_requests)
- IDs: text cuid2 primary keys (import { createId } from '@paralleldrive/cuid2')
- Timestamps: createdAt, updatedAt using timestamp().defaultNow() and $onUpdateFn
- Soft delete: use status field or deletedAt where blueprint specifies termination

---
name: Phase 2 build state
description: What was built in Phase 2 (Payroll, Performance, Recruitment), secrets needed, and known issues.
---

## Phase 2 — Completed

### DB Schema (lib/db/src/schema/)
- `payroll.ts` — payrollStatusEnum, payPeriodsTable, salaryComponentsTable, payslipsTable, payslipLinesTable
- `performance.ts` — performanceRatingEnum, reviewCyclesTable, performanceReviewsTable
- `recruitment.ts` — jobStatusEnum, jobTypeEnum, applicationStatusEnum, interviewTypeEnum, jobsTable, applicationsTable, interviewsTable
- All exported from schema/index.ts and wired in schema/relations.ts

### API Routes (artifacts/api-server/src/routes/)
- `payroll.ts` — CRUD pay periods, run payroll (formula eval via `new Function`), approve/pay, payslips, salary components
- `performance.ts` — review cycles CRUD, performance reviews CRUD + submit action
- `recruitment.ts` — jobs CRUD, applications per job, global applications list, interview scheduling, status updates
- All mounted in routes/index.ts at /v1/payroll, /v1/performance, /v1/recruitment

### Frontend Pages (artifacts/hrm-erp/src/pages/)
- `payroll/index.tsx` — pay periods list + payslip table with ₹INR totals, run/approve actions
- `performance/index.tsx` — review cycles panel + reviews with rating badges, submit action
- `recruitment/index.tsx` — jobs list + pipeline kanban-style status select, add applicants dialog

### Sidebar & Routing
- app-layout.tsx: DollarSign (Payroll, adminOnly), Star (Performance), UserPlus (Recruitment, adminOnly)
- App.tsx: /payroll, /performance, /recruitment routes added

### Secrets Required
- JWT_ACCESS_SECRET — JWT signing for access tokens (15m)
- JWT_REFRESH_SECRET — JWT signing for refresh tokens (7d)
- SESSION_SECRET — already set

### customFetch export fix
- lib/api-client-react/src/index.ts now exports `customFetch` and `CustomFetchOptions` from custom-fetch.ts
- Phase 2 pages use `customFetch` directly (not orval codegen) to avoid Zod v3/v4 mismatch

### Workflows
- API Server: `PORT=8080 pnpm --filter @workspace/api-server run dev` (port 8080)
- HRM Frontend: `PORT=24578 BASE_PATH=/ pnpm --filter @workspace/hrm-erp run dev` (port 24578)
- Both must have PORT and BASE_PATH set or they fail on startup

**Why:** Vite vite.config.ts throws if PORT/BASE_PATH env vars are missing at config-load time.

### Known: DB push
Run `cd lib/db && pnpm install && pnpm run push` after any schema changes — drizzle-kit must be installed first.

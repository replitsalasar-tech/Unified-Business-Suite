---
name: HRM ERP Architecture Decisions
description: Key architecture and deployment decisions for the HRM+Distributor ERP project
---

# HRM ERP Architecture Decisions

## Infrastructure Independence
**Rule:** The system must be fully deployable on any server (AWS, VPS, bare metal). No Replit-specific dependencies in production code.
**Why:** User explicitly stated the system will be deployed independently of Replit.
**How to apply:** Never use Replit object storage, Replit auth, or any @replit/* SDK in the hrm artifact. Use standard Node.js patterns.

## Credentials / Integration Config
**Rule:** For ALL external integrations (S3/storage, email, SMS, payment gateways), create config options in .env and service layer. Do NOT hardcode or wire up credentials — the developer will add actual keys.
**Why:** User will not provide API keys during development. Added by their coder post-delivery.
**How to apply:** Every integration service reads from env vars, gracefully skips/logs-warn when missing, exposes clear config docs.

## Multi-Tenant SaaS
**Rule:** The system is sold to multiple companies. Every data entity is scoped to companyId. JWT must include companyId.
**Why:** Product is sold to multiple companies — no single company name hardcoded.
**How to apply:** Company table is central. All DB queries filter by companyId from JWT claims. Drizzle schema uses companyId FK on all tenant-scoped tables.

## Tech Stack (blueprint-adapted for monorepo)
- Backend: Express 5 + TypeScript + Drizzle ORM (monorepo standard — NOT Prisma)
- Auth: Custom JWT (15m access + 7d refresh), bcrypt cost 12, RBAC with permissions map
- DB: PostgreSQL + Drizzle ORM + drizzle-zod validation
- Frontend: React + Vite + TanStack Query (Orval codegen hooks) + Zustand + shadcn/ui
- Currency/locale: INR (India) primary
- Email: nodemailer placeholder, env-gated, skip in Phase 1
- File storage: S3-compatible config (env vars only, no SDK hardwired in Phase 1)

## Phase Plan
- Phase 1 (MVP): Foundation + HRM Core — Auth, Company setup, Employees, Departments, Attendance, Leave
- Phase 2: HRM Advanced — Payroll engine, Performance reviews, Recruitment pipeline  
- Phase 3: Distributor ERP — Inventory, Products, Suppliers, Purchase Orders
- Phase 4: Sales & Finance — Orders, Customers, Invoices, Payments, Shipments
- Phase 5: Reports, Audit logs, Background jobs (BullMQ), PDF exports

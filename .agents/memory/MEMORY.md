# HRM ERP Project Memory

- [Architecture decisions](hrm-arch.md) — Infrastructure-agnostic, multi-tenant SaaS, custom JWT auth, INR/India
- [Development rules](hrm-dev-rules.md) — No Replit dependencies, credentials added by coder, not in code
- [Phase 1 build state](hrm-phase1-state.md) — What was built, seed creds, JWT secrets still needed, codegen Zod quirk
- [Phase 1 audit fixes](hrm-phase1-audit.md) — all blueprint gaps found and patched; route prefix (/v1), lockout, MFA flow, leave balances, search filters
- [Phase 2 build state](hrm-phase2-state.md) — Payroll/Performance/Recruitment built; JWT secrets required; workflows need PORT+BASE_PATH; customFetch now exported
- [Phase 3 build state](hrm-phase3-state.md) — ERP schemas, 8 routes, 8 pages, DB pushed; auth.sub not auth.userId; Package2 not Packages

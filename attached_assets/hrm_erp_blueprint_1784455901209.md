# HRM + DISTRIBUTOR ERP — DEFINITIVE BUILD BLUEPRINT
## Replit-Ready: Industry-Grade, Zero-Ambiguity Implementation Guide
### Version 1.0 | Complete from First Commit to Production

---

## QUICK-START FOR REPLIT

1. Clone the folder structure in Section 4 exactly.
2. Run `npm install` in `/server` and `/client`.
3. Copy `.env.example` → `.env` and fill every variable (Section 7).
4. Run `npm run db:migrate` then `npm run db:seed`.
5. Run `npm run dev` — both API and frontend start.

This document is the single source of truth. Read it top-to-bottom once, then implement section-by-section.

---

## SECTION 1: TECH STACK (SPECIFIC, LOCKED)

### 1.1 Backend
| Layer | Technology | Version | Reason |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | Stable LTS, great ecosystem |
| Framework | Express.js | 4.18 | Mature, minimal, well-understood |
| Language | TypeScript | 5.x | Type safety prevents entire classes of bugs |
| ORM | Prisma | 5.x | Type-safe queries, migrations built-in |
| Database | PostgreSQL | 16 | ACID, JSON support, excellent indexing |
| Cache | Redis | 7 | Session store, rate-limit counters, job queues |
| Auth Tokens | JWT (jsonwebtoken) | 9.x | Stateless API auth |
| Session Store | connect-redis | 7.x | Redis-backed sessions for admin panel |
| Password Hash | bcryptjs | 2.x | Cost factor 12 (see Section 5) |
| MFA | speakeasy + qrcode | latest | TOTP-based MFA (RFC 6238) |
| File Uploads | multer + AWS S3 SDK | latest | Multipart upload, presigned URLs |
| Email | nodemailer + SendGrid | latest | Transactional email |
| Job Queue | BullMQ | 4.x | Background jobs (payroll, reports) |
| Validation | zod | 3.x | Runtime schema validation, paired with TypeScript |
| Rate Limiting | express-rate-limit | 7.x | IP-based, Redis-backed |
| Logging | winston + morgan | latest | Structured JSON logs |
| API Docs | swagger-jsdoc + swagger-ui-express | latest | Auto-generated docs |

### 1.2 Frontend
| Layer | Technology | Version | Reason |
|---|---|---|---|
| Framework | React | 18.x | Industry standard |
| Language | TypeScript | 5.x | Matches backend types |
| Build Tool | Vite | 5.x | Fastest dev server + HMR |
| Styling | Tailwind CSS | 3.x | Utility-first, consistent design |
| UI Components | shadcn/ui (Radix) | latest | Accessible, unstyled primitives |
| State: Server | TanStack Query | 5.x | Server state, cache, mutations |
| State: Client | Zustand | 4.x | Lightweight global store (auth, UI state) |
| Routing | React Router | 6.x | Nested layouts, protected routes |
| Forms | React Hook Form + zod | latest | Performant, integrated validation |
| Charts | Recharts | 2.x | Composable, React-native charts |
| HTTP Client | axios | 1.x | Interceptors for JWT refresh |
| Icons | lucide-react | latest | Consistent icon set |
| Date | date-fns | 3.x | Tree-shakeable date utils |

### 1.3 DevOps & Infrastructure
| Layer | Technology |
|---|---|
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Cloud | AWS (EC2 + RDS + ElastiCache + S3 + CloudFront) |
| SSL/TLS | Let's Encrypt (Certbot) via nginx reverse proxy |
| Process Manager | PM2 (inside Docker) |
| Monitoring | Sentry (errors) + Datadog agent (metrics) |
| Secrets | AWS Secrets Manager (production) / .env (dev) |

---

## SECTION 2: FOLDER STRUCTURE

```
hrm-erp/
├── .github/
│   └── workflows/
│       ├── ci.yml          # lint, test, build on PR
│       └── deploy.yml      # deploy on merge to main
├── docker/
│   ├── nginx/
│   │   └── nginx.conf
│   ├── postgres/
│   │   └── init.sql        # extensions, roles
│   └── redis/
│       └── redis.conf
├── server/                 # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts     # Prisma client singleton
│   │   │   ├── redis.ts        # Redis client
│   │   │   ├── s3.ts           # S3 client
│   │   │   └── env.ts          # Zod-validated env vars
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT verify + attach user
│   │   │   ├── authorize.ts    # RBAC permission check
│   │   │   ├── rateLimiter.ts  # Redis-backed rate limits
│   │   │   ├── validate.ts     # Zod request validator
│   │   │   ├── errorHandler.ts # Global error handler
│   │   │   ├── requestId.ts    # UUID per request (logging)
│   │   │   └── sanitize.ts     # XSS sanitization (xss library)
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.router.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.schema.ts    # Zod schemas
│   │   │   ├── users/
│   │   │   ├── employees/
│   │   │   ├── departments/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   ├── payroll/
│   │   │   ├── performance/
│   │   │   ├── recruitment/
│   │   │   ├── inventory/
│   │   │   ├── orders/
│   │   │   ├── suppliers/
│   │   │   ├── customers/
│   │   │   ├── invoices/
│   │   │   ├── shipments/
│   │   │   ├── products/
│   │   │   └── reports/
│   │   ├── jobs/               # BullMQ workers
│   │   │   ├── payroll.job.ts
│   │   │   ├── report.job.ts
│   │   │   └── email.job.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── crypto.ts       # token generation helpers
│   │   │   ├── pagination.ts
│   │   │   └── response.ts     # Standard API response wrapper
│   │   └── app.ts              # Express app setup
│   ├── prisma/
│   │   ├── schema.prisma       # Full schema (see Section 3)
│   │   ├── migrations/         # Auto-generated by Prisma
│   │   └── seed.ts             # Initial data seeder
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts       # Axios instance + interceptors
│   │   │   └── endpoints/      # One file per module
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   └── shared/         # DataTable, Modal, etc.
│   │   ├── features/           # One folder per module
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   ├── payroll/
│   │   │   ├── performance/
│   │   │   ├── inventory/
│   │   │   ├── orders/
│   │   │   ├── suppliers/
│   │   │   ├── customers/
│   │   │   ├── invoices/
│   │   │   └── reports/
│   │   ├── hooks/              # Custom React hooks
│   │   ├── store/              # Zustand stores
│   │   │   ├── auth.store.ts
│   │   │   └── ui.store.ts
│   │   ├── types/              # Shared TypeScript types
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
└── README.md
```

---

## SECTION 3: DATABASE SCHEMA (COMPLETE PRISMA SCHEMA)

```prisma
// prisma/schema.prisma
// PostgreSQL 16 — Full HRM + Distributor ERP Schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum Role {
  SUPER_ADMIN
  HR_MANAGER
  PAYROLL_MANAGER
  DEPARTMENT_HEAD
  EMPLOYEE
  DISTRIBUTOR_ADMIN
  DISTRIBUTOR_MANAGER
  SALES_REP
  SUPPLIER
  CUSTOMER_PORTAL
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERN
}

enum EmployeeStatus {
  ACTIVE
  ON_LEAVE
  TERMINATED
  RESIGNED
  SUSPENDED
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  HALF_DAY
  ON_LEAVE
  HOLIDAY
  WEEKEND
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum LeaveType {
  ANNUAL
  SICK
  MATERNITY
  PATERNITY
  EMERGENCY
  UNPAID
  COMPENSATORY
}

enum PayrollStatus {
  DRAFT
  PROCESSING
  APPROVED
  PAID
  FAILED
}

enum PerformanceRating {
  EXCEPTIONAL
  EXCEEDS_EXPECTATIONS
  MEETS_EXPECTATIONS
  NEEDS_IMPROVEMENT
  UNSATISFACTORY
}

enum OrderStatus {
  DRAFT
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  RETURNED
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  OVERDUE
  REFUNDED
}

enum StockMovementType {
  PURCHASE
  SALE
  RETURN
  ADJUSTMENT
  TRANSFER
  DAMAGE
}

enum InvoiceStatus {
  DRAFT
  SENT
  VIEWED
  PARTIAL
  PAID
  OVERDUE
  CANCELLED
}

enum ShipmentStatus {
  PENDING
  PACKED
  DISPATCHED
  IN_TRANSIT
  DELIVERED
  FAILED
  RETURNED
}

// ─────────────────────────────────────────────
// CORE: USERS & AUTH
// ─────────────────────────────────────────────

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  passwordHash      String    // bcrypt cost 12
  role              Role
  isActive          Boolean   @default(true)
  isEmailVerified   Boolean   @default(false)
  mfaEnabled        Boolean   @default(false)
  mfaSecret         String?   // encrypted at rest
  failedLoginCount  Int       @default(0)
  lockedUntil       DateTime?
  lastLoginAt       DateTime?
  lastLoginIp       String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  employee          Employee?
  refreshTokens     RefreshToken[]
  auditLogs         AuditLog[]
  passwordResets    PasswordReset[]
  sessions          Session[]

  @@index([email])
  @@index([role])
}

model RefreshToken {
  id          String   @id @default(cuid())
  token       String   @unique    // SHA-256 hashed
  userId      String
  expiresAt   DateTime
  revokedAt   DateTime?
  createdAt   DateTime @default(now())
  ipAddress   String?
  userAgent   String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

model Session {
  id         String   @id @default(cuid())
  userId     String
  data       Json
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model PasswordReset {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique    // SHA-256 of token
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([tokenHash])
}

model AuditLog {
  id         String   @id @default(cuid())
  userId     String?
  action     String   // CREATE, UPDATE, DELETE, LOGIN, etc.
  resource   String   // Table/entity name
  resourceId String?
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([resource])
  @@index([createdAt])
}

// ─────────────────────────────────────────────
// HRM: ORGANIZATION STRUCTURE
// ─────────────────────────────────────────────

model Company {
  id           String   @id @default(cuid())
  name         String
  logoUrl      String?
  address      String?
  city         String?
  country      String?
  taxId        String?
  currency     String   @default("USD")
  timezone     String   @default("UTC")
  fiscalYearStart Int   @default(1) // 1=January
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  departments  Department[]
  holidays     Holiday[]
  payPeriods   PayPeriod[]
}

model Department {
  id          String   @id @default(cuid())
  companyId   String
  name        String
  code        String   @unique
  headId      String?  // Employee ID of head
  parentId    String?  // Self-reference for hierarchy
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  company     Company     @relation(fields: [companyId], references: [id])
  parent      Department? @relation("DeptHierarchy", fields: [parentId], references: [id])
  children    Department[] @relation("DeptHierarchy")
  employees   Employee[]

  @@index([companyId])
}

model JobTitle {
  id        String     @id @default(cuid())
  title     String     @unique
  level     Int        // 1=junior, 5=C-suite
  minSalary Decimal?   @db.Decimal(15, 2)
  maxSalary Decimal?   @db.Decimal(15, 2)
  createdAt DateTime   @default(now())

  employees Employee[]
}

// ─────────────────────────────────────────────
// HRM: EMPLOYEES
// ─────────────────────────────────────────────

model Employee {
  id               String         @id @default(cuid())
  userId           String         @unique
  employeeCode     String         @unique // e.g. EMP-0001
  departmentId     String
  jobTitleId       String
  managerId        String?        // Self-reference
  firstName        String
  lastName         String
  dateOfBirth      DateTime?
  gender           String?
  nationalId       String?        @unique // Stored encrypted
  phone            String?
  emergencyContact Json?          // {name, phone, relation}
  address          Json?          // {street, city, state, zip, country}
  photoUrl         String?
  bankAccountInfo  Json?          // Stored encrypted
  employmentType   EmploymentType @default(FULL_TIME)
  status           EmployeeStatus @default(ACTIVE)
  hireDate         DateTime
  probationEndDate DateTime?
  terminationDate  DateTime?
  baseSalary       Decimal        @db.Decimal(15, 2)
  currency         String         @default("USD")
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  // Relations
  user             User           @relation(fields: [userId], references: [id])
  department       Department     @relation(fields: [departmentId], references: [id])
  jobTitle         JobTitle       @relation(fields: [jobTitleId], references: [id])
  manager          Employee?      @relation("ManagerSubordinate", fields: [managerId], references: [id])
  subordinates     Employee[]     @relation("ManagerSubordinate")
  attendances      Attendance[]
  leaveRequests    LeaveRequest[]
  leaveBalances    LeaveBalance[]
  payslips         Payslip[]
  performanceReviews PerformanceReview[] @relation("ReviewedEmployee")
  givenReviews     PerformanceReview[]   @relation("Reviewer")
  documents        EmployeeDocument[]
  recruitmentJobs  Job[]          @relation("HiringManager")

  @@index([departmentId])
  @@index([status])
  @@index([managerId])
}

model EmployeeDocument {
  id          String   @id @default(cuid())
  employeeId  String
  type        String   // CONTRACT, ID_PROOF, CERTIFICATE, etc.
  name        String
  fileUrl     String   // S3 presigned-compatible path
  uploadedAt  DateTime @default(now())

  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@index([employeeId])
}

// ─────────────────────────────────────────────
// HRM: ATTENDANCE
// ─────────────────────────────────────────────

model Shift {
  id         String   @id @default(cuid())
  name       String
  startTime  String   // "09:00"
  endTime    String   // "18:00"
  breakMins  Int      @default(60)
  workDays   Int[]    // [1,2,3,4,5] — 1=Monday

  attendances Attendance[]
}

model Attendance {
  id          String           @id @default(cuid())
  employeeId  String
  date        DateTime         @db.Date
  checkIn     DateTime?
  checkOut    DateTime?
  shiftId     String?
  status      AttendanceStatus @default(PRESENT)
  hoursWorked Decimal?         @db.Decimal(5, 2)
  overtime    Decimal?         @db.Decimal(5, 2)
  notes       String?
  source      String           @default("MANUAL") // BIOMETRIC, MOBILE, MANUAL
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  employee Employee @relation(fields: [employeeId], references: [id])
  shift    Shift?   @relation(fields: [shiftId], references: [id])

  @@unique([employeeId, date])
  @@index([employeeId])
  @@index([date])
}

model Holiday {
  id          String   @id @default(cuid())
  companyId   String
  name        String
  date        DateTime @db.Date
  isRecurring Boolean  @default(false) // Repeat every year

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])
  @@index([date])
}

// ─────────────────────────────────────────────
// HRM: LEAVE MANAGEMENT
// ─────────────────────────────────────────────

model LeavePolicy {
  id              String    @id @default(cuid())
  leaveType       LeaveType
  annualAllowance Decimal   @db.Decimal(5, 1)
  carryForward    Decimal   @db.Decimal(5, 1) @default(0)
  encashable      Boolean   @default(false)
  requiresApproval Boolean  @default(true)
  minDaysNotice   Int       @default(0)

  balances LeaveBalance[]
}

model LeaveBalance {
  id         String    @id @default(cuid())
  employeeId String
  policyId   String
  year       Int
  allocated  Decimal   @db.Decimal(5, 1)
  used       Decimal   @db.Decimal(5, 1) @default(0)
  pending    Decimal   @db.Decimal(5, 1) @default(0)
  remaining  Decimal   @db.Decimal(5, 1)

  employee Employee    @relation(fields: [employeeId], references: [id])
  policy   LeavePolicy @relation(fields: [policyId], references: [id])

  @@unique([employeeId, policyId, year])
  @@index([employeeId])
}

model LeaveRequest {
  id          String      @id @default(cuid())
  employeeId  String
  leaveType   LeaveType
  startDate   DateTime    @db.Date
  endDate     DateTime    @db.Date
  totalDays   Decimal     @db.Decimal(5, 1)
  reason      String
  status      LeaveStatus @default(PENDING)
  approverId  String?
  approvedAt  DateTime?
  rejectionNote String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([employeeId])
  @@index([status])
  @@index([startDate, endDate])
}

// ─────────────────────────────────────────────
// HRM: PAYROLL
// ─────────────────────────────────────────────

model PayPeriod {
  id          String        @id @default(cuid())
  companyId   String
  name        String        // "January 2025"
  startDate   DateTime      @db.Date
  endDate     DateTime      @db.Date
  payDate     DateTime      @db.Date
  status      PayrollStatus @default(DRAFT)
  createdAt   DateTime      @default(now())
  processedAt DateTime?

  company  Company   @relation(fields: [companyId], references: [id])
  payslips Payslip[]

  @@index([companyId])
  @@index([status])
}

model SalaryComponent {
  id         String   @id @default(cuid())
  name       String   // "Basic Pay", "HRA", "Transport Allowance", "Income Tax"
  code       String   @unique
  type       String   // EARNING | DEDUCTION
  isFixed    Boolean  @default(true)
  isTaxable  Boolean  @default(true)
  formula    String?  // e.g. "baseSalary * 0.40" for HRA
  createdAt  DateTime @default(now())

  payslipLines PayslipLine[]
}

model Payslip {
  id            String        @id @default(cuid())
  employeeId    String
  payPeriodId   String
  grossEarnings Decimal       @db.Decimal(15, 2)
  totalDeductions Decimal     @db.Decimal(15, 2)
  netPay        Decimal       @db.Decimal(15, 2)
  status        PayrollStatus @default(DRAFT)
  paidAt        DateTime?
  paymentMethod String?       // BANK_TRANSFER, CHEQUE, CASH
  createdAt     DateTime      @default(now())

  employee   Employee    @relation(fields: [employeeId], references: [id])
  payPeriod  PayPeriod   @relation(fields: [payPeriodId], references: [id])
  lines      PayslipLine[]

  @@unique([employeeId, payPeriodId])
  @@index([employeeId])
  @@index([payPeriodId])
}

model PayslipLine {
  id          String @id @default(cuid())
  payslipId   String
  componentId String
  amount      Decimal @db.Decimal(15, 2)

  payslip   Payslip         @relation(fields: [payslipId], references: [id], onDelete: Cascade)
  component SalaryComponent @relation(fields: [componentId], references: [id])

  @@index([payslipId])
}

// ─────────────────────────────────────────────
// HRM: PERFORMANCE
// ─────────────────────────────────────────────

model ReviewCycle {
  id        String   @id @default(cuid())
  name      String   // "Q1 2025 Performance Review"
  startDate DateTime @db.Date
  endDate   DateTime @db.Date
  isActive  Boolean  @default(true)

  reviews PerformanceReview[]
}

model PerformanceReview {
  id           String            @id @default(cuid())
  cycleId      String
  employeeId   String
  reviewerId   String
  rating       PerformanceRating?
  score        Decimal?          @db.Decimal(4, 2) // 0–100
  goals        Json?             // [{goal, weight, score}]
  strengths    String?
  improvements String?
  comments     String?
  submittedAt  DateTime?
  createdAt    DateTime          @default(now())
  updatedAt    DateTime          @updatedAt

  cycle    ReviewCycle @relation(fields: [cycleId], references: [id])
  employee Employee    @relation("ReviewedEmployee", fields: [employeeId], references: [id])
  reviewer Employee    @relation("Reviewer", fields: [reviewerId], references: [id])

  @@unique([cycleId, employeeId, reviewerId])
  @@index([employeeId])
}

// ─────────────────────────────────────────────
// HRM: RECRUITMENT
// ─────────────────────────────────────────────

model Job {
  id              String   @id @default(cuid())
  title           String
  departmentId    String?
  hiringManagerId String?
  description     String
  requirements    String
  type            String   // FULL_TIME, PART_TIME, CONTRACT
  location        String?
  salaryMin       Decimal? @db.Decimal(15, 2)
  salaryMax       Decimal? @db.Decimal(15, 2)
  isPublished     Boolean  @default(false)
  closingDate     DateTime?
  createdAt       DateTime @default(now())

  hiringManager Employee?    @relation("HiringManager", fields: [hiringManagerId], references: [id])
  applications  Application[]

  @@index([isPublished])
}

model Application {
  id           String   @id @default(cuid())
  jobId        String
  candidateName String
  candidateEmail String
  phone        String?
  resumeUrl    String?
  coverLetter  String?
  status       String   @default("NEW") // NEW, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED
  stage        Int      @default(1)
  notes        String?
  appliedAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  job       Job        @relation(fields: [jobId], references: [id])
  interviews Interview[]

  @@index([jobId])
  @@index([status])
}

model Interview {
  id            String   @id @default(cuid())
  applicationId String
  scheduledAt   DateTime
  durationMins  Int      @default(60)
  type          String   // PHONE, VIDEO, IN_PERSON, TECHNICAL
  interviewers  String[] // User IDs
  location      String?
  meetingLink   String?
  feedback      String?
  rating        Int?     // 1-5
  status        String   @default("SCHEDULED") // SCHEDULED, COMPLETED, CANCELLED

  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
  @@index([scheduledAt])
}

// ─────────────────────────────────────────────
// DISTRIBUTOR ERP: PRODUCTS & INVENTORY
// ─────────────────────────────────────────────

model Category {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  parentId    String?
  description String?
  imageUrl    String?

  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  products Product[]
}

model Product {
  id               String   @id @default(cuid())
  sku              String   @unique
  name             String
  description      String?
  categoryId       String?
  unit             String   @default("PIECE") // PIECE, KG, LITRE, BOX
  purchasePrice    Decimal  @db.Decimal(15, 2)
  sellingPrice     Decimal  @db.Decimal(15, 2)
  taxRate          Decimal  @db.Decimal(5, 2) @default(0)
  reorderLevel     Int      @default(10)
  maxStockLevel    Int?
  weight           Decimal? @db.Decimal(10, 3)
  dimensions       Json?    // {l, w, h, unit}
  imageUrl         String?
  barcode          String?  @unique
  isActive         Boolean  @default(true)
  trackInventory   Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  category      Category?       @relation(fields: [categoryId], references: [id])
  inventoryItems InventoryItem[]
  orderItems     OrderItem[]
  stockMovements StockMovement[]
  supplierProducts SupplierProduct[]

  @@index([categoryId])
  @@index([isActive])
  @@index([sku])
}

model Warehouse {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique
  address   Json?
  isDefault Boolean  @default(false)
  managerId String?  // User ID
  createdAt DateTime @default(now())

  inventoryItems InventoryItem[]
  stockMovements StockMovement[]
  shipments      Shipment[]
}

model InventoryItem {
  id             String   @id @default(cuid())
  productId      String
  warehouseId    String
  quantity       Int      @default(0)
  reservedQty    Int      @default(0) // Reserved by pending orders
  availableQty   Int      @default(0) // quantity - reservedQty
  batchNumber    String?
  expiryDate     DateTime?
  locationCode   String?  // Bin/rack location in warehouse
  updatedAt      DateTime @updatedAt

  product   Product   @relation(fields: [productId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])

  @@unique([productId, warehouseId, batchNumber])
  @@index([productId])
  @@index([warehouseId])
  @@index([availableQty])
}

model StockMovement {
  id          String            @id @default(cuid())
  productId   String
  warehouseId String
  type        StockMovementType
  quantity    Int               // Positive for IN, negative for OUT
  reference   String?           // Order number, PO number, etc.
  notes       String?
  performedBy String?           // User ID
  createdAt   DateTime          @default(now())

  product   Product   @relation(fields: [productId], references: [id])
  warehouse Warehouse @relation(fields: [warehouseId], references: [id])

  @@index([productId])
  @@index([warehouseId])
  @@index([createdAt])
}

// ─────────────────────────────────────────────
// DISTRIBUTOR ERP: SUPPLIERS
// ─────────────────────────────────────────────

model Supplier {
  id           String   @id @default(cuid())
  code         String   @unique // SUP-0001
  name         String
  contactName  String?
  email        String?
  phone        String?
  address      Json?
  taxId        String?
  paymentTerms Int      @default(30) // Days
  currency     String   @default("USD")
  rating       Decimal? @db.Decimal(3, 2) // 0–5
  isActive     Boolean  @default(true)
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  supplierProducts SupplierProduct[]
  purchaseOrders   PurchaseOrder[]
}

model SupplierProduct {
  id             String   @id @default(cuid())
  supplierId     String
  productId      String
  supplierSku    String?  // Supplier's own SKU for this product
  costPrice      Decimal  @db.Decimal(15, 2)
  leadTimeDays   Int      @default(7)
  minOrderQty    Int      @default(1)
  isPreferred    Boolean  @default(false)

  supplier Supplier @relation(fields: [supplierId], references: [id])
  product  Product  @relation(fields: [productId], references: [id])

  @@unique([supplierId, productId])
}

model PurchaseOrder {
  id             String        @id @default(cuid())
  poNumber       String        @unique // PO-2025-0001
  supplierId     String
  warehouseId    String?
  status         String        @default("DRAFT") // DRAFT, SENT, CONFIRMED, RECEIVED, CANCELLED
  totalAmount    Decimal       @db.Decimal(15, 2) @default(0)
  currency       String        @default("USD")
  expectedDate   DateTime?
  receivedDate   DateTime?
  notes          String?
  createdBy      String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  supplier Supplier          @relation(fields: [supplierId], references: [id])
  items    PurchaseOrderItem[]

  @@index([supplierId])
  @@index([status])
}

model PurchaseOrderItem {
  id              String   @id @default(cuid())
  purchaseOrderId String
  productId       String
  quantity        Int
  unitCost        Decimal  @db.Decimal(15, 2)
  totalCost       Decimal  @db.Decimal(15, 2)
  receivedQty     Int      @default(0)

  purchaseOrder PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)

  @@index([purchaseOrderId])
}

// ─────────────────────────────────────────────
// DISTRIBUTOR ERP: CUSTOMERS & CRM
// ─────────────────────────────────────────────

model Customer {
  id           String   @id @default(cuid())
  code         String   @unique // CUST-0001
  name         String
  contactName  String?
  email        String?  @unique
  phone        String?
  address      Json?
  billingAddress Json?
  shippingAddress Json?
  taxId        String?
  paymentTerms Int      @default(30)
  creditLimit  Decimal? @db.Decimal(15, 2)
  currency     String   @default("USD")
  priceListId  String?
  salesRepId   String?  // User ID
  isActive     Boolean  @default(true)
  notes        String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  orders    Order[]
  contacts  CustomerContact[]
  activities CustomerActivity[]
  invoices  Invoice[]

  @@index([isActive])
  @@index([email])
}

model CustomerContact {
  id         String   @id @default(cuid())
  customerId String
  name       String
  email      String?
  phone      String?
  role       String?  // CEO, Purchase Manager, etc.
  isPrimary  Boolean  @default(false)

  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([customerId])
}

model CustomerActivity {
  id         String   @id @default(cuid())
  customerId String
  type       String   // CALL, EMAIL, MEETING, NOTE, DEMO
  subject    String
  notes      String?
  outcome    String?
  scheduledAt DateTime?
  completedAt DateTime?
  userId     String?
  createdAt  DateTime @default(now())

  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([customerId])
  @@index([scheduledAt])
}

model PriceList {
  id        String   @id @default(cuid())
  name      String
  currency  String   @default("USD")
  discount  Decimal  @db.Decimal(5, 2) @default(0) // % off standard price
  isDefault Boolean  @default(false)
  validFrom DateTime?
  validTo   DateTime?

  items PriceListItem[]
}

model PriceListItem {
  id          String  @id @default(cuid())
  priceListId String
  productId   String
  price       Decimal @db.Decimal(15, 2) // Override price for this product

  priceList PriceList @relation(fields: [priceListId], references: [id], onDelete: Cascade)

  @@unique([priceListId, productId])
}

// ─────────────────────────────────────────────
// DISTRIBUTOR ERP: SALES ORDERS
// ─────────────────────────────────────────────

model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique // ORD-2025-0001
  customerId      String
  status          OrderStatus @default(DRAFT)
  paymentStatus   PaymentStatus @default(PENDING)
  subtotal        Decimal     @db.Decimal(15, 2) @default(0)
  taxAmount       Decimal     @db.Decimal(15, 2) @default(0)
  discountAmount  Decimal     @db.Decimal(15, 2) @default(0)
  shippingCost    Decimal     @db.Decimal(15, 2) @default(0)
  totalAmount     Decimal     @db.Decimal(15, 2) @default(0)
  currency        String      @default("USD")
  shippingAddress Json?
  billingAddress  Json?
  notes           String?
  expectedDate    DateTime?
  deliveredAt     DateTime?
  createdBy       String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  customer  Customer    @relation(fields: [customerId], references: [id])
  items     OrderItem[]
  invoices  Invoice[]
  shipments Shipment[]
  payments  Payment[]

  @@index([customerId])
  @@index([status])
  @@index([createdAt])
  @@index([paymentStatus])
}

model OrderItem {
  id         String  @id @default(cuid())
  orderId    String
  productId  String
  quantity   Int
  unitPrice  Decimal @db.Decimal(15, 2)
  discount   Decimal @db.Decimal(5, 2) @default(0) // Percentage
  taxRate    Decimal @db.Decimal(5, 2) @default(0)
  lineTotal  Decimal @db.Decimal(15, 2)
  notes      String?

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])

  @@index([orderId])
}

// ─────────────────────────────────────────────
// DISTRIBUTOR ERP: INVOICES & PAYMENTS
// ─────────────────────────────────────────────

model Invoice {
  id            String        @id @default(cuid())
  invoiceNumber String        @unique // INV-2025-0001
  orderId       String?
  customerId    String
  status        InvoiceStatus @default(DRAFT)
  subtotal      Decimal       @db.Decimal(15, 2)
  taxAmount     Decimal       @db.Decimal(15, 2) @default(0)
  discountAmount Decimal      @db.Decimal(15, 2) @default(0)
  totalAmount   Decimal       @db.Decimal(15, 2)
  amountPaid    Decimal       @db.Decimal(15, 2) @default(0)
  amountDue     Decimal       @db.Decimal(15, 2)
  currency      String        @default("USD")
  dueDate       DateTime
  issuedDate    DateTime      @default(now())
  paidDate      DateTime?
  notes         String?
  termsAndConditions String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  order    Order?    @relation(fields: [orderId], references: [id])
  customer Customer  @relation(fields: [customerId], references: [id])
  payments Payment[]

  @@index([customerId])
  @@index([status])
  @@index([dueDate])
}

model Payment {
  id            String   @id @default(cuid())
  invoiceId     String?
  orderId       String?
  customerId    String?
  amount        Decimal  @db.Decimal(15, 2)
  currency      String   @default("USD")
  method        String   // CASH, BANK_TRANSFER, CHEQUE, CARD, CRYPTO
  reference     String?  // Bank ref, cheque number, transaction ID
  paidAt        DateTime @default(now())
  notes         String?
  createdBy     String?

  invoice Invoice? @relation(fields: [invoiceId], references: [id])
  order   Order?   @relation(fields: [orderId], references: [id])

  @@index([invoiceId])
  @@index([orderId])
  @@index([paidAt])
}

// ─────────────────────────────────────────────
// DISTRIBUTOR ERP: SHIPMENTS
// ─────────────────────────────────────────────

model Shipment {
  id              String         @id @default(cuid())
  shipmentNumber  String         @unique // SHP-2025-0001
  orderId         String
  warehouseId     String?
  status          ShipmentStatus @default(PENDING)
  carrier         String?        // FedEx, DHL, etc.
  trackingNumber  String?
  trackingUrl     String?
  shippedAt       DateTime?
  estimatedArrival DateTime?
  deliveredAt     DateTime?
  weight          Decimal?       @db.Decimal(10, 3)
  dimensions      Json?
  shippingCost    Decimal?       @db.Decimal(15, 2)
  notes           String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  order     Order     @relation(fields: [orderId], references: [id])
  warehouse Warehouse? @relation(fields: [warehouseId], references: [id])
  items     ShipmentItem[]

  @@index([orderId])
  @@index([status])
}

model ShipmentItem {
  id         String @id @default(cuid())
  shipmentId String
  productId  String
  quantity   Int

  shipment Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)

  @@index([shipmentId])
}
```

---

## SECTION 4: AUTHENTICATION & AUTHORIZATION (COMPLETE)

### 4.1 JWT Strategy

```typescript
// server/src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  JWT_ACCESS_SECRET: z.string().min(64),    // 64+ char random string
  JWT_REFRESH_SECRET: z.string().min(64),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_COST: z.coerce.number().min(12).default(12),
});
export const env = envSchema.parse(process.env);
```

```typescript
// server/src/modules/auth/auth.service.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../config/database';

// ── Token Generation ─────────────────────────────────────────────
export function generateAccessToken(userId: string, role: string) {
  return jwt.sign(
    { sub: userId, role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN, algorithm: 'HS256' }
  );
}

export function generateRefreshToken(userId: string) {
  const token = crypto.randomBytes(64).toString('hex'); // 128-char hex
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

// ── Password ─────────────────────────────────────────────────────
export async function hashPassword(password: string) {
  return bcrypt.hash(password, env.BCRYPT_COST); // Cost factor 12
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

// ── Login ─────────────────────────────────────────────────────────
export async function login(email: string, password: string, ip: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  
  if (!user || !user.isActive) throw new Error('INVALID_CREDENTIALS');
  
  // Check account lock
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new Error('ACCOUNT_LOCKED');
  }
  
  const valid = await verifyPassword(password, user.passwordHash);
  
  if (!valid) {
    // Increment failed attempts, lock after 5
    const failedCount = user.failedLoginCount + 1;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failedCount,
        lockedUntil: failedCount >= 5
          ? new Date(Date.now() + 30 * 60 * 1000) // 30 min lockout
          : null,
      },
    });
    throw new Error('INVALID_CREDENTIALS');
  }
  
  // Reset failed count on success
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      lastLoginIp: ip,
    },
  });
  
  // If MFA enabled, return partial token requiring MFA
  if (user.mfaEnabled) {
    const mfaToken = jwt.sign(
      { sub: user.id, type: 'mfa_required' },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '5m' }
    );
    return { requiresMfa: true, mfaToken };
  }
  
  return issueTokens(user.id, user.role, ip);
}

export async function issueTokens(userId: string, role: string, ip: string) {
  const accessToken = generateAccessToken(userId, role);
  const { token: refreshToken, tokenHash } = generateRefreshToken(userId);
  
  await prisma.refreshToken.create({
    data: {
      userId,
      token: tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: ip,
    },
  });
  
  return { accessToken, refreshToken };
}
```

### 4.2 RBAC Middleware

```typescript
// server/src/middleware/authorize.ts

import type { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

// Permission definitions — adjust to business needs
const PERMISSIONS: Record<string, Role[]> = {
  // HR Permissions
  'employees:read':   [Role.SUPER_ADMIN, Role.HR_MANAGER, Role.DEPARTMENT_HEAD, Role.PAYROLL_MANAGER],
  'employees:write':  [Role.SUPER_ADMIN, Role.HR_MANAGER],
  'employees:delete': [Role.SUPER_ADMIN],
  'payroll:read':     [Role.SUPER_ADMIN, Role.HR_MANAGER, Role.PAYROLL_MANAGER],
  'payroll:write':    [Role.SUPER_ADMIN, Role.PAYROLL_MANAGER],
  'payroll:approve':  [Role.SUPER_ADMIN, Role.HR_MANAGER],
  'attendance:read':  [Role.SUPER_ADMIN, Role.HR_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE],
  'attendance:write': [Role.SUPER_ADMIN, Role.HR_MANAGER, Role.EMPLOYEE],
  'leave:read':       [Role.SUPER_ADMIN, Role.HR_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE],
  'leave:approve':    [Role.SUPER_ADMIN, Role.HR_MANAGER, Role.DEPARTMENT_HEAD],
  'performance:read': [Role.SUPER_ADMIN, Role.HR_MANAGER, Role.DEPARTMENT_HEAD, Role.EMPLOYEE],
  'performance:write':[Role.SUPER_ADMIN, Role.HR_MANAGER, Role.DEPARTMENT_HEAD],
  // ERP Permissions
  'orders:read':      [Role.SUPER_ADMIN, Role.DISTRIBUTOR_ADMIN, Role.DISTRIBUTOR_MANAGER, Role.SALES_REP],
  'orders:write':     [Role.SUPER_ADMIN, Role.DISTRIBUTOR_ADMIN, Role.DISTRIBUTOR_MANAGER, Role.SALES_REP],
  'orders:approve':   [Role.SUPER_ADMIN, Role.DISTRIBUTOR_ADMIN, Role.DISTRIBUTOR_MANAGER],
  'inventory:read':   [Role.SUPER_ADMIN, Role.DISTRIBUTOR_ADMIN, Role.DISTRIBUTOR_MANAGER, Role.SALES_REP],
  'inventory:write':  [Role.SUPER_ADMIN, Role.DISTRIBUTOR_ADMIN, Role.DISTRIBUTOR_MANAGER],
  'invoices:read':    [Role.SUPER_ADMIN, Role.DISTRIBUTOR_ADMIN, Role.DISTRIBUTOR_MANAGER, Role.CUSTOMER_PORTAL],
  'invoices:write':   [Role.SUPER_ADMIN, Role.DISTRIBUTOR_ADMIN, Role.DISTRIBUTOR_MANAGER],
  'suppliers:read':   [Role.SUPER_ADMIN, Role.DISTRIBUTOR_ADMIN, Role.DISTRIBUTOR_MANAGER],
  'suppliers:write':  [Role.SUPER_ADMIN, Role.DISTRIBUTOR_ADMIN],
  'reports:read':     [Role.SUPER_ADMIN, Role.HR_MANAGER, Role.DISTRIBUTOR_ADMIN],
  'admin:all':        [Role.SUPER_ADMIN],
};

export function authorize(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // Set by auth middleware
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    
    const allowed = PERMISSIONS[permission] ?? [];
    if (!allowed.includes(user.role as Role)) {
      return res.status(403).json({ error: 'Forbidden', required: permission });
    }
    
    next();
  };
}

// Employees can only access their own data
export function ownerOrAdmin(getResourceUserId: (req: Request) => Promise<string | null>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user!;
    if ([Role.SUPER_ADMIN, Role.HR_MANAGER].includes(user.role as Role)) return next();
    
    const resourceUserId = await getResourceUserId(req);
    if (resourceUserId === user.id) return next();
    
    return res.status(403).json({ error: 'Forbidden' });
  };
}
```

### 4.3 Auth Middleware

```typescript
// server/src/middleware/auth.ts

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: string; email: string };
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    if (payload.type !== 'access') throw new Error('Wrong token type');
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

---

## SECTION 5: SECURITY IMPLEMENTATION (OWASP TOP 10)

### 5.1 Express Security Setup

```typescript
// server/src/app.ts

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { xss } from 'xss';
import { redis } from './config/redis';

const app = express();

// ── HTTP Security Headers (helmet defaults + custom CSP) ──────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// ── Body Parsing (limit size to prevent DoS) ──────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Global Rate Limiting ──────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ sendCommand: (...args) => redis.sendCommand(args) }),
});
app.use(globalLimiter);

// Strict limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 login attempts per 15 min per IP
  store: new RedisStore({ sendCommand: (...args) => redis.sendCommand(args) }),
  message: { error: 'Too many authentication attempts' },
});

// ── XSS Sanitization Middleware ───────────────────────────────────
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
});

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') return xss(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeObject(v)])
    );
  }
  return obj;
}

export default app;
```

### 5.2 Input Validation (Zod)

```typescript
// server/src/modules/auth/auth.schema.ts

import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(8).max(128),
    mfaCode: z.string().length(6).optional(),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z
      .string()
      .min(12, 'At least 12 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[a-z]/, 'Must contain lowercase')
      .regex(/[0-9]/, 'Must contain number')
      .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
    firstName: z.string().min(1).max(50).trim(),
    lastName: z.string().min(1).max(50).trim(),
    role: z.enum(['HR_MANAGER', 'EMPLOYEE', 'DISTRIBUTOR_MANAGER', 'SALES_REP']),
  }),
});
```

```typescript
// server/src/middleware/validate.ts

import type { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(err);
    }
  };
}
```

### 5.3 CSRF Protection

```typescript
// Use double-submit cookie pattern for state-changing requests
// client/src/api/client.ts

import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Attach access token to every request
apiClient.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push(token => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const { data } = await apiClient.post('/auth/refresh');
        useAuthStore.getState().setTokens(data.accessToken);
        refreshQueue.forEach(cb => cb(data.accessToken));
        refreshQueue = [];
        return apiClient(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

---

## SECTION 6: API ENDPOINTS (COMPLETE REFERENCE)

### 6.1 Auth Module

```
POST   /api/v1/auth/register          Create new user account
POST   /api/v1/auth/login             Login with email + password
POST   /api/v1/auth/logout            Revoke refresh token
POST   /api/v1/auth/refresh           Refresh access token
POST   /api/v1/auth/mfa/setup         Enable MFA (returns QR code)
POST   /api/v1/auth/mfa/verify        Verify MFA code during login
POST   /api/v1/auth/mfa/disable       Disable MFA (requires password)
POST   /api/v1/auth/forgot-password   Send reset email
POST   /api/v1/auth/reset-password    Reset password with token
GET    /api/v1/auth/me                Get current user profile
PATCH  /api/v1/auth/me                Update profile
PATCH  /api/v1/auth/change-password   Change password
```

**POST /api/v1/auth/login — Request/Response:**
```json
// Request
{ "email": "admin@company.com", "password": "SecureP@ss123" }

// Response 200 (no MFA)
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "f3a2bc...",
  "user": { "id": "cuid...", "email": "admin@company.com", "role": "SUPER_ADMIN" }
}

// Response 200 (MFA required)
{ "requiresMfa": true, "mfaToken": "eyJ..." }

// Response 401
{ "error": "INVALID_CREDENTIALS" }

// Response 429
{ "error": "Too many authentication attempts. Try again in 15 minutes." }
```

### 6.2 Employee Module

```
GET    /api/v1/employees              List employees (paginated, filterable)
POST   /api/v1/employees              Create employee
GET    /api/v1/employees/:id          Get employee details
PATCH  /api/v1/employees/:id          Update employee
DELETE /api/v1/employees/:id          Soft-terminate employee
GET    /api/v1/employees/:id/attendance    Employee attendance history
GET    /api/v1/employees/:id/leaves        Employee leave records
GET    /api/v1/employees/:id/payslips      Employee payslips
GET    /api/v1/employees/:id/performance   Employee performance reviews
POST   /api/v1/employees/:id/documents     Upload document
GET    /api/v1/employees/org-chart         Org chart tree
```

**GET /api/v1/employees — Query Params:**
```
?page=1&limit=20&departmentId=xxx&status=ACTIVE&search=John&sortBy=firstName&sortOrder=asc
```

**GET /api/v1/employees — Response:**
```json
{
  "data": [
    {
      "id": "cuid...",
      "employeeCode": "EMP-0042",
      "firstName": "Priya",
      "lastName": "Sharma",
      "email": "priya@company.com",
      "department": { "id": "...", "name": "Engineering" },
      "jobTitle": { "id": "...", "title": "Senior Developer" },
      "status": "ACTIVE",
      "hireDate": "2022-03-15",
      "baseSalary": 85000
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 }
}
```

### 6.3 Attendance Module

```
GET    /api/v1/attendance             List (filterable by employee, date range, status)
POST   /api/v1/attendance             Log attendance (check-in/out)
PATCH  /api/v1/attendance/:id         Update attendance record
GET    /api/v1/attendance/summary     Monthly summary for dashboard
GET    /api/v1/attendance/report      Detailed report (CSV export available)
POST   /api/v1/attendance/bulk        Bulk import from biometric device/CSV
```

### 6.4 Leave Module

```
GET    /api/v1/leaves                 List leave requests (with filters)
POST   /api/v1/leaves                 Submit leave request
GET    /api/v1/leaves/:id             Get leave request details
PATCH  /api/v1/leaves/:id/approve     Approve leave request
PATCH  /api/v1/leaves/:id/reject      Reject leave request
DELETE /api/v1/leaves/:id             Cancel leave request (by employee)
GET    /api/v1/leaves/balances        Get leave balances for current user
GET    /api/v1/leaves/calendar        Team leave calendar (avoid conflicts)
```

### 6.5 Payroll Module

```
GET    /api/v1/payroll/periods        List pay periods
POST   /api/v1/payroll/periods        Create pay period
POST   /api/v1/payroll/run/:periodId  Run payroll computation for period
GET    /api/v1/payroll/run/:periodId  Get payroll run results (all employees)
POST   /api/v1/payroll/approve/:periodId  Approve and mark as paid
GET    /api/v1/payroll/payslips/:id   Get individual payslip
GET    /api/v1/payroll/payslips/:id/pdf  Download payslip as PDF
GET    /api/v1/payroll/components     List salary components
POST   /api/v1/payroll/components     Create salary component
```

### 6.6 Orders Module

```
GET    /api/v1/orders                 List orders (paginated, filterable)
POST   /api/v1/orders                 Create order (draft)
GET    /api/v1/orders/:id             Get order details
PATCH  /api/v1/orders/:id             Update order (if draft)
POST   /api/v1/orders/:id/confirm     Confirm order → reserve inventory
POST   /api/v1/orders/:id/cancel      Cancel order → release inventory
POST   /api/v1/orders/:id/invoice     Generate invoice from order
GET    /api/v1/orders/:id/timeline    Order status timeline
```

**POST /api/v1/orders — Request:**
```json
{
  "customerId": "cuid...",
  "items": [
    { "productId": "cuid...", "quantity": 50, "unitPrice": 10.50, "discount": 5 },
    { "productId": "cuid...", "quantity": 100, "unitPrice": 5.00, "discount": 0 }
  ],
  "shippingAddress": { "street": "123 Main St", "city": "Mumbai", "country": "IN" },
  "notes": "Urgent delivery",
  "expectedDate": "2025-08-01"
}
```

**POST /api/v1/orders — Response:**
```json
{
  "data": {
    "id": "cuid...",
    "orderNumber": "ORD-2025-0042",
    "status": "DRAFT",
    "subtotal": 1025.00,
    "taxAmount": 184.50,
    "totalAmount": 1209.50,
    "items": [ ... ],
    "createdAt": "2025-07-12T10:30:00Z"
  }
}
```

### 6.7 Inventory Module

```
GET    /api/v1/inventory              List products with stock levels
GET    /api/v1/inventory/:productId   Stock for specific product (all warehouses)
POST   /api/v1/inventory/adjust       Manual stock adjustment (with reason)
GET    /api/v1/inventory/low-stock    Products below reorder level
GET    /api/v1/inventory/movements    Stock movement history (filterable)
GET    /api/v1/inventory/valuation    Total inventory valuation report
```

### 6.8 Invoice Module

```
GET    /api/v1/invoices               List invoices
POST   /api/v1/invoices               Create invoice manually
GET    /api/v1/invoices/:id           Invoice details
POST   /api/v1/invoices/:id/send      Email invoice to customer
GET    /api/v1/invoices/:id/pdf       Download invoice PDF
POST   /api/v1/invoices/:id/payment   Record payment
GET    /api/v1/invoices/overdue       List overdue invoices
GET    /api/v1/invoices/aging         Accounts receivable aging report
```

### 6.9 Reports Module

```
GET    /api/v1/reports/hr/headcount        Headcount by department
GET    /api/v1/reports/hr/turnover         Employee turnover rate
GET    /api/v1/reports/hr/attendance       Attendance compliance
GET    /api/v1/reports/hr/payroll-summary  Monthly payroll summary
GET    /api/v1/reports/erp/sales           Sales by period/customer/product
GET    /api/v1/reports/erp/revenue         Revenue and profit margins
GET    /api/v1/reports/erp/inventory       Inventory status and aging
GET    /api/v1/reports/erp/supplier        Supplier performance
GET    /api/v1/reports/erp/customer        Customer analytics (RFM)
GET    /api/v1/reports/dashboard           Combined executive dashboard KPIs
```

**Standard API Response Wrapper:**
```typescript
// server/src/utils/response.ts

export function sendSuccess(res: Response, data: any, statusCode = 200, meta?: any) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta && { meta }),
    timestamp: new Date().toISOString(),
  });
}

export function sendError(res: Response, message: string, statusCode = 400, code?: string) {
  return res.status(statusCode).json({
    success: false,
    error: { message, code },
    timestamp: new Date().toISOString(),
  });
}

// Error handler middleware
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error({ err, requestId: req.headers['x-request-id'] });
  
  if (err.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma unique constraint violations, etc.
    return sendError(res, 'Database constraint violation', 409, 'DB_CONSTRAINT');
  }
  
  return sendError(res, 'Internal server error', 500, 'INTERNAL_ERROR');
}
```

---

## SECTION 7: ENVIRONMENT VARIABLES

```bash
# .env.example — REQUIRED FIELDS (all must be set in production)

# Server
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173

# Database — PostgreSQL 16
DATABASE_URL=postgresql://hrm_user:strongpassword@localhost:5432/hrm_erp_db?schema=public&connection_limit=20&pool_timeout=10

# Redis 7
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT — Generate with: openssl rand -hex 64
JWT_ACCESS_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<different-64-char-random-string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cookies
COOKIE_SECRET=<32-char-random-string>

# Bcrypt
BCRYPT_COST=12

# AWS (for S3 file storage)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=hrm-erp-files
AWS_CLOUDFRONT_DOMAIN=

# Email (SendGrid)
SENDGRID_API_KEY=
EMAIL_FROM=noreply@yourcompany.com
EMAIL_FROM_NAME=HRM ERP System

# App
APP_URL=http://localhost:5173
API_URL=http://localhost:3000

# Sentry (Error Monitoring)
SENTRY_DSN=

# Encryption (for sensitive fields like bank account, national ID)
ENCRYPTION_KEY=<32-byte-hex-key>  # openssl rand -hex 32
```

---

## SECTION 8: FRONTEND ARCHITECTURE

### 8.1 Route Structure

```typescript
// client/src/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Protected — all roles */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          
          {/* HRM Routes */}
          <Route element={<ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','DEPARTMENT_HEAD']} />}>
            <Route path="/employees" element={<EmployeeListPage />} />
            <Route path="/employees/new" element={<EmployeeCreatePage />} />
            <Route path="/employees/:id" element={<EmployeeDetailPage />} />
            <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
          </Route>
          
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leave" element={<LeavePage />} />
          <Route path="/leave/apply" element={<LeaveApplyPage />} />
          
          <Route element={<ProtectedRoute roles={['SUPER_ADMIN','PAYROLL_MANAGER','HR_MANAGER']} />}>
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/payroll/:periodId" element={<PayrollRunPage />} />
          </Route>
          
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/recruitment" element={<RecruitmentPage />} />
          
          {/* Distributor ERP Routes */}
          <Route element={<ProtectedRoute roles={['SUPER_ADMIN','DISTRIBUTOR_ADMIN','DISTRIBUTOR_MANAGER','SALES_REP']} />}>
            <Route path="/orders" element={<OrderListPage />} />
            <Route path="/orders/new" element={<OrderCreatePage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/customers" element={<CustomerListPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/suppliers" element={<SupplierListPage />} />
            <Route path="/invoices" element={<InvoiceListPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/shipments" element={<ShipmentPage />} />
          </Route>
          
          <Route element={<ProtectedRoute roles={['SUPER_ADMIN','HR_MANAGER','DISTRIBUTOR_ADMIN']} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
          
          <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
          </Route>
        </Route>
      </Route>
      
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
```

### 8.2 Zustand Auth Store

```typescript
// client/src/store/auth.store.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  user: { id: string; email: string; role: string } | null;
  isAuthenticated: boolean;
  setTokens: (accessToken: string) => void;
  setUser: (user: AuthState['user']) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      setTokens: accessToken => set({ accessToken, isAuthenticated: true }),
      setUser: user => set({ user }),
      logout: () => set({ accessToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      // Only persist non-sensitive state (not the token — token in memory)
      partialize: state => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
```

### 8.3 Protected Route Component

```typescript
// client/src/components/layout/ProtectedRoute.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

interface Props {
  roles?: string[];
}

export function ProtectedRoute({ roles }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
}
```

### 8.4 Data Table Component (Reusable)

```typescript
// client/src/components/shared/DataTable.tsx

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  pagination?: { page: number; pageSize: number; total: number };
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({ data, columns, isLoading, pagination, onPageChange }: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination ? Math.ceil(pagination.total / pagination.pageSize) : -1,
  });

  if (isLoading) return <TableSkeleton columns={columns.length} rows={10} />;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} className="px-4 py-3 text-left font-medium text-gray-600">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-gray-100">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {pagination && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={onPageChange!}
        />
      )}
    </div>
  );
}
```

---

## SECTION 9: DOCKER & DEPLOYMENT

### 9.1 docker-compose.yml (Development)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: hrm_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: hrm_erp_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U hrm_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
      target: development
    restart: unless-stopped
    env_file: .env
    ports:
      - "3000:3000"
    volumes:
      - ./server:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: npm run dev

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
      target: development
    restart: unless-stopped
    env_file: .env
    ports:
      - "5173:5173"
    volumes:
      - ./client:/app
      - /app/node_modules
    environment:
      VITE_API_URL: http://localhost:3000/api/v1

volumes:
  postgres_data:
  redis_data:
```

### 9.2 Server Dockerfile (Multi-Stage)

```dockerfile
# server/Dockerfile

# ── Development ────────────────────────────────────
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Build ──────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npx prisma generate
RUN npm run build  # tsc compile to /dist

# ── Production ─────────────────────────────────────
FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate
USER appuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 9.3 Nginx Configuration

```nginx
# docker/nginx/nginx.conf

worker_processes auto;

events {
  worker_connections 2048;
}

http {
  # Security headers
  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;
  add_header Referrer-Policy strict-origin-when-cross-origin;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";

  # Gzip
  gzip on;
  gzip_types text/plain application/json application/javascript text/css;
  gzip_min_length 1024;

  # Rate limiting zone
  limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

  upstream api {
    server server:3000;
    keepalive 64;
  }

  server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Serve React app
    location / {
      root /var/www/client;
      try_files $uri $uri/ /index.html;
    }

    # Proxy to API
    location /api/ {
      limit_req zone=api burst=20 nodelay;
      proxy_pass http://api;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_read_timeout 60s;
      proxy_send_timeout 60s;
    }
  }
}
```

### 9.4 GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test-server:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
        ports: ["5432:5432"]
      redis:
        image: redis:7
        ports: ["6379:6379"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: server
      - run: npx prisma migrate deploy
        working-directory: server
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
      - run: npm run lint
        working-directory: server
      - run: npm test -- --coverage
        working-directory: server
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
          JWT_ACCESS_SECRET: test-secret-that-is-at-least-64-characters-long-for-ci-testing
          JWT_REFRESH_SECRET: test-refresh-secret-that-is-at-least-64-characters-for-ci
          BCRYPT_COST: 4  # Low cost for tests

  test-client:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: client
      - run: npm run lint
        working-directory: client
      - run: npm run type-check
        working-directory: client
      - run: npm test
        working-directory: client

  deploy:
    needs: [test-server, test-client]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to AWS
        run: |
          # SSH to EC2 and run deploy script
          # OR push to AWS ECS/ECR
          echo "Deploy step — configure for your AWS setup"
```

---

## SECTION 10: BACKGROUND JOBS (BullMQ)

```typescript
// server/src/jobs/payroll.job.ts

import { Worker, Queue } from 'bullmq';
import { redis } from '../config/redis';
import { prisma } from '../config/database';

export const payrollQueue = new Queue('payroll', { connection: redis });

// Worker processes payroll computation
export const payrollWorker = new Worker(
  'payroll',
  async job => {
    const { payPeriodId } = job.data;
    
    // 1. Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        leaveRequests: {
          where: {
            status: 'APPROVED',
            startDate: { gte: job.data.startDate },
            endDate: { lte: job.data.endDate },
          },
        },
      },
    });
    
    // 2. Get attendance for the period
    // 3. Calculate earnings + deductions for each employee
    // 4. Create payslip records
    // 5. Update pay period status
    
    for (const employee of employees) {
      const payslip = await computePayslip(employee, payPeriodId);
      await prisma.payslip.create({ data: payslip });
      job.updateProgress((employees.indexOf(employee) + 1) / employees.length * 100);
    }
  },
  { connection: redis, concurrency: 1 }
);
```

---

## SECTION 11: TESTING STRATEGY

### 11.1 Unit Tests

```typescript
// server/tests/unit/auth.service.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword, verifyPassword, generateAccessToken } from '../../src/modules/auth/auth.service';

describe('Auth Service', () => {
  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const hash = await hashPassword('TestPassword123!');
      expect(hash).not.toBe('TestPassword123!');
      expect(hash).toMatch(/^\$2[ab]\$\d{2}\$/); // bcrypt format
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const hash = await hashPassword('TestPassword123!');
      const result = await verifyPassword('TestPassword123!', hash);
      expect(result).toBe(true);
    });

    it('should return false for wrong password', async () => {
      const hash = await hashPassword('TestPassword123!');
      const result = await verifyPassword('WrongPassword!', hash);
      expect(result).toBe(false);
    });
  });
});
```

### 11.2 Integration Tests

```typescript
// server/tests/integration/auth.integration.test.ts

import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    // Seed test user
    await prisma.user.create({
      data: {
        email: 'test@company.com',
        passwordHash: await hashPassword('ValidPass123!'),
        role: 'EMPLOYEE',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test@company.com' } });
  });

  it('should return 200 with tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@company.com', password: 'ValidPass123!' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('should return 401 on invalid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@company.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('should lock account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@company.com', password: 'wrong' });
    }
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@company.com', password: 'ValidPass123!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('ACCOUNT_LOCKED');
  });
});
```

---

## SECTION 12: DATABASE INDEXES & PERFORMANCE

### Critical Indexes (add to Prisma schema or separate migration)

```sql
-- Composite indexes for common queries

-- Attendance queries: employee + date range
CREATE INDEX CONCURRENTLY idx_attendance_employee_date
  ON "Attendance"("employeeId", "date" DESC);

-- Orders by customer + status (most common list query)
CREATE INDEX CONCURRENTLY idx_orders_customer_status
  ON "Order"("customerId", "status", "createdAt" DESC);

-- Invoices: overdue query (status + dueDate)
CREATE INDEX CONCURRENTLY idx_invoices_overdue
  ON "Invoice"("status", "dueDate")
  WHERE "status" IN ('SENT', 'VIEWED', 'PARTIAL');

-- Inventory: low stock detection
CREATE INDEX CONCURRENTLY idx_inventory_available
  ON "InventoryItem"("availableQty", "productId")
  WHERE "availableQty" > 0;

-- Audit log: by resource + date (admin queries)
CREATE INDEX CONCURRENTLY idx_audit_resource_date
  ON "AuditLog"("resource", "createdAt" DESC);

-- Stock movements: product + date range (valuation)
CREATE INDEX CONCURRENTLY idx_stock_movements_product_date
  ON "StockMovement"("productId", "createdAt" DESC);

-- Full-text search on employees
CREATE INDEX CONCURRENTLY idx_employee_fulltext
  ON "Employee" USING GIN(
    to_tsvector('english', "firstName" || ' ' || "lastName")
  );

-- Full-text search on products
CREATE INDEX CONCURRENTLY idx_product_fulltext
  ON "Product" USING GIN(
    to_tsvector('english', "name" || ' ' || COALESCE("description", ''))
  );
```

### Redis Caching Strategy

```typescript
// Cache patterns to implement:

// 1. Dashboard KPIs — cache 5 minutes
const cacheKey = `dashboard:${orgId}:kpis`;
const ttl = 300; // seconds

// 2. Product catalog — cache 1 hour (invalidate on stock change)
const productKey = `products:list:${page}:${filters}`;

// 3. Employee list — cache 10 minutes
const employeeKey = `employees:${departmentId}:${page}`;

// 4. Never cache: orders (real-time), payslips (sensitive), auth tokens

// Cache helper
export async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  const result = await fn();
  await redis.setex(key, ttl, JSON.stringify(result));
  return result;
}
```

---

## SECTION 13: SENSITIVE DATA ENCRYPTION

```typescript
// server/src/utils/crypto.ts

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// Use for: nationalId, bankAccountInfo, mfaSecret
// Store encrypted string in DB; decrypt on read in service layer
```

---

## SECTION 14: DATABASE CONNECTION POOL

```typescript
// server/prisma/schema.prisma datasource url already includes:
// ?connection_limit=20&pool_timeout=10

// server/src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  });

prisma.$on('warn', e => logger.warn({ msg: e.message }));
prisma.$on('error', e => logger.error({ msg: e.message }));

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
```

---

## SECTION 15: PACKAGE.JSON FILES

### Server package.json

```json
{
  "name": "hrm-erp-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec ts-node src/server.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate deploy",
    "db:migrate:dev": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts",
    "db:reset": "prisma migrate reset --force",
    "db:studio": "prisma studio",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write src"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "bcryptjs": "^2.4.3",
    "bullmq": "^4.0.0",
    "connect-redis": "^7.0.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.18.0",
    "express-rate-limit": "^7.0.0",
    "helmet": "^7.0.0",
    "ioredis": "^5.0.0",
    "jsonwebtoken": "^9.0.0",
    "morgan": "^1.10.0",
    "multer": "^1.4.5",
    "nodemailer": "^6.0.0",
    "rate-limit-redis": "^4.0.0",
    "speakeasy": "^2.0.0",
    "winston": "^3.0.0",
    "xss": "^1.0.14",
    "zod": "^3.0.0",
    "@aws-sdk/client-s3": "^3.0.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.0.0",
    "@types/speakeasy": "^2.0.10",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "nodemon": "^3.0.0",
    "prisma": "^5.0.0",
    "supertest": "^6.0.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Client package.json

```json
{
  "name": "hrm-erp-client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "type-check": "tsc --noEmit",
    "test": "vitest"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@tanstack/react-query": "^5.0.0",
    "@tanstack/react-table": "^8.0.0",
    "axios": "^1.6.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "date-fns": "^3.0.0",
    "lucide-react": "^0.400.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.0",
    "react-router-dom": "^6.20.0",
    "recharts": "^2.9.0",
    "tailwind-merge": "^2.0.0",
    "zustand": "^4.4.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

---

## SECTION 16: SEED DATA

```typescript
// server/prisma/seed.ts

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create super admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      passwordHash: await bcrypt.hash('Admin@123456', 12),
      role: Role.SUPER_ADMIN,
      isEmailVerified: true,
    },
  });

  // Create company
  const company = await prisma.company.upsert({
    where: { id: 'default-company' },
    update: {},
    create: {
      id: 'default-company',
      name: 'Demo Company Ltd.',
      currency: 'USD',
      timezone: 'America/New_York',
    },
  });

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'ENG' },
      update: {},
      create: { companyId: company.id, name: 'Engineering', code: 'ENG' },
    }),
    prisma.department.upsert({
      where: { code: 'HR' },
      update: {},
      create: { companyId: company.id, name: 'Human Resources', code: 'HR' },
    }),
    prisma.department.upsert({
      where: { code: 'SALES' },
      update: {},
      create: { companyId: company.id, name: 'Sales', code: 'SALES' },
    }),
  ]);

  // Create salary components
  await prisma.salaryComponent.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Basic Salary', code: 'BASIC', type: 'EARNING', isFixed: true, isTaxable: true },
      { name: 'Housing Allowance', code: 'HRA', type: 'EARNING', isFixed: false, isTaxable: false, formula: 'baseSalary * 0.40' },
      { name: 'Income Tax', code: 'INCOME_TAX', type: 'DEDUCTION', isFixed: false, isTaxable: false },
      { name: 'Health Insurance', code: 'HEALTH_INS', type: 'DEDUCTION', isFixed: true, isTaxable: false },
    ],
  });

  // Create leave policies
  await prisma.leavePolicy.createMany({
    skipDuplicates: true,
    data: [
      { leaveType: 'ANNUAL', annualAllowance: 20, carryForward: 5, encashable: true },
      { leaveType: 'SICK', annualAllowance: 10, carryForward: 0 },
      { leaveType: 'MATERNITY', annualAllowance: 90, carryForward: 0 },
      { leaveType: 'PATERNITY', annualAllowance: 5, carryForward: 0 },
    ],
  });

  // Create warehouses
  await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      name: 'Main Warehouse',
      code: 'MAIN',
      isDefault: true,
      address: { street: '1 Warehouse Way', city: 'Chicago', country: 'US' },
    },
  });

  console.log('Seed completed. Admin: admin@company.com / Admin@123456');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
```

---

## SECTION 17: LAUNCH CHECKLIST

Before going live, verify every item:

**Security**
- [ ] All env vars set in production (no defaults from .env.example)
- [ ] JWT secrets are 64+ character random strings (not guessable)
- [ ] ENCRYPTION_KEY is 32 random bytes
- [ ] HTTPS enforced (nginx redirect 80→443)
- [ ] HSTS header present
- [ ] CORS whitelist contains only your frontend domain
- [ ] Rate limiting active on auth routes (10/15min)
- [ ] bcrypt cost factor is 12 in production
- [ ] Database user has minimum required permissions (not postgres superuser)
- [ ] Redis requirepass set
- [ ] Audit logging enabled
- [ ] MFA available for admin accounts

**Performance**
- [ ] Database indexes created (Section 12)
- [ ] Redis caching implemented for dashboards and product lists
- [ ] pg connection pool set (connection_limit=20)
- [ ] Nginx gzip enabled
- [ ] Static assets served via CloudFront (not Express)
- [ ] BullMQ workers running for payroll and email jobs

**Operations**
- [ ] Sentry DSN configured
- [ ] Automated database backups enabled (daily, 30-day retention)
- [ ] Health check endpoint at /api/health returns 200
- [ ] CI/CD pipeline green on main branch
- [ ] Seed data removed or reset password changed
- [ ] Docker containers auto-restart on failure

---

*Blueprint complete. Start with Section 2 (folder structure), then Section 3 (database schema via `prisma migrate dev`), then Section 4 (auth), then build modules in order. Every line in this document maps directly to code.*

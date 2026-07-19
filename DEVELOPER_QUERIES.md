# Developer Queries — HRM + Distributor ERP System
**Generated:** 2026-07-19  
**Purpose:** Open questions that need answers before/during implementation. Send this to the development team.

---

## 🔴 CRITICAL — Required Before Production Deployment

### 1. Database Server
- What PostgreSQL version and hosting? (AWS RDS, self-managed, Supabase, Neon, etc.)
- Connection pool size requirements? (default: 20)
- Will a read replica be needed for reports?

### 2. File Storage (Documents, Photos, PDFs)
- S3-compatible provider choice: AWS S3 / DigitalOcean Spaces / MinIO (self-hosted) / Cloudflare R2?
- Bucket name and region?
- CloudFront/CDN for serving files publicly? Or pre-signed URLs only?
- Required: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_CLOUDFRONT_DOMAIN`

### 3. Email Service
- Provider: SendGrid / AWS SES / Nodemailer SMTP / Mailgun?
- Required for: password reset, leave approval notifications, payslip delivery
- Required: `SENDGRID_API_KEY` or SMTP credentials

### 4. Redis (Caching + Rate Limiting + Background Jobs)
- Provider: Redis Cloud / AWS ElastiCache / Upstash / self-managed?
- Required: `REDIS_URL`, `REDIS_PASSWORD`
- Used for: rate limiting, JWT blacklist, BullMQ job queues (payroll, reports)

### 5. Deployment Server
- OS: Ubuntu 22.04 LTS recommended
- Node.js version: 20 LTS
- Process manager: PM2 recommended
- Reverse proxy: Nginx
- SSL: Let's Encrypt (Certbot)
- Domain name(s) for the application?

---

## 🟡 IMPORTANT — Affects Business Logic

### 6. India-Specific Payroll (Phase 2)
- Which statutory deductions to compute automatically?
  - PF (Provident Fund): 12% employee + 12% employer on Basic (up to ₹15,000)?
  - ESI (Employee State Insurance): 0.75% employee + 3.25% employer (if salary ≤ ₹21,000)?
  - Professional Tax: varies by state — which state(s)?
  - TDS (Income Tax): Flat % or slab-based? New regime or old regime?
  - Gratuity: Calculated automatically on payslip?
- Pay cycle: Monthly? 1st of month or specific date?
- Pay structure: Basic + HRA + Special Allowance + Other allowances?

### 7. Multi-Tenant Isolation
- How are tenants identified: subdomain (company1.yourdomain.com) or URL path (/company1/)?
- Company onboarding: self-service signup or admin-created only?
- Is data completely isolated per company, or is there cross-company reporting for platform owner?
- Billing model: per-seat, flat monthly, or usage-based?

### 8. Roles & Permissions
- The system has these roles from blueprint: SUPER_ADMIN, HR_MANAGER, PAYROLL_MANAGER, DEPARTMENT_HEAD, EMPLOYEE, DISTRIBUTOR_ADMIN, DISTRIBUTOR_MANAGER, SALES_REP, SUPPLIER, CUSTOMER_PORTAL
- Should SUPER_ADMIN be a platform-level role (sees all companies) or company-level?
- Any custom roles needed beyond the blueprint list?

### 9. Attendance
- Integration with biometric devices? Which brand/model? (ZKTeco, Realtime, Matrix, etc.)
- API format for biometric data push: REST, SDK, CSV?
- Mobile app check-in with GPS geofencing required?
- Work-from-home vs office attendance tracking?

### 10. Leave Management
- India-specific leave types to add beyond blueprint: Bereavement, Casual Leave, Floater holidays?
- Compensatory off (Comp-off) tracking?
- Leave encashment rules: end of year or on resignation?
- Weekend policy: Sat half-day? Alternate Saturdays?
- Public holiday calendar: national only or state-specific?

---

## 🟢 NICE TO HAVE — Clarifications

### 11. MFA (Multi-Factor Authentication)
- Required for all users or admin only?
- Push notification MFA (beyond TOTP) needed?

### 12. Audit Log Retention
- How long to retain audit logs? 1 year / 3 years / 7 years?
- Export audit logs to external SIEM?

### 13. Reports & Exports
- PDF library preference: Puppeteer (headless Chrome), PDFKit, or jsPDF?
- Excel export needed (payroll registers, attendance reports)?
- Dashboard KPIs: real-time or cached (5-min cache acceptable)?

### 14. Notifications
- In-app notifications only, or also push notifications (web/mobile)?
- WhatsApp notifications (very common in India): Twilio or Gupshup integration?

### 15. Data Backup
- Automated daily backup policy?
- Point-in-time recovery needed?
- Backup retention: 30 days / 90 days / 1 year?

### 16. Performance Targets
- Expected concurrent users per company?
- Maximum employees per company (affects indexing strategy)?
- Expected API response time SLA? (e.g. p99 < 500ms)

---

## 📝 Environment Variables Checklist
Copy this into your `.env` and fill before deploying:

```bash
# Core
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@host:5432/hrm_erp_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT (generate with: openssl rand -hex 64)
JWT_ACCESS_SECRET=<64-char-random>
JWT_REFRESH_SECRET=<64-char-random>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cookies
COOKIE_SECRET=<32-char-random>

# Encryption (for nationalId, bankAccount: openssl rand -hex 32)
ENCRYPTION_KEY=<32-byte-hex>

# File Storage (S3-compatible)
STORAGE_PROVIDER=s3         # s3 | spaces | minio | r2
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=hrm-erp-files
AWS_CLOUDFRONT_DOMAIN=      # optional CDN domain

# Email (leave blank to skip in dev)
EMAIL_PROVIDER=sendgrid     # sendgrid | smtp | ses
SENDGRID_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@yourcompany.com

# App URLs
APP_URL=https://yourdomain.com
API_URL=https://yourdomain.com

# Sentry (optional)
SENTRY_DSN=
```

---

*This file was auto-generated by the AI development agent. Update answers and return to development team.*

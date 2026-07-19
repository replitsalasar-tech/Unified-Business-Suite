---
name: Phase 3 ERP Build State
description: What was built in Phase 3 (Distributor ERP), key patterns, and gotchas
---

## What was built

### DB Schema (lib/db/src/schema/)
- erp-products.ts: categoriesTable, productsTable, warehousesTable, inventoryItemsTable, stockMovementsTable + stockMovementTypeEnum
- erp-suppliers.ts: suppliersTable, supplierProductsTable, purchaseOrdersTable, purchaseOrderItemsTable
- erp-customers.ts: customersTable, customerContactsTable, customerActivitiesTable, priceListsTable, priceListItemsTable
- erp-orders.ts: ordersTable, orderItemsTable, invoicesTable, paymentsTable, shipmentsTable, shipmentItemsTable + orderStatusEnum, paymentStatusEnum, invoiceStatusEnum, shipmentStatusEnum
- schema/index.ts exports all 4 new schema files
- schema/relations.ts rewritten with full HRM + ERP relations

### Backend Routes (artifacts/api-server/src/routes/)
- products.ts, inventory.ts, suppliers.ts, customers.ts, orders.ts, invoices.ts, shipments.ts, reports.ts
- All mounted in routes/index.ts at /v1/*

### Frontend Pages (artifacts/hrm-erp/src/pages/)
- products/, inventory/, suppliers/, customers/, orders/, invoices/, shipments/, reports/
- App.tsx updated with ERP routes; app-layout.tsx updated with role-gated ERP sidebar section

### DB Push
- All ERP tables pushed: `pnpm --filter @workspace/db run push`

## Key Gotchas

### auth.sub vs auth.userId
AccessTokenPayload uses `sub` for userId — never `auth.userId`.

**Why:** JWT spec uses `sub`; the existing type only exposes `sub`, `companyId`, `role`, `type`.

### Lucide icon: Package2 not Packages
`Packages` is not exported by lucide-react — use `Package2`.

**Why:** Caused a runtime Vite module error that crashed the frontend.

### Pre-existing TS2769 errors
All route files across the codebase have TS2769 errors from Express 5 typing `req.params` as `string | string[]`. These are pre-existing and do NOT block esbuild compilation. Do not attempt to fix them globally.

## ERP Role Names
SUPER_ADMIN, DISTRIBUTOR_ADMIN, DISTRIBUTOR_MANAGER, SALES_REP

Seed admin (`admin@acme-india.com` / `Admin@1234`) has role SUPER_ADMIN — sees all ERP nav items.

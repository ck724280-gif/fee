# DPR Fee Management System — Project Blueprint

## 1. Architecture Overview
The **DPR Fee Management System** is a production-grade, full-stack web application for "DPR Private Tuition", architected with Next.js 15 (App Router), React 19, Tailwind CSS v4, Prisma ORM 6 with Neon PostgreSQL serverless adapter (`@prisma/adapter-neon`), TypeScript, JWT auth with `jose` + `bcryptjs`, on-demand PDF generation with `@react-pdf/renderer`, interactive charts with Recharts, form validation with Zod, and WhatsApp click-to-chat integration.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js 15 App Router                         │
├────────────────────────────────┬───────────────────────────────────────┤
│        Frontend (React 19)     │             Backend API               │
│  - SaaS Dashboard (Recharts)   │  - Auth (/api/auth/*, jose JWT)       │
│  - Student & Class CRUD        │  - Students & Classes CRUD (/api/*)   │
│  - Fee Collection & Billing    │  - Billing Engine (/api/fees/*)       │
│  - Reports & Multi-Filter Export│ - Payment Transactions (/api/pay/*)  │
│  - WhatsApp Click-to-Chat      │  - Document Delivery (/api/docs/*)    │
│  - Responsive Mobile-Ready UI  │  - Audit Logging System               │
├────────────────────────────────┴───────────────────────────────────────┤
│                         Prisma ORM 6 Engine                            │
│  - Neon Serverless Adapter (@prisma/adapter-neon + ws pool)           │
│  - Dual Connection: DATABASE_URL (pooled) + DIRECT_URL (direct)        │
│  - Atomic Transactions for Payments, Idempotent Unique Constraints    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Feature Inventory
Every requirement and discovered feature is enumerated below and mapped to its assigned milestone:

| # | Feature | Category | Description | Milestone | Source |
|---|---------|----------|-------------|-----------|--------|
| 1 | Next.js 15 App Router & React 19 Scaffolding | Infra | Core application container, TypeScript, Tailwind v4, Lucide icons | M1 | R5 |
| 2 | Prisma 6 + Neon Serverless DB Setup | Infra | Dual connection strings (`DATABASE_URL`, `DIRECT_URL`), adapter-neon | M1 | R5 |
| 3 | Core Database Schema & Migrations | Database | Tables: User, Class, Student, FeeRecord, Payment, Document, Setting, AuditLog | M1 | R1-R5 |
| 4 | DB Seed Script with Realistic Fixtures | Database | 4 classes (5-8, ₹500-₹800), 6+ students (DEFAULT/CUSTOM fee modes), fee cycles & payments | M1 | R5, AC |
| 5 | Admission-Date Billing Cycle Engine | Engine | Individual student admission date anchors (e.g. May 3 -> May 3–Jun 2 due Jun 3) | M2 | R1, AC |
| 6 | Edge-Case Date Math & Anchor Recovery | Engine | 28th, 29th, 30th, 31st anchors across short months (Feb 28/29, Apr, Jun, Sep, Nov) | M2 | R1, AC |
| 7 | Fee Mode Resolution (DEFAULT vs CUSTOM) | Engine | Dynamic class fee inheritance for DEFAULT; locked custom monthly fee for CUSTOM | M2 | R1, AC |
| 8 | Fee Record Snapshot Immutability | Engine | Frozen snapshot of base, discount, admission, and late fees; immutable history | M2 | R1, AC |
| 9 | Idempotent Fee Record Generation | Engine | Compound unique constraint `(student_id, billing_period_start, billing_period_end)` | M2 | R1, AC |
| 10 | Discount Engine | Engine | Fixed (₹) and Percentage (%) discounts applied to base monthly fee | M2 | R1, R2 |
| 11 | Fee Status State Machine | Engine | States: UPCOMING, DUE, PARTIALLY_PAID, PAID, OVERDUE, WAIVED, CANCELLED | M2 | R1, AC |
| 12 | Class-Configurable Late Fee Calculation | Engine | Optional late fees (fixed or per-day) after grace period; disabled by default | M2 | R1 |
| 13 | Student Code Generator | Engine | Unique sequential student codes in format `DPR-{YEAR}-{SEQ}` (e.g. DPR-2026-001) | M2 | R2, AC |
| 14 | Multi-Part & Full Payment Engine | Payment | Atomic `prisma.$transaction` recording payment and updating fee record paid/outstanding | M3 | R3, AC |
| 15 | Overpayment Guard Validation | Payment | Rejects payment amounts exceeding the fee record's outstanding balance | M3 | R3, AC |
| 16 | Payment Methods & Transaction IDs | Payment | Cash, UPI, Bank Transfer, Card, Other with optional transaction ID capture | M3 | R3 |
| 17 | Receipt Code Sequence Generator | Payment | Unique sequential receipt numbers in format `DPR-RC-{YEAR}-{SEQ}` | M3 | R3, AC |
| 18 | On-Demand PDF Receipt Generation | Documents | `@react-pdf/renderer` in-memory streaming with DPR branding and authorized signature | M3 | R3, AC |
| 19 | On-Demand PDF Fee Reminder Generation | Documents | `@react-pdf/renderer` in-memory streaming with DPR branding, amount due, and due date | M3 | R3, AC |
| 20 | Secure Document UUID Token Engine | Documents | Public token URL `/api/documents/[token]` backed by `Document` table; no disk storage | M3 | R3, AC |
| 21 | Class Management Full CRUD | UI/CRUD | Add/Edit/List classes with default monthly fee, admission fee, late fee rules | M4 | R2 |
| 22 | Student Management Full CRUD | UI/CRUD | Add/Edit/List/View student with fee mode selection, class default auto-populate | M4 | R2, AC |
| 23 | Student Profile 360° View | UI/CRUD | Personal info, fee mode comparison (class vs student), payment history, fee timeline | M4 | R2 |
| 24 | SaaS Dashboard KPI Cards & Alerts | UI/Dash | Real-time metrics: Total/Active students, Today/Monthly collection, Due/Overdue fees | M4 | R4, AC |
| 25 | Interactive Recharts Analytics | UI/Dash | Monthly collection trend bar chart, class distribution pie, fee status donut | M4 | R4 |
| 26 | Reports & Multi-Dimension Export Engine | Reports | 8 report views with date/class/status filters, RFC 4180 CSV export, Print, PDF | M4 | R4 |
| 27 | WhatsApp Click-to-Chat Deep Linking | WhatsApp | `wa.me` links with pre-filled student name, class, amount, due date & secure PDF URL | M4 | R4, AC |
| 28 | Responsive UI & Mobile Navigation | UI | Desktop sidebar, mobile collapsible drawer, responsive horizontal scrolling tables | M4 | R5, AC |
| 29 | Single-Admin JWT Authentication | Security | `jose` HS256 signed JWT tokens in httpOnly secure cookies | M5 | R5, AC |
| 30 | Password Hashing with BcryptJS | Security | Salted bcrypt hashing for admin password, seeded via `ADMIN_EMAIL`/`ADMIN_PASSWORD` | M5 | R5 |
| 31 | Edge Middleware Route Protection | Security | Next.js middleware protecting `/dashboard/*` and `/api/*` (except public endpoints) | M5 | R5, AC |
| 32 | Comprehensive Zod Input Validation | Security | Strict Zod schemas on both frontend client forms and backend API routes | M5 | R5 |
| 33 | Comprehensive Audit Logging Engine | Security | Records login, student CRUD, fee generation, payments, settings changes | M5 | R5 |
| 34 | Dual Track E2E Test Suite (Tiers 1-4) | QA | Test harness covering >=5 tests/feature, boundary cases, pairwise, real workloads | M6 | AC |
| 35 | Adversarial Coverage Hardening (Tier 5) | Hardening | White-box stress testing, race-condition testing, security penetration | M7 | AC |

---

## 3. Milestones & Implementation Topology

| Milestone | Name | Scope & Deliverables | Dependencies | Status |
|---|---|---|---|---|
| **M1** | Foundation, Schema & Scaffolding | Next.js 15, React 19, Tailwind v4, Prisma 6 Schema with Neon adapter, DB Migrations & Seed data | None | DONE |
| **M2** | Core Fee Billing Engine & Math | Admission-date billing calculation, anchor preservation, fee mode resolution, immutability, idempotency, student code sequencing | M1 | DONE |
| **M3** | Payment Engine, Transactions & PDF Docs | Partial/Full payments, atomic transactions, receipt numbering, @react-pdf/renderer on-demand token streaming | M1, M2 | DONE |
| **M4** | Student/Class CRUD, Dashboard, Reports & WhatsApp | Full UI, student/class management, SaaS dashboard with Recharts, multi-filter reports, WhatsApp deep links | M1, M2, M3 | DONE |
| **M5** | JWT Auth, Middleware Security & Audit Logs | Single-admin login, `jose` Edge middleware, `bcryptjs` hashing, Zod validation, audit log recorder | M1, M4 | DONE |
| **M6** | Dual Track E2E Test Suite Verification | Requirement-driven Opaque-box E2E test suite (Tiers 1-4) passing 100% | M1-M5, Track B | DONE |
| **M7** | Adversarial Hardening (Tier 5) & Integrity Audit | White-box edge-case stress testing, Forensic Integrity Audit (`teamwork_preview_auditor`) | M6 | DONE |

---

## 4. Interface Contracts & API Specifications

### 4.1 Billing Engine Interface (`lib/billing-engine.ts`)
```typescript
export interface BillingCycleParams {
  admissionDate: Date;
  cycleIndex: number;
}

export interface BillingCycleResult {
  cycleIndex: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
}

export interface FeeCalculationInput {
  feeMode: 'DEFAULT' | 'CUSTOM';
  classDefaultFee: number;
  customMonthlyFee?: number | null;
  discountType?: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue?: number;
  admissionFee?: number;
  isFirstCycle?: boolean;
}

export interface FeeCalculationOutput {
  baseAmount: number;
  admissionFeeAmount: number;
  discountAmount: number;
  netFeeAmount: number;
}
```

### 4.2 Payment Transaction Interface (`lib/payment-service.ts`)
```typescript
export interface RecordPaymentInput {
  feeRecordId: string;
  amount: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
  transactionId?: string | null;
  notes?: string | null;
  recordedByUserId?: string | null;
}

export interface RecordPaymentResult {
  payment: any;
  feeRecord: any;
  receiptNumber: string;
}
```

### 4.3 Document Token Interface (`lib/document-service.ts`)
```typescript
export interface GenerateDocumentTokenInput {
  documentType: 'RECEIPT' | 'REMINDER' | 'STATEMENT';
  referenceId: string; // paymentId or feeRecordId or studentId
  studentId: string;
  expiresAt?: Date | null;
}
```

### 4.4 Auth & Session Contracts (`lib/auth.ts`)
```typescript
export interface AuthPayload {
  userId: string;
  email: string;
  role: 'ADMIN';
  name: string;
}
// Token issued via jose SignJWT with HS256 algorithm, stored in 'dpr_auth_token' httpOnly cookie.
```

---

## 5. Code Layout

```
tuition_manager/
├── .agents/                      # Orchestrator, miners, workers, tests, audit metadata
├── prisma/
│   ├── schema.prisma             # Comprehensive Prisma schema (Neon adapter compatible)
│   ├── seed.ts                   # Seed script (4 classes, 6+ students, billing cycles, payments)
│   └── migrations/               # Prisma migrations
├── public/                       # Static branding assets
├── src/
│   ├── app/                      # Next.js 15 App Router
│   │   ├── (auth)/
│   │   │   └── login/page.tsx    # Admin login page
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx        # Dashboard shell with responsive sidebar & header
│   │   │   ├── page.tsx          # Main SaaS Dashboard (KPIs, Charts, Alerts, Quick Actions)
│   │   │   ├── classes/          # Classes CRUD
│   │   │   ├── students/         # Students CRUD & 360° Profile view
│   │   │   ├── fees/             # Fee records, Billing cycle generator, Collection modal
│   │   │   ├── payments/         # Payment history & Receipt viewer
│   │   │   ├── reports/          # Multi-dimension reports with CSV/PDF/Print
│   │   │   ├── audit-logs/       # Audit log trail
│   │   │   └── settings/         # Institute settings & Fee defaults
│   │   └── api/
│   │       ├── auth/             # Login, Logout, Session check
│   │       ├── classes/          # Class CRUD APIs
│   │       ├── students/         # Student CRUD APIs
│   │       ├── fees/             # Fee generation, status refresh, collection
│   │       ├── payments/         # Payment recording with atomic transaction
│   │       ├── documents/        # PDF stream endpoints: /api/documents/[token]
│   │       ├── reports/          # Aggregated report data APIs
│   │       ├── audit-logs/       # Audit logs query API
│   │       └── settings/         # Institute settings API
│   ├── components/
│   │   ├── ui/                   # Reusable UI primitives (Button, Modal, Card, Table, Badge, Input)
│   │   ├── layout/               # Sidebar, Header, MobileNav
│   │   ├── dashboard/            # KPI cards, Recharts components, Alerts
│   │   ├── pdf/                  # @react-pdf/renderer templates (ReceiptPDF, ReminderPDF)
│   │   └── whatsapp/             # WhatsApp click-to-chat action buttons
│   ├── lib/
│   │   ├── prisma.ts             # Prisma client singleton with Neon serverless adapter
│   │   ├── auth.ts               # Jose JWT signing/verification & bcryptjs helpers
│   │   ├── billing-engine.ts     # Admission-date billing cycle & anchor date math
│   │   ├── payment-service.ts    # Atomic payment transactions & receipt sequencing
│   │   ├── document-service.ts   # UUID token generation & validation
│   │   ├── whatsapp.ts           # Click-to-chat URL & message builders
│   │   ├── audit.ts              # Audit log writer
│   │   └── validations/          # Zod schemas for all models & API inputs
│   └── middleware.ts             # Edge Middleware protecting /dashboard and /api routes
├── tests/                        # Dual Track Opaque-Box E2E Test Suite (Tiers 1-5)
│   ├── e2e/
│   ├── tier1_features/
│   ├── tier2_boundaries/
│   ├── tier3_combinations/
│   ├── tier4_workloads/
│   └── tier5_adversarial/
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts / postcss.config.mjs
└── README.md
```

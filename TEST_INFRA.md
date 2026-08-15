# DPR Fee Management System — 4-Tier Test Infrastructure Specification (`TEST_INFRA.md`)

## 1. Executive Summary & Architecture Overview

The **DPR Fee Management System** ("DPR Private Tuition") requires the highest standard of financial, temporal, and cryptographic integrity. To guarantee zero defects across all business operations, this specification establishes a **4-Tier Requirement-Driven Opaque-Box Testing Methodology**.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   DPR Tuition 4-Tier E2E Testing Architecture                    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Feature Coverage (35 Features × >=5 Test Cases = >=175 Tests)             │
│   - Unit & Functional Contracts across all domain features                       │
│   - Scaffolding, Billing Math, State Machine, Payments, PDFs, CRUD, Dash, Auth   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Boundary Value Analysis & Edge Cases (>=175 Tests)                       │
│   - Date Anchors (28th, 29th, 30th, 31st, Feb Leap/Non-Leap, Year Rollover)     │
│   - Financial Limits (Zero, Negative, Overpayment Guards, 100% Discounts)        │
│   - Security & Cryptography (JWT Expiry, Malformed Tokens, Public Token Bypass)   │
│   - String/Input Stress (RFC 4180 CSV escaping, Unicode names, Phone sanitizer)   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 3: Cross-Feature Interactions (Pairwise Matrix)                             │
│   - Class Fee Modifications vs. Custom Fee Student Invariance                    │
│   - Partial Payments ➔ Status Transitions ➔ Dynamic WhatsApp & Reminder PDFs    │
│   - Class Transfers Mid-Cycle ➔ Historical Snapshot Immutability                │
│   - Discount + Late Fee Grace Expiry ➔ Cumulative Payment Settlements            │
│   - Student Inactivation / Deferral ➔ Billing Cessation & Audit Verification    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ Tier 4: Real-World Institute Workloads (Full-Scale Simulation)                   │
│   - 12-Month Institute Academic Lifecycle Simulation (12 Classes, 50+ Students)  │
│   - Delinquency Recovery Pipeline & Arrears Aging Analytics                      │
│   - Multi-Dimension Financial Ledger & Recharts Data Reconciliation              │
│   - High-Concurrency Payment Stress & Atomic Receipt Numbering (DPR-RC-YYYY-SEQ) │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The 4-Tier Testing Methodology

### Tier 1: Feature Coverage Matrix (>= 5 Tests per Feature)
Every feature enumerated in the project specification is covered by at least 5 explicit test cases verifying:
1. Primary Happy Path behavior.
2. Parameter validation and standard defaults.
3. Positive and negative state transformations.
4. Output schema compliance and cryptographic/numeric correctness.
5. Invariant preservation (e.g. historical immutability, unique constraints).

### Tier 2: Boundary Value Analysis & Edge Cases
Exhaustive stress testing of non-trivial edge boundaries:
- **Temporal Boundaries**:
  - Admission on 28th (consistent across all months).
  - Admission on 29th (Feb 28 in non-leap 2026, Feb 29 in leap 2024/2028, recovery in March).
  - Admission on 30th (Feb 28 clamp, 30-day month clamp, 31-day recovery).
  - Admission on 31st (Clamped to 30th in Apr/Jun/Sep/Nov, 28/29 in Feb, restored to 31st in Jan/Mar/May/Jul/Aug/Oct/Dec).
  - Leap day admissions (`2024-02-29`) rolling over 48 consecutive months.
  - Year-end transitions (Dec 15 -> Jan 14 -> Feb 14).
- **Financial Boundaries**:
  - Exact zero payment rejection (HTTP 422).
  - Negative payment rejection.
  - Overpayment attempt ($P > F_{outstanding}$) strictly rejected.
  - Exact balance settlement ($P = F_{outstanding}$) updating status to `PAID`.
  - Fixed discount exceeding base fee clamped/rejected.
  - Percentage discount of 0%, 50%, and 100% (free tuition waiver).
  - Multi-part micro-payments (e.g. ₹50 x 10 = ₹500).
- **Security & Authorization Boundaries**:
  - Unauthenticated access to `/api/*` returning HTTP 401.
  - Edge middleware redirection for unauthenticated `/dashboard/*` access.
  - Public document token bypass (`/api/documents/[token]`) allowing unauthenticated access.
  - Expired token access returning HTTP 410 Gone.
  - Nonexistent / Malformed UUID token returning HTTP 404.
  - Bcrypt salt strength and password hash verification.
  - JWT token tamper detection (modified signature / corrupted claims).
- **Input & Formatting Boundaries**:
  - WhatsApp phone number normalization (`+91 98765-43210`, `09876543210`, `9876543210` ➔ `919876543210`).
  - WhatsApp message URL encoding with special characters (`&`, `%`, `#`, quotes, emojis).
  - RFC 4180 CSV export with commas, quotes, and newlines in student names and addresses.
  - Recharts dataset normalization for zero-revenue months and empty classes.

### Tier 3: Cross-Feature Interactions & Pairwise Combinations
Verifies multi-system integrations where operations in one subsystem trigger effects across several others:
1. **Class Fee Modification vs. Custom Student Rate**:
   - Class 8 fee raised from ₹800 to ₹1000.
   - Student A (`fee_mode: DEFAULT`) generates new cycle at ₹1000.
   - Student B (`fee_mode: CUSTOM`, ₹600) generates new cycle at ₹600.
   - Historical records for Student A & B from past months remain strictly at ₹800 and ₹600.
2. **Partial Payment ➔ Status Transition ➔ Reminder & WhatsApp Generation**:
   - ₹800 fee receives ₹300 payment ➔ status becomes `PARTIALLY_PAID`, outstanding becomes ₹500.
   - Receipt PDF generated for ₹300; Reminder PDF generated for remaining ₹500.
   - WhatsApp message dynamically generated with updated ₹500 due and secure token link.
3. **Discount + Late Fee Grace Expiry ➔ Multi-Part Settlement**:
   - Base ₹1000 fee with 10% discount = ₹900.
   - Due date passes + grace period ends ➔ late fee ₹50 applied = ₹950 total.
   - Installment 1: ₹500 ➔ status `PARTIALLY_PAID`, outstanding ₹450.
   - Installment 2: ₹450 ➔ status `PAID`, outstanding ₹0.
4. **Class Transfer Mid-Year**:
   - Student moves from Class 6 (₹600) to Class 7 (₹700).
   - Past cycles retain Class 6 snapshot; future cycles resolve Class 7 rate.

### Tier 4: Real-World Institute Workloads
High-volume operational simulation mirroring DPR Tuition's day-to-day business over an extended timeline:
- **Full Institute Simulation**: 12 classes, 50+ students, 600+ billing cycles, 800+ payment transactions.
- **Aging & Delinquency Pipeline**: Tracking aging buckets (<15d, 15-30d, 30d+), overdue notices, and bulk resolution.
- **Ledger & Report Reconciliation**: End-to-end mathematical consistency where Total Billed - Total Paid = Total Outstanding across all 8 report modules and KPI aggregates.
- **Concurrency & Race Condition Handling**: Multi-payment collision handling and monotonic receipt code sequencing (`DPR-RC-YYYY-SEQ`).

---

## 3. 35-Feature Mapping Table

| # | Feature Name | Tier 1 Test Suite | Tier 2 Boundary Suite | Tier 3 Interaction Suite | Tier 4 Workload Suite |
|---|--------------|-------------------|-----------------------|--------------------------|-----------------------|
| 1 | Next.js 15 App Router Scaffolding | `tier1/01_scaffolding` | `tier2/05_input` | `tier3/01_class_fee` | `tier4/01_simulation` |
| 2 | Prisma 6 + Neon DB Setup | `tier1/01_scaffolding` | `tier2/03_security` | `tier3/01_class_fee` | `tier4/01_simulation` |
| 3 | Core Database Schema & Migrations | `tier1/01_scaffolding` | `tier2/03_security` | `tier3/04_transfer` | `tier4/03_reconcile` |
| 4 | DB Seed Script & Fixtures | `tier1/01_scaffolding` | `tier2/01_date` | `tier3/01_class_fee` | `tier4/01_simulation` |
| 5 | Admission-Date Billing Cycle Engine | `tier1/02_billing` | `tier2/01_date` | `tier3/01_class_fee` | `tier4/01_simulation` |
| 6 | Edge-Case Date Math & Anchor Recovery | `tier1/02_billing` | `tier2/01_date` | `tier3/04_transfer` | `tier4/01_simulation` |
| 7 | Fee Mode Resolution (DEFAULT vs CUSTOM) | `tier1/02_billing` | `tier2/02_financial` | `tier3/01_class_fee` | `tier4/01_simulation` |
| 8 | Fee Record Snapshot Immutability | `tier1/02_billing` | `tier2/02_financial` | `tier3/01_class_fee` | `tier4/01_simulation` |
| 9 | Idempotent Fee Record Generation | `tier1/02_billing` | `tier2/01_date` | `tier3/05_inactivate` | `tier4/04_concurrency` |
| 10 | Discount Engine (Fixed & %) | `tier1/02_billing` | `tier2/02_financial` | `tier3/03_discount_late` | `tier4/01_simulation` |
| 11 | Fee Status State Machine | `tier1/03_lifecycle` | `tier2/02_financial` | `tier3/02_partial_pay` | `tier4/02_delinquency` |
| 12 | Class-Configurable Late Fee Calculation | `tier1/03_lifecycle` | `tier2/02_financial` | `tier3/03_discount_late` | `tier4/02_delinquency` |
| 13 | Student Code Generator (DPR-YYYY-SEQ) | `tier1/03_lifecycle` | `tier2/05_input` | `tier3/04_transfer` | `tier4/01_simulation` |
| 14 | Multi-Part & Full Payment Engine | `tier1/04_payments` | `tier2/02_financial` | `tier3/02_partial_pay` | `tier4/04_concurrency` |
| 15 | Overpayment Guard Validation | `tier1/04_payments` | `tier2/02_financial` | `tier3/02_partial_pay` | `tier4/04_concurrency` |
| 16 | Payment Methods & Transaction IDs | `tier1/04_payments` | `tier2/05_input` | `tier3/02_partial_pay` | `tier4/03_reconcile` |
| 17 | Receipt Code Generator (DPR-RC-YYYY-SEQ) | `tier1/04_payments` | `tier2/05_input` | `tier3/02_partial_pay` | `tier4/04_concurrency` |
| 18 | On-Demand PDF Receipt Generation | `tier1/05_documents` | `tier2/04_documents` | `tier3/02_partial_pay` | `tier4/01_simulation` |
| 19 | On-Demand PDF Fee Reminder Generation | `tier1/05_documents` | `tier2/04_documents` | `tier3/02_partial_pay` | `tier4/02_delinquency` |
| 20 | Secure Document UUID Token Engine | `tier1/05_documents` | `tier2/04_documents` | `tier3/02_partial_pay` | `tier4/01_simulation` |
| 21 | Class Management Full CRUD | `tier1/06_crud_dash` | `tier2/05_input` | `tier3/01_class_fee` | `tier4/01_simulation` |
| 22 | Student Management Full CRUD | `tier1/06_crud_dash` | `tier2/05_input` | `tier3/04_transfer` | `tier4/01_simulation` |
| 23 | Student Profile 360° View | `tier1/06_crud_dash` | `tier2/05_input` | `tier3/04_transfer` | `tier4/03_reconcile` |
| 24 | SaaS Dashboard KPI Cards & Alerts | `tier1/06_crud_dash` | `tier2/02_financial` | `tier3/02_partial_pay` | `tier4/03_reconcile` |
| 25 | Interactive Recharts Analytics | `tier1/06_crud_dash` | `tier2/05_input` | `tier3/01_class_fee` | `tier4/03_reconcile` |
| 26 | Reports & Multi-Dimension Export Engine | `tier1/07_reports` | `tier2/05_input` | `tier3/02_partial_pay` | `tier4/03_reconcile` |
| 27 | WhatsApp Click-to-Chat Deep Linking | `tier1/07_reports` | `tier2/05_input` | `tier3/02_partial_pay` | `tier4/02_delinquency` |
| 28 | Responsive UI & Mobile Navigation | `tier1/07_reports` | `tier2/05_input` | `tier3/04_transfer` | `tier4/01_simulation` |
| 29 | Single-Admin JWT Authentication | `tier1/08_security` | `tier2/03_security` | `tier3/05_inactivate` | `tier4/01_simulation` |
| 30 | Password Hashing with BcryptJS | `tier1/08_security` | `tier2/03_security` | `tier3/05_inactivate` | `tier4/01_simulation` |
| 31 | Edge Middleware Route Protection | `tier1/08_security` | `tier2/03_security` | `tier3/02_partial_pay` | `tier4/01_simulation` |
| 32 | Comprehensive Zod Input Validation | `tier1/08_security` | `tier2/05_input` | `tier3/01_class_fee` | `tier4/04_concurrency` |
| 33 | Comprehensive Audit Logging Engine | `tier1/08_security` | `tier2/03_security` | `tier3/02_partial_pay` | `tier4/01_simulation` |
| 34 | Dual Track E2E Test Suite (Tiers 1-4) | `tier1/08_security` | `tier2/05_input` | `tier3/01_class_fee` | `tier4/01_simulation` |
| 35 | Adversarial Coverage Hardening (Tier 5) | `tier1/08_security` | `tier2/03_security` | `tier3/03_discount_late` | `tier4/04_concurrency` |

---

## 4. Test Directory Layout

```
tuition_manager/
├── TEST_INFRA.md                   # This master specification
├── TEST_READY.md                   # Test execution results and feature checklist
├── tests/
│   ├── run-all.ts                  # Master CLI test runner with tier reporting
│   ├── types.ts                    # Common test context & assertion types
│   ├── assertions.ts               # Custom zero-dependency assertion library
│   ├── fixtures/
│   │   ├── in-memory-db.ts         # High-fidelity in-memory transactional database
│   │   ├── mock-data.ts            # Realistic institute seed & synthetic datasets
│   │   └── mock-services.ts        # Contract-faithful implementations of all services
│   ├── tier1_features/
│   │   ├── 01_scaffolding.test.ts  # Features 1-4: Scaffolding, DB setup, Schema, Seed
│   │   ├── 02_billing_engine.test.ts # Features 5-10: Date anchors, Pricing, Idempotency, Discounts
│   │   ├── 03_fee_lifecycle.test.ts # Features 11-13: Status state machine, Late fees, Student codes
│   │   ├── 04_payments.test.ts     # Features 14-17: Partial/Full payments, Overpayment, Receipts
│   │   ├── 05_documents.test.ts    # Features 18-20: PDF streaming, Secure UUID tokens, Expiry
│   │   ├── 06_crud_dashboard.test.ts # Features 21-25: Classes, Students, Profile, KPIs, Charts
│   │   ├── 07_reports_whatsapp.test.ts # Features 26-28: Reports, CSV, WhatsApp deep-linking, UI
│   │   └── 08_security_audit.test.ts # Features 29-35: JWT, Bcrypt, Middleware, Zod, Audit logs
│   ├── tier2_boundaries/
│   │   ├── 01_date_boundaries.test.ts # 28th, 29th, 30th, 31st, leap years, 48-month rollovers
│   │   ├── 02_financial_boundaries.test.ts # Overpayment, zero/negative, 100% discount, micro-payments
│   │   ├── 03_security_boundaries.test.ts # Expired JWT, tampered tokens, unauthenticated API access
│   │   ├── 04_document_boundaries.test.ts # Expired doc tokens, invalid UUID format, nonexistent tokens
│   │   └── 05_input_boundaries.test.ts # Unicode names, RFC 4180 CSV quotes, phone sanitization
│   ├── tier3_combinations/
│   │   ├── 01_class_fee_vs_custom_student.test.ts # Dynamic DEFAULT vs locked CUSTOM across fee updates
│   │   ├── 02_partial_payment_reminders.test.ts # Partial payments ➔ status ➔ reminder PDF ➔ WhatsApp
│   │   ├── 03_discount_latefee_lifecycle.test.ts # Discounts + Late fee grace expiration + Settlement
│   │   ├── 04_class_transfer_billing.test.ts # Mid-year class change + historical snapshot immutability
│   │   └── 05_status_inactivation_lifecycle.test.ts # Inactivation ➔ billing cessation ➔ audit log
│   └── tier4_workloads/
│       ├── 01_full_institute_simulation.test.ts # 12-month simulation (12 classes, 50 students, 600 cycles)
│       ├── 02_delinquency_recovery_pipeline.test.ts # Aging buckets (<15d, 15-30d, 30d+) & arrears notices
│       ├── 03_financial_reports_reconciliation.test.ts # Reconciling Daily/Monthly/Class/KPI reports
│       └── 04_high_concurrency_payments.test.ts # Race conditions, atomic balances & monotonic receipts
```

---

## 5. Execution Instructions

The test suite is completely automated and can be executed via standard CLI:

```bash
# Execute the entire 4-Tier Test Suite
npx tsx tests/run-all.ts

# Or run via Node standard runner
node --loader tsx tests/run-all.ts
```

Output includes:
- Summary table with total tests per tier.
- Detailed pass/fail statuses and execution timings.
- Granular error diagnostics on assertion failures.
- Zero external network dependencies for 100% deterministic test execution.

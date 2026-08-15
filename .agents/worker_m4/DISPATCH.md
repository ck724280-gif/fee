## 2026-08-15T07:15:41Z
You are the Implementation Worker for Milestone 4 (Student/Class CRUD, Dashboard UI with Recharts, Reports Engine with CSV/PDF/Print, WhatsApp Deep Linking) of the DPR Fee Management System.
Your working directory is: d:\antigravity programme\tuition_manager\.agents\worker_m4\

MANDATORY INPUTS (READ FIRST):
- User Requirements: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md
- Project Blueprint: d:\antigravity programme\tuition_manager\PROJECT.md
- Gate Status: d:\antigravity programme\tuition_manager\.agents\orchestrator\GATE_STATUS.md
- Explorer 1 Blueprint (UI & Layout): d:\antigravity programme\tuition_manager\.agents\explorer_1_m4\analysis.md
- Explorer 2 Blueprint (CRUD & APIs): d:\antigravity programme\tuition_manager\.agents\explorer_2_m4\analysis.md
- Explorer 3 Blueprint (Analytics, Reports & WhatsApp): d:\antigravity programme\tuition_manager\.agents\explorer_3_m4\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

SCOPE & DELIVERABLES:
1. Full UI Pages & Layout in `src/app/(dashboard)/`:
   - `layout.tsx`: Responsive layout shell with desktop sidebar, mobile collapsible drawer with backdrop, top header with user profile menu, breadcrumbs.
   - `page.tsx`: Full SaaS Dashboard with Overdue Alert Banner, KPI summary cards, Quick Actions bar, interactive Recharts charts (Monthly Collection Trend, Class Distribution, Fee Status Donut), and Recent Payments table.
   - `classes/page.tsx`: Class Management table with fee defaults (monthly fee, admission fee, late fee policy), and Add/Edit `ClassModal`.
   - `students/page.tsx`: Student Directory with search, filters (Class, Status, Fee Mode), pagination, and Add/Edit `StudentModal` (DEFAULT vs CUSTOM fee mode toggle, dynamic class fee auto-population, discount controls, admission date).
   - `students/[id]/page.tsx`: Student 360° Profile view (Financial summary badges, personal details, fee mode comparison, chronological billing cycles timeline with color-coded status badges, payment ledger with on-demand PDF receipts, quick action modal triggers).
   - `fees/page.tsx`: Fee Management table with filters, Batch & Per-Student Billing Cycle Generation modal, Refresh Statuses button, and Fee Collection modal.
   - `payments/page.tsx`: Payments History table with receipt download links, search, and date filters.
   - `reports/page.tsx`: 8-dimension Reports Engine (Monthly Collection, Defaulters/Overdue, Class Summary, Payment Mode Breakdown, Student Ledger, Admission Fees, Discounts, Daily Collection Register), multi-filters, RFC 4180 CSV export with UTF-8 BOM, print layout styling.
   - `settings/page.tsx`: Institute Settings UI (Institute name "DPR Private Tuition", address, contact info, academic year, currency, fee defaults).

2. Backend API Routes:
   - `/api/classes` (GET, POST), `/api/classes/[id]` (GET, PUT, DELETE)
   - `/api/students` (GET with query filters, POST), `/api/students/[id]` (GET 360° with fees & payments, PUT, DELETE)
   - `/api/fees` (GET list with filters), `/api/fees/generate` (POST batch/single), `/api/fees/refresh-statuses` (POST)
   - `/api/payments` (GET list, POST record payment with atomic transaction)
   - `/api/reports` (GET aggregated report data for all 8 views)
   - `/api/settings` (GET, PUT)
   - `/api/dashboard/stats` (GET KPIs, chart datasets, high-priority alerts)

3. Interactive Components & Services:
   - `src/components/dashboard/*`: KPI cards, Recharts chart wrappers (SSR-safe mount), Recent payments table, Overdue alert banner.
   - `src/components/modals/*`: `ClassModal`, `StudentModal`, `CollectFeeModal` (with real-time overpayment guard, receipt number, instant PDF/WhatsApp trigger), `GenerateBillingModal`, `WhatsAppPreviewModal`.
   - `src/components/whatsapp/*`: `WhatsAppButton`, `WhatsAppReminderCard`.
   - `src/lib/whatsapp.ts`: Phone sanitization (`+91` normalization), Dynamic templates (Fee Reminder with public PDF link, Payment Receipt with public PDF link, Overdue Notice).
   - `src/components/ui/*`: Reusable UI components (Button, Input, Select, Modal, Card, Table, Badge, Alert, Toast).
   - `src/lib/validations/*`: Zod validation schemas for all forms and API inputs.

4. Verification & Testing:
   - Run typecheck (`npx tsc --noEmit` or equivalent) to verify 0 errors.
   - Run the E2E test runner (`npx tsx tests/run_all_tests.ts`) to ensure all 395 tests pass 100%.
   - Document commands, test results, created files, and verification proof.

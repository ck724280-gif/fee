# Original User Request

## 2026-08-15T05:54:25Z

Build a fully functional, production-ready Fee Management Web Application ("DPR Fee Management System") for a real private tuition institute named "DPR Private Tuition". The app must deploy on Vercel free tier with Neon PostgreSQL (free tier), supporting class-based and student-specific fee management, automatic billing cycles based on individual student admission dates, professional PDF receipts/reminders, WhatsApp click-to-chat sharing, and a premium SaaS-style dashboard. This is a production system — every button, form, calculation, and feature must actually work with real database-driven data. No fake buttons, placeholder logic, or hardcoded values.

Working directory: d:\antigravity programme\tuition_manager
Integrity mode: development

Technology stack: Next.js 15 (App Router), React 19, Tailwind CSS v4, Prisma ORM 6, Neon PostgreSQL, TypeScript, JWT auth with `jose` + `bcryptjs`, `@react-pdf/renderer` for PDFs, Recharts for charts, Zod for validation, date-fns for date handling, Lucide React for icons.

## Requirements

### R1. Core Fee Management Engine
The system must support two-level fee configuration: class default fees and student-specific custom fees using an explicit fee_mode field (DEFAULT or CUSTOM) on each student record. Billing cycles must be calculated from each student's individual admission/joining date — NOT the 1st of each calendar month. For example, a student admitted on May 3 has billing periods May 3–Jun 2, Jun 3–Jul 2, etc., with due dates Jun 3, Jul 3, etc. Fee records must be immutable once generated — changing a student's fee or class default fee must never alter historical fee records. Fee generation must be idempotent using a unique database constraint on (student_id, billing_period_start, billing_period_end) so running generation 1 or 100 times produces the same result. The billing engine must correctly handle edge cases: admission on the 28th, 29th, 30th, 31st, February in leap/non-leap years, mid-cycle admission, student becoming inactive, and class changes. When a class default fee changes, students with fee_mode=DEFAULT get the new rate for future periods only; students with fee_mode=CUSTOM are unaffected. Fee statuses (UPCOMING, DUE, PARTIALLY_PAID, PAID, OVERDUE, WAIVED, CANCELLED) must be derived from due date, paid amount, outstanding amount, and current date. Late fee configuration must be available but disabled by default, configurable per-class with fixed amount or per-day rate.

### R2. Complete Student & Class Management
Full CRUD for classes (class name, default monthly fee, default admission fee, late fee rules, status) and students (student ID, name, father's name, mother's name, guardian name, mobile, WhatsApp number, address, DOB, gender, school, class, admission date, joining date, fee_mode, custom monthly fee, admission fee, discount, discount type, status). Auto-generate unique student codes in format DPR-{YEAR}-{SEQ} (e.g., DPR-2026-001). When adding a student, selecting a class should auto-populate the class default fee as the suggested fee, and the admin must be able to override it by choosing "Custom Student Fee" mode. The UI must clearly show: Class Default Fee, Student Fee Mode, and Actual Monthly Fee for transparency. Student statuses: Active, Inactive, Left, Completed. Student profile page must show personal info, fee configuration comparison (class default vs student fee), current fee period/status, complete payment history, and fee history timeline.

### R3. Payment System with Professional Receipts & Reminders
Support full and partial payments — multiple payments against one fee record (e.g., ₹200 + ₹200 + ₹100 = ₹500 total against a ₹500 fee). Payment validation must prevent payment amount exceeding the outstanding balance. Use database transactions to atomically create the payment record AND update the fee record's paid/outstanding amounts and status. Support payment methods: Cash, UPI, Bank Transfer, Card, Other — with optional transaction ID capture for non-cash methods. Auto-generate unique receipt numbers in format DPR-RC-{YEAR}-{SEQ}. Generate professional PDF receipts (with DPR branding, student details, fee period, payment details, outstanding balance, authorized signature area) and fee reminder PDFs (with DPR branding, student details, amount due, due date, professional message) using @react-pdf/renderer. PDFs must be generated on-demand via API routes using secure random UUID token URLs stored in a documents table — no permanent filesystem storage. Document URLs must not expose sequential database IDs. Optional expiry support for document tokens.

### R4. Dashboard, Reports & WhatsApp Integration
Professional SaaS-style dashboard with: KPI cards (total students, active students, today's collection, monthly collection, pending fees, overdue fees, partial payments, new admissions), charts (monthly collection trend bar chart, class-wise fee distribution pie chart, fee status donut chart), quick action buttons (Add Student, Collect Fee, View Due Fees, View Overdue Fees, Generate Reminder, Generate Receipt), recent activity feed, and alert notifications (fees due today, overdue fees, upcoming due dates). Reports module supporting: daily collection, monthly collection, outstanding fees, overdue fees, class-wise collection, student-wise fee statement, payment method report, admission report — all filterable by date range, class, student, status, and payment method, with PDF export, CSV export, and browser print. WhatsApp integration using click-to-chat URLs (https://wa.me/...) — NOT auto-send. Pre-fill messages with student name, class, amount due/paid, due date, and secure PDF document link. The manager reviews and sends manually. Fee display tables must transparently show: Student, Class, Default Fee, Fee Mode, Actual Fee, Paid, Due, Status.

### R5. Authentication, Security & Vercel Deployment
Secure single-admin login with JWT tokens (using `jose` library for Edge-compatible signing/verification) and `bcryptjs` for password hashing. Store session in httpOnly, secure, sameSite cookies. Protect all dashboard and API routes via Next.js middleware. Full input validation with Zod on both frontend and API. Admin credentials seeded via environment variables ADMIN_EMAIL and ADMIN_PASSWORD. The entire application must be a single Next.js 15 App Router project deployable to Vercel free tier. Use Prisma ORM with the @prisma/adapter-neon driver adapter for serverless-compatible Neon PostgreSQL connections. Dual connection strings: DATABASE_URL (pooled, for runtime) and DIRECT_URL (direct, for migrations). Include: complete Prisma schema with all tables (users, classes, students, fee_records, payments, documents, institute_settings, audit_logs), database migrations, seed script with 4 sample classes (Class 5–8 with fees ₹500–₹800) and 6 sample students (mix of DEFAULT and CUSTOM fee modes) demonstrating the full billing cycle, .env.example with all variables documented, and a comprehensive README.md with deployment instructions. Audit log must record all significant actions (login, student CRUD, fee generation, payments, settings changes) with user, action, entity, timestamp, and metadata. Responsive design for desktop, tablet, and mobile — with mobile-optimized fee collection flow.

## Acceptance Criteria

### Build & Type Safety
- [ ] `npm run build` completes without errors
- [ ] `npx tsc --noEmit` passes with zero type errors
- [ ] `npm run lint` passes with no blocking errors
- [ ] `npx prisma validate` succeeds
- [ ] `npx prisma db push` creates all tables without errors
- [ ] `npx prisma db seed` populates sample data (4 classes, 6+ students, sample fee records, sample payments)

### Fee Engine Correctness
- [ ] A student admitted on May 3 with ₹800 fee generates billing periods May 3–Jun 2 (due Jun 3), Jun 3–Jul 2 (due Jul 3), etc. — NOT 1st-to-30th calendar months
- [ ] Running fee generation multiple times for the same student produces no duplicate fee records (idempotency via unique constraint)
- [ ] Changing a class default fee from ₹500 to ₹600: a student with fee_mode=DEFAULT shows ₹600 for future periods; a student with fee_mode=CUSTOM at ₹300 remains ₹300; all existing historical fee records are unchanged
- [ ] Fee status is correctly derived: UPCOMING before due date, DUE on due date, OVERDUE after due date, PARTIALLY_PAID when partial payment exists, PAID when fully paid

### Payment System
- [ ] Recording a partial payment (e.g., ₹200 against ₹500 fee) updates the fee record to PARTIALLY_PAID with outstanding=₹300
- [ ] Recording subsequent payments correctly accumulates until PAID status
- [ ] Attempting to pay more than the outstanding amount is rejected with a clear error message
- [ ] Each payment generates a unique receipt number in DPR-RC-{YEAR}-{SEQ} format

### PDF & Documents
- [ ] Receipt PDF renders with DPR branding, student details, payment details, and is downloadable
- [ ] Reminder PDF renders with DPR branding, student details, outstanding amount, due date, and is downloadable
- [ ] PDFs are served via secure random token URLs (e.g., /api/documents/[uuid]) — not sequential IDs

### WhatsApp Integration
- [ ] WhatsApp button opens wa.me link with pre-filled message containing student name, amount, due date, and document URL
- [ ] No automatic message sending — click-to-chat only

### UI & Navigation
- [ ] Dashboard loads and displays real KPI data from the database (not hardcoded)
- [ ] All navigation links in sidebar work and route to correct pages
- [ ] Student add/edit forms work end-to-end with database persistence
- [ ] Application is responsive — sidebar collapses on mobile, tables scroll horizontally

### Security
- [ ] Unauthenticated requests to /api/* (except /api/auth/login) return 401
- [ ] Unauthenticated access to dashboard pages redirects to login

## Follow-up — 2026-08-15T07:45:36Z

Resume Instructions after Server Restart:
1. Complete Milestone 5: JWT authentication with `jose` + `bcryptjs`, login page, auth API routes, Next.js middleware for route protection, audit log integration
2. Add README.md with deployment instructions
3. Verify `npm run build` passes
4. Run the Victory Audit
5. Report completion with the admin login credentials (seeded email/password)

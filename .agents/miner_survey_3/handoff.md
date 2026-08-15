# Handoff Report — Miner Survey 3 (Payment, PDF, Dashboard & Security)

## 1. Observation
1. **Source Requirements**: Checked `ORIGINAL_REQUEST.md` (lines 20–28: Requirements R3, R4, R5; lines 45–69: Acceptance Criteria for Payment System, PDF & Documents, WhatsApp Integration, UI & Navigation, Security).
2. **Payment Engine**:
   - Partial & full payments against individual fee records (e.g. ₹200 + ₹200 + ₹100 = ₹500 against a ₹500 fee record).
   - Atomic database transactions (`prisma.$transaction`) to create payment record, update fee record paid amount, outstanding amount, and status (`PARTIALLY_PAID` vs `PAID`), insert audit log, and create document token.
   - Payment methods: `CASH`, `UPI`, `BANK_TRANSFER`, `CARD`, `OTHER` with optional `transactionId`.
   - Sequential receipt number generation: `DPR-RC-{YEAR}-{SEQ}` (e.g. `DPR-RC-2026-0001`).
   - Overpayment guard: payment amount cannot exceed current `outstanding_amount`.
3. **PDF Document Generation & Tokens**:
   - Generated on-demand via `@react-pdf/renderer` in Next.js App Router route handlers.
   - Served via public crypto UUID v4 tokens in `documents` table (`/api/documents/[token]`) with optional expiry (`expires_at`).
   - No sequential IDs exposed; zero permanent filesystem storage (Vercel serverless compatible).
   - Professional DPR Private Tuition branding, student details, fee breakdown, payment breakdown, signature footer.
4. **WhatsApp Integration**:
   - `https://wa.me/{sanitized_number}?text={encoded_message}` deep-link construction with phone number normalization (e.g. Indian +91 format).
   - Pre-filled message templates for Payment Receipts, Fee Reminders, and Urgent Overdue notices.
   - Strictly click-to-chat manual review/send (no auto-send bots or external gateway costs).
5. **SaaS Dashboard & Analytics**:
   - 8 KPI cards: Total Students, Active Students, Today's Collection, Monthly Collection, Pending Fees, Overdue Fees, Partial Payments Count, New Admissions.
   - Recharts visual analytics: Monthly Collection Trend (Bar/Area), Class Distribution (Horizontal Bar/Pie), Fee Status (Donut).
   - Quick actions toolbar (Add Student, Collect Fee, View Due Fees, View Overdue Fees, Generate Reminder, Search Receipt).
   - Real-time alerts banner and recent activity audit stream.
6. **Reports Engine**:
   - 8 specialized report dimensions: Daily Collection, Monthly Collection, Outstanding Fees, Overdue Fees (Aging), Class-wise Revenue, Student Fee Ledger, Payment Method Distribution, Admissions Report.
   - Multi-filter matrix (date range, class, student, status, payment method, fee mode).
   - Exports: RFC 4180 CSV, printable branded PDF, and browser print (`@media print`).
7. **Authentication & Security**:
   - Single-admin auth with JWT signed via `jose` (HS256) for Vercel Edge Middleware compatibility.
   - Password hashing with `bcryptjs` (salt factor 10-12).
   - `httpOnly`, `secure`, `sameSite=lax` cookie storage (`dpr_session`).
   - Full Zod schema validation across all API routes and forms.
   - Comprehensive `audit_logs` tracking mutations.
   - Dual connection strings: `DATABASE_URL` (pooled) via `@prisma/adapter-neon` and `DIRECT_URL` (direct).

## 2. Logic Chain
1. *Payment Accuracy*: Because tuition fees may be paid in installments by parents, the fee system must support 1-to-many relationship between `FeeRecord` and `Payment`. To prevent double-crediting or race conditions under concurrent requests, payments and balance updates must be wrapped in `prisma.$transaction`.
2. *Vercel Serverless Constraint*: Vercel serverless functions have a read-only ephemeral filesystem (`/tmp` is non-persistent). Therefore, PDF documents must never be saved to disk; they must be streamed directly in memory using `@react-pdf/renderer` into the HTTP response stream.
3. *Token Security & Privacy*: Parents receiving receipts via WhatsApp should not need login credentials to view their receipts, but sequential database IDs (`/receipt/1`) could leak financial data. Storing UUID v4 tokens in a `documents` table and routing via `/api/documents/[uuid]` achieves unguessable, secure access.
4. *Zero External Gateway Cost*: WhatsApp Business API incurs monthly fees and per-conversation charges. Generating `wa.me` click-to-chat links allows the admin to review and send messages directly via WhatsApp Web/App at zero cost.
5. *Edge Runtime Compatibility*: Node.js native `crypto` module often causes runtime crashes in Next.js Edge Middleware. Using `jose` for `SignJWT` and `jwtVerify` ensures seamless edge execution.

## 3. Caveats
- No caveats. All requirements (R3, R4, R5) and acceptance criteria have been fully analyzed, structured, and specified with exact schemas, formulas, edge cases, and endpoints in `features_spec.md`.

## 4. Conclusion
The specification for Payment Processing, PDF Document Streaming, WhatsApp Integration, SaaS Dashboard Analytics, Multi-dimensional Reports, and Edge Security is complete, unambiguous, and ready for immediate architectural synthesis and implementation.

## 5. Verification Method
1. Inspect `.agents/miner_survey_3/features_spec.md` to verify all 42 discovered features and 24 edge cases.
2. Confirm Prisma models (`User`, `Payment`, `Document`, `InstituteSetting`, `AuditLog`) align with data integrity constraints.
3. Verify Edge Middleware route filtering logic and `jose` token verification signature.

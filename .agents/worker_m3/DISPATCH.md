## 2026-08-15T12:23:17Z

You are Worker M3 (Payment Engine, Transactions & PDF Docs Specialist).
Your working directory is: d:\antigravity programme\tuition_manager\.agents\worker_m3.
Authoritative requirements: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md.
Project blueprint: d:\antigravity programme\tuition_manager\PROJECT.md.
Feature & Payment specifications: d:\antigravity programme\tuition_manager\.agents\miner_survey_3\features_spec.md.
Workspace root: d:\antigravity programme\tuition_manager.

Task:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and `miner_survey_3/features_spec.md`.
2. Implement `src/lib/payment-service.ts`:
   - Full & partial payment recording with database transactions (`prisma.$transaction`).
   - Atomically create Payment record and update FeeRecord (`paidAmount = paidAmount + amount`, `outstandingAmount = totalAmount - paidAmount`, status = PAID if outstanding === 0 else PARTIALLY_PAID).
   - Strict overpayment guard: throw clear error if `amount > feeRecord.outstandingAmount`.
   - Concurrency-safe receipt number generation `DPR-RC-{YEAR}-{SEQ}` (e.g. DPR-RC-2026-0001).
   - Payment methods: `CASH`, `UPI`, `BANK_TRANSFER`, `CARD`, `OTHER` with optional transactionId.
3. Implement `src/lib/document-service.ts`:
   - Generate secure random UUID token in `Document` table (`token`, `documentType` [RECEIPT, REMINDER, STATEMENT], `referenceId`, `studentId`, `expiresAt`).
   - Validate document token and retrieve associated data for PDF rendering.
4. Implement `@react-pdf/renderer` PDF components in `src/components/pdf/`:
   - `ReceiptPDF.tsx`: Professional PDF layout with DPR Private Tuition header/logo/tagline, receipt number, student name, student code, class name, billing period (from date to date), due date, breakdown table (Base Fee, Admission Fee, Discounts, Late Fee, Total Fee), payment details (Amount Paid, Payment Method, Transaction ID, Payment Date), remaining Outstanding Balance, and Authorized Signature line.
   - `ReminderPDF.tsx`: Professional PDF reminder with DPR branding, student info, billing period, amount due, due date, payment instructions/UPI handle, and formal fee reminder text.
5. Implement API Route Handlers:
   - `src/app/api/payments/route.ts`: POST to record payment, GET to list payments with filters (studentId, feeRecordId, paymentMethod, date range).
   - `src/app/api/payments/[id]/route.ts`: GET payment details by ID.
   - `src/app/api/documents/route.ts`: POST to generate document token.
   - `src/app/api/documents/[token]/route.ts`: GET to render and stream PDF on-demand via `@react-pdf/renderer` `renderToStream` or `renderToBuffer` returning `Content-Type: application/pdf`. Return 404 for invalid tokens and 410 for expired tokens. No permanent file storage on disk.
6. Implement Zod validation schemas in `src/lib/validations/payment.ts` and `src/lib/validations/document.ts`.
7. Execute verification:
   - `npx tsx tests/tier1_features/04_payments.test.ts`
   - `npx tsx tests/tier1_features/05_documents.test.ts`
   - `npx tsx tests/tier2_boundaries/02_financial_boundaries.test.ts`
   - `npx tsx tests/tier2_boundaries/04_document_boundaries.test.ts`
   - `npx tsx tests/tier3_combinations/02_partial_payment_reminders.test.ts`
   - `npx tsx tests/run-all.ts`
   - `npx tsc --noEmit`
8. Document all verification steps and outputs in `handoff.md` and notify parent.

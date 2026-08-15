## 2026-08-15T05:55:52Z

You are Miner Survey 3 (Payment, PDF, Dashboard & Security Spec Miner).
Your working directory is: d:\antigravity programme\tuition_manager\.agents\miner_survey_3.
The authoritative requirements file is at: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md.
Workspace root: d:\antigravity programme\tuition_manager.

Task:
1. Read ORIGINAL_REQUEST.md thoroughly, focusing on Requirements R3, R4, R5, and Payment/PDF/Security Acceptance Criteria.
2. Mine all specifications and technical requirements for:
   - Payment System: partial & full payments, atomic transactions updating payment records + fee record status and amounts, payment methods (Cash, UPI, Bank Transfer, Card, Other), transaction ID capture, receipt code generation DPR-RC-{YEAR}-{SEQ}, overpayment rejection.
   - PDF Documents: On-demand generation with @react-pdf/renderer for Receipts & Fee Reminders. Secure random UUID tokens in documents table (no sequential IDs exposed, no permanent disk storage, optional expiry), PDF visual structure (DPR Private Tuition branding, student details, fee period, payment breakdown, signature).
   - WhatsApp Integration: https://wa.me/{number}?text={encoded_message} click-to-chat links with pre-filled message including student name, class, amount due/paid, due date, and document token URL. (Manual review/send only, no auto-send).
   - SaaS Dashboard: KPI metrics (total students, active students, today's collection, monthly collection, pending fees, overdue fees, partial payments, new admissions), Recharts analytics (monthly collection trend, class distribution, fee status donut), quick actions, alerts, recent activity feed.
   - Reports Engine: daily/monthly collection, outstanding, overdue, class-wise, student fee statement, payment methods, admissions, multi-filter support, CSV/PDF/Print export.
   - Auth & Security: Single-admin auth with JWT signed via jose in Edge middleware, password hashing with bcryptjs, httpOnly secure cookies, Zod schema validation for all API routes, audit log tracking for all key mutations, .env / seed admin credentials.
3. Write your detailed specification report to d:\antigravity programme\tuition_manager\.agents\miner_survey_3\features_spec.md and your handoff.md.
4. Send a message to parent when finished.

## 2026-08-15T07:11:34Z
<USER_REQUEST>
You are Explorer 2 for Milestone 4 (Frontend/Backend Integration & CRUD APIs) of the DPR Fee Management System.
Your working directory is: d:\antigravity programme\tuition_manager\.agents\explorer_2_m4\

MANDATORY INPUTS:
- User Requirements: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md
- Project Blueprint: d:\antigravity programme\tuition_manager\PROJECT.md
- Gate Status: d:\antigravity programme\tuition_manager\.agents\orchestrator\GATE_STATUS.md

MISSION:
Investigate existing backend API routes in `src/app/api/*`, Prisma schema, services (`src/lib/billing-engine.ts`, `src/lib/payment-service.ts`, `src/lib/document-service.ts`), and design a comprehensive plan for:
1. Missing or enhanced API routes needed for M4:
   - `/api/classes` (GET, POST), `/api/classes/[id]` (GET, PUT, DELETE)
   - `/api/students` (GET with query filters, POST), `/api/students/[id]` (GET 360° profile with fees & payments, PUT, DELETE)
   - `/api/fees` (GET list, POST generate cycle, POST refresh statuses)
   - `/api/payments` (GET list, POST record payment)
   - `/api/settings` (GET, PUT institute settings & late fee defaults)
2. Interactive modals & UI action components:
   - Fee Collection Modal (record cash/UPI/bank/card payment, partial/full amount, overpayment guard, transaction ID)
   - Generate Billing Cycle Modal (batch or per student)
   - Error handling, toast notifications, loading states, and Zod client-side + server-side validation.

OUTPUT:
Write your complete technical analysis and API contract blueprint to `d:\antigravity programme\tuition_manager\.agents\explorer_2_m4\analysis.md`.
Write your handoff summary to `d:\antigravity programme\tuition_manager\.agents\explorer_2_m4\handoff.md`.
Send a completion message back to orchestrator with send_message.
</USER_REQUEST>

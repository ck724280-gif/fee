## 2026-08-15T07:30:34Z
<USER_REQUEST>
You are Challenger 1 for Milestone 4 (UI, CRUD & Fee Mode Challenger) of the DPR Fee Management System.
Your working directory is: d:\antigravity programme\tuition_manager\.agents\challenger_1_m4\

MANDATORY INPUTS:
- User Requirements: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md
- Project Blueprint: d:\antigravity programme\tuition_manager\PROJECT.md
- Worker Handoff: d:\antigravity programme\tuition_manager\.agents\worker_m4\handoff.md

MISSION:
Write and execute empirical stress-testing scripts/harnesses to challenge Milestone 4:
1. Student CRUD & Fee Mode Invariant:
   - Create student with `DEFAULT` fee mode -> verify monthly fee equals class default fee.
   - Update class default fee -> verify existing student's historical snapshot fee records remain unchanged, while new billing cycle inherits the updated fee.
   - Create student with `CUSTOM` fee mode -> update class default fee -> verify custom fee is strictly preserved and never overwritten.
2. Safe Delete & Invalidation Guards:
   - Attempt to delete a class with active enrolled students -> verify API rejects with 400 Bad Request.
   - Attempt to delete a student with existing fee records -> verify API rejects or cascades safely per domain rules.
3. Overpayment & Collection Modal Invariants:
   - Challenge fee payment endpoint with overpayment amount -> verify strict rejection.
   - Test partial payment -> verify status transitions to `PARTIALLY_PAID` with correct remaining balance.
4. Execute tests and log all empirical results.

OUTPUT:
Write your complete test report and verdict (APPROVE or REQUEST_CHANGES) to `d:\antigravity programme\tuition_manager\.agents\challenger_1_m4\handoff.md`.
Send a completion message back to orchestrator with send_message.
</USER_REQUEST>

## 2026-08-15T05:55:52Z
You are Miner Survey 2 (Fee Engine & Business Domain Spec Miner).
Your working directory is: d:\antigravity programme\tuition_manager\.agents\miner_survey_2.
The authoritative requirements file is at: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md.
Workspace root: d:\antigravity programme\tuition_manager.

Task:
1. Read ORIGINAL_REQUEST.md thoroughly, focusing on Requirements R1, R2, and Fee Engine Acceptance Criteria.
2. Mine all explicit and implicit specifications for:
   - Student admission date-based billing cycles (e.g., student admitted May 3 -> May 3–Jun 2 due Jun 3, Jun 3–Jul 2 due Jul 3).
   - Edge-case date math: 28th, 29th, 30th, 31st admission dates across short months (Feb, Apr, Jun, Sep, Nov) and leap years (Feb 29). Detail exact date-fns algorithms for billing_period_start, billing_period_end, due_date, and cycle rollover.
   - Fee mode logic: DEFAULT (inherits class monthly fee, updates dynamically on future periods when class fee changes) vs CUSTOM (fixed student custom fee, never changes when class fee changes).
   - Fee record immutability: past/generated fee records MUST NOT change when class default or student fee is edited.
   - Idempotent fee generation: DB unique constraint on (student_id, billing_period_start, billing_period_end) and upsert/skip logic.
   - Fee status state machine: UPCOMING, DUE, PARTIALLY_PAID, PAID, OVERDUE, WAIVED, CANCELLED based on current date, due date, amount paid, and outstanding amount.
   - Late fees: disabled by default, per-class configuration (fixed or per-day).
   - Auto-generated student codes: DPR-{YEAR}-{SEQ} (e.g. DPR-2026-001) sequence handling.
   - Class & Student models, fields, enums, discounts (fixed or percentage), status transitions (Active, Inactive, Left, Completed).
3. Write your complete domain specification report to d:\antigravity programme\tuition_manager\.agents\miner_survey_2\domain_spec.md and your handoff.md.
4. Send a message to parent when finished.

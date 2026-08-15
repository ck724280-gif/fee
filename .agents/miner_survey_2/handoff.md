# Handoff Report — Miner Survey 2 (Fee Engine & Business Domain Spec)

## 1. Observation
- **Authoritative Requirements File**: `d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md`
- **Key Clauses Observed**:
  - Line 15 (R1): *"The system must support two-level fee configuration: class default fees and student-specific custom fees using an explicit fee_mode field (DEFAULT or CUSTOM) on each student record. Billing cycles must be calculated from each student's individual admission/joining date — NOT the 1st of each calendar month. For example, a student admitted on May 3 has billing periods May 3–Jun 2, Jun 3–Jul 2, etc., with due dates Jun 3, Jul 3, etc. Fee records must be immutable once generated — changing a student's fee or class default fee must never alter historical fee records. Fee generation must be idempotent using a unique database constraint on (student_id, billing_period_start, billing_period_end)..."*
  - Line 18 (R2): *"Full CRUD for classes... and students... Auto-generate unique student codes in format DPR-{YEAR}-{SEQ} (e.g., DPR-2026-001)... Student statuses: Active, Inactive, Left, Completed."*
  - Line 21 (R3): *"Support full and partial payments — multiple payments against one fee record (e.g., ₹200 + ₹200 + ₹100 = ₹500 total against a ₹500 fee)... Auto-generate unique receipt numbers in format DPR-RC-{YEAR}-{SEQ}."*
  - Lines 40–44 (Acceptance Criteria): Explicit verification requirements for admission date billing, idempotency, fee mode inheritance vs custom locks, and state machine derivation.

## 2. Logic Chain
1. **Admission Anchor Date Math**: Because admission dates can fall on days 28–31, calculating subsequent cycle dates via naive increments would cause drift (e.g., Jan 31 -> Feb 28 -> Mar 28 instead of Mar 31). By persisting the anchor day $A_0 = \text{getDate}(D_0)$ and evaluating each cycle as $S_k = \min(A_0, \text{daysInMonth}(Y_k, M_k))$, all month boundaries clamp correctly (Feb 28/29, Apr 30) and instantly recover the anchor in 31-day months (Mar 31, May 31).
2. **Immutability Architecture**: Modifying Class default fees or Student fees must never retroactively alter past generated fees. By recording full pricing snapshots (`base_amount`, `discount_amount`, `admission_fee_amount`, `late_fee_amount`, `total_amount`, `fee_mode`, `class_id`) directly on each row in `fee_records`, historical statements and receipts remain 100% frozen.
3. **Idempotency Guarantee**: By enforcing `@@unique([student_id, billing_period_start, billing_period_end])` on table `fee_records`, any duplicate generation attempt is safely caught and skipped without creating dirty data or duplicate invoices.
4. **Multi-Payment Consistency**: atomic database transactions update `payments`, increment `fee_records.paid_amount`, decrement `fee_records.outstanding_amount`, and trigger status recalculation (`PAID` or `PARTIALLY_PAID`). Overpayments exceeding outstanding balance are rejected at validation.

## 3. Caveats
- Timezone handling: When operating between UTC database storage and IST (Asia/Kolkata, UTC+05:30) local time, all billing start/end dates must be stored as pure SQL dates (`@db.Date` in Prisma) or normalized to UTC midnight to avoid single-day off-by-one shifting.
- Late fee activation: Late fees are disabled by default (`late_fee_enabled: false`), but the engine specification supports both `FIXED` and `PER_DAY` rates when enabled on a Class.

## 4. Conclusion
The comprehensive Fee Engine and Business Domain specification has been authored and published to:
`d:\antigravity programme\tuition_manager\.agents\miner_survey_2\domain_spec.md`.

It provides:
- Mathematical and reference TypeScript `date-fns` implementations for student admission-based billing cycles.
- A 17-scenario edge case verification matrix covering 28th/29th/30th/31st anchor days, February leap/non-leap years, and calendar boundaries.
- Complete Prisma schema models (`Class`, `Student`, `FeeRecord`, `Payment`) with constraints, enums, and indexes.
- State machine transition definitions for fee status (`UPCOMING`, `DUE`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `WAIVED`, `CANCELLED`).
- Sequence generation algorithms for `DPR-{YEAR}-{SEQ}` and `DPR-RC-{YEAR}-{SEQ}`.

## 5. Verification Method
- **Inspect Specification File**:
  `view_file` at `d:\antigravity programme\tuition_manager\.agents\miner_survey_2\domain_spec.md`
- **Verify Date Engine Logic**:
  Run unit test with inputs `admission_date = '2026-05-03'`:
  - Cycle 0: Start `2026-05-03`, End `2026-06-02`, Due `2026-06-03`
  - Cycle 1: Start `2026-06-03`, End `2026-07-02`, Due `2026-07-03`
- **Verify 31st Anchor Recovery**:
  Run unit test with input `admission_date = '2026-01-31'`:
  - Cycle 0: `2026-01-31` to `2026-02-27` (Due `2026-02-28`)
  - Cycle 1: `2026-02-28` to `2026-03-30` (Due `2026-03-31`)
  - Cycle 2: `2026-03-31` to `2026-04-29` (Due `2026-04-30`)

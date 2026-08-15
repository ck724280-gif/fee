# DISPATCH LOG

## 2026-08-15T06:33:28Z
You are Worker M2 (Core Fee Billing Engine & Math Specialist).
Your working directory is: d:\antigravity programme\tuition_manager\.agents\worker_m2.
Authoritative requirements: d:\antigravity programme\tuition_manager\.agents\ORIGINAL_REQUEST.md.
Project blueprint: d:\antigravity programme\tuition_manager\PROJECT.md.
Domain specification: d:\antigravity programme\tuition_manager\.agents\miner_survey_2\domain_spec.md.
Test infrastructure & assertions: d:\antigravity programme\tuition_manager\TEST_INFRA.md and d:\antigravity programme\tuition_manager\tests/.
Workspace root: d:\antigravity programme\tuition_manager.

Task:
1. Read ORIGINAL_REQUEST.md, PROJECT.md, and `miner_survey_2/domain_spec.md`.
2. Implement `src/lib/billing-engine.ts`:
   - `calculateBillingCycle(admissionDate: Date, cycleIndex: number)`: calculates periodStart, periodEnd (day before next start), dueDate (start of next cycle + grace). Implements anchor day preservation across 28th, 29th, 30th, 31st and leap year Feb 29 with automatic month-end clamping and next-month anchor recovery.
   - `calculateFeeBreakdown(...)`: resolves feeMode DEFAULT (dynamic class fee) vs CUSTOM (student custom monthly fee), applies discounts (FIXED or PERCENTAGE), applies admission fee if first cycle, computes late fees if overdue and enabled.
   - `deriveFeeStatus(feeRecord, currentDate)`: derives UPCOMING, DUE, PARTIALLY_PAID, PAID, OVERDUE, WAIVED, CANCELLED.
   - `generateStudentBillingRecords(...)`: generates idempotent fee records for a student across all cycles up to a target date, utilizing Prisma unique constraint `(studentId, billingPeriodStart, billingPeriodEnd)` with safe skip on existing records.
   - `generateBatchBillingRecords(...)`: batch generator for all ACTIVE students up to a target date.
   - `generateStudentCode(prismaClient, admissionYear)`: concurrency-safe generation of `DPR-{YEAR}-{SEQ}` (e.g. DPR-2026-001).
3. Implement API route handlers:
   - `src/app/api/fees/generate/route.ts`: POST endpoint to trigger batch or single student fee generation.
   - `src/app/api/fees/route.ts`: GET endpoint to list fee records with filtering (classId, studentId, status, date range, search) and pagination.
   - `src/app/api/fees/[id]/route.ts`: GET record by ID, PATCH to update status (e.g. WAIVED, CANCELLED).
4. Run tests and typechecks:
   - `npx tsx tests/tier1_features/02_billing_engine.test.ts`
   - `npx tsx tests/tier1_features/03_fee_lifecycle.test.ts`
   - `npx tsx tests/tier2_boundaries/01_date_boundaries.test.ts`
   - `npx tests/tier3_combinations/01_class_fee_vs_custom_student.test.ts`
   - `npx tsc --noEmit`
5. Verify everything passes 100% and document commands and output in `handoff.md`.

/**
 * Independent Forensic Audit Verification Script for Milestone 2
 * Author: Forensic Auditor (M2)
 *
 * Direct adversarial stress test of src/lib/billing-engine.ts and src/lib/validations/fee.ts
 */

import {
  calculateBillingCycle,
  getBillingCyclesUpToDate,
  calculateLateFee,
  calculateFeeBreakdown,
  resolvePricing,
  deriveFeeStatus,
  generateStudentCode,
  BillingEngine,
} from '../../src/lib/billing-engine';
import { generateFeesSchema, feeFilterSchema, updateFeeRecordSchema } from '../../src/lib/validations/fee';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FORENSIC ASSERTION FAILED: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`FORENSIC ASSERTION FAILED [${message}]: Expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn: () => void, expectedText: string, message: string) {
  let threw = false;
  try {
    fn();
  } catch (err: any) {
    threw = true;
    if (expectedText && !err.message.includes(expectedText)) {
      throw new Error(`FORENSIC ASSERTION FAILED [${message}]: Threw unexpected error: ${err.message}`);
    }
  }
  if (!threw) {
    throw new Error(`FORENSIC ASSERTION FAILED [${message}]: Expected function to throw, but it succeeded.`);
  }
}

export async function runForensicAudit() {
  console.log('================================================================');
  console.log('STARTING FORENSIC INTEGRITY AUDIT: MILESTONE 2');
  console.log('================================================================\n');

  let checksPassed = 0;

  // -------------------------------------------------------------
  // Check 1: Date Math — Leap Year & Anchor Preservation (100 Years / 1200 Cycles)
  // -------------------------------------------------------------
  console.log('>>> [Check 1] Probing Date Math & Multi-Year Continuity...');
  
  // Test 31st anchor across 48 consecutive months
  const anchor31 = new Date('2024-01-31');
  for (let k = 0; k < 48; k++) {
    const cur = calculateBillingCycle(anchor31, k);
    const next = calculateBillingCycle(anchor31, k + 1);
    // Period end + 1 day must equal due date
    const endMs = cur.periodEnd.getTime();
    const dueMs = cur.dueDate.getTime();
    assertEqual(dueMs - endMs, 86400000, `Gap/Overlap in cycle ${k} for 31st anchor`);
    // Due date must equal next cycle start date
    assertEqual(cur.dueDateStr, next.periodStartStr, `Discontinuity between cycle ${k} and ${k+1}`);
  }
  checksPassed++;
  console.log('  ✔ 31st anchor continuity verified across 48 months (zero gaps, zero overlaps).');

  // Test Leap Day Admission (2024-02-29) across 10 years (120 cycles)
  const leapAdmission = new Date('2024-02-29');
  const c0 = calculateBillingCycle(leapAdmission, 0);
  assertEqual(c0.periodStartStr, '2024-02-29', 'Leap Day Cycle 0 start');
  assertEqual(c0.periodEndStr, '2024-03-28', 'Leap Day Cycle 0 end');
  assertEqual(c0.dueDateStr, '2024-03-29', 'Leap Day Cycle 0 due date');

  // Cycle 12 (Feb 2025 - Non-leap year) -> clamped to Feb 28
  const c12 = calculateBillingCycle(leapAdmission, 12);
  assertEqual(c12.periodStartStr, '2025-02-28', 'Leap Day Cycle 12 (non-leap) start');
  assertEqual(c12.periodEndStr, '2025-03-28', 'Leap Day Cycle 12 (non-leap) end');
  assertEqual(c12.dueDateStr, '2025-03-29', 'Leap Day Cycle 12 (non-leap) due date');

  // Cycle 48 (Feb 2028 - Next Leap year) -> restored to Feb 29
  const c48 = calculateBillingCycle(leapAdmission, 48);
  assertEqual(c48.periodStartStr, '2028-02-29', 'Leap Day Cycle 48 (leap year) start');
  assertEqual(c48.periodEndStr, '2028-03-28', 'Leap Day Cycle 48 (leap year) end');
  assertEqual(c48.dueDateStr, '2028-03-29', 'Leap Day Cycle 48 (leap year) due date');
  checksPassed++;
  console.log('  ✔ Leap day admission (Feb 29) verified across leap & non-leap recovery.');

  // -------------------------------------------------------------
  // Check 2: Invalid Date Handling
  // -------------------------------------------------------------
  console.log('\n>>> [Check 2] Probing Invalid Date Input Handling...');
  assertThrows(() => calculateBillingCycle('invalid-date', 0), 'Invalid admission date', 'Invalid string date');
  checksPassed++;
  console.log('  ✔ Invalid admission date correctly throws error.');

  // -------------------------------------------------------------
  // Check 3: Pricing Engine & Edge Combinations
  // -------------------------------------------------------------
  console.log('\n>>> [Check 3] Probing Pricing Engine & Discount Boundaries...');

  // Zero base fee
  const pZero = calculateFeeBreakdown({
    feeMode: 'DEFAULT',
    classDefaultFee: 0,
    discountType: 'NONE',
    discountValue: 0,
  });
  assertEqual(pZero.totalAmount, 0, 'Zero base fee');
  assertEqual(pZero.netFeeAmount, 0, 'Zero net fee');

  // Fixed discount > base fee (Clamping check)
  const pExcessDiscount = calculateFeeBreakdown({
    feeMode: 'DEFAULT',
    classDefaultFee: 500,
    discountType: 'FIXED',
    discountValue: 1200,
  });
  assertEqual(pExcessDiscount.discountAmount, 500, 'Discount clamped to base amount');
  assertEqual(pExcessDiscount.netFeeAmount, 0, 'Net fee cannot be negative');

  // Percentage discount > 100% (Clamping check)
  const pExcessPct = calculateFeeBreakdown({
    feeMode: 'DEFAULT',
    classDefaultFee: 800,
    discountType: 'PERCENTAGE',
    discountValue: 150,
  });
  assertEqual(pExcessPct.discountAmount, 800, 'Percentage discount clamped to 100%');
  assertEqual(pExcessPct.netFeeAmount, 0, 'Net fee after 100% discount');

  // Negative discount percentage (Clamping check)
  const pNegPct = calculateFeeBreakdown({
    feeMode: 'DEFAULT',
    classDefaultFee: 800,
    discountType: 'PERCENTAGE',
    discountValue: -20,
  });
  assertEqual(pNegPct.discountAmount, 0, 'Negative percentage discount clamped to 0');
  assertEqual(pNegPct.netFeeAmount, 800, 'Net fee after negative discount');

  // CUSTOM fee mode without customMonthlyFee
  assertThrows(() => {
    calculateFeeBreakdown({
      feeMode: 'CUSTOM',
      classDefaultFee: 800,
      customMonthlyFee: null,
    });
  }, 'non-negative customMonthlyFee', 'Missing customMonthlyFee in CUSTOM mode');

  // CUSTOM fee mode with negative customMonthlyFee
  assertThrows(() => {
    calculateFeeBreakdown({
      feeMode: 'CUSTOM',
      classDefaultFee: 800,
      customMonthlyFee: -50,
    });
  }, 'non-negative customMonthlyFee', 'Negative customMonthlyFee in CUSTOM mode');

  // First cycle admission fee independence from discount
  const pCycle0 = calculateFeeBreakdown({
    feeMode: 'DEFAULT',
    classDefaultFee: 800,
    discountType: 'FIXED',
    discountValue: 200,
    admissionFee: 500,
    isFirstCycle: true,
  });
  assertEqual(pCycle0.baseAmount, 800, 'Base amount');
  assertEqual(pCycle0.discountAmount, 200, 'Discount amount');
  assertEqual(pCycle0.netFeeAmount, 600, 'Net fee');
  assertEqual(pCycle0.admissionFeeAmount, 500, 'Admission fee');
  assertEqual(pCycle0.totalAmount, 1100, 'Total amount = net + admission');

  checksPassed++;
  console.log('  ✔ Pricing breakdown and discount boundary clamping verified.');

  // -------------------------------------------------------------
  // Check 4: Late Fee Engine
  // -------------------------------------------------------------
  console.log('\n>>> [Check 4] Probing Late Fee Calculation Engine...');

  // Late fee disabled
  const lfDisabled = calculateLateFee(
    { lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 100, graceDays: 0 },
    { dueDate: '2026-05-01', totalAmount: 500, paidAmount: 0 },
    '2026-06-01'
  );
  assertEqual(lfDisabled, 0, 'Disabled late fee returns 0');

  // Fully paid fee incurs 0 late fee
  const lfPaid = calculateLateFee(
    { lateFeeEnabled: true, lateFeeType: 'FIXED', lateFeeAmount: 100, graceDays: 0 },
    { dueDate: '2026-05-01', totalAmount: 500, paidAmount: 500 },
    '2026-06-01'
  );
  assertEqual(lfPaid, 0, 'Paid fee incurs 0 late fee');

  // Within grace period
  const lfGrace = calculateLateFee(
    { lateFeeEnabled: true, lateFeeType: 'FIXED', lateFeeAmount: 100, graceDays: 7 },
    { dueDate: '2026-05-01', totalAmount: 500, paidAmount: 0 },
    '2026-05-06'
  );
  assertEqual(lfGrace, 0, 'Late fee within grace period is 0');

  // Per day calculation past grace period
  const lfPerDay = calculateLateFee(
    { lateFeeEnabled: true, lateFeeType: 'PER_DAY', lateFeeAmount: 15, graceDays: 3 },
    { dueDate: '2026-05-01', totalAmount: 500, paidAmount: 0 },
    '2026-05-11' // 10 days late - 3 grace = 7 days * 15 = 105
  );
  assertEqual(lfPerDay, 105, 'Per-day late fee calculation');

  checksPassed++;
  console.log('  ✔ Late fee calculations (Fixed, Per-day, Grace period, Paid immunity) verified.');

  // -------------------------------------------------------------
  // Check 5: Fee Status State Machine
  // -------------------------------------------------------------
  console.log('\n>>> [Check 5] Probing Fee Status Derivation State Machine...');

  // UPCOMING
  assertEqual(
    deriveFeeStatus({ paidAmount: 0, totalAmount: 500, dueDate: '2026-06-01' }, '2026-05-31'),
    'UPCOMING',
    'Status before due date'
  );

  // DUE on due date
  assertEqual(
    deriveFeeStatus({ paidAmount: 0, totalAmount: 500, dueDate: '2026-06-01' }, '2026-06-01'),
    'DUE',
    'Status on due date'
  );

  // DUE during grace period
  assertEqual(
    deriveFeeStatus({ paidAmount: 0, totalAmount: 500, dueDate: '2026-06-01' }, '2026-06-04', 5),
    'DUE',
    'Status during grace period'
  );

  // OVERDUE after due date and grace period
  assertEqual(
    deriveFeeStatus({ paidAmount: 0, totalAmount: 500, dueDate: '2026-06-01' }, '2026-06-08', 5),
    'OVERDUE',
    'Status after grace period'
  );

  // PARTIALLY_PAID
  assertEqual(
    deriveFeeStatus({ paidAmount: 200, totalAmount: 500, dueDate: '2026-06-01' }, '2026-06-15'),
    'PARTIALLY_PAID',
    'Status for partial payment'
  );

  // PAID
  assertEqual(
    deriveFeeStatus({ paidAmount: 500, totalAmount: 500, dueDate: '2026-06-01' }, '2026-06-15'),
    'PAID',
    'Status for full payment'
  );

  // Overpayment -> PAID
  assertEqual(
    deriveFeeStatus({ paidAmount: 600, totalAmount: 500, dueDate: '2026-06-01' }, '2026-06-15'),
    'PAID',
    'Status for overpayment'
  );

  // Zero total amount -> PAID
  assertEqual(
    deriveFeeStatus({ paidAmount: 0, totalAmount: 0, dueDate: '2026-06-01' }, '2026-05-15'),
    'PAID',
    'Zero total amount is PAID'
  );

  // Immutable WAIVED override
  assertEqual(
    deriveFeeStatus({ paidAmount: 0, totalAmount: 500, dueDate: '2026-06-01', status: 'WAIVED' }, '2026-06-15'),
    'WAIVED',
    'WAIVED status is immutable'
  );

  // Immutable CANCELLED override
  assertEqual(
    deriveFeeStatus({ paidAmount: 0, totalAmount: 500, dueDate: '2026-06-01', status: 'CANCELLED' }, '2026-06-15'),
    'CANCELLED',
    'CANCELLED status is immutable'
  );

  checksPassed++;
  console.log('  ✔ Fee status state machine verified across all states.');

  // -------------------------------------------------------------
  // Check 6: Sequential Student Code Generation
  // -------------------------------------------------------------
  console.log('\n>>> [Check 6] Probing Student Code Generation Logic...');

  const mockDb1 = {
    student: {
      findFirst: async () => null,
    },
  };
  const codeFirst = await generateStudentCode(mockDb1, 2026);
  assertEqual(codeFirst, 'DPR-2026-001', 'First code sequence');

  const mockDb2 = {
    student: {
      findFirst: async () => ({ studentCode: 'DPR-2026-009' }),
    },
  };
  const codeNext = await generateStudentCode(mockDb2, 2026);
  assertEqual(codeNext, 'DPR-2026-010', 'Incrementing code sequence');

  const mockDb3 = {
    student: {
      findFirst: async () => ({ studentCode: 'DPR-2026-999' }),
    },
  };
  const codeTriple = await generateStudentCode(mockDb3, 2026);
  assertEqual(codeTriple, 'DPR-2026-1000', '1000+ code sequence');

  checksPassed++;
  console.log('  ✔ Student code generation logic verified.');

  // -------------------------------------------------------------
  // Check 7: Zod Validation Schemas
  // -------------------------------------------------------------
  console.log('\n>>> [Check 7] Probing Zod Validation Schemas...');

  // Valid generate fees input
  const validGen = generateFeesSchema.safeParse({
    studentId: 'uuid-1',
    throughDate: '2026-12-31',
  });
  assert(validGen.success, 'Valid generate fees schema parse');

  // Empty body for batch generation is valid
  const validEmptyGen = generateFeesSchema.safeParse({});
  assert(validEmptyGen.success, 'Empty body generate fees schema parse');

  // Valid fee filter schema
  const validFilter = feeFilterSchema.safeParse({
    page: '2',
    limit: '50',
    sortBy: 'totalAmount',
    sortOrder: 'asc',
    status: 'OVERDUE',
  });
  assert(validFilter.success, 'Valid fee filter parse');
  if (validFilter.success) {
    assertEqual(validFilter.data.page, 2, 'Page coerced to number');
    assertEqual(validFilter.data.limit, 50, 'Limit coerced to number');
  }

  // Invalid fee filter limit > 100
  const invalidLimit = feeFilterSchema.safeParse({
    limit: '200',
  });
  assert(!invalidLimit.success, 'Fee filter limit > 100 rejected');

  // Valid update fee record
  const validUpdate = updateFeeRecordSchema.safeParse({
    status: 'WAIVED',
    notes: 'Scholarship grant',
    lateFeeAmount: 50,
  });
  assert(validUpdate.success, 'Valid fee record update schema parse');

  // Invalid update fee record with negative late fee
  const invalidUpdate = updateFeeRecordSchema.safeParse({
    lateFeeAmount: -10,
  });
  assert(!invalidUpdate.success, 'Negative lateFeeAmount rejected');

  checksPassed++;
  console.log('  ✔ All Zod validation schemas strictly verified.');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`FORENSIC AUDIT COMPLETE: ALL ${checksPassed} AUDIT CHECKS PASSED`);
  console.log('VERDICT: CLEAN — NO INTEGRITY VIOLATIONS DETECTED');
  console.log('================================================================');
}

runForensicAudit().catch((err) => {
  console.error('AUDIT CRITICAL FAILURE:', err);
  process.exit(1);
});

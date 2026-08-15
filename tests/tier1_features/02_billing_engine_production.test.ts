/**
 * Direct Unit & Integration Verification for src/lib/billing-engine.ts
 */

import { assertEqual, assertTrue, assertFalse, assertThrows } from '../assertions';
import {
  calculateBillingCycle,
  getBillingCyclesUpToDate,
  calculateLateFee,
  calculateFeeBreakdown,
  resolvePricing,
  deriveFeeStatus,
  generateStudentCode,
  generateStudentBillingRecords,
  generateBatchBillingRecords,
} from '../../src/lib/billing-engine';

async function runProductionBillingEngineTests() {
  console.log('--- Running Direct Tests for src/lib/billing-engine.ts ---');

  // Test 1: Standard Admission Date Cycle Math
  const c0 = calculateBillingCycle(new Date('2026-05-03'), 0);
  assertEqual(c0.periodStartStr, '2026-05-03');
  assertEqual(c0.periodEndStr, '2026-06-02');
  assertEqual(c0.dueDateStr, '2026-06-03');

  const c1 = calculateBillingCycle(new Date('2026-05-03'), 1);
  assertEqual(c1.periodStartStr, '2026-06-03');
  assertEqual(c1.periodEndStr, '2026-07-02');
  assertEqual(c1.dueDateStr, '2026-07-03');

  // Test 2: 31st Anchor Clamping and Next-Month Recovery
  const mar31_0 = calculateBillingCycle(new Date('2026-03-31'), 0);
  assertEqual(mar31_0.periodStartStr, '2026-03-31');
  assertEqual(mar31_0.periodEndStr, '2026-04-29');
  assertEqual(mar31_0.dueDateStr, '2026-04-30');

  const mar31_1 = calculateBillingCycle(new Date('2026-03-31'), 1);
  assertEqual(mar31_1.periodStartStr, '2026-04-30');
  assertEqual(mar31_1.periodEndStr, '2026-05-30');
  assertEqual(mar31_1.dueDateStr, '2026-05-31');

  // Test 3: Leap Year Feb 29 Clamping & Restoration
  const leapJan29 = calculateBillingCycle(new Date('2024-01-29'), 0);
  assertEqual(leapJan29.periodStartStr, '2024-01-29');
  assertEqual(leapJan29.periodEndStr, '2024-02-28');
  assertEqual(leapJan29.dueDateStr, '2024-02-29');

  const nonLeapJan29 = calculateBillingCycle(new Date('2026-01-29'), 0);
  assertEqual(nonLeapJan29.periodStartStr, '2026-01-29');
  assertEqual(nonLeapJan29.periodEndStr, '2026-02-27');
  assertEqual(nonLeapJan29.dueDateStr, '2026-02-28');

  // Test 4: getBillingCyclesUpToDate
  const allCycles = getBillingCyclesUpToDate(new Date('2026-01-15'), new Date('2026-04-15'));
  assertEqual(allCycles.length, 4); // Jan, Feb, Mar, Apr
  assertEqual(allCycles[0].periodStartStr, '2026-01-15');
  assertEqual(allCycles[3].periodStartStr, '2026-04-15');

  // Test 5: Pricing Calculation - DEFAULT mode with discounts
  const pDefault = calculateFeeBreakdown({
    feeMode: 'DEFAULT',
    classDefaultFee: 800,
    discountType: 'PERCENTAGE',
    discountValue: 10,
    admissionFee: 200,
    isFirstCycle: true,
  });
  assertEqual(pDefault.baseAmount, 800);
  assertEqual(pDefault.discountAmount, 80);
  assertEqual(pDefault.netFeeAmount, 720);
  assertEqual(pDefault.admissionFeeAmount, 200);
  assertEqual(pDefault.totalAmount, 920);

  // Test 6: Pricing Calculation - CUSTOM mode
  const pCustom = calculateFeeBreakdown({
    feeMode: 'CUSTOM',
    classDefaultFee: 800,
    customMonthlyFee: 650,
    discountType: 'FIXED',
    discountValue: 50,
    admissionFee: 0,
    isFirstCycle: false,
  });
  assertEqual(pCustom.baseAmount, 650);
  assertEqual(pCustom.discountAmount, 50);
  assertEqual(pCustom.netFeeAmount, 600);
  assertEqual(pCustom.totalAmount, 600);

  // Test 7: CUSTOM mode validation error if customMonthlyFee is missing
  assertThrows(() => {
    calculateFeeBreakdown({
      feeMode: 'CUSTOM',
      classDefaultFee: 800,
      customMonthlyFee: null,
    });
  }, 'non-negative customMonthlyFee');

  // Test 8: Late Fee Calculation
  const lateFixed = calculateLateFee(
    { lateFeeEnabled: true, lateFeeType: 'FIXED', lateFeeAmount: 50, graceDays: 5 },
    { dueDate: new Date('2026-05-01'), totalAmount: 500, paidAmount: 0 },
    new Date('2026-05-10')
  );
  assertEqual(lateFixed, 50);

  const latePerDay = calculateLateFee(
    { lateFeeEnabled: true, lateFeeType: 'PER_DAY', lateFeeAmount: 10, graceDays: 2 },
    { dueDate: new Date('2026-05-01'), totalAmount: 500, paidAmount: 0 },
    new Date('2026-05-06') // 5 days late - 2 grace = 3 days * 10 = 30
  );
  assertEqual(latePerDay, 30);

  const lateGrace = calculateLateFee(
    { lateFeeEnabled: true, lateFeeType: 'FIXED', lateFeeAmount: 50, graceDays: 5 },
    { dueDate: new Date('2026-05-01'), totalAmount: 500, paidAmount: 0 },
    new Date('2026-05-04')
  );
  assertEqual(lateGrace, 0);

  // Test 9: deriveFeeStatus
  const statusUpcoming = deriveFeeStatus(
    { paidAmount: 0, totalAmount: 500, dueDate: new Date('2026-06-01') },
    new Date('2026-05-15')
  );
  assertEqual(statusUpcoming, 'UPCOMING');

  const statusDue = deriveFeeStatus(
    { paidAmount: 0, totalAmount: 500, dueDate: new Date('2026-06-01') },
    new Date('2026-06-01')
  );
  assertEqual(statusDue, 'DUE');

  const statusOverdue = deriveFeeStatus(
    { paidAmount: 0, totalAmount: 500, dueDate: new Date('2026-06-01') },
    new Date('2026-06-15')
  );
  assertEqual(statusOverdue, 'OVERDUE');

  const statusPartial = deriveFeeStatus(
    { paidAmount: 200, totalAmount: 500, dueDate: new Date('2026-06-01') },
    new Date('2026-06-15')
  );
  assertEqual(statusPartial, 'PARTIALLY_PAID');

  const statusPaid = deriveFeeStatus(
    { paidAmount: 500, totalAmount: 500, dueDate: new Date('2026-06-01') },
    new Date('2026-06-15')
  );
  assertEqual(statusPaid, 'PAID');

  const statusWaived = deriveFeeStatus(
    { paidAmount: 0, totalAmount: 500, dueDate: new Date('2026-06-01'), status: 'WAIVED' },
    new Date('2026-06-15')
  );
  assertEqual(statusWaived, 'WAIVED');

  // Test 10: generateStudentCode mock client
  const mockPrisma = {
    student: {
      findFirst: async () => ({ studentCode: 'DPR-2026-042' }),
    },
  };
  const code = await generateStudentCode(mockPrisma, 2026);
  assertEqual(code, 'DPR-2026-043');

  const emptyMockPrisma = {
    student: {
      findFirst: async () => null,
    },
  };
  const firstCode = await generateStudentCode(emptyMockPrisma, 2026);
  assertEqual(firstCode, 'DPR-2026-001');

  console.log('✔ All direct production billing engine tests PASSED successfully!');
}

runProductionBillingEngineTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

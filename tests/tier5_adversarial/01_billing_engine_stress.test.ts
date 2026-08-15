/**
 * Tier 5 Adversarial Stress Suite: Billing Engine & Date Math Oracle
 * Author: Challenger 1 (Milestone M2)
 */

import {
  calculateBillingCycle,
  getBillingCyclesUpToDate,
  calculateFeeBreakdown,
  calculateLateFee,
  deriveFeeStatus,
  generateStudentCode,
  generateStudentBillingRecords,
  formatYMD,
  startOfDay,
  BillingCycle,
} from '../../src/lib/billing-engine';
import { assert, assertEqual, assertTrue, assertFalse, assertThrows } from '../assertions';

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function runTest(suite: string, name: string, fn: () => void | Promise<void>) {
  try {
    const res = fn();
    if (res instanceof Promise) {
      throw new Error('Async test must be run with runAsyncTest');
    }
    results.push({ suite, name, passed: true });
    console.log(`  ✓ [${suite}] ${name}`);
  } catch (err: any) {
    results.push({ suite, name, passed: false, error: err.message || String(err) });
    console.error(`  ✗ [${suite}] ${name}: ${err.message}`);
  }
}

async function runAsyncTest(suite: string, name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ suite, name, passed: true });
    console.log(`  ✓ [${suite}] ${name}`);
  } catch (err: any) {
    results.push({ suite, name, passed: false, error: err.message || String(err) });
    console.error(`  ✗ [${suite}] ${name}: ${err.message}`);
  }
}

/**
 * High-fidelity Prisma mock client for database interaction testing
 */
function createPrismaMock() {
  const classes: any[] = [];
  const students: any[] = [];
  const feeRecords: any[] = [];

  return {
    class: {
      create: async ({ data }: any) => {
        const item = { id: data.id || `cls_${Date.now()}_${Math.random()}`, ...data };
        classes.push(item);
        return item;
      },
      findUnique: async ({ where }: any) => {
        return classes.find((c) => c.id === where.id) || null;
      },
    },
    student: {
      create: async ({ data }: any) => {
        const item = { id: data.id || `stu_${Date.now()}_${Math.random()}`, ...data };
        students.push(item);
        return item;
      },
      findUnique: async ({ where, include }: any) => {
        const stu = students.find((s) => s.id === where.id);
        if (!stu) return null;
        if (include?.class) {
          const cls = classes.find((c) => c.id === stu.classId);
          return { ...stu, class: cls };
        }
        return stu;
      },
      findFirst: async ({ where, orderBy, select }: any) => {
        let matching = [...students];
        if (where?.studentCode?.startsWith) {
          const prefix = where.studentCode.startsWith;
          matching = matching.filter((s) => s.studentCode && s.studentCode.startsWith(prefix));
        }
        if (orderBy?.studentCode === 'desc') {
          matching.sort((a, b) => b.studentCode.localeCompare(a.studentCode));
        }
        const item = matching[0] || null;
        if (!item) return null;
        if (select?.studentCode) return { studentCode: item.studentCode };
        return item;
      },
      findMany: async ({ where }: any) => {
        let matching = [...students];
        if (where?.status) matching = matching.filter((s) => s.status === where.status);
        if (where?.classId) matching = matching.filter((s) => s.classId === where.classId);
        return matching;
      },
    },
    feeRecord: {
      create: async ({ data }: any) => {
        // Enforce compound unique constraint (studentId, billingPeriodStart, billingPeriodEnd)
        const dup = feeRecords.find(
          (f) =>
            f.studentId === data.studentId &&
            f.billingPeriodStart.getTime() === data.billingPeriodStart.getTime() &&
            f.billingPeriodEnd.getTime() === data.billingPeriodEnd.getTime()
        );
        if (dup) {
          const err: any = new Error('Unique constraint failed on (studentId, billingPeriodStart, billingPeriodEnd)');
          err.code = 'P2002';
          throw err;
        }
        const item = { id: data.id || `fee_${Date.now()}_${Math.random()}`, ...data };
        feeRecords.push(item);
        return item;
      },
      findFirst: async ({ where }: any) => {
        return (
          feeRecords.find(
            (f) =>
              f.studentId === where.studentId &&
              f.billingPeriodStart.getTime() === where.billingPeriodStart.getTime() &&
              f.billingPeriodEnd.getTime() === where.billingPeriodEnd.getTime()
          ) || null
        );
      },
      findMany: async ({ where }: any) => {
        let matching = [...feeRecords];
        if (where?.studentId) matching = matching.filter((f) => f.studentId === where.studentId);
        return matching;
      },
    },
    _rawDb: { classes, students, feeRecords },
  };
}

async function main() {
  console.log('\n============================================================');
  console.log('  CHALLENGER 1 — TIER 5 ADVERSARIAL STRESS TEST SUITE');
  console.log('  Target: src/lib/billing-engine.ts');
  console.log('============================================================\n');

  // =========================================================================
  // SUITE 1: Full Exhaustive Calendar Invariant Stress (39,492 cycles evaluated)
  // =========================================================================
  runTest('Suite 1: Calendar Invariants', 'Exhaustive 31-day x 12-month x 3-year invariant oracle', () => {
    const sampleYears = [2024, 2025, 2028]; // Leap, Non-leap, Next leap
    let totalCyclesTested = 0;

    for (const year of sampleYears) {
      for (let month = 0; month < 12; month++) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
          const admissionDate = new Date(year, month, day, 0, 0, 0, 0);

          let previousCycle: BillingCycle | null = null;
          // Test 36 consecutive cycles per anchor (3 full years)
          for (let k = 0; k < 36; k++) {
            const cycle = calculateBillingCycle(admissionDate, k);
            totalCyclesTested++;

            // Invariant 1: periodStart <= periodEnd
            assert(
              cycle.periodStart.getTime() <= cycle.periodEnd.getTime(),
              `Cycle ${k} periodStart (${cycle.periodStartStr}) must be <= periodEnd (${cycle.periodEndStr}) for anchor ${formatYMD(admissionDate)}`
            );

            // Invariant 2: dueDate equals next cycle's start date
            assertEqual(
              cycle.dueDate.getTime(),
              cycle.periodEnd.getTime() + 24 * 60 * 60 * 1000,
              `Cycle ${k} dueDate must be exactly 1 day after periodEnd`
            );

            // Invariant 3: If previous cycle exists, previous.periodEnd + 1 day === cycle.periodStart (Zero gaps, Zero overlaps)
            if (previousCycle) {
              const expectedStart = new Date(previousCycle.periodEnd.getTime() + 24 * 60 * 60 * 1000);
              assertEqual(
                formatYMD(cycle.periodStart),
                formatYMD(expectedStart),
                `Gap or overlap detected between cycle ${k - 1} (${previousCycle.periodEndStr}) and cycle ${k} (${cycle.periodStartStr})`
              );
              assertEqual(
                formatYMD(previousCycle.dueDate),
                formatYMD(cycle.periodStart),
                `Previous dueDate (${previousCycle.dueDateStr}) must equal current periodStart (${cycle.periodStartStr})`
              );
            }

            // Invariant 4: Anchor Restoration
            const expectedYear = year + Math.floor((month + k) / 12);
            const expectedMonth = (month + k) % 12;
            const daysInTargetMonth = new Date(expectedYear, expectedMonth + 1, 0).getDate();
            const expectedAnchorDay = Math.min(day, daysInTargetMonth);

            assertEqual(
              cycle.periodStart.getFullYear(),
              expectedYear,
              `Cycle ${k} target year mismatch for anchor ${formatYMD(admissionDate)}`
            );
            assertEqual(
              cycle.periodStart.getMonth(),
              expectedMonth,
              `Cycle ${k} target month mismatch for anchor ${formatYMD(admissionDate)}`
            );
            assertEqual(
              cycle.periodStart.getDate(),
              expectedAnchorDay,
              `Cycle ${k} anchor day restoration failed: expected day ${expectedAnchorDay}, got ${cycle.periodStart.getDate()} in ${formatYMD(cycle.periodStart)}`
            );

            previousCycle = cycle;
          }
        }
      }
    }

    console.log(`    -> Evaluated ${totalCyclesTested} individual billing cycles across all calendar anchors.`);
  });

  // =========================================================================
  // SUITE 2: Extreme Anchor Day Edge Cases (28th, 29th, 30th, 31st across short months)
  // =========================================================================
  runTest('Suite 2: Extreme Anchors', '31st anchor across all 12 months with short months & Feb', () => {
    const admissionDate = new Date(2025, 0, 31); // Jan 31, 2025 (common year)

    const expectedPairs = [
      { start: '2025-01-31', end: '2025-02-27', due: '2025-02-28' },
      { start: '2025-02-28', end: '2025-03-30', due: '2025-03-31' },
      { start: '2025-03-31', end: '2025-04-29', due: '2025-04-30' },
      { start: '2025-04-30', end: '2025-05-30', due: '2025-05-31' },
      { start: '2025-05-31', end: '2025-06-29', due: '2025-06-30' },
      { start: '2025-06-30', end: '2025-07-30', due: '2025-07-31' },
      { start: '2025-07-31', end: '2025-08-30', due: '2025-08-31' },
      { start: '2025-08-31', end: '2025-09-29', due: '2025-09-30' },
      { start: '2025-09-30', end: '2025-10-30', due: '2025-10-31' },
      { start: '2025-10-31', end: '2025-11-29', due: '2025-11-30' },
      { start: '2025-11-30', end: '2025-12-30', due: '2025-12-31' },
      { start: '2025-12-31', end: '2026-01-30', due: '2026-01-31' },
    ];

    for (let k = 0; k < expectedPairs.length; k++) {
      const cycle = calculateBillingCycle(admissionDate, k);
      assertEqual(cycle.periodStartStr, expectedPairs[k].start, `Cycle ${k} start mismatch for Jan 31 anchor`);
      assertEqual(cycle.periodEndStr, expectedPairs[k].end, `Cycle ${k} end mismatch for Jan 31 anchor`);
      assertEqual(cycle.dueDateStr, expectedPairs[k].due, `Cycle ${k} due mismatch for Jan 31 anchor`);
    }
  });

  runTest('Suite 2: Extreme Anchors', 'Leap Day (Feb 29) multi-year anchor recovery across leap/non-leap years', () => {
    const admissionDate = new Date(2024, 1, 29); // Feb 29, 2024 (Leap Year)

    // C0 (Feb 2024): Feb 29 -> Mar 28 (due Mar 29)
    const c0 = calculateBillingCycle(admissionDate, 0);
    assertEqual(c0.periodStartStr, '2024-02-29');
    assertEqual(c0.periodEndStr, '2024-03-28');
    assertEqual(c0.dueDateStr, '2024-03-29');

    // C12 (Feb 2025, non-leap): Clamps to Feb 28 -> Mar 28 (due Mar 29)
    const c12 = calculateBillingCycle(admissionDate, 12);
    assertEqual(c12.periodStartStr, '2025-02-28');
    assertEqual(c12.periodEndStr, '2025-03-28');
    assertEqual(c12.dueDateStr, '2025-03-29');

    // C13 (Mar 2025): Recovers to Mar 29 -> Apr 28 (due Apr 29)
    const c13 = calculateBillingCycle(admissionDate, 13);
    assertEqual(c13.periodStartStr, '2025-03-29');
    assertEqual(c13.periodEndStr, '2025-04-28');
    assertEqual(c13.dueDateStr, '2025-04-29');

    // C48 (Feb 2028, next leap year): Restores exact Feb 29 -> Mar 28 (due Mar 29)
    const c48 = calculateBillingCycle(admissionDate, 48);
    assertEqual(c48.periodStartStr, '2028-02-29');
    assertEqual(c48.periodEndStr, '2028-03-28');
    assertEqual(c48.dueDateStr, '2028-03-29');
  });

  runTest('Suite 2: Extreme Anchors', '30th anchor rolling into February and restoring in March', () => {
    const admissionDate = new Date(2025, 0, 30); // Jan 30, 2025

    // C0: Jan 30 -> Feb 27 (due Feb 28)
    const c0 = calculateBillingCycle(admissionDate, 0);
    assertEqual(c0.periodStartStr, '2025-01-30');
    assertEqual(c0.periodEndStr, '2025-02-27');
    assertEqual(c0.dueDateStr, '2025-02-28');

    // C1: Feb 28 -> Mar 29 (due Mar 30)
    const c1 = calculateBillingCycle(admissionDate, 1);
    assertEqual(c1.periodStartStr, '2025-02-28');
    assertEqual(c1.periodEndStr, '2025-03-29');
    assertEqual(c1.dueDateStr, '2025-03-30');

    // C2: Mar 30 -> Apr 29 (due Apr 30)
    const c2 = calculateBillingCycle(admissionDate, 2);
    assertEqual(c2.periodStartStr, '2025-03-30');
    assertEqual(c2.periodEndStr, '2025-04-29');
    assertEqual(c2.dueDateStr, '2025-04-30');
  });

  runTest('Suite 2: Extreme Anchors', '28th anchor maintains exact 28th start across all 12 months', () => {
    const admissionDate = new Date(2025, 1, 28); // Feb 28, 2025

    for (let k = 0; k < 24; k++) {
      const cycle = calculateBillingCycle(admissionDate, k);
      assertEqual(cycle.periodStart.getDate(), 28, `Cycle ${k} must start on day 28`);
    }
  });

  // =========================================================================
  // SUITE 3: Multi-Year Rollover & Horizon Stability (120+ Cycles / 10 Years)
  // =========================================================================
  runTest('Suite 3: Long Horizon', '120 consecutive cycles (10 years) for Day 31 anchor without drift', () => {
    const admissionDate = new Date(2020, 0, 31); // Jan 31, 2020 (Leap Year)
    const cycles = getBillingCyclesUpToDate(admissionDate, new Date(2030, 0, 31));

    // From Jan 31, 2020 through Jan 31, 2030 = exactly 121 cycles (0 to 120)
    assertEqual(cycles.length, 121, `Expected 121 cycles over 10 years, got ${cycles.length}`);

    // Check last cycle in Jan 2030
    const lastCycle = cycles[120];
    assertEqual(lastCycle.periodStartStr, '2030-01-31');
    assertEqual(lastCycle.periodEndStr, '2030-02-27');
    assertEqual(lastCycle.dueDateStr, '2030-02-28');
  });

  // =========================================================================
  // SUITE 4: Fee Mode Resolution & Class Default Fee Modifications (Immutability)
  // =========================================================================
  runTest('Suite 4: Fee Mode & Immutability', 'DEFAULT vs CUSTOM fee mode resolution & class fee change isolation', () => {
    const class5 = {
      defaultMonthlyFee: 500,
      lateFeeEnabled: false,
    };

    // 1. Student with DEFAULT mode
    const defaultStudent = {
      feeMode: 'DEFAULT' as const,
      customMonthlyFee: null,
    };

    // Cycle 0: class fee is 500
    const pricing0 = calculateFeeBreakdown({
      feeMode: defaultStudent.feeMode,
      classDefaultFee: class5.defaultMonthlyFee,
      customMonthlyFee: defaultStudent.customMonthlyFee,
    });
    assertEqual(pricing0.baseAmount, 500);
    assertEqual(pricing0.netFeeAmount, 500);
    assertEqual(pricing0.totalAmount, 500);

    // Now admin updates Class 5 fee to 650
    class5.defaultMonthlyFee = 650;

    // Cycle 1: new class fee applies
    const pricing1 = calculateFeeBreakdown({
      feeMode: defaultStudent.feeMode,
      classDefaultFee: class5.defaultMonthlyFee,
      customMonthlyFee: defaultStudent.customMonthlyFee,
    });
    assertEqual(pricing1.baseAmount, 650);
    assertEqual(pricing1.netFeeAmount, 650);
    // Verified: past cycle 0 pricing remains 500, future cycle 1 pricing is 650

    // 2. Student with CUSTOM mode (e.g. 420)
    const customStudent = {
      feeMode: 'CUSTOM' as const,
      customMonthlyFee: 420,
    };

    const customPricing0 = calculateFeeBreakdown({
      feeMode: customStudent.feeMode,
      classDefaultFee: class5.defaultMonthlyFee, // class fee is 650
      customMonthlyFee: customStudent.customMonthlyFee,
    });
    assertEqual(customPricing0.baseAmount, 420);
    assertEqual(customPricing0.netFeeAmount, 420);

    // Now admin updates Class 5 fee to 800
    class5.defaultMonthlyFee = 800;

    const customPricing1 = calculateFeeBreakdown({
      feeMode: customStudent.feeMode,
      classDefaultFee: class5.defaultMonthlyFee, // class fee is 800
      customMonthlyFee: customStudent.customMonthlyFee,
    });
    assertEqual(customPricing1.baseAmount, 420);
    assertEqual(customPricing1.netFeeAmount, 420);
    // Verified: CUSTOM student fee is completely insulated from class fee changes
  });

  // =========================================================================
  // SUITE 5: Financial Boundaries & Discount Stress Testing
  // =========================================================================
  runTest('Suite 5: Financial Boundaries', 'Invalid custom fee rejection, zero fee, discount bounds', () => {
    // 1. Missing customMonthlyFee in CUSTOM mode throws error
    assertThrows(() => {
      calculateFeeBreakdown({
        feeMode: 'CUSTOM',
        classDefaultFee: 500,
        customMonthlyFee: null,
      });
    }, 'requires a non-negative customMonthlyFee');

    assertThrows(() => {
      calculateFeeBreakdown({
        feeMode: 'CUSTOM',
        classDefaultFee: 500,
        customMonthlyFee: undefined,
      });
    }, 'requires a non-negative customMonthlyFee');

    assertThrows(() => {
      calculateFeeBreakdown({
        feeMode: 'CUSTOM',
        classDefaultFee: 500,
        customMonthlyFee: -50,
      });
    }, 'requires a non-negative customMonthlyFee');

    // 2. Zero custom fee is valid (e.g. 100% scholarship)
    const zeroFee = calculateFeeBreakdown({
      feeMode: 'CUSTOM',
      classDefaultFee: 500,
      customMonthlyFee: 0,
    });
    assertEqual(zeroFee.baseAmount, 0);
    assertEqual(zeroFee.netFeeAmount, 0);
    assertEqual(zeroFee.totalAmount, 0);

    // 3. FIXED discount exceeding base fee is capped at base fee
    const excessiveFixed = calculateFeeBreakdown({
      feeMode: 'DEFAULT',
      classDefaultFee: 500,
      discountType: 'FIXED',
      discountValue: 1000,
    });
    assertEqual(excessiveFixed.discountAmount, 500);
    assertEqual(excessiveFixed.netFeeAmount, 0);

    // 4. PERCENTAGE discount clamping
    const over100Pct = calculateFeeBreakdown({
      feeMode: 'DEFAULT',
      classDefaultFee: 600,
      discountType: 'PERCENTAGE',
      discountValue: 150,
    });
    assertEqual(over100Pct.discountAmount, 600);
    assertEqual(over100Pct.netFeeAmount, 0);

    const negativePct = calculateFeeBreakdown({
      feeMode: 'DEFAULT',
      classDefaultFee: 600,
      discountType: 'PERCENTAGE',
      discountValue: -30,
    });
    assertEqual(negativePct.discountAmount, 0);
    assertEqual(negativePct.netFeeAmount, 600);

    // 5. Admission fee strictly on first cycle
    const cycle0 = calculateFeeBreakdown({
      feeMode: 'DEFAULT',
      classDefaultFee: 700,
      admissionFee: 1000,
      isFirstCycle: true,
    });
    assertEqual(cycle0.admissionFeeAmount, 1000);
    assertEqual(cycle0.totalAmount, 1700);

    const cycle1 = calculateFeeBreakdown({
      feeMode: 'DEFAULT',
      classDefaultFee: 700,
      admissionFee: 1000,
      isFirstCycle: false,
    });
    assertEqual(cycle1.admissionFeeAmount, 0);
    assertEqual(cycle1.totalAmount, 700);
  });

  // =========================================================================
  // SUITE 6: Late Fee & Status Derivation State Machine
  // =========================================================================
  runTest('Suite 6: Late Fee & Status Machine', 'Grace days, fixed vs per-day late fees, and status state machine', () => {
    const cls = {
      lateFeeEnabled: true,
      lateFeeType: 'PER_DAY' as const,
      lateFeeAmount: 25,
      graceDays: 5,
    };

    const feeRecord = {
      dueDate: new Date('2026-06-03'),
      totalAmount: 800,
      paidAmount: 0,
    };

    // 1. Current date = 2026-06-02 (before due date)
    assertEqual(calculateLateFee(cls, feeRecord, new Date('2026-06-02')), 0);
    assertEqual(deriveFeeStatus(feeRecord, new Date('2026-06-02'), 5), 'UPCOMING');

    // 2. Current date = 2026-06-03 (on due date)
    assertEqual(calculateLateFee(cls, feeRecord, new Date('2026-06-03')), 0);
    assertEqual(deriveFeeStatus(feeRecord, new Date('2026-06-03'), 5), 'DUE');

    // 3. Current date = 2026-06-08 (5 days past due date = within grace period)
    assertEqual(calculateLateFee(cls, feeRecord, new Date('2026-06-08')), 0);
    assertEqual(deriveFeeStatus(feeRecord, new Date('2026-06-08'), 5), 'DUE');

    // 4. Current date = 2026-06-09 (6 days past due date = 1 day overdue)
    // 6 - 5 = 1 overdue day * 25 = 25
    assertEqual(calculateLateFee(cls, feeRecord, new Date('2026-06-09')), 25);
    assertEqual(deriveFeeStatus(feeRecord, new Date('2026-06-09'), 5), 'OVERDUE');

    // 5. Current date = 2026-06-13 (10 days past due date = 5 days overdue)
    // 10 - 5 = 5 overdue days * 25 = 125
    assertEqual(calculateLateFee(cls, feeRecord, new Date('2026-06-13')), 125);
    assertEqual(deriveFeeStatus(feeRecord, new Date('2026-06-13'), 5), 'OVERDUE');

    // 6. Fully paid record incurs 0 late fee and derives PAID status
    const paidRecord = { ...feeRecord, paidAmount: 800 };
    assertEqual(calculateLateFee(cls, paidRecord, new Date('2026-06-13')), 0);
    assertEqual(deriveFeeStatus(paidRecord, new Date('2026-06-13'), 5), 'PAID');

    // 7. Partial payment preserves PARTIALLY_PAID status even when overdue
    const partialRecord = { ...feeRecord, paidAmount: 300 };
    assertEqual(deriveFeeStatus(partialRecord, new Date('2026-06-13'), 5), 'PARTIALLY_PAID');

    // 8. WAIVED and CANCELLED overrides remain immutable
    assertEqual(deriveFeeStatus({ ...feeRecord, status: 'WAIVED' }), 'WAIVED');
    assertEqual(deriveFeeStatus({ ...feeRecord, status: 'CANCELLED' }), 'CANCELLED');
  });

  // =========================================================================
  // SUITE 7: End-to-End Idempotency & Database Integration
  // =========================================================================
  await runAsyncTest('Suite 7: Idempotency & DB Engine', '100x idempotency check and sequential code numbering', async () => {
    const mockDb = createPrismaMock();

    // Create a class
    const cls = await mockDb.class.create({
      data: {
        id: 'cls-1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        admissionFee: 500,
        lateFeeEnabled: false,
        lateFeeAmount: 0,
        lateFeeType: 'FIXED',
        graceDays: 0,
        status: 'ACTIVE',
      },
    });

    // Create an active student
    const student = await mockDb.student.create({
      data: {
        id: 'std-1',
        studentCode: 'DPR-2026-001',
        name: 'Adversarial Test Student',
        mobile: '9876543210',
        admissionDate: new Date('2026-01-31'),
        classId: cls.id,
        feeMode: 'DEFAULT',
        status: 'ACTIVE',
      },
    });

    // Target date: April 15, 2026 -> should evaluate cycles for Jan 31, Feb 28, Mar 31 (3 cycles)
    const res1 = await generateStudentBillingRecords(mockDb as any, student.id, {
      throughDate: new Date('2026-04-15'),
      currentDate: new Date('2026-04-15'),
    });

    assertEqual(res1.created, 3, 'First generation should create 3 cycles');
    assertEqual(res1.skipped, 0, 'First generation should have 0 skipped');

    // Running second time with same target date
    const res2 = await generateStudentBillingRecords(mockDb as any, student.id, {
      throughDate: new Date('2026-04-15'),
      currentDate: new Date('2026-04-15'),
    });

    assertEqual(res2.created, 0, 'Second generation should create 0 cycles');
    assertEqual(res2.skipped, 3, 'Second generation should skip all 3 existing cycles');
    assertEqual(res2.recordIds.length, 3, 'Second generation should return existing record IDs');

    // Total records in database must strictly remain 3
    const totalRecords = await mockDb.feeRecord.findMany({ where: { studentId: student.id } });
    assertEqual(totalRecords.length, 3, 'Total fee records in DB must be exactly 3');

    // Student code generation sequence test
    const code1 = await generateStudentCode(mockDb as any, 2026);
    assertEqual(code1, 'DPR-2026-002');
  });

  // Summary
  console.log('\n============================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  SUMMARY: ${passed} passed, ${failed} failed (${results.length} total test suites)`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

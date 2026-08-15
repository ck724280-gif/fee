/**
 * Tier 5 Adversarial Challenge Suite:
 * 1. Fee Record Generation Idempotency & Concurrency Stress
 * 2. Batch Generation Scalability & Error Isolation (1000+ Student Cohort)
 * 3. Fee Status Transition State Machine Across Sliding Temporal Windows
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
  formatYMD,
} from '../../src/lib/billing-engine';
import { FeeStatus, FeeMode, DiscountType, StudentStatus, LateFeeType } from '@prisma/client';

export async function runAdversarialM2Suite() {
  console.log('\n======================================================================');
  console.log('  CHALLENGER 2 (M2): EMPIRICAL IDEMPOTENCY, BATCH & STATUS ENGINE SUITE');
  console.log('======================================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✔ PASS [${totalTests}]: ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  ✖ FAIL [${totalTests}]: ${name}`);
      console.error(`     Error: ${err.message || err}`);
      failedTests++;
    }
  }

  // Setup High-Performance Mock Prisma Adapter for full lifecycle testing
  class MockPrismaAdapter {
    public students: any[] = [];
    public classes: any[] = [];
    public feeRecords: any[] = [];
    public feeRecordMap: Map<string, any> = new Map();
    public idCounter = 1;

    private getKey(studentId: string, start: Date, end: Date): string {
      return `${studentId}_${formatYMD(new Date(start))}_${formatYMD(new Date(end))}`;
    }

    public student = {
      findUnique: async ({ where }: any) => {
        const s = this.students.find((st) => st.id === where.id);
        if (!s) return null;
        const cls = this.classes.find((c) => c.id === s.classId);
        return { ...s, class: cls ? { ...cls } : null };
      },
      findMany: async ({ where, orderBy }: any) => {
        let results = [...this.students];
        if (where?.status) {
          results = results.filter((st) => st.status === where.status);
        }
        if (where?.classId) {
          results = results.filter((st) => st.classId === where.classId);
        }
        return results.map((st) => ({
          ...st,
          class: this.classes.find((c) => c.id === st.classId),
        }));
      },
      findFirst: async ({ where, orderBy }: any) => {
        let results = [...this.students];
        if (where?.studentCode?.startsWith) {
          results = results.filter((s) => s.studentCode.startsWith(where.studentCode.startsWith));
        }
        return results[results.length - 1] || null;
      },
    };

    public feeRecord = {
      findFirst: async ({ where }: any) => {
        const key = this.getKey(where.studentId, where.billingPeriodStart, where.billingPeriodEnd);
        return this.feeRecordMap.get(key) || null;
      },
      create: async ({ data }: any) => {
        const key = this.getKey(data.studentId, data.billingPeriodStart, data.billingPeriodEnd);
        if (this.feeRecordMap.has(key)) {
          const err: any = new Error(`Unique constraint failed on the fields: (studentId, billingPeriodStart, billingPeriodEnd)`);
          err.code = 'P2002';
          throw err;
        }

        const record = {
          id: `fee_${this.idCounter++}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.feeRecords.push(record);
        this.feeRecordMap.set(key, record);
        return record;
      },
    };
  }

  // =========================================================================
  // SECTION 1: IDEMPOTENCY UNDER INTENSIVE STRESS & CONCURRENCY
  // =========================================================================
  console.log('\n--- SECTION 1: Fee Record Generation Idempotency Stress Tests ---');

  await test('ADV-IDEMP-01: 50 Sequential Duplicate Runs for Single Student (Zero Duplicates)', async () => {
    const mock = new MockPrismaAdapter();
    mock.classes.push({
      id: 'cls-1',
      name: 'Class 8',
      defaultMonthlyFee: 800,
      defaultAdmissionFee: 200,
      lateFeeEnabled: false,
      lateFeeType: 'FIXED',
      lateFeeAmount: 0,
      graceDays: 0,
    });
    mock.students.push({
      id: 'stu-1',
      studentCode: 'DPR-2026-001',
      name: 'Rohan Sharma',
      classId: 'cls-1',
      admissionDate: new Date('2026-01-15'),
      feeMode: 'DEFAULT',
      customMonthlyFee: null,
      admissionFee: 200,
      discountType: 'NONE',
      discountValue: 0,
      status: 'ACTIVE',
    });

    const throughDate = new Date('2026-06-15'); // Jan, Feb, Mar, Apr, May, Jun (6 cycles)

    // Run 1: Initial generation
    const res1 = await generateStudentBillingRecords(mock as any, 'stu-1', { throughDate });
    assertEqual(res1.created, 6);
    assertEqual(res1.skipped, 0);
    assertEqual(mock.feeRecords.length, 6);

    // Runs 2 to 50: Repeated generations
    for (let run = 2; run <= 50; run++) {
      const res = await generateStudentBillingRecords(mock as any, 'stu-1', { throughDate });
      assertEqual(res.created, 0);
      assertEqual(res.skipped, 6);
      assertEqual(mock.feeRecords.length, 6);
    }
  });

  await test('ADV-IDEMP-02: Concurrent Race Condition Generation (20 Simultaneous Parallel Promises)', async () => {
    const mock = new MockPrismaAdapter();
    mock.classes.push({
      id: 'cls-1',
      name: 'Class 10',
      defaultMonthlyFee: 1000,
      defaultAdmissionFee: 0,
      lateFeeEnabled: false,
      lateFeeType: 'FIXED',
      lateFeeAmount: 0,
      graceDays: 0,
    });
    mock.students.push({
      id: 'stu-concurrent',
      studentCode: 'DPR-2026-002',
      name: 'Priya Patel',
      classId: 'cls-1',
      admissionDate: new Date('2026-01-01'),
      feeMode: 'DEFAULT',
      customMonthlyFee: null,
      admissionFee: 0,
      discountType: 'NONE',
      discountValue: 0,
      status: 'ACTIVE',
    });

    const throughDate = new Date('2026-12-01'); // 12 cycles

    // Launch 20 concurrent invocations simultaneously
    const promises = Array.from({ length: 20 }, () =>
      generateStudentBillingRecords(mock as any, 'stu-concurrent', { throughDate })
    );

    const results = await Promise.all(promises);

    // Total records in DB must be exactly 12
    assertEqual(mock.feeRecords.length, 12);

    // Sum of created across all promises must be 12, rest skipped
    const totalCreated = results.reduce((acc, r) => acc + r.created, 0);
    const totalSkipped = results.reduce((acc, r) => acc + r.skipped, 0);
    assertEqual(totalCreated, 12);
    assertEqual(totalSkipped, 20 * 12 - 12);
  });

  await test('ADV-IDEMP-03: Incremental Time-Window Generation (Jan -> Mar -> Jun -> Dec)', async () => {
    const mock = new MockPrismaAdapter();
    mock.classes.push({
      id: 'cls-1',
      name: 'Class 6',
      defaultMonthlyFee: 600,
      defaultAdmissionFee: 100,
      lateFeeEnabled: false,
      lateFeeType: 'FIXED',
      lateFeeAmount: 0,
      graceDays: 0,
    });
    mock.students.push({
      id: 'stu-incr',
      studentCode: 'DPR-2026-003',
      name: 'Amit Verma',
      classId: 'cls-1',
      admissionDate: new Date('2026-01-10'),
      feeMode: 'DEFAULT',
      customMonthlyFee: null,
      admissionFee: 100,
      discountType: 'NONE',
      discountValue: 0,
      status: 'ACTIVE',
    });

    // Step 1: Up to March 10 (3 cycles: Jan, Feb, Mar)
    const res1 = await generateStudentBillingRecords(mock as any, 'stu-incr', {
      throughDate: new Date('2026-03-10'),
    });
    assertEqual(res1.created, 3);
    assertEqual(res1.skipped, 0);
    assertEqual(mock.feeRecords.length, 3);

    // Step 2: Rerun up to March 10 (0 created, 3 skipped)
    const res2 = await generateStudentBillingRecords(mock as any, 'stu-incr', {
      throughDate: new Date('2026-03-10'),
    });
    assertEqual(res2.created, 0);
    assertEqual(res2.skipped, 3);
    assertEqual(mock.feeRecords.length, 3);

    // Step 3: Expand to June 10 (3 new created: Apr, May, Jun; 3 skipped)
    const res3 = await generateStudentBillingRecords(mock as any, 'stu-incr', {
      throughDate: new Date('2026-06-10'),
    });
    assertEqual(res3.created, 3);
    assertEqual(res3.skipped, 3);
    assertEqual(mock.feeRecords.length, 6);

    // Step 4: Shrink throughDate to Feb 10 (historical window) -> 0 created, 2 skipped
    const res4 = await generateStudentBillingRecords(mock as any, 'stu-incr', {
      throughDate: new Date('2026-02-10'),
    });
    assertEqual(res4.created, 0);
    assertEqual(res4.skipped, 2);
    assertEqual(mock.feeRecords.length, 6);

    // Step 5: Expand to Dec 10 (6 new created: Jul, Aug, Sep, Oct, Nov, Dec; 6 skipped)
    const res5 = await generateStudentBillingRecords(mock as any, 'stu-incr', {
      throughDate: new Date('2026-12-10'),
    });
    assertEqual(res5.created, 6);
    assertEqual(res5.skipped, 6);
    assertEqual(mock.feeRecords.length, 12);
  });

  await test('ADV-IDEMP-04: Month-End Anchor 31st Across Leap Year Repeated Generation', async () => {
    const mock = new MockPrismaAdapter();
    mock.classes.push({
      id: 'cls-1',
      name: 'Class 7',
      defaultMonthlyFee: 700,
      defaultAdmissionFee: 0,
      lateFeeEnabled: false,
      lateFeeType: 'FIXED',
      lateFeeAmount: 0,
      graceDays: 0,
    });
    mock.students.push({
      id: 'stu-31st-leap',
      studentCode: 'DPR-2024-031',
      name: 'Kavita Roy',
      classId: 'cls-1',
      admissionDate: new Date('2024-01-31'), // 2024 is a Leap Year!
      feeMode: 'DEFAULT',
      customMonthlyFee: null,
      admissionFee: 0,
      discountType: 'NONE',
      discountValue: 0,
      status: 'ACTIVE',
    });

    const throughDate = new Date('2024-05-31'); // Jan 31, Feb 29, Mar 31, Apr 30, May 31 (5 cycles)

    // Run 1
    const res1 = await generateStudentBillingRecords(mock as any, 'stu-31st-leap', { throughDate });
    assertEqual(res1.created, 5);
    assertEqual(mock.feeRecords.length, 5);

    // Verify Feb 29 leap year clamping and Mar 31 restoration
    const febCycle = mock.feeRecords[1];
    const marCycle = mock.feeRecords[2];
    assertEqual(formatYMD(febCycle.billingPeriodStart), '2024-02-29');
    assertEqual(formatYMD(febCycle.billingPeriodEnd), '2024-03-30');
    assertEqual(formatYMD(marCycle.billingPeriodStart), '2024-03-31');

    // Run 2 (repeat)
    const res2 = await generateStudentBillingRecords(mock as any, 'stu-31st-leap', { throughDate });
    assertEqual(res2.created, 0);
    assertEqual(res2.skipped, 5);
    assertEqual(mock.feeRecords.length, 5);
  });

  // =========================================================================
  // SECTION 2: BATCH GENERATION SCALABILITY & ISOLATION (1000+ COHORT)
  // =========================================================================
  console.log('\n--- SECTION 2: Batch Generation Scalability & Error Isolation ---');

  await test('ADV-SCALE-01: Large Cohort Batch Generation (1,000 Students x 6 Cycles = 6,000 Records)', async () => {
    const mock = new MockPrismaAdapter();

    // 10 Classes
    for (let c = 1; c <= 10; c++) {
      mock.classes.push({
        id: `cls-${c}`,
        name: `Class ${c}`,
        defaultMonthlyFee: 500 + c * 50,
        defaultAdmissionFee: 100,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
      });
    }

    // 1,000 Active Students with diverse anchors (1st to 28th) and mixed fee modes
    for (let i = 1; i <= 1000; i++) {
      const classId = `cls-${(i % 10) + 1}`;
      const anchorDay = (i % 28) + 1;
      const isCustom = i % 5 === 0;
      mock.students.push({
        id: `stu-${i}`,
        studentCode: `DPR-2026-${String(i).padStart(4, '0')}`,
        name: `Student ${i}`,
        classId,
        admissionDate: new Date(2026, 0, anchorDay), // Jan 2026
        feeMode: isCustom ? 'CUSTOM' : 'DEFAULT',
        customMonthlyFee: isCustom ? 750 : null,
        admissionFee: 100,
        discountType: i % 10 === 0 ? 'FIXED' : 'NONE',
        discountValue: i % 10 === 0 ? 50 : 0,
        status: 'ACTIVE',
      });
    }

    const t0 = Date.now();
    const throughDate = new Date('2026-06-28'); // 6 cycles each

    // Execute Batch Generation across 1,000 students
    const batchRes = await generateBatchBillingRecords(mock as any, { throughDate });
    const elapsedMs = Date.now() - t0;

    console.log(`     [Scale Metric]: Generated ${batchRes.created} records for 1,000 students in ${elapsedMs}ms (${(elapsedMs / 1000).toFixed(2)}s)`);

    assertEqual(batchRes.totalProcessed, 1000);
    assertEqual(batchRes.created, 6000);
    assertEqual(batchRes.skipped, 0);
    assertEqual(batchRes.errors.length, 0);
    assertEqual(mock.feeRecords.length, 6000);

    // Performance assertion: 6,000 records generated in < 15,000ms
    assertTrue(elapsedMs < 15000);
  });

  await test('ADV-SCALE-02: Batch Generation Idempotency across 500 Students (Zero Duplicates on Re-runs)', async () => {
    const mock = new MockPrismaAdapter();
    for (let c = 1; c <= 5; c++) {
      mock.classes.push({
        id: `cls-${c}`,
        name: `Class ${c}`,
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
      });
    }
    for (let i = 1; i <= 500; i++) {
      mock.students.push({
        id: `stu-${i}`,
        studentCode: `DPR-2026-${String(i).padStart(4, '0')}`,
        name: `Student ${i}`,
        classId: `cls-${(i % 5) + 1}`,
        admissionDate: new Date('2026-01-05'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });
    }

    const throughDate = new Date('2026-04-05'); // 4 cycles each -> 2,000 records

    // First run
    const run1 = await generateBatchBillingRecords(mock as any, { throughDate });
    assertEqual(run1.created, 2000);
    assertEqual(run1.skipped, 0);
    assertEqual(mock.feeRecords.length, 2000);

    // Second run (immediate duplicate)
    const run2 = await generateBatchBillingRecords(mock as any, { throughDate });
    assertEqual(run2.created, 0);
    assertEqual(run2.skipped, 2000);
    assertEqual(mock.feeRecords.length, 2000);

    // Third run (immediate duplicate)
    const run3 = await generateBatchBillingRecords(mock as any, { throughDate });
    assertEqual(run3.created, 0);
    assertEqual(run3.skipped, 2000);
    assertEqual(mock.feeRecords.length, 2000);
  });

  await test('ADV-SCALE-03: Mixed Status Filtering (ACTIVE vs INACTIVE / LEFT / COMPLETED)', async () => {
    const mock = new MockPrismaAdapter();
    mock.classes.push({
      id: 'cls-1',
      name: 'Class 8',
      defaultMonthlyFee: 800,
      defaultAdmissionFee: 0,
      lateFeeEnabled: false,
      lateFeeType: 'FIXED',
      lateFeeAmount: 0,
      graceDays: 0,
    });

    mock.students.push(
      {
        id: 'stu-active',
        studentCode: 'DPR-2026-001',
        name: 'Active Student',
        classId: 'cls-1',
        admissionDate: new Date('2026-01-01'),
        feeMode: 'DEFAULT',
        status: 'ACTIVE',
      },
      {
        id: 'stu-inactive',
        studentCode: 'DPR-2026-002',
        name: 'Inactive Student',
        classId: 'cls-1',
        admissionDate: new Date('2026-01-01'),
        feeMode: 'DEFAULT',
        status: 'INACTIVE',
      },
      {
        id: 'stu-left',
        studentCode: 'DPR-2026-003',
        name: 'Left Student',
        classId: 'cls-1',
        admissionDate: new Date('2026-01-01'),
        feeMode: 'DEFAULT',
        status: 'LEFT',
      },
      {
        id: 'stu-completed',
        studentCode: 'DPR-2026-004',
        name: 'Completed Student',
        classId: 'cls-1',
        admissionDate: new Date('2026-01-01'),
        feeMode: 'DEFAULT',
        status: 'COMPLETED',
      }
    );

    const throughDate = new Date('2026-03-01'); // 3 cycles
    const batchRes = await generateBatchBillingRecords(mock as any, { throughDate });

    // Only ACTIVE student should be processed
    assertEqual(batchRes.totalProcessed, 1);
    assertEqual(batchRes.created, 3);
    assertEqual(mock.feeRecords.length, 3);
    assertTrue(mock.feeRecords.every((f) => f.studentId === 'stu-active'));

    // Directly attempting to generate for an inactive student throws error
    let threw = false;
    try {
      await generateStudentBillingRecords(mock as any, 'stu-inactive', { throughDate });
    } catch (err: any) {
      threw = true;
      assertTrue(err.message.includes('Cannot generate fee record for inactive student'));
    }
    assertTrue(threw);
  });

  await test('ADV-SCALE-04: Class Filtering in Batch Generation', async () => {
    const mock = new MockPrismaAdapter();
    mock.classes.push(
      { id: 'cls-A', name: 'Class A', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0 },
      { id: 'cls-B', name: 'Class B', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0 }
    );
    mock.students.push(
      { id: 'stu-A1', studentCode: 'DPR-2026-001', name: 'A1', classId: 'cls-A', admissionDate: new Date('2026-01-01'), feeMode: 'DEFAULT', status: 'ACTIVE' },
      { id: 'stu-A2', studentCode: 'DPR-2026-002', name: 'A2', classId: 'cls-A', admissionDate: new Date('2026-01-01'), feeMode: 'DEFAULT', status: 'ACTIVE' },
      { id: 'stu-B1', studentCode: 'DPR-2026-003', name: 'B1', classId: 'cls-B', admissionDate: new Date('2026-01-01'), feeMode: 'DEFAULT', status: 'ACTIVE' }
    );

    const throughDate = new Date('2026-02-01'); // 2 cycles each

    // Target Class A only
    const resA = await generateBatchBillingRecords(mock as any, { classId: 'cls-A', throughDate });
    assertEqual(resA.totalProcessed, 2);
    assertEqual(resA.created, 4);
    assertEqual(mock.feeRecords.length, 4);
    assertTrue(mock.feeRecords.every((f) => f.classId === 'cls-A'));

    // Target Class B only
    const resB = await generateBatchBillingRecords(mock as any, { classId: 'cls-B', throughDate });
    assertEqual(resB.totalProcessed, 1);
    assertEqual(resB.created, 2);
    assertEqual(mock.feeRecords.length, 6);
  });

  await test('ADV-SCALE-05: Error Isolation in Batch Generation (Corrupted Student Does Not Halt Batch)', async () => {
    const mock = new MockPrismaAdapter();
    mock.classes.push({
      id: 'cls-1',
      name: 'Class 8',
      defaultMonthlyFee: 800,
      defaultAdmissionFee: 0,
      lateFeeEnabled: false,
      lateFeeType: 'FIXED',
      lateFeeAmount: 0,
      graceDays: 0,
    });

    mock.students.push(
      { id: 'stu-valid-1', studentCode: 'DPR-2026-001', name: 'Valid 1', classId: 'cls-1', admissionDate: new Date('2026-01-01'), feeMode: 'DEFAULT', status: 'ACTIVE' },
      {
        id: 'stu-corrupt',
        studentCode: 'DPR-2026-002',
        name: 'Corrupt Custom',
        classId: 'cls-1',
        admissionDate: new Date('2026-01-01'),
        feeMode: 'CUSTOM',
        customMonthlyFee: -50, // INVALID: negative custom monthly fee
        status: 'ACTIVE',
      },
      { id: 'stu-valid-2', studentCode: 'DPR-2026-003', name: 'Valid 2', classId: 'cls-1', admissionDate: new Date('2026-01-01'), feeMode: 'DEFAULT', status: 'ACTIVE' }
    );

    const throughDate = new Date('2026-02-01'); // 2 cycles each
    const batchRes = await generateBatchBillingRecords(mock as any, { throughDate });

    // Total processed = 3
    assertEqual(batchRes.totalProcessed, 3);
    // Valid 1 created 2, Valid 2 created 2 -> total created = 4
    assertEqual(batchRes.created, 4);
    // Errors array contains exactly 1 error for corrupt student
    assertEqual(batchRes.errors.length, 1);
    assertEqual(batchRes.errors[0].studentId, 'stu-corrupt');
    assertTrue(batchRes.errors[0].error.includes('non-negative customMonthlyFee'));
  });

  // =========================================================================
  // SECTION 3: FEE STATUS TRANSITION ENGINE & SLIDING REFERENCE DATES
  // =========================================================================
  console.log('\n--- SECTION 3: Fee Status Transition Engine Across Sliding Dates ---');

  await test('ADV-STATUS-01: Comprehensive Temporal Status Lifecycle (UPCOMING -> DUE -> OVERDUE)', () => {
    const dueDate = new Date('2026-06-15');
    const totalAmount = 1000;
    const paidAmount = 0;

    // T - 10 days (2026-06-05) -> UPCOMING
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-05'), 0), 'UPCOMING');

    // T - 1 day (2026-06-14) -> UPCOMING
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-14'), 0), 'UPCOMING');

    // T at 00:00:00 (2026-06-15) -> DUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-15T00:00:00.000Z'), 0), 'DUE');

    // T at local 23:59:59 (2026-06-15) -> DUE (normalized start of day)
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date(2026, 5, 15, 23, 59, 59, 999), 0), 'DUE');

    // T + 1 day with 0 grace days (2026-06-16) -> OVERDUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-16'), 0), 'OVERDUE');

    // T + 30 days (2026-07-15) -> OVERDUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-07-15'), 0), 'OVERDUE');
  });

  await test('ADV-STATUS-02: Grace Period Sliding Windows (0, 3, 7, 15 Grace Days)', () => {
    const dueDate = new Date('2026-06-10');
    const totalAmount = 800;
    const paidAmount = 0;

    // Grace Period = 3 Days
    // 2026-06-10 (due date) -> DUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-10'), 3), 'DUE');
    // 2026-06-12 (+2 days, within grace 3) -> DUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-12'), 3), 'DUE');
    // 2026-06-13 (+3 days, exactly at grace boundary) -> DUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-13'), 3), 'DUE');
    // 2026-06-14 (+4 days, exceeds grace 3) -> OVERDUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-14'), 3), 'OVERDUE');

    // Grace Period = 7 Days
    // 2026-06-16 (+6 days) -> DUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-16'), 7), 'DUE');
    // 2026-06-17 (+7 days) -> DUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-17'), 7), 'DUE');
    // 2026-06-18 (+8 days) -> OVERDUE
    assertEqual(deriveFeeStatus({ paidAmount, totalAmount, dueDate }, new Date('2026-06-18'), 7), 'OVERDUE');
  });

  await test('ADV-STATUS-03: Partial Payment Invariance (PARTIALLY_PAID across all dates)', () => {
    const dueDate = new Date('2026-06-15');
    const totalAmount = 1000;
    const partialRecord = { paidAmount: 400, totalAmount, dueDate };

    // Before due date
    assertEqual(deriveFeeStatus(partialRecord, new Date('2026-06-01'), 0), 'PARTIALLY_PAID');
    // On due date
    assertEqual(deriveFeeStatus(partialRecord, new Date('2026-06-15'), 0), 'PARTIALLY_PAID');
    // After due date / overdue
    assertEqual(deriveFeeStatus(partialRecord, new Date('2026-06-30'), 0), 'PARTIALLY_PAID');
    // 1 Year later
    assertEqual(deriveFeeStatus(partialRecord, new Date('2027-06-15'), 0), 'PARTIALLY_PAID');
  });

  await test('ADV-STATUS-04: Full Payment Invariance (PAID across all dates & Zero Total Amount)', () => {
    const dueDate = new Date('2026-06-15');
    const totalAmount = 1000;
    const fullyPaidRecord = { paidAmount: 1000, totalAmount, dueDate };

    // Before due date
    assertEqual(deriveFeeStatus(fullyPaidRecord, new Date('2026-06-01'), 0), 'PAID');
    // On due date
    assertEqual(deriveFeeStatus(fullyPaidRecord, new Date('2026-06-15'), 0), 'PAID');
    // After due date
    assertEqual(deriveFeeStatus(fullyPaidRecord, new Date('2026-07-01'), 0), 'PAID');

    // 100% discount resulting in totalAmount = 0
    const zeroTotalRecord = { paidAmount: 0, totalAmount: 0, dueDate };
    assertEqual(deriveFeeStatus(zeroTotalRecord, new Date('2026-06-01'), 0), 'PAID');
    assertEqual(deriveFeeStatus(zeroTotalRecord, new Date('2026-06-15'), 0), 'PAID');
    assertEqual(deriveFeeStatus(zeroTotalRecord, new Date('2026-07-01'), 0), 'PAID');
  });

  await test('ADV-STATUS-05: Terminal Override Immutability (WAIVED & CANCELLED)', () => {
    const dueDate = new Date('2026-06-15');
    const totalAmount = 800;

    const waivedRecord = {
      paidAmount: 0,
      totalAmount,
      dueDate,
      status: 'WAIVED',
    };
    // Evaluated across diverse dates
    assertEqual(deriveFeeStatus(waivedRecord, new Date('2026-05-01')), 'WAIVED');
    assertEqual(deriveFeeStatus(waivedRecord, new Date('2026-06-15')), 'WAIVED');
    assertEqual(deriveFeeStatus(waivedRecord, new Date('2026-07-01')), 'WAIVED');
    assertEqual(deriveFeeStatus(waivedRecord, new Date('2028-01-01')), 'WAIVED');

    const cancelledRecord = {
      paidAmount: 0,
      totalAmount,
      dueDate,
      status: 'CANCELLED',
    };
    // Evaluated across diverse dates
    assertEqual(deriveFeeStatus(cancelledRecord, new Date('2026-05-01')), 'CANCELLED');
    assertEqual(deriveFeeStatus(cancelledRecord, new Date('2026-06-15')), 'CANCELLED');
    assertEqual(deriveFeeStatus(cancelledRecord, new Date('2026-07-01')), 'CANCELLED');
  });

  await test('ADV-STATUS-06: 365-Day Sliding Chronological Simulation', () => {
    // Student admitted on 2026-01-01. Due date for Cycle 0 is 2026-02-01.
    const dueDate = new Date('2026-02-01');
    const totalAmount = 500;
    const graceDays = 5;

    // Simulate every single day from Jan 1, 2026 to Dec 31, 2026 (365 iterations)
    const startDate = new Date('2026-01-01');
    for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
      const currentEvalDate = new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const status = deriveFeeStatus({ paidAmount: 0, totalAmount, dueDate }, currentEvalDate, graceDays);

      if (dayOffset < 31) {
        // Jan 1 to Jan 31 -> UPCOMING
        assertEqual(status, 'UPCOMING', `Day offset ${dayOffset} should be UPCOMING`);
      } else if (dayOffset >= 31 && dayOffset <= 36) {
        // Feb 1 (day 31) to Feb 6 (day 36, grace boundary) -> DUE
        assertEqual(status, 'DUE', `Day offset ${dayOffset} should be DUE`);
      } else {
        // Feb 7 (day 37) onwards -> OVERDUE
        assertEqual(status, 'OVERDUE', `Day offset ${dayOffset} should be OVERDUE`);
      }
    }
  });

  // =========================================================================
  // SUMMARY & VERDICT
  // =========================================================================
  console.log('\n======================================================================');
  console.log(`  CHALLENGER 2 SUMMARY: ${passedTests}/${totalTests} Tests Passed (${failedTests} Failed)`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    throw new Error(`${failedTests} adversarial test(s) failed!`);
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('02_idempotency_batch_status_adversarial.test.ts')) {
  runAdversarialM2Suite().catch((err) => {
    console.error('Fatal error in adversarial test run:', err);
    process.exit(1);
  });
}

/**
 * Tier 1: Feature Coverage — 03 Fee Lifecycle, Late Fees & Student Code Generator
 * Covers Features 11-13 (>= 5 test cases per feature = >= 15 test cases)
 */

import { assertEqual, assertTrue, assertFalse } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB, InMemoryFeeRecord } from '../fixtures/in-memory-db';
import { BillingService } from '../fixtures/mock-services';

export const tier1FeeLifecycleTests: TestCase[] = [
  // --- Feature 11: Fee Status State Machine ---
  {
    tier: 1,
    featureId: 11,
    featureName: 'Fee Status State Machine',
    name: 'F11-T01: Before due date with zero paid derives UPCOMING status',
    fn: () => {
      const record: Pick<InMemoryFeeRecord, 'paidAmount' | 'totalAmount' | 'dueDate' | 'status'> = {
        paidAmount: 0,
        totalAmount: 800,
        dueDate: new Date('2026-06-03'),
        status: 'UPCOMING',
      };
      const status = BillingService.deriveFeeStatus(record, new Date('2026-05-15'));
      assertEqual(status, 'UPCOMING');
    },
  },
  {
    tier: 1,
    featureId: 11,
    featureName: 'Fee Status State Machine',
    name: 'F11-T02: On due date with zero paid derives DUE status',
    fn: () => {
      const record: Pick<InMemoryFeeRecord, 'paidAmount' | 'totalAmount' | 'dueDate' | 'status'> = {
        paidAmount: 0,
        totalAmount: 800,
        dueDate: new Date('2026-06-03'),
        status: 'UPCOMING',
      };
      const status = BillingService.deriveFeeStatus(record, new Date('2026-06-03'));
      assertEqual(status, 'DUE');
    },
  },
  {
    tier: 1,
    featureId: 11,
    featureName: 'Fee Status State Machine',
    name: 'F11-T03: After due date with zero paid derives OVERDUE status',
    fn: () => {
      const record: Pick<InMemoryFeeRecord, 'paidAmount' | 'totalAmount' | 'dueDate' | 'status'> = {
        paidAmount: 0,
        totalAmount: 800,
        dueDate: new Date('2026-06-03'),
        status: 'UPCOMING',
      };
      const status = BillingService.deriveFeeStatus(record, new Date('2026-06-10'));
      assertEqual(status, 'OVERDUE');
    },
  },
  {
    tier: 1,
    featureId: 11,
    featureName: 'Fee Status State Machine',
    name: 'F11-T04: Positive partial paid amount (0 < paid < total) derives PARTIALLY_PAID status',
    fn: () => {
      const record: Pick<InMemoryFeeRecord, 'paidAmount' | 'totalAmount' | 'dueDate' | 'status'> = {
        paidAmount: 300,
        totalAmount: 800,
        dueDate: new Date('2026-06-03'),
        status: 'UPCOMING',
      };
      const status = BillingService.deriveFeeStatus(record, new Date('2026-06-10'));
      assertEqual(status, 'PARTIALLY_PAID');
    },
  },
  {
    tier: 1,
    featureId: 11,
    featureName: 'Fee Status State Machine',
    name: 'F11-T05: Fully paid (paid == total) derives PAID status regardless of date',
    fn: () => {
      const record: Pick<InMemoryFeeRecord, 'paidAmount' | 'totalAmount' | 'dueDate' | 'status'> = {
        paidAmount: 800,
        totalAmount: 800,
        dueDate: new Date('2026-06-03'),
        status: 'UPCOMING',
      };
      const status = BillingService.deriveFeeStatus(record, new Date('2026-07-01'));
      assertEqual(status, 'PAID');
    },
  },

  // --- Feature 12: Class-Configurable Late Fee Calculation ---
  {
    tier: 1,
    featureId: 12,
    featureName: 'Class-Configurable Late Fee Calculation',
    name: 'F12-T01: Disabled late fee returns ₹0 even when significantly overdue',
    fn: () => {
      const cls = {
        id: 'c1',
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED' as const,
        lateFeeAmount: 50,
        graceDays: 5,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const fee = {
        id: 'f1',
        studentId: 's1',
        classId: 'c1',
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-05-01'),
        billingPeriodEnd: new Date('2026-05-31'),
        dueDate: new Date('2026-06-01'),
        baseAmount: 500,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 500,
        paidAmount: 0,
        outstandingAmount: 500,
        status: 'OVERDUE' as const,
        classSnapshotFee: 500,
        studentFeeModeSnapshot: 'DEFAULT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const lateFee = BillingService.calculateLateFee(cls, fee, new Date('2026-06-25'));
      assertEqual(lateFee, 0);
    },
  },
  {
    tier: 1,
    featureId: 12,
    featureName: 'Class-Configurable Late Fee Calculation',
    name: 'F12-T02: Late fee is ₹0 within grace period (e.g. 5 days after due date)',
    fn: () => {
      const cls = {
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: true,
        lateFeeType: 'FIXED' as const,
        lateFeeAmount: 50,
        graceDays: 5,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const fee = {
        id: 'f1',
        studentId: 's1',
        classId: 'c1',
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-05-03'),
        billingPeriodEnd: new Date('2026-06-02'),
        dueDate: new Date('2026-06-03'),
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 800,
        paidAmount: 0,
        outstandingAmount: 800,
        status: 'DUE' as const,
        classSnapshotFee: 800,
        studentFeeModeSnapshot: 'DEFAULT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const lateFee = BillingService.calculateLateFee(cls, fee, new Date('2026-06-07')); // +4 days (within 5)
      assertEqual(lateFee, 0);
    },
  },
  {
    tier: 1,
    featureId: 12,
    featureName: 'Class-Configurable Late Fee Calculation',
    name: 'F12-T03: Fixed late fee applies after grace period expires',
    fn: () => {
      const cls = {
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: true,
        lateFeeType: 'FIXED' as const,
        lateFeeAmount: 50,
        graceDays: 5,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const fee = {
        id: 'f1',
        studentId: 's1',
        classId: 'c1',
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-05-03'),
        billingPeriodEnd: new Date('2026-06-02'),
        dueDate: new Date('2026-06-03'),
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 800,
        paidAmount: 0,
        outstandingAmount: 800,
        status: 'OVERDUE' as const,
        classSnapshotFee: 800,
        studentFeeModeSnapshot: 'DEFAULT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const lateFee = BillingService.calculateLateFee(cls, fee, new Date('2026-06-10')); // +7 days (exceeds 5)
      assertEqual(lateFee, 50);
    },
  },
  {
    tier: 1,
    featureId: 12,
    featureName: 'Class-Configurable Late Fee Calculation',
    name: 'F12-T04: Per-day late fee accumulates for each day past grace period',
    fn: () => {
      const cls = {
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: true,
        lateFeeType: 'PER_DAY' as const,
        lateFeeAmount: 10,
        graceDays: 3,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const fee = {
        id: 'f1',
        studentId: 's1',
        classId: 'c1',
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-05-03'),
        billingPeriodEnd: new Date('2026-06-02'),
        dueDate: new Date('2026-06-03'),
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 800,
        paidAmount: 0,
        outstandingAmount: 800,
        status: 'OVERDUE' as const,
        classSnapshotFee: 800,
        studentFeeModeSnapshot: 'DEFAULT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const lateFee = BillingService.calculateLateFee(cls, fee, new Date('2026-06-13')); // +10 days -> 10 - 3 = 7 days * 10 = 70
      assertEqual(lateFee, 70);
    },
  },
  {
    tier: 1,
    featureId: 12,
    featureName: 'Class-Configurable Late Fee Calculation',
    name: 'F12-T05: Paid fee records incur zero late fee regardless of late inspection date',
    fn: () => {
      const cls = {
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: true,
        lateFeeType: 'FIXED' as const,
        lateFeeAmount: 50,
        graceDays: 5,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const fee = {
        id: 'f1',
        studentId: 's1',
        classId: 'c1',
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-05-03'),
        billingPeriodEnd: new Date('2026-06-02'),
        dueDate: new Date('2026-06-03'),
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 800,
        paidAmount: 800,
        outstandingAmount: 0,
        status: 'PAID' as const,
        classSnapshotFee: 800,
        studentFeeModeSnapshot: 'DEFAULT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const lateFee = BillingService.calculateLateFee(cls, fee, new Date('2026-07-15'));
      assertEqual(lateFee, 0);
    },
  },

  // --- Feature 13: Student Code Generator ---
  {
    tier: 1,
    featureId: 13,
    featureName: 'Student Code Generator',
    name: 'F13-T01: Generates initial sequence DPR-2026-001 on empty database',
    fn: () => {
      const db = new InMemoryDB();
      const code = BillingService.generateStudentCode(db, 2026);
      assertEqual(code, 'DPR-2026-001');
    },
  },
  {
    tier: 1,
    featureId: 13,
    featureName: 'Student Code Generator',
    name: 'F13-T02: Increments sequence monotonically (DPR-2026-002, DPR-2026-003)',
    fn: () => {
      const db = new InMemoryDB();
      const c1 = db.createClass({
        name: 'C1',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
        mobile: '9876543210',
        classId: c1.id,
        admissionDate: new Date(),
        joiningDate: new Date(),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const nextCode = BillingService.generateStudentCode(db, 2026);
      assertEqual(nextCode, 'DPR-2026-002');
    },
  },
  {
    tier: 1,
    featureId: 13,
    featureName: 'Student Code Generator',
    name: 'F13-T03: Scopes sequences by year independently (DPR-2026-001 vs DPR-2027-001)',
    fn: () => {
      const db = new InMemoryDB();
      const c1 = db.createClass({
        name: 'C1',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
        mobile: '9876543210',
        classId: c1.id,
        admissionDate: new Date(),
        joiningDate: new Date(),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const code2027 = BillingService.generateStudentCode(db, 2027);
      assertEqual(code2027, 'DPR-2027-001');
    },
  },
  {
    tier: 1,
    featureId: 13,
    featureName: 'Student Code Generator',
    name: 'F13-T04: Zero-pads sequences up to 3 digits (e.g. DPR-2026-099 -> DPR-2026-100)',
    fn: () => {
      const db = new InMemoryDB();
      const c1 = db.createClass({
        name: 'C1',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      db.createStudent({
        studentCode: 'DPR-2026-099',
        name: 'Student 99',
        mobile: '9876543210',
        classId: c1.id,
        admissionDate: new Date(),
        joiningDate: new Date(),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const nextCode = BillingService.generateStudentCode(db, 2026);
      assertEqual(nextCode, 'DPR-2026-100');
    },
  },
  {
    tier: 1,
    featureId: 13,
    featureName: 'Student Code Generator',
    name: 'F13-T05: Attempting to insert duplicate studentCode fails unique constraint',
    fn: () => {
      const db = new InMemoryDB();
      const c1 = db.createClass({
        name: 'C1',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
        mobile: '9876543210',
        classId: c1.id,
        admissionDate: new Date(),
        joiningDate: new Date(),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      let threw = false;
      try {
        db.createStudent({
          studentCode: 'DPR-2026-001',
          name: 'Duplicate Student',
          mobile: '9876543211',
          classId: c1.id,
          admissionDate: new Date(),
          joiningDate: new Date(),
          feeMode: 'DEFAULT',
          admissionFee: 0,
          discountType: 'NONE',
          discountValue: 0,
          status: 'ACTIVE',
        });
      } catch (err: any) {
        threw = true;
        assertTrue(err.message.includes('Unique constraint failed'));
      }
      assertTrue(threw);
    },
  },
];

if (process.argv[1]?.replace(/\\/g, '/').endsWith('03_fee_lifecycle.test.ts')) {
  (async () => {
    let passed = 0;
    let failed = 0;
    console.log(`Running ${tier1FeeLifecycleTests.length} tests in 03_fee_lifecycle.test.ts...`);
    for (const t of tier1FeeLifecycleTests) {
      try {
        await t.fn();
        console.log(`  ✔ PASS: ${t.name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✖ FAIL: ${t.name}`, err);
        failed++;
      }
    }
    console.log(`\nResult: ${passed} passed, ${failed} failed out of ${tier1FeeLifecycleTests.length} tests.`);
    if (failed > 0) process.exit(1);
  })();
}


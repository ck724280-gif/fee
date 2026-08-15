/**
 * Tier 1: Feature Coverage — 02 Billing Engine & Math
 * Covers Features 5-10 (>= 5 test cases per feature = >= 30 test cases)
 */

import { assertEqual, assertTrue, assertFalse, assertThrows } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService } from '../fixtures/mock-services';

export const tier1BillingEngineTests: TestCase[] = [
  // --- Feature 5: Admission-Date Billing Cycle Engine ---
  {
    tier: 1,
    featureId: 5,
    featureName: 'Admission-Date Billing Cycle Engine',
    name: 'F05-T01: Student admitted on May 3 generates period May 3–Jun 2 (due Jun 3) for Cycle 0',
    fn: () => {
      const cycle = BillingService.calculateBillingCycle(new Date('2026-05-03'), 0);
      assertEqual(cycle.periodStartStr, '2026-05-03');
      assertEqual(cycle.periodEndStr, '2026-06-02');
      assertEqual(cycle.dueDateStr, '2026-06-03');
    },
  },
  {
    tier: 1,
    featureId: 5,
    featureName: 'Admission-Date Billing Cycle Engine',
    name: 'F05-T02: Subsequent cycle (Cycle 1) generates Jun 3–Jul 2 (due Jul 3)',
    fn: () => {
      const cycle = BillingService.calculateBillingCycle(new Date('2026-05-03'), 1);
      assertEqual(cycle.periodStartStr, '2026-06-03');
      assertEqual(cycle.periodEndStr, '2026-07-02');
      assertEqual(cycle.dueDateStr, '2026-07-03');
    },
  },
  {
    tier: 1,
    featureId: 5,
    featureName: 'Admission-Date Billing Cycle Engine',
    name: 'F05-T03: Calendar 1st admission (May 1) generates May 1–May 31 (due Jun 1)',
    fn: () => {
      const cycle = BillingService.calculateBillingCycle(new Date('2026-05-01'), 0);
      assertEqual(cycle.periodStartStr, '2026-05-01');
      assertEqual(cycle.periodEndStr, '2026-05-31');
      assertEqual(cycle.dueDateStr, '2026-06-01');
    },
  },
  {
    tier: 1,
    featureId: 5,
    featureName: 'Admission-Date Billing Cycle Engine',
    name: 'F05-T04: Mid-month 15th admission generates contiguous periods without gaps',
    fn: () => {
      const c0 = BillingService.calculateBillingCycle(new Date('2026-05-15'), 0);
      const c1 = BillingService.calculateBillingCycle(new Date('2026-05-15'), 1);
      assertEqual(c0.periodStartStr, '2026-05-15');
      assertEqual(c0.periodEndStr, '2026-06-14');
      assertEqual(c1.periodStartStr, '2026-06-15');
      assertEqual(c1.periodEndStr, '2026-07-14');
    },
  },
  {
    tier: 1,
    featureId: 5,
    featureName: 'Admission-Date Billing Cycle Engine',
    name: 'F05-T05: Year transition cycle (Dec 15) generates Dec 15–Jan 14 (due Jan 15 of next year)',
    fn: () => {
      const cycle = BillingService.calculateBillingCycle(new Date('2026-12-15'), 0);
      assertEqual(cycle.periodStartStr, '2026-12-15');
      assertEqual(cycle.periodEndStr, '2027-01-14');
      assertEqual(cycle.dueDateStr, '2027-01-15');
    },
  },

  // --- Feature 6: Edge-Case Date Math & Anchor Recovery ---
  {
    tier: 1,
    featureId: 6,
    featureName: 'Edge-Case Date Math & Anchor Recovery',
    name: 'F06-T01: 31st Anchor clamps to 30th in 30-day month (Mar 31 -> Apr 30 due date)',
    fn: () => {
      const cycle = BillingService.calculateBillingCycle(new Date('2026-03-31'), 0);
      assertEqual(cycle.periodStartStr, '2026-03-31');
      assertEqual(cycle.periodEndStr, '2026-04-29');
      assertEqual(cycle.dueDateStr, '2026-04-30');
    },
  },
  {
    tier: 1,
    featureId: 6,
    featureName: 'Edge-Case Date Math & Anchor Recovery',
    name: 'F06-T02: 31st Anchor restores exact 31st day in subsequent 31-day month (May 31)',
    fn: () => {
      const cycle = BillingService.calculateBillingCycle(new Date('2026-03-31'), 1);
      assertEqual(cycle.periodStartStr, '2026-04-30');
      assertEqual(cycle.periodEndStr, '2026-05-30');
      assertEqual(cycle.dueDateStr, '2026-05-31');
    },
  },
  {
    tier: 1,
    featureId: 6,
    featureName: 'Edge-Case Date Math & Anchor Recovery',
    name: 'F06-T03: 31st Anchor clamps to Feb 28 in non-leap year and recovers Mar 31',
    fn: () => {
      const c0 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 0);
      const c1 = BillingService.calculateBillingCycle(new Date('2026-01-31'), 1);
      assertEqual(c0.periodStartStr, '2026-01-31');
      assertEqual(c0.periodEndStr, '2026-02-27');
      assertEqual(c0.dueDateStr, '2026-02-28');
      assertEqual(c1.periodStartStr, '2026-02-28');
      assertEqual(c1.periodEndStr, '2026-03-30');
      assertEqual(c1.dueDateStr, '2026-03-31');
    },
  },
  {
    tier: 1,
    featureId: 6,
    featureName: 'Edge-Case Date Math & Anchor Recovery',
    name: 'F06-T04: 29th Anchor in leap year (Jan 29, 2024) matches Feb 29 exactly',
    fn: () => {
      const cycle = BillingService.calculateBillingCycle(new Date('2024-01-29'), 0);
      assertEqual(cycle.periodStartStr, '2024-01-29');
      assertEqual(cycle.periodEndStr, '2024-02-28');
      assertEqual(cycle.dueDateStr, '2024-02-29');
    },
  },
  {
    tier: 1,
    featureId: 6,
    featureName: 'Edge-Case Date Math & Anchor Recovery',
    name: 'F06-T05: Leap day admission (2024-02-29) in non-leap year 2025 clamps to Feb 28 and recovers Mar 29',
    fn: () => {
      const c12 = BillingService.calculateBillingCycle(new Date('2024-02-29'), 12);
      assertEqual(c12.periodStartStr, '2025-02-28');
      assertEqual(c12.periodEndStr, '2025-03-28');
      assertEqual(c12.dueDateStr, '2025-03-29');
    },
  },

  // --- Feature 7: Fee Mode Resolution (DEFAULT vs CUSTOM) ---
  {
    tier: 1,
    featureId: 7,
    featureName: 'Fee Mode Resolution (DEFAULT vs CUSTOM)',
    name: 'F07-T01: DEFAULT fee mode resolves base fee from Class defaultMonthlyFee',
    fn: () => {
      const student = {
        feeMode: 'DEFAULT' as const,
        customMonthlyFee: null,
        discountType: 'NONE' as const,
        discountValue: 0,
        admissionFee: 0,
      };
      const cls = { defaultMonthlyFee: 700 };
      const pricing = BillingService.resolvePricing(student, cls, false);
      assertEqual(pricing.baseAmount, 700);
      assertEqual(pricing.totalAmount, 700);
    },
  },
  {
    tier: 1,
    featureId: 7,
    featureName: 'Fee Mode Resolution (DEFAULT vs CUSTOM)',
    name: 'F07-T02: CUSTOM fee mode overrides Class default fee with customMonthlyFee',
    fn: () => {
      const student = {
        feeMode: 'CUSTOM' as const,
        customMonthlyFee: 650,
        discountType: 'NONE' as const,
        discountValue: 0,
        admissionFee: 0,
      };
      const cls = { defaultMonthlyFee: 800 };
      const pricing = BillingService.resolvePricing(student, cls, false);
      assertEqual(pricing.baseAmount, 650);
      assertEqual(pricing.totalAmount, 650);
    },
  },
  {
    tier: 1,
    featureId: 7,
    featureName: 'Fee Mode Resolution (DEFAULT vs CUSTOM)',
    name: 'F07-T03: First cycle includes one-time admission fee',
    fn: () => {
      const student = {
        feeMode: 'DEFAULT' as const,
        customMonthlyFee: null,
        discountType: 'NONE' as const,
        discountValue: 0,
        admissionFee: 300,
      };
      const cls = { defaultMonthlyFee: 800 };
      const pricingFirst = BillingService.resolvePricing(student, cls, true);
      const pricingSubsequent = BillingService.resolvePricing(student, cls, false);
      assertEqual(pricingFirst.totalAmount, 1100);
      assertEqual(pricingSubsequent.totalAmount, 800);
    },
  },
  {
    tier: 1,
    featureId: 7,
    featureName: 'Fee Mode Resolution (DEFAULT vs CUSTOM)',
    name: 'F07-T04: CUSTOM fee mode without customMonthlyFee throws validation error',
    fn: () => {
      const student = {
        feeMode: 'CUSTOM' as const,
        customMonthlyFee: null,
        discountType: 'NONE' as const,
        discountValue: 0,
        admissionFee: 0,
      };
      const cls = { defaultMonthlyFee: 800 };
      assertThrows(() => BillingService.resolvePricing(student, cls, false), 'customMonthlyFee');
    },
  },
  {
    tier: 1,
    featureId: 7,
    featureName: 'Fee Mode Resolution (DEFAULT vs CUSTOM)',
    name: 'F07-T05: Fee mode change in class does not mutate CUSTOM student rates',
    fn: () => {
      const student = {
        feeMode: 'CUSTOM' as const,
        customMonthlyFee: 550,
        discountType: 'NONE' as const,
        discountValue: 0,
        admissionFee: 0,
      };
      const clsOld = { defaultMonthlyFee: 600 };
      const clsNew = { defaultMonthlyFee: 900 };
      const p1 = BillingService.resolvePricing(student, clsOld, false);
      const p2 = BillingService.resolvePricing(student, clsNew, false);
      assertEqual(p1.totalAmount, 550);
      assertEqual(p2.totalAmount, 550);
    },
  },

  // --- Feature 8: Fee Record Snapshot Immutability ---
  {
    tier: 1,
    featureId: 8,
    featureName: 'Fee Record Snapshot Immutability',
    name: 'F08-T01: Generated FeeRecord freezes class default fee at time of creation',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 300,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const student = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 300,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const fee = BillingService.generateFeeRecord(db, student.id, 0);
      assertEqual(fee.baseAmount, 800);
      assertEqual(fee.classSnapshotFee, 800);

      // Mutate class fee
      db.updateClass(cls.id, { defaultMonthlyFee: 1000 });

      // Ensure historical fee record remains unchanged
      const persistedFee = db.feeRecords.find((f) => f.id === fee.id);
      assertEqual(persistedFee?.baseAmount, 800);
      assertEqual(persistedFee?.classSnapshotFee, 800);
    },
  },
  {
    tier: 1,
    featureId: 8,
    featureName: 'Fee Record Snapshot Immutability',
    name: 'F08-T02: Changing student feeMode from DEFAULT to CUSTOM does not alter existing records',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const student = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const fee = BillingService.generateFeeRecord(db, student.id, 0);
      assertEqual(fee.studentFeeModeSnapshot, 'DEFAULT');

      // Update student profile to CUSTOM
      db.updateStudent(student.id, { feeMode: 'CUSTOM', customMonthlyFee: 500 });

      const persistedFee = db.feeRecords.find((f) => f.id === fee.id);
      assertEqual(persistedFee?.studentFeeModeSnapshot, 'DEFAULT');
      assertEqual(persistedFee?.baseAmount, 800);
    },
  },
  {
    tier: 1,
    featureId: 8,
    featureName: 'Fee Record Snapshot Immutability',
    name: 'F08-T03: Future cycle billing uses updated class fee while past cycle stays intact',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const student = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const fee0 = BillingService.generateFeeRecord(db, student.id, 0);
      db.updateClass(cls.id, { defaultMonthlyFee: 950 });
      const fee1 = BillingService.generateFeeRecord(db, student.id, 1);

      assertEqual(fee0.baseAmount, 800);
      assertEqual(fee1.baseAmount, 950);
    },
  },
  {
    tier: 1,
    featureId: 8,
    featureName: 'Fee Record Snapshot Immutability',
    name: 'F08-T04: Discount mutation does not alter previously generated cycle discount amount',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 6',
        defaultMonthlyFee: 600,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const student = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Aniket',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'PERCENTAGE',
        discountValue: 10, // 10% of 600 = 60
        status: 'ACTIVE',
      });

      const fee0 = BillingService.generateFeeRecord(db, student.id, 0);
      assertEqual(fee0.discountAmount, 60);
      assertEqual(fee0.totalAmount, 540);

      // Student loses scholarship
      db.updateStudent(student.id, { discountType: 'NONE', discountValue: 0 });

      const fee1 = BillingService.generateFeeRecord(db, student.id, 1);
      assertEqual(fee0.discountAmount, 60);
      assertEqual(fee1.discountAmount, 0);
      assertEqual(fee1.totalAmount, 600);
    },
  },
  {
    tier: 1,
    featureId: 8,
    featureName: 'Fee Record Snapshot Immutability',
    name: 'F08-T05: Deleting or archiving class leaves historical fee records accessible',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const student = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const fee0 = BillingService.generateFeeRecord(db, student.id, 0);
      db.updateClass(cls.id, { status: 'ARCHIVED' });

      assertEqual(db.feeRecords.length, 1);
      assertEqual(db.feeRecords[0].id, fee0.id);
    },
  },

  // --- Feature 9: Idempotent Fee Record Generation ---
  {
    tier: 1,
    featureId: 9,
    featureName: 'Idempotent Fee Record Generation',
    name: 'F09-T01: Generating same cycle twice fails unique compound constraint',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const student = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      BillingService.generateFeeRecord(db, student.id, 0);
      assertThrows(() => BillingService.generateFeeRecord(db, student.id, 0), 'Unique constraint failed');
    },
  },
  {
    tier: 1,
    featureId: 9,
    featureName: 'Idempotent Fee Record Generation',
    name: 'F09-T02: Database holds exactly 1 record after duplicate generation attempts',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const student = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      BillingService.generateFeeRecord(db, student.id, 0);
      try {
        BillingService.generateFeeRecord(db, student.id, 0);
      } catch {
        // Ignored
      }
      assertEqual(db.feeRecords.length, 1);
    },
  },
  {
    tier: 1,
    featureId: 9,
    featureName: 'Idempotent Fee Record Generation',
    name: 'F09-T03: Consecutive cycles (Cycle 0 and Cycle 1) generate separate distinct records',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const student = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const f0 = BillingService.generateFeeRecord(db, student.id, 0);
      const f1 = BillingService.generateFeeRecord(db, student.id, 1);
      assertEqual(db.feeRecords.length, 2);
      assertEqual(f0.cycleIndex, 0);
      assertEqual(f1.cycleIndex, 1);
    },
  },
  {
    tier: 1,
    featureId: 9,
    featureName: 'Idempotent Fee Record Generation',
    name: 'F09-T04: Two students with same admission date both get their own independent fee records',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const s1 = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });
      const s2 = db.createStudent({
        id: 's2',
        studentCode: 'DPR-2026-002',
        name: 'Student 2',
        mobile: '9876543211',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const f1 = BillingService.generateFeeRecord(db, s1.id, 0);
      const f2 = BillingService.generateFeeRecord(db, s2.id, 0);
      assertEqual(db.feeRecords.length, 2);
      assertEqual(f1.studentId, 's1');
      assertEqual(f2.studentId, 's2');
    },
  },
  {
    tier: 1,
    featureId: 9,
    featureName: 'Idempotent Fee Record Generation',
    name: 'F09-T05: Inactive student fee generation is safely blocked',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'c1',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const student = db.createStudent({
        id: 's1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'LEFT',
      });

      assertThrows(() => BillingService.generateFeeRecord(db, student.id, 0), 'inactive student');
    },
  },

  // --- Feature 10: Discount Engine ---
  {
    tier: 1,
    featureId: 10,
    featureName: 'Discount Engine',
    name: 'F10-T01: Fixed discount (₹100 on ₹700) calculates net fee ₹600',
    fn: () => {
      const student = {
        feeMode: 'DEFAULT' as const,
        customMonthlyFee: null,
        discountType: 'FIXED' as const,
        discountValue: 100,
        admissionFee: 0,
      };
      const cls = { defaultMonthlyFee: 700 };
      const pricing = BillingService.resolvePricing(student, cls, false);
      assertEqual(pricing.discountAmount, 100);
      assertEqual(pricing.netFeeAmount, 600);
      assertEqual(pricing.totalAmount, 600);
    },
  },
  {
    tier: 1,
    featureId: 10,
    featureName: 'Discount Engine',
    name: 'F10-T02: Percentage discount (25% on ₹800) calculates net fee ₹600',
    fn: () => {
      const student = {
        feeMode: 'DEFAULT' as const,
        customMonthlyFee: null,
        discountType: 'PERCENTAGE' as const,
        discountValue: 25,
        admissionFee: 0,
      };
      const cls = { defaultMonthlyFee: 800 };
      const pricing = BillingService.resolvePricing(student, cls, false);
      assertEqual(pricing.discountAmount, 200);
      assertEqual(pricing.netFeeAmount, 600);
      assertEqual(pricing.totalAmount, 600);
    },
  },
  {
    tier: 1,
    featureId: 10,
    featureName: 'Discount Engine',
    name: 'F10-T03: 100% percentage discount results in ₹0 net fee',
    fn: () => {
      const student = {
        feeMode: 'DEFAULT' as const,
        customMonthlyFee: null,
        discountType: 'PERCENTAGE' as const,
        discountValue: 100,
        admissionFee: 0,
      };
      const cls = { defaultMonthlyFee: 800 };
      const pricing = BillingService.resolvePricing(student, cls, false);
      assertEqual(pricing.discountAmount, 800);
      assertEqual(pricing.netFeeAmount, 0);
      assertEqual(pricing.totalAmount, 0);
    },
  },
  {
    tier: 1,
    featureId: 10,
    featureName: 'Discount Engine',
    name: 'F10-T04: Fixed discount greater than base fee is clamped to base fee (no negative fees)',
    fn: () => {
      const student = {
        feeMode: 'DEFAULT' as const,
        customMonthlyFee: null,
        discountType: 'FIXED' as const,
        discountValue: 1000,
        admissionFee: 0,
      };
      const cls = { defaultMonthlyFee: 500 };
      const pricing = BillingService.resolvePricing(student, cls, false);
      assertEqual(pricing.discountAmount, 500);
      assertEqual(pricing.netFeeAmount, 0);
    },
  },
  {
    tier: 1,
    featureId: 10,
    featureName: 'Discount Engine',
    name: 'F10-T05: Discount applies to base monthly fee but does not reduce admission fee',
    fn: () => {
      const student = {
        feeMode: 'DEFAULT' as const,
        customMonthlyFee: null,
        discountType: 'FIXED' as const,
        discountValue: 200,
        admissionFee: 300,
      };
      const cls = { defaultMonthlyFee: 800 };
      const pricing = BillingService.resolvePricing(student, cls, true);
      assertEqual(pricing.baseAmount, 800);
      assertEqual(pricing.discountAmount, 200);
      assertEqual(pricing.netFeeAmount, 600);
      assertEqual(pricing.admissionFeeAmount, 300);
      assertEqual(pricing.totalAmount, 900);
    },
  },
];

if (process.argv[1]?.replace(/\\/g, '/').endsWith('02_billing_engine.test.ts')) {
  (async () => {
    let passed = 0;
    let failed = 0;
    console.log(`Running ${tier1BillingEngineTests.length} tests in 02_billing_engine.test.ts...`);
    for (const t of tier1BillingEngineTests) {
      try {
        await t.fn();
        console.log(`  ✔ PASS: ${t.name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✖ FAIL: ${t.name}`, err);
        failed++;
      }
    }
    console.log(`\nResult: ${passed} passed, ${failed} failed out of ${tier1BillingEngineTests.length} tests.`);
    if (failed > 0) process.exit(1);
  })();
}


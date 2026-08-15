/**
 * Tier 3: Cross-Feature Interactions — 01 Class Fee Changes vs. Custom Student Rates
 * Pairwise verification of dynamic DEFAULT fee adoption, CUSTOM rate invariance, and historical ledger immutability.
 */

import { assertEqual, assertTrue, assertFalse } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService } from '../fixtures/mock-services';

export const tier3ClassFeeVsCustomStudentTests: TestCase[] = [
  {
    tier: 3,
    name: 'X01-T01: Cohort of DEFAULT and CUSTOM students across class fee hike (₹800 -> ₹1000)',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'cls_8',
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });

      const stuDefault = db.createStudent({
        id: 'stu_def',
        studentCode: 'DPR-2026-001',
        name: 'Default Student',
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

      const stuCustom = db.createStudent({
        id: 'stu_cust',
        studentCode: 'DPR-2026-002',
        name: 'Custom Student',
        mobile: '9876543211',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'CUSTOM',
        customMonthlyFee: 600,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      // Month 1 Generation (Cycle 0)
      const defFee0 = BillingService.generateFeeRecord(db, stuDefault.id, 0);
      const custFee0 = BillingService.generateFeeRecord(db, stuCustom.id, 0);
      assertEqual(defFee0.totalAmount, 800);
      assertEqual(custFee0.totalAmount, 600);

      // Class Fee Hike from 800 to 1000
      db.updateClass(cls.id, { defaultMonthlyFee: 1000 });

      // Month 2 Generation (Cycle 1)
      const defFee1 = BillingService.generateFeeRecord(db, stuDefault.id, 1);
      const custFee1 = BillingService.generateFeeRecord(db, stuCustom.id, 1);

      // Verify Month 2 results: Default student gets 1000, Custom student stays 600
      assertEqual(defFee1.totalAmount, 1000);
      assertEqual(custFee1.totalAmount, 600);

      // Verify Historical Immutability for Month 1
      const persistedDef0 = db.feeRecords.find((f) => f.id === defFee0.id);
      const persistedCust0 = db.feeRecords.find((f) => f.id === custFee0.id);
      assertEqual(persistedDef0?.totalAmount, 800);
      assertEqual(persistedCust0?.totalAmount, 600);
    },
  },
  {
    tier: 3,
    name: 'X01-T02: Fee reduction in class propagates to DEFAULT students only',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'cls_6',
        name: 'Class 6',
        defaultMonthlyFee: 600,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });

      const stuDefault = db.createStudent({
        id: 's_def',
        studentCode: 'DPR-2026-001',
        name: 'Def',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-01'),
        joiningDate: new Date('2026-05-01'),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });
      const stuCustom = db.createStudent({
        id: 's_cust',
        studentCode: 'DPR-2026-002',
        name: 'Cust',
        mobile: '9876543211',
        classId: cls.id,
        admissionDate: new Date('2026-05-01'),
        joiningDate: new Date('2026-05-01'),
        feeMode: 'CUSTOM',
        customMonthlyFee: 550,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      // Fee reduction from 600 to 500
      db.updateClass(cls.id, { defaultMonthlyFee: 500 });

      const feeDef = BillingService.generateFeeRecord(db, stuDefault.id, 0);
      const feeCust = BillingService.generateFeeRecord(db, stuCustom.id, 0);

      assertEqual(feeDef.totalAmount, 500);
      assertEqual(feeCust.totalAmount, 550);
    },
  },
  {
    tier: 3,
    name: 'X01-T03: Converting a student from CUSTOM to DEFAULT applies class rate to subsequent cycles',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'cls_7',
        name: 'Class 7',
        defaultMonthlyFee: 700,
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
        name: 'Priya',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-01'),
        joiningDate: new Date('2026-05-01'),
        feeMode: 'CUSTOM',
        customMonthlyFee: 650,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const f0 = BillingService.generateFeeRecord(db, student.id, 0);
      assertEqual(f0.totalAmount, 650);

      // Student converts to DEFAULT fee mode
      db.updateStudent(student.id, { feeMode: 'DEFAULT', customMonthlyFee: null });

      const f1 = BillingService.generateFeeRecord(db, student.id, 1);
      assertEqual(f0.totalAmount, 650);
      assertEqual(f1.totalAmount, 700);
    },
  },
  {
    tier: 3,
    name: 'X01-T04: Multiple fee adjustments in a single academic term preserve every generated month rate',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'cls_8',
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
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const f0 = BillingService.generateFeeRecord(db, student.id, 0); // 800
      db.updateClass(cls.id, { defaultMonthlyFee: 850 });
      const f1 = BillingService.generateFeeRecord(db, student.id, 1); // 850
      db.updateClass(cls.id, { defaultMonthlyFee: 900 });
      const f2 = BillingService.generateFeeRecord(db, student.id, 2); // 900

      assertEqual(f0.totalAmount, 800);
      assertEqual(f1.totalAmount, 850);
      assertEqual(f2.totalAmount, 900);
    },
  },
  {
    tier: 3,
    name: 'X01-T05: Fee mode snapshot field is persisted accurately per fee record',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        id: 'cls_8',
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
        name: 'S1',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });
      const f = BillingService.generateFeeRecord(db, s1.id, 0);
      assertEqual(f.studentFeeModeSnapshot, 'DEFAULT');
    },
  },
];

if (process.argv[1]?.replace(/\\/g, '/').endsWith('01_class_fee_vs_custom_student.test.ts')) {
  (async () => {
    let passed = 0;
    let failed = 0;
    console.log(`Running ${tier3ClassFeeVsCustomStudentTests.length} tests in 01_class_fee_vs_custom_student.test.ts...`);
    for (const t of tier3ClassFeeVsCustomStudentTests) {
      try {
        await t.fn();
        console.log(`  ✔ PASS: ${t.name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✖ FAIL: ${t.name}`, err);
        failed++;
      }
    }
    console.log(`\nResult: ${passed} passed, ${failed} failed out of ${tier3ClassFeeVsCustomStudentTests.length} tests.`);
    if (failed > 0) process.exit(1);
  })();
}


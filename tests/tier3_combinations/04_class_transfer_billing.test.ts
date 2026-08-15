/**
 * Tier 3: Cross-Feature Interactions — 04 Student Class Transfer & Snapshot Immutability
 * Pairwise verification of student promotion/transfer between classes and historical fee record immutability.
 */

import { assertEqual, assertTrue, assertFalse } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, format } from '../fixtures/mock-services';

export const tier3ClassTransferBillingTests: TestCase[] = [
  {
    tier: 3,
    name: 'X04-T01: Student promoted from Class 6 (₹600) to Class 7 (₹700) gets new rate for future cycles',
    fn: () => {
      const db = new InMemoryDB();
      const cls6 = db.createClass({
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
      const cls7 = db.createClass({
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
        id: 'stu_1',
        studentCode: 'DPR-2026-001',
        name: 'Aniket Sen',
        mobile: '9876543210',
        classId: cls6.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      // Cycle 0 billed under Class 6
      const fee0 = BillingService.generateFeeRecord(db, student.id, 0);
      assertEqual(fee0.classId, cls6.id);
      assertEqual(fee0.baseAmount, 600);

      // Student promoted to Class 7
      db.updateStudent(student.id, { classId: cls7.id });

      // Cycle 1 billed under Class 7
      const fee1 = BillingService.generateFeeRecord(db, student.id, 1);
      assertEqual(fee1.classId, cls7.id);
      assertEqual(fee1.baseAmount, 700);

      // Historical fee 0 remains Class 6
      const fee0Persisted = db.feeRecords.find((f) => f.id === fee0.id);
      assertEqual(fee0Persisted?.classId, cls6.id);
      assertEqual(fee0Persisted?.baseAmount, 600);
    },
  },
  {
    tier: 3,
    name: 'X04-T02: Student with CUSTOM fee mode retains custom rate even after class transfer',
    fn: () => {
      const db = new InMemoryDB();
      const cls6 = db.createClass({ id: 'cls_6', name: 'Class 6', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const cls7 = db.createClass({ id: 'cls_7', name: 'Class 7', defaultMonthlyFee: 700, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });

      const student = db.createStudent({
        id: 'stu_1',
        studentCode: 'DPR-2026-001',
        name: 'Special Student',
        mobile: '9876543210',
        classId: cls6.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'CUSTOM',
        customMonthlyFee: 500,
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      const f0 = BillingService.generateFeeRecord(db, student.id, 0);
      db.updateStudent(student.id, { classId: cls7.id });
      const f1 = BillingService.generateFeeRecord(db, student.id, 1);

      assertEqual(f0.baseAmount, 500);
      assertEqual(f1.baseAmount, 500);
    },
  },
  {
    tier: 3,
    name: 'X04-T03: Class transfer records audit log entry with oldClassId and newClassId',
    fn: () => {
      const db = new InMemoryDB();
      const cls6 = db.createClass({ id: 'cls_6', name: 'Class 6', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const cls7 = db.createClass({ id: 'cls_7', name: 'Class 7', defaultMonthlyFee: 700, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });

      const student = db.createStudent({
        id: 'stu_1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls6.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      db.updateStudent(student.id, { classId: cls7.id });
      db.createAuditLog({
        userId: 'admin_1',
        action: 'STUDENT_CLASS_TRANSFERRED',
        entityType: 'STUDENT',
        entityId: student.id,
        details: { oldClassId: cls6.id, newClassId: cls7.id },
      });

      const log = db.auditLogs.find((a) => a.action === 'STUDENT_CLASS_TRANSFERRED');
      assertEqual(log?.details.oldClassId, cls6.id);
      assertEqual(log?.details.newClassId, cls7.id);
    },
  },
  {
    tier: 3,
    name: 'X04-T04: Class transfer preserves admission date anchor day for all future cycles',
    fn: () => {
      const db = new InMemoryDB();
      const cls6 = db.createClass({ id: 'cls_6', name: 'Class 6', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const cls7 = db.createClass({ id: 'cls_7', name: 'Class 7', defaultMonthlyFee: 700, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });

      const student = db.createStudent({
        id: 'stu_1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls6.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      BillingService.generateFeeRecord(db, student.id, 0);
      db.updateStudent(student.id, { classId: cls7.id });
      const f1 = BillingService.generateFeeRecord(db, student.id, 1);

      assertEqual(format(f1.billingPeriodStart, 'yyyy-MM-dd'), '2026-06-03');
    },
  },
  {
    tier: 3,
    name: 'X04-T05: Fee records for student across two different classes coexist in database',
    fn: () => {
      const db = new InMemoryDB();
      const cls6 = db.createClass({ id: 'cls_6', name: 'Class 6', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const cls7 = db.createClass({ id: 'cls_7', name: 'Class 7', defaultMonthlyFee: 700, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });

      const student = db.createStudent({
        id: 'stu_1',
        studentCode: 'DPR-2026-001',
        name: 'Rahul',
        mobile: '9876543210',
        classId: cls6.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });

      BillingService.generateFeeRecord(db, student.id, 0);
      db.updateStudent(student.id, { classId: cls7.id });
      BillingService.generateFeeRecord(db, student.id, 1);

      const records = db.feeRecords.filter((f) => f.studentId === student.id);
      assertEqual(records.length, 2);
      assertEqual(records[0].classId, 'cls_6');
      assertEqual(records[1].classId, 'cls_7');
    },
  },
];

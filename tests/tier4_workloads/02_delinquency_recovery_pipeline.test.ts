/**
 * Tier 4: Real-World Institute Workloads — 02 Delinquency Tracking & Arrears Recovery Pipeline
 * Simulates overdue fee aging across time buckets (<15 days, 15-30 days, 30+ days), WhatsApp notices, and full recovery.
 */

import { assertEqual, assertTrue, assertFalse, assertDefined } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, PaymentService, DocumentService, WhatsAppService } from '../fixtures/mock-services';

export const tier4DelinquencyRecoveryTests: TestCase[] = [
  {
    tier: 4,
    name: 'W02-T01: Delinquency aging categorization across <15 days, 15-30 days, and 30+ days buckets',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'Rahul', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-01-01'), joiningDate: new Date('2026-01-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      // Create 3 fee records with past due dates
      // Due 10 days ago (Feb 1 relative to Feb 11)
      const f1 = db.createFeeRecord({
        studentId: stu.id,
        classId: cls.id,
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-01-01'),
        billingPeriodEnd: new Date('2026-01-31'),
        dueDate: new Date('2026-02-01'),
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 800,
        paidAmount: 0,
        outstandingAmount: 800,
        status: 'OVERDUE',
        classSnapshotFee: 800,
        studentFeeModeSnapshot: 'DEFAULT',
      });

      // Due 25 days ago (Jan 17 relative to Feb 11)
      const f2 = db.createFeeRecord({
        studentId: stu.id,
        classId: cls.id,
        cycleIndex: 1,
        billingPeriodStart: new Date('2025-12-17'),
        billingPeriodEnd: new Date('2026-01-16'),
        dueDate: new Date('2026-01-17'),
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 800,
        paidAmount: 0,
        outstandingAmount: 800,
        status: 'OVERDUE',
        classSnapshotFee: 800,
        studentFeeModeSnapshot: 'DEFAULT',
      });

      // Due 45 days ago (Dec 28 relative to Feb 11)
      const f3 = db.createFeeRecord({
        studentId: stu.id,
        classId: cls.id,
        cycleIndex: 2,
        billingPeriodStart: new Date('2025-11-28'),
        billingPeriodEnd: new Date('2025-12-27'),
        dueDate: new Date('2025-12-28'),
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 800,
        paidAmount: 0,
        outstandingAmount: 800,
        status: 'OVERDUE',
        classSnapshotFee: 800,
        studentFeeModeSnapshot: 'DEFAULT',
      });

      const evalDate = new Date('2026-02-11');
      const getBucket = (dueDate: Date) => {
        const diffDays = Math.floor((evalDate.getTime() - new Date(dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 15) return '<15 days';
        if (diffDays <= 30) return '15-30 days';
        return '30+ days';
      };

      assertEqual(getBucket(f1.dueDate), '<15 days');
      assertEqual(getBucket(f2.dueDate), '15-30 days');
      assertEqual(getBucket(f3.dueDate), '30+ days');
    },
  },
  {
    tier: 4,
    name: 'W02-T02: Urgent WhatsApp overdue notice generation with tokenized document link',
    fn: () => {
      const db = new InMemoryDB();
      const token = DocumentService.createDocumentToken(db, 'REMINDER', 'fee_overdue_1', {
        studentName: 'Rahul Sharma',
        overdueAmount: 800,
      });

      const docUrl = `https://dprtuition.vercel.app/api/documents/${token}`;
      const msg = WhatsAppService.generateReminderMessage({
        studentName: 'Rahul Sharma',
        className: 'Class 8',
        dueAmount: 800,
        dueDateStr: '01 February 2026',
        documentUrl: docUrl,
      });

      assertTrue(msg.includes('Rahul Sharma'));
      assertTrue(msg.includes('₹800'));
      assertTrue(msg.includes(token));
    },
  },
  {
    tier: 4,
    name: 'W02-T03: Delinquency recovery pipeline: successive payments clear overdue accounts to PAID',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'Rahul', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-01-01'), joiningDate: new Date('2026-01-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      const fee = db.createFeeRecord({
        studentId: stu.id,
        classId: cls.id,
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-01-01'),
        billingPeriodEnd: new Date('2026-01-31'),
        dueDate: new Date('2026-02-01'),
        baseAmount: 800,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 800,
        paidAmount: 0,
        outstandingAmount: 800,
        status: 'OVERDUE',
        classSnapshotFee: 800,
        studentFeeModeSnapshot: 'DEFAULT',
      });

      // Partial recovery: ₹400
      const p1 = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 400, paymentMethod: 'UPI' });
      assertEqual(p1.feeRecord.status, 'PARTIALLY_PAID');
      assertEqual(p1.feeRecord.outstandingAmount, 400);

      // Final settlement: ₹400
      const p2 = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 400, paymentMethod: 'CASH' });
      assertEqual(p2.feeRecord.status, 'PAID');
      assertEqual(p2.feeRecord.outstandingAmount, 0);
    },
  },
  {
    tier: 4,
    name: 'W02-T04: Total delinquency arrears calculation across entire student body',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s1 = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-01-01'), joiningDate: new Date('2026-01-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const s2 = db.createStudent({ studentCode: 'DPR-2026-002', name: 'S2', mobile: '9876543211', classId: cls.id, admissionDate: new Date('2026-01-01'), joiningDate: new Date('2026-01-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      db.createFeeRecord({
        studentId: s1.id,
        classId: cls.id,
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-01-01'),
        billingPeriodEnd: new Date('2026-01-31'),
        dueDate: new Date('2026-02-01'),
        baseAmount: 500,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 500,
        paidAmount: 0,
        outstandingAmount: 500,
        status: 'OVERDUE',
        classSnapshotFee: 500,
        studentFeeModeSnapshot: 'DEFAULT',
      });
      db.createFeeRecord({
        studentId: s2.id,
        classId: cls.id,
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-01-01'),
        billingPeriodEnd: new Date('2026-01-31'),
        dueDate: new Date('2026-02-01'),
        baseAmount: 500,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 500,
        paidAmount: 100,
        outstandingAmount: 400,
        status: 'PARTIALLY_PAID',
        classSnapshotFee: 500,
        studentFeeModeSnapshot: 'DEFAULT',
      });

      const overdueTotal = db.feeRecords.filter((f) => f.status === 'OVERDUE').reduce((sum, f) => sum + f.outstandingAmount, 0);
      const totalPending = db.feeRecords.reduce((sum, f) => sum + f.outstandingAmount, 0);

      assertEqual(overdueTotal, 500);
      assertEqual(totalPending, 900);
    },
  },
  {
    tier: 4,
    name: 'W02-T05: Delinquent student leaving the institute retains historical overdue records for accounting',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-01-01'), joiningDate: new Date('2026-01-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      db.createFeeRecord({
        studentId: s.id,
        classId: cls.id,
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-01-01'),
        billingPeriodEnd: new Date('2026-01-31'),
        dueDate: new Date('2026-02-01'),
        baseAmount: 500,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 500,
        paidAmount: 0,
        outstandingAmount: 500,
        status: 'OVERDUE',
        classSnapshotFee: 500,
        studentFeeModeSnapshot: 'DEFAULT',
      });

      db.updateStudent(s.id, { status: 'LEFT' });

      const overdueCount = db.feeRecords.filter((f) => f.status === 'OVERDUE').length;
      assertEqual(overdueCount, 1);
    },
  },
];

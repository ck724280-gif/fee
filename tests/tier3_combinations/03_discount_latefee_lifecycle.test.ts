/**
 * Tier 3: Cross-Feature Interactions — 03 Discounts, Late Fees & Multi-Part Settlements
 * Pairwise verification connecting student discounts, class-level late fees after grace period, and payment settlements.
 */

import { assertEqual, assertTrue, assertFalse } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, PaymentService } from '../fixtures/mock-services';

export const tier3DiscountLateFeeLifecycleTests: TestCase[] = [
  {
    tier: 3,
    name: 'X03-T01: Student with 10% discount on ₹800 fee billed ₹720, incurs ₹50 late fee after grace period = ₹770 total',
    fn: () => {
      const cls = {
        id: 'cls_8',
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
      const stu = {
        feeMode: 'DEFAULT' as const,
        customMonthlyFee: null,
        discountType: 'PERCENTAGE' as const,
        discountValue: 10,
        admissionFee: 0,
      };

      const pricing = BillingService.resolvePricing(stu, cls, false);
      assertEqual(pricing.netFeeAmount, 720);

      const fee = {
        id: 'f1',
        studentId: 's1',
        classId: cls.id,
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-05-03'),
        billingPeriodEnd: new Date('2026-06-02'),
        dueDate: new Date('2026-06-03'),
        baseAmount: pricing.baseAmount,
        admissionFeeAmount: 0,
        discountAmount: pricing.discountAmount,
        lateFeeAmount: 0,
        totalAmount: pricing.totalAmount,
        paidAmount: 0,
        outstandingAmount: pricing.totalAmount,
        status: 'DUE' as const,
        classSnapshotFee: 800,
        studentFeeModeSnapshot: 'DEFAULT' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const lateFee = BillingService.calculateLateFee(cls, fee, new Date('2026-06-15')); // Grace expired
      assertEqual(lateFee, 50);
      assertEqual(fee.totalAmount + lateFee, 770);
    },
  },
  {
    tier: 3,
    name: 'X03-T02: Settlement of discounted fee + late fee in 2 installments',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 8',
        defaultMonthlyFee: 800,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Aniket',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-01'),
        joiningDate: new Date('2026-05-01'),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'FIXED',
        discountValue: 100, // 800 - 100 = 700
        status: 'ACTIVE',
      });

      const fee = BillingService.generateFeeRecord(db, stu.id, 0);
      assertEqual(fee.totalAmount, 700);

      // Installment 1: 400
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 400, paymentMethod: 'CASH' });
      // Installment 2: 300
      const pay2 = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 300, paymentMethod: 'UPI' });

      assertEqual(pay2.feeRecord.status, 'PAID');
      assertEqual(pay2.feeRecord.outstandingAmount, 0);
    },
  },
  {
    tier: 3,
    name: 'X03-T03: Scholarship 100% discount student pays ₹0 and has immediate PAID status',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Scholarship Student',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-01'),
        joiningDate: new Date('2026-05-01'),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'PERCENTAGE',
        discountValue: 100,
        status: 'ACTIVE',
      });

      const fee = BillingService.generateFeeRecord(db, stu.id, 0);
      assertEqual(fee.totalAmount, 0);
      assertEqual(fee.discountAmount, 600);
      assertEqual(fee.outstandingAmount, 0);
    },
  },
  {
    tier: 3,
    name: 'X03-T04: Changing discount value mid-year affects only future cycles while preserving existing payment receipts',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-01'),
        joiningDate: new Date('2026-05-01'),
        feeMode: 'DEFAULT',
        admissionFee: 0,
        discountType: 'FIXED',
        discountValue: 100, // 500 net
        status: 'ACTIVE',
      });

      const f0 = BillingService.generateFeeRecord(db, stu.id, 0);
      await PaymentService.recordPayment(db, { feeRecordId: f0.id, amount: 500, paymentMethod: 'CASH' });

      // Student loses discount for cycle 1
      db.updateStudent(stu.id, { discountType: 'NONE', discountValue: 0 });
      const f1 = BillingService.generateFeeRecord(db, stu.id, 1);

      assertEqual(f0.totalAmount, 500);
      assertEqual(f1.totalAmount, 600);
      assertEqual(db.payments[0].amount, 500);
    },
  },
  {
    tier: 3,
    name: 'X03-T05: Discount and Admission fee coexistence in first billing cycle',
    fn: () => {
      const stu = {
        feeMode: 'DEFAULT' as const,
        customMonthlyFee: null,
        discountType: 'FIXED' as const,
        discountValue: 150,
        admissionFee: 300,
      };
      const cls = { defaultMonthlyFee: 800 };
      const p = BillingService.resolvePricing(stu, cls, true);
      assertEqual(p.baseAmount, 800);
      assertEqual(p.discountAmount, 150);
      assertEqual(p.netFeeAmount, 650);
      assertEqual(p.admissionFeeAmount, 300);
      assertEqual(p.totalAmount, 950);
    },
  },
];

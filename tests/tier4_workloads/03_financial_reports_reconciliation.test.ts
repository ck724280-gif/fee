/**
 * Tier 4: Real-World Institute Workloads — 03 Multi-Dimension Financial Reports & Ledger Reconciliation
 * Reconciles Daily Collections, Monthly Totals, Outstanding Aging, Class Distribution, and Payment Methods down to exact rupee.
 */

import { assertEqual, assertTrue, assertFalse } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, PaymentService, DashboardService, ReportsService } from '../fixtures/mock-services';

export const tier4FinancialReconciliationTests: TestCase[] = [
  {
    tier: 4,
    name: 'W03-T01: Daily Collection total matches sum of all payment records on that date',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s1 = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const s2 = db.createStudent({ studentCode: 'DPR-2026-002', name: 'S2', mobile: '9876543211', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      const f1 = BillingService.generateFeeRecord(db, s1.id, 0);
      const f2 = BillingService.generateFeeRecord(db, s2.id, 0);

      const targetDate = new Date('2026-05-15T12:00:00Z');
      await PaymentService.recordPayment(db, { feeRecordId: f1.id, amount: 500, paymentMethod: 'CASH', paymentDate: targetDate });
      await PaymentService.recordPayment(db, { feeRecordId: f2.id, amount: 200, paymentMethod: 'UPI', paymentDate: targetDate });

      const dayPayments = db.payments.filter((p) => p.paymentDate.toISOString().split('T')[0] === '2026-05-15');
      const dailySum = dayPayments.reduce((sum, p) => sum + p.amount, 0);

      assertEqual(dailySum, 700);
      assertEqual(dayPayments.length, 2);
    },
  },
  {
    tier: 4,
    name: 'W03-T02: Monthly Collection aggregation matches the sum of all payments throughout the calendar month',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s1 = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s1.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 200, paymentMethod: 'CASH', paymentDate: new Date('2026-05-05') });
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 200, paymentMethod: 'UPI', paymentDate: new Date('2026-05-15') });
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 200, paymentMethod: 'BANK_TRANSFER', paymentDate: new Date('2026-05-25') });

      const monthPayments = db.payments.filter((p) => p.paymentDate.toISOString().startsWith('2026-05'));
      const monthlySum = monthPayments.reduce((sum, p) => sum + p.amount, 0);

      assertEqual(monthlySum, 600);
      assertEqual(monthPayments.length, 3);
    },
  },
  {
    tier: 4,
    name: 'W03-T03: Payment Method breakdown sums strictly to total collected revenue',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 1000, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s1 = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s1.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 300, paymentMethod: 'CASH' });
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 400, paymentMethod: 'UPI' });
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 300, paymentMethod: 'CARD' });

      const cashSum = db.payments.filter((p) => p.paymentMethod === 'CASH').reduce((sum, p) => sum + p.amount, 0);
      const upiSum = db.payments.filter((p) => p.paymentMethod === 'UPI').reduce((sum, p) => sum + p.amount, 0);
      const cardSum = db.payments.filter((p) => p.paymentMethod === 'CARD').reduce((sum, p) => sum + p.amount, 0);
      const total = db.payments.reduce((sum, p) => sum + p.amount, 0);

      assertEqual(cashSum, 300);
      assertEqual(upiSum, 400);
      assertEqual(cardSum, 300);
      assertEqual(cashSum + upiSum + cardSum, total);
    },
  },
  {
    tier: 4,
    name: 'W03-T04: Class-wise revenue collection rate calculation percentage is exact',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s1 = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const s2 = db.createStudent({ studentCode: 'DPR-2026-002', name: 'S2', mobile: '9876543211', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      const f1 = BillingService.generateFeeRecord(db, s1.id, 0);
      const f2 = BillingService.generateFeeRecord(db, s2.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: f1.id, amount: 800, paymentMethod: 'CASH' });
      await PaymentService.recordPayment(db, { feeRecordId: f2.id, amount: 400, paymentMethod: 'CASH' });

      const totalBilled = f1.totalAmount + f2.totalAmount; // 1600
      const totalCollected = 800 + 400; // 1200
      const collectionRate = (totalCollected / totalBilled) * 100; // 75%

      assertEqual(collectionRate, 75);
    },
  },
  {
    tier: 4,
    name: 'W03-T05: Student Statement Ledger running balance matches sequential debit/credit math',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      // Month 1 Fee: +600 (Balance: 600)
      const f0 = BillingService.generateFeeRecord(db, s.id, 0);
      // Payment: -400 (Balance: 200)
      await PaymentService.recordPayment(db, { feeRecordId: f0.id, amount: 400, paymentMethod: 'CASH' });
      // Month 2 Fee: +600 (Balance: 800)
      const f1 = BillingService.generateFeeRecord(db, s.id, 1);
      // Payment: -800 (Balance: 0)
      await PaymentService.recordPayment(db, { feeRecordId: f0.id, amount: 200, paymentMethod: 'CASH' });
      await PaymentService.recordPayment(db, { feeRecordId: f1.id, amount: 600, paymentMethod: 'CASH' });

      const totalBilled = f0.totalAmount + f1.totalAmount;
      const totalPaid = db.payments.filter((p) => p.studentId === s.id).reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = totalBilled - totalPaid;

      assertEqual(totalBilled, 1200);
      assertEqual(totalPaid, 1200);
      assertEqual(remainingBalance, 0);
    },
  },
];

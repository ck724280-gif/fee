/**
 * Tier 2: Boundary Value Analysis & Edge Cases — 02 Financial Limits, Balances & Overpayment Guards
 * Comprehensive boundary testing of payment amounts, discounts, late fee thresholds, and zero states.
 */

import { assertEqual, assertTrue, assertFalse, assertRejects } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, PaymentService } from '../fixtures/mock-services';

export const tier2FinancialBoundariesTests: TestCase[] = [
  // Overpayment Boundary Tests
  {
    tier: 2,
    name: 'B02-T01: Overpayment by ₹1 (₹501 on ₹500 balance) is rejected',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      await assertRejects(() => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 501, paymentMethod: 'CASH' }), 'cannot exceed');
    },
  },
  {
    tier: 2,
    name: 'B02-T02: Massive overpayment (₹100,000 on ₹500 balance) is rejected',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      await assertRejects(() => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 100000, paymentMethod: 'CASH' }), 'cannot exceed');
    },
  },
  {
    tier: 2,
    name: 'B02-T03: Exact boundary payment (₹500.00 on ₹500 balance) succeeds perfectly',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      const res = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 500, paymentMethod: 'CASH' });
      assertEqual(res.feeRecord.outstandingAmount, 0);
      assertEqual(res.feeRecord.status, 'PAID');
    },
  },
  {
    tier: 2,
    name: 'B02-T04: Payment of ₹499 leaves exact ₹1 outstanding balance',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      const res = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 499, paymentMethod: 'CASH' });
      assertEqual(res.feeRecord.outstandingAmount, 1);
      assertEqual(res.feeRecord.status, 'PARTIALLY_PAID');
    },
  },
  {
    tier: 2,
    name: 'B02-T05: Final payment of ₹1 settles ₹1 balance to PAID',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 499, paymentMethod: 'CASH' });
      const res = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 1, paymentMethod: 'CASH' });
      assertEqual(res.feeRecord.outstandingAmount, 0);
      assertEqual(res.feeRecord.status, 'PAID');
    },
  },

  // Micro-Payments & High Granularity Installments
  {
    tier: 2,
    name: 'B02-T06: 10 consecutive micro-installments of ₹50 on ₹500 fee record reach PAID status on 10th payment',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      for (let i = 0; i < 9; i++) {
        const res = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 50, paymentMethod: 'CASH' });
        assertEqual(res.feeRecord.status, 'PARTIALLY_PAID');
      }
      const finalRes = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 50, paymentMethod: 'CASH' });
      assertEqual(finalRes.feeRecord.status, 'PAID');
      assertEqual(finalRes.feeRecord.outstandingAmount, 0);
      assertEqual(db.payments.length, 10);
    },
  },

  // Discount Boundary Tests
  {
    tier: 2,
    name: 'B02-T07: 0% percentage discount leaves total fee unmodified',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'PERCENTAGE', discountValue: 0, admissionFee: 0 }, { defaultMonthlyFee: 800 });
      assertEqual(p.discountAmount, 0);
      assertEqual(p.totalAmount, 800);
    },
  },
  {
    tier: 2,
    name: 'B02-T08: 50% percentage discount cuts fee in exact half',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'PERCENTAGE', discountValue: 50, admissionFee: 0 }, { defaultMonthlyFee: 700 });
      assertEqual(p.discountAmount, 350);
      assertEqual(p.totalAmount, 350);
    },
  },
  {
    tier: 2,
    name: 'B02-T09: 100% percentage discount yields ₹0 total fee',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'PERCENTAGE', discountValue: 100, admissionFee: 0 }, { defaultMonthlyFee: 800 });
      assertEqual(p.discountAmount, 800);
      assertEqual(p.totalAmount, 0);
    },
  },
  {
    tier: 2,
    name: 'B02-T10: Percentage discount > 100% is clamped to 100%',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'PERCENTAGE', discountValue: 150, admissionFee: 0 }, { defaultMonthlyFee: 800 });
      assertEqual(p.discountAmount, 800);
      assertEqual(p.totalAmount, 0);
    },
  },
  {
    tier: 2,
    name: 'B02-T11: Fixed discount equal to base fee yields ₹0 net fee',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'FIXED', discountValue: 600, admissionFee: 0 }, { defaultMonthlyFee: 600 });
      assertEqual(p.discountAmount, 600);
      assertEqual(p.netFeeAmount, 0);
    },
  },
  {
    tier: 2,
    name: 'B02-T12: Fixed discount greater than base fee is clamped to base fee (no negative balance)',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'FIXED', discountValue: 1200, admissionFee: 0 }, { defaultMonthlyFee: 600 });
      assertEqual(p.discountAmount, 600);
      assertEqual(p.netFeeAmount, 0);
    },
  },

  // Late Fee Boundary Tests
  {
    tier: 2,
    name: 'B02-T13: Late fee on day 0 of grace period is ₹0',
    fn: () => {
      const cls = { id: 'c1', name: 'C1', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: true, lateFeeType: 'FIXED' as const, lateFeeAmount: 50, graceDays: 5, status: 'ACTIVE' as const, createdAt: new Date(), updatedAt: new Date() };
      const fee = { id: 'f1', studentId: 's1', classId: 'c1', cycleIndex: 0, billingPeriodStart: new Date('2026-05-03'), billingPeriodEnd: new Date('2026-06-02'), dueDate: new Date('2026-06-03'), baseAmount: 800, admissionFeeAmount: 0, discountAmount: 0, lateFeeAmount: 0, totalAmount: 800, paidAmount: 0, outstandingAmount: 800, status: 'DUE' as const, classSnapshotFee: 800, studentFeeModeSnapshot: 'DEFAULT' as const, createdAt: new Date(), updatedAt: new Date() };
      const late = BillingService.calculateLateFee(cls, fee, new Date('2026-06-03'));
      assertEqual(late, 0);
    },
  },
  {
    tier: 2,
    name: 'B02-T14: Late fee on last day of grace period (day 5) is ₹0',
    fn: () => {
      const cls = { id: 'c1', name: 'C1', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: true, lateFeeType: 'FIXED' as const, lateFeeAmount: 50, graceDays: 5, status: 'ACTIVE' as const, createdAt: new Date(), updatedAt: new Date() };
      const fee = { id: 'f1', studentId: 's1', classId: 'c1', cycleIndex: 0, billingPeriodStart: new Date('2026-05-03'), billingPeriodEnd: new Date('2026-06-02'), dueDate: new Date('2026-06-03'), baseAmount: 800, admissionFeeAmount: 0, discountAmount: 0, lateFeeAmount: 0, totalAmount: 800, paidAmount: 0, outstandingAmount: 800, status: 'OVERDUE' as const, classSnapshotFee: 800, studentFeeModeSnapshot: 'DEFAULT' as const, createdAt: new Date(), updatedAt: new Date() };
      const late = BillingService.calculateLateFee(cls, fee, new Date('2026-06-08')); // +5 days exactly
      assertEqual(late, 0);
    },
  },
  {
    tier: 2,
    name: 'B02-T15: Late fee on first day past grace period (day 6) incurs late fee',
    fn: () => {
      const cls = { id: 'c1', name: 'C1', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: true, lateFeeType: 'FIXED' as const, lateFeeAmount: 50, graceDays: 5, status: 'ACTIVE' as const, createdAt: new Date(), updatedAt: new Date() };
      const fee = { id: 'f1', studentId: 's1', classId: 'c1', cycleIndex: 0, billingPeriodStart: new Date('2026-05-03'), billingPeriodEnd: new Date('2026-06-02'), dueDate: new Date('2026-06-03'), baseAmount: 800, admissionFeeAmount: 0, discountAmount: 0, lateFeeAmount: 0, totalAmount: 800, paidAmount: 0, outstandingAmount: 800, status: 'OVERDUE' as const, classSnapshotFee: 800, studentFeeModeSnapshot: 'DEFAULT' as const, createdAt: new Date(), updatedAt: new Date() };
      const late = BillingService.calculateLateFee(cls, fee, new Date('2026-06-09')); // +6 days
      assertEqual(late, 50);
    },
  },
  {
    tier: 2,
    name: 'B02-T16: Per-day late fee calculates correctly 10 days past grace period',
    fn: () => {
      const cls = { id: 'c1', name: 'C1', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: true, lateFeeType: 'PER_DAY' as const, lateFeeAmount: 15, graceDays: 3, status: 'ACTIVE' as const, createdAt: new Date(), updatedAt: new Date() };
      const fee = { id: 'f1', studentId: 's1', classId: 'c1', cycleIndex: 0, billingPeriodStart: new Date('2026-05-03'), billingPeriodEnd: new Date('2026-06-02'), dueDate: new Date('2026-06-03'), baseAmount: 800, admissionFeeAmount: 0, discountAmount: 0, lateFeeAmount: 0, totalAmount: 800, paidAmount: 0, outstandingAmount: 800, status: 'OVERDUE' as const, classSnapshotFee: 800, studentFeeModeSnapshot: 'DEFAULT' as const, createdAt: new Date(), updatedAt: new Date() };
      const late = BillingService.calculateLateFee(cls, fee, new Date('2026-06-16')); // +13 days -> 13 - 3 = 10 days * 15 = 150
      assertEqual(late, 150);
    },
  },
  {
    tier: 2,
    name: 'B02-T17: Admission fee is ₹0 when configured as 0 in student profile',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'NONE', discountValue: 0, admissionFee: 0 }, { defaultMonthlyFee: 500 }, true);
      assertEqual(p.admissionFeeAmount, 0);
      assertEqual(p.totalAmount, 500);
    },
  },
  {
    tier: 2,
    name: 'B02-T18: Admission fee is omitted in Cycle 1 and all future cycles',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'NONE', discountValue: 0, admissionFee: 300 }, { defaultMonthlyFee: 500 }, false);
      assertEqual(p.admissionFeeAmount, 0);
      assertEqual(p.totalAmount, 500);
    },
  },
  {
    tier: 2,
    name: 'B02-T19: Zero class default fee resolves to ₹0 base fee without errors',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'NONE', discountValue: 0, admissionFee: 0 }, { defaultMonthlyFee: 0 }, false);
      assertEqual(p.baseAmount, 0);
      assertEqual(p.totalAmount, 0);
    },
  },
  {
    tier: 2,
    name: 'B02-T20: Zero custom student fee resolves to ₹0 base fee without errors',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'CUSTOM', customMonthlyFee: 0, discountType: 'NONE', discountValue: 0, admissionFee: 0 }, { defaultMonthlyFee: 800 }, false);
      assertEqual(p.baseAmount, 0);
      assertEqual(p.totalAmount, 0);
    },
  },
  {
    tier: 2,
    name: 'B02-T21: Fractional percentage discount rounds to nearest integer currency amount',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'DEFAULT', customMonthlyFee: null, discountType: 'PERCENTAGE', discountValue: 15, admissionFee: 0 }, { defaultMonthlyFee: 650 });
      // 15% of 650 = 97.5 -> rounded to 98
      assertEqual(p.discountAmount, 98);
      assertEqual(p.totalAmount, 552);
    },
  },
  {
    tier: 2,
    name: 'B02-T22: Multiple payments totalling exact amount transitions to PAID on last rupee',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 100, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 33, paymentMethod: 'CASH' });
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 33, paymentMethod: 'CASH' });
      const res = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 34, paymentMethod: 'CASH' });
      assertEqual(res.feeRecord.paidAmount, 100);
      assertEqual(res.feeRecord.outstandingAmount, 0);
      assertEqual(res.feeRecord.status, 'PAID');
    },
  },
  {
    tier: 2,
    name: 'B02-T23: Overpayment error provides clear actionable message containing exact outstanding balance',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 400, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      let msg = '';
      try {
        await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 450, paymentMethod: 'CASH' });
      } catch (err: any) {
        msg = err.message;
      }
      assertTrue(msg.includes('450'));
      assertTrue(msg.includes('400'));
    },
  },
  {
    tier: 2,
    name: 'B02-T24: Attempting payment on non-existent feeRecordId throws 404',
    fn: async () => {
      const db = new InMemoryDB();
      await assertRejects(() => PaymentService.recordPayment(db, { feeRecordId: 'fee_not_found', amount: 100, paymentMethod: 'CASH' }), 'not found');
    },
  },
  {
    tier: 2,
    name: 'B02-T25: Payment updates do not mutate other unrelated fee records',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const f0 = BillingService.generateFeeRecord(db, s.id, 0);
      const f1 = BillingService.generateFeeRecord(db, s.id, 1);

      await PaymentService.recordPayment(db, { feeRecordId: f0.id, amount: 500, paymentMethod: 'CASH' });
      const f1After = db.feeRecords.find((f) => f.id === f1.id);
      assertEqual(f1After?.paidAmount, 0);
      assertEqual(f1After?.outstandingAmount, 500);
      assertEqual(f1After?.status, f1.status);
    },
  },
  {
    tier: 2,
    name: 'B02-T26: Waived fee record preserves status and outstanding balance is cleared',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);
      const updated = db.updateFeeRecord(fee.id, { status: 'WAIVED', outstandingAmount: 0 });
      assertEqual(updated.status, 'WAIVED');
      assertEqual(updated.outstandingAmount, 0);
    },
  },
  {
    tier: 2,
    name: 'B02-T27: Cancelled fee record preserves status without triggering delinquency',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);
      const updated = db.updateFeeRecord(fee.id, { status: 'CANCELLED', outstandingAmount: 0 });
      assertEqual(updated.status, 'CANCELLED');
    },
  },
  {
    tier: 2,
    name: 'B02-T28: Zero amount fee record derives PAID status immediately upon creation',
    fn: () => {
      const record = {
        paidAmount: 0,
        totalAmount: 0,
        dueDate: new Date('2026-06-01'),
        status: 'UPCOMING' as const,
      };
      const status = BillingService.deriveFeeStatus(record, new Date());
      assertEqual(status, 'PAID');
    },
  },
  {
    tier: 2,
    name: 'B02-T29: Extreme high valid fee amount (e.g. ₹50,000 annual lump sum) resolves cleanly',
    fn: () => {
      const p = BillingService.resolvePricing({ feeMode: 'CUSTOM', customMonthlyFee: 50000, discountType: 'NONE', discountValue: 0, admissionFee: 10000 }, { defaultMonthlyFee: 500 }, true);
      assertEqual(p.baseAmount, 50000);
      assertEqual(p.admissionFeeAmount, 10000);
      assertEqual(p.totalAmount, 60000);
    },
  },
  {
    tier: 2,
    name: 'B02-T30: Cumulative payments sum strictly equals paidAmount on feeRecord',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 250, paymentMethod: 'CASH' });
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 350, paymentMethod: 'UPI' });

      const paymentsSum = db.payments.filter((p) => p.feeRecordId === fee.id).reduce((sum, p) => sum + p.amount, 0);
      const feeRecord = db.feeRecords.find((f) => f.id === fee.id);
      assertEqual(feeRecord?.paidAmount, paymentsSum);
      assertEqual(feeRecord?.paidAmount, 600);
      assertEqual(feeRecord?.outstandingAmount, 200);
    },
  },
  {
    tier: 2,
    name: 'B02-T31: Re-running fee status derivation with simulated future dates changes DUE to OVERDUE',
    fn: () => {
      const fee = {
        paidAmount: 0,
        totalAmount: 800,
        dueDate: new Date('2026-06-03'),
        status: 'UPCOMING' as const,
      };
      const onDue = BillingService.deriveFeeStatus(fee, new Date('2026-06-03'));
      const afterDue = BillingService.deriveFeeStatus(fee, new Date('2026-06-04'));
      assertEqual(onDue, 'DUE');
      assertEqual(afterDue, 'OVERDUE');
    },
  },
  {
    tier: 2,
    name: 'B02-T32: PARTIALLY_PAID status persists even when past due date without transitioning to OVERDUE directly',
    fn: () => {
      const fee = {
        paidAmount: 300,
        totalAmount: 800,
        dueDate: new Date('2026-06-03'),
        status: 'UPCOMING' as const,
      };
      const status = BillingService.deriveFeeStatus(fee, new Date('2026-06-20'));
      assertEqual(status, 'PARTIALLY_PAID');
    },
  },
  {
    tier: 2,
    name: 'B02-T33: Negative custom fee value throws validation error',
    fn: () => {
      let threw = false;
      try {
        BillingService.resolvePricing({ feeMode: 'CUSTOM', customMonthlyFee: -500, discountType: 'NONE', discountValue: 0, admissionFee: 0 }, { defaultMonthlyFee: 800 });
      } catch (err: any) {
        threw = true;
        assertTrue(err.message.includes('non-negative'));
      }
      assertTrue(threw);
    },
  },
  {
    tier: 2,
    name: 'B02-T34: Total billed minus total payments equals outstanding balance across whole database',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s1 = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const s2 = db.createStudent({ studentCode: 'DPR-2026-002', name: 'S2', mobile: '9876543211', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      const f1 = BillingService.generateFeeRecord(db, s1.id, 0);
      const f2 = BillingService.generateFeeRecord(db, s2.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: f1.id, amount: 600, paymentMethod: 'CASH' });
      await PaymentService.recordPayment(db, { feeRecordId: f2.id, amount: 200, paymentMethod: 'UPI' });

      const totalBilled = db.feeRecords.reduce((sum, f) => sum + f.totalAmount, 0);
      const totalPaid = db.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalOutstanding = db.feeRecords.reduce((sum, f) => sum + f.outstandingAmount, 0);

      assertEqual(totalBilled, 1200);
      assertEqual(totalPaid, 800);
      assertEqual(totalOutstanding, 400);
      assertEqual(totalBilled - totalPaid, totalOutstanding);
    },
  },
  {
    tier: 2,
    name: 'B02-T35: Zero payment attempts do not generate receipt or audit log records',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      try {
        await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 0, paymentMethod: 'CASH' });
      } catch {
        // Expected
      }

      assertEqual(db.payments.length, 0);
      assertEqual(db.auditLogs.length, 0);
    },
  },
];

if (process.argv[1]?.replace(/\\/g, '/').endsWith('02_financial_boundaries.test.ts')) {
  (async () => {
    let passed = 0;
    let failed = 0;
    console.log(`Running ${tier2FinancialBoundariesTests.length} tests in 02_financial_boundaries.test.ts...`);
    for (const t of tier2FinancialBoundariesTests) {
      try {
        await t.fn();
        console.log(`  ✔ PASS: ${t.name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✖ FAIL: ${t.name}`, err);
        failed++;
      }
    }
    console.log(`\nResult: ${passed} passed, ${failed} failed out of ${tier2FinancialBoundariesTests.length} tests.`);
    if (failed > 0) process.exit(1);
  })();
}


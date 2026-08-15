/**
 * Tier 1: Feature Coverage — 04 Payments, Overpayment Guards & Receipt Generator
 * Covers Features 14-17 (>= 5 test cases per feature = >= 20 test cases)
 */

import { assertEqual, assertTrue, assertFalse, assertDefined, assertRejects } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, PaymentService } from '../fixtures/mock-services';

export const tier1PaymentsTests: TestCase[] = [
  // --- Feature 14: Multi-Part & Full Payment Engine ---
  {
    tier: 1,
    featureId: 14,
    featureName: 'Multi-Part & Full Payment Engine',
    name: 'F14-T01: Partial payment of ₹200 on ₹500 fee updates paid to ₹200, outstanding to ₹300, and status to PARTIALLY_PAID',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      const res = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 200,
        paymentMethod: 'CASH',
      });

      assertEqual(res.feeRecord.paidAmount, 200);
      assertEqual(res.feeRecord.outstandingAmount, 300);
      assertEqual(res.feeRecord.status, 'PARTIALLY_PAID');
    },
  },
  {
    tier: 1,
    featureId: 14,
    featureName: 'Multi-Part & Full Payment Engine',
    name: 'F14-T02: Full payment of ₹500 on ₹500 fee updates paid to ₹500, outstanding to ₹0, and status to PAID',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      const res = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 500,
        paymentMethod: 'UPI',
        transactionId: 'UPI-998877',
      });

      assertEqual(res.feeRecord.paidAmount, 500);
      assertEqual(res.feeRecord.outstandingAmount, 0);
      assertEqual(res.feeRecord.status, 'PAID');
    },
  },
  {
    tier: 1,
    featureId: 14,
    featureName: 'Multi-Part & Full Payment Engine',
    name: 'F14-T03: Cumulative multi-part installments (₹200 + ₹200 + ₹100 = ₹500) transition smoothly to PAID',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 200, paymentMethod: 'CASH' });
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 200, paymentMethod: 'UPI' });
      const p3 = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 100, paymentMethod: 'CASH' });

      assertEqual(p3.feeRecord.paidAmount, 500);
      assertEqual(p3.feeRecord.outstandingAmount, 0);
      assertEqual(p3.feeRecord.status, 'PAID');
      assertEqual(db.payments.length, 3);
    },
  },
  {
    tier: 1,
    featureId: 14,
    featureName: 'Multi-Part & Full Payment Engine',
    name: 'F14-T04: Payment generates an audit log entry atomically',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 250,
        paymentMethod: 'CASH',
        createdById: 'admin_usr_1',
      });

      const audit = db.auditLogs.find((a) => a.action === 'PAYMENT_RECORDED');
      assertDefined(audit);
      assertEqual(audit.userId, 'admin_usr_1');
      assertEqual(audit.entityType, 'PAYMENT');
    },
  },
  {
    tier: 1,
    featureId: 14,
    featureName: 'Multi-Part & Full Payment Engine',
    name: 'F14-T05: Payment creates an on-demand receipt document token automatically',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      const res = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 500,
        paymentMethod: 'CASH',
      });

      const doc = db.documents.find((d) => d.token === res.documentToken);
      assertDefined(doc);
      assertEqual(doc.documentType, 'RECEIPT');
      assertEqual(doc.entityId, res.payment.id);
    },
  },

  // --- Feature 15: Overpayment Guard Validation ---
  {
    tier: 1,
    featureId: 15,
    featureName: 'Overpayment Guard Validation',
    name: 'F15-T01: Overpayment attempt (₹600 on ₹500 fee) is strictly rejected',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      await assertRejects(
        () => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 600, paymentMethod: 'CASH' }),
        'cannot exceed outstanding balance'
      );
    },
  },
  {
    tier: 1,
    featureId: 15,
    featureName: 'Overpayment Guard Validation',
    name: 'F15-T02: Second installment exceeding remaining balance is rejected without mutating state',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 300, paymentMethod: 'CASH' });

      // Attempt to pay 250 when outstanding is 200
      await assertRejects(
        () => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 250, paymentMethod: 'CASH' }),
        'cannot exceed outstanding balance'
      );

      const feeAfter = db.feeRecords.find((f) => f.id === fee.id);
      assertEqual(feeAfter?.paidAmount, 300);
      assertEqual(feeAfter?.outstandingAmount, 200);
      assertEqual(db.payments.length, 1);
    },
  },
  {
    tier: 1,
    featureId: 15,
    featureName: 'Overpayment Guard Validation',
    name: 'F15-T03: Zero payment amount is rejected with validation error',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      await assertRejects(
        () => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 0, paymentMethod: 'CASH' }),
        'greater than 0'
      );
    },
  },
  {
    tier: 1,
    featureId: 15,
    featureName: 'Overpayment Guard Validation',
    name: 'F15-T04: Negative payment amount is rejected with validation error',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      await assertRejects(
        () => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: -150, paymentMethod: 'CASH' }),
        'greater than 0'
      );
    },
  },
  {
    tier: 1,
    featureId: 15,
    featureName: 'Overpayment Guard Validation',
    name: 'F15-T05: Attempting payment on already PAID fee record is rejected',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 500, paymentMethod: 'CASH' });

      await assertRejects(
        () => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 10, paymentMethod: 'CASH' }),
        'cannot exceed outstanding balance'
      );
    },
  },

  // --- Feature 16: Payment Methods & Transaction IDs ---
  {
    tier: 1,
    featureId: 16,
    featureName: 'Payment Methods & Transaction IDs',
    name: 'F16-T01: Cash payment records CASH method without requiring transactionId',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      const res = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 500, paymentMethod: 'CASH' });
      assertEqual(res.payment.paymentMethod, 'CASH');
      assertEqual(res.payment.transactionId, null);
    },
  },
  {
    tier: 1,
    featureId: 16,
    featureName: 'Payment Methods & Transaction IDs',
    name: 'F16-T02: UPI payment captures transaction reference ID',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      const res = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 500,
        paymentMethod: 'UPI',
        transactionId: 'UPI-REF-123456789',
      });
      assertEqual(res.payment.paymentMethod, 'UPI');
      assertEqual(res.payment.transactionId, 'UPI-REF-123456789');
    },
  },
  {
    tier: 1,
    featureId: 16,
    featureName: 'Payment Methods & Transaction IDs',
    name: 'F16-T03: Bank Transfer captures NEFT/IMPS reference code',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      const res = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 500,
        paymentMethod: 'BANK_TRANSFER',
        transactionId: 'NEFT-SBIN0001234-5544',
      });
      assertEqual(res.payment.paymentMethod, 'BANK_TRANSFER');
      assertEqual(res.payment.transactionId, 'NEFT-SBIN0001234-5544');
    },
  },
  {
    tier: 1,
    featureId: 16,
    featureName: 'Payment Methods & Transaction IDs',
    name: 'F16-T04: Card and Other payment methods record correctly',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      const res = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 250,
        paymentMethod: 'CARD',
        transactionId: 'POS-AUTH-8877',
      });
      assertEqual(res.payment.paymentMethod, 'CARD');

      const res2 = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 250,
        paymentMethod: 'OTHER',
        notes: 'Cheque deposit #001298',
      });
      assertEqual(res2.payment.paymentMethod, 'OTHER');
      assertEqual(res2.payment.notes, 'Cheque deposit #001298');
    },
  },
  {
    tier: 1,
    featureId: 16,
    featureName: 'Payment Methods & Transaction IDs',
    name: 'F16-T05: Payment date accepts historical date or defaults to current date',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 5',
        defaultMonthlyFee: 500,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      const stu = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Student 1',
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
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      const customDate = new Date('2026-05-10T10:00:00Z');
      const res = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 500,
        paymentMethod: 'CASH',
        paymentDate: customDate,
      });
      assertEqual(res.payment.paymentDate.toISOString(), customDate.toISOString());
    },
  },

  // --- Feature 17: Receipt Code Sequence Generator ---
  {
    tier: 1,
    featureId: 17,
    featureName: 'Receipt Code Sequence Generator',
    name: 'F17-T01: First receipt generated is formatted DPR-RC-2026-0001',
    fn: () => {
      const db = new InMemoryDB();
      const receiptNo = PaymentService.generateReceiptNumber(db, 2026);
      assertEqual(receiptNo, 'DPR-RC-2026-0001');
    },
  },
  {
    tier: 1,
    featureId: 17,
    featureName: 'Receipt Code Sequence Generator',
    name: 'F17-T02: Increments sequence monotonically across sequential payments',
    fn: () => {
      const db = new InMemoryDB();
      db.createPayment({
        feeRecordId: 'f1',
        studentId: 's1',
        amount: 500,
        paymentMethod: 'CASH',
        receiptNumber: 'DPR-RC-2026-0001',
        paymentDate: new Date('2026-05-01'),
      });

      const nextReceipt = PaymentService.generateReceiptNumber(db, 2026);
      assertEqual(nextReceipt, 'DPR-RC-2026-0002');
    },
  },
  {
    tier: 1,
    featureId: 17,
    featureName: 'Receipt Code Sequence Generator',
    name: 'F17-T03: Scopes receipt sequence by year (DPR-RC-2026-0001 vs DPR-RC-2027-0001)',
    fn: () => {
      const db = new InMemoryDB();
      db.createPayment({
        feeRecordId: 'f1',
        studentId: 's1',
        amount: 500,
        paymentMethod: 'CASH',
        receiptNumber: 'DPR-RC-2026-0001',
        paymentDate: new Date('2026-05-01'),
      });

      const receipt2027 = PaymentService.generateReceiptNumber(db, 2027);
      assertEqual(receipt2027, 'DPR-RC-2027-0001');
    },
  },
  {
    tier: 1,
    featureId: 17,
    featureName: 'Receipt Code Sequence Generator',
    name: 'F17-T04: Zero-pads up to 4 digits (e.g. DPR-RC-2026-0999 -> DPR-RC-2026-1000)',
    fn: () => {
      const db = new InMemoryDB();
      db.createPayment({
        feeRecordId: 'f1',
        studentId: 's1',
        amount: 500,
        paymentMethod: 'CASH',
        receiptNumber: 'DPR-RC-2026-0999',
        paymentDate: new Date('2026-05-01'),
      });

      const nextReceipt = PaymentService.generateReceiptNumber(db, 2026);
      assertEqual(nextReceipt, 'DPR-RC-2026-1000');
    },
  },
  {
    tier: 1,
    featureId: 17,
    featureName: 'Receipt Code Sequence Generator',
    name: 'F17-T05: Attempting to insert duplicate receiptNumber fails unique constraint',
    fn: () => {
      const db = new InMemoryDB();
      db.createPayment({
        feeRecordId: 'f1',
        studentId: 's1',
        amount: 500,
        paymentMethod: 'CASH',
        receiptNumber: 'DPR-RC-2026-0001',
        paymentDate: new Date('2026-05-01'),
      });

      let threw = false;
      try {
        db.createPayment({
          feeRecordId: 'f2',
          studentId: 's2',
          amount: 500,
          paymentMethod: 'CASH',
          receiptNumber: 'DPR-RC-2026-0001',
          paymentDate: new Date('2026-05-01'),
        });
      } catch (err: any) {
        threw = true;
        assertTrue(err.message.includes('Unique constraint failed'));
      }
      assertTrue(threw);
    },
  },
];

if (process.argv[1]?.replace(/\\/g, '/').endsWith('04_payments.test.ts')) {
  (async () => {
    let passed = 0;
    let failed = 0;
    console.log(`Running ${tier1PaymentsTests.length} tests in 04_payments.test.ts...`);
    for (const t of tier1PaymentsTests) {
      try {
        await t.fn();
        console.log(`  ✔ PASS: ${t.name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✖ FAIL: ${t.name}`, err);
        failed++;
      }
    }
    console.log(`\nResult: ${passed} passed, ${failed} failed out of ${tier1PaymentsTests.length} tests.`);
    if (failed > 0) process.exit(1);
  })();
}


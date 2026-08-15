/**
 * Tier 3: Cross-Feature Interactions — 02 Partial Payments, Reminders & WhatsApp Integration
 * Pairwise verification connecting payment capturing, dynamic fee balance derivation, reminder document creation, and WhatsApp messaging.
 */

import { assertEqual, assertTrue, assertFalse, assertDefined } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, PaymentService, DocumentService, WhatsAppService } from '../fixtures/mock-services';

export const tier3PartialPaymentRemindersTests: TestCase[] = [
  {
    tier: 3,
    name: 'X02-T01: Partial payment of ₹300 on ₹800 fee triggers PARTIALLY_PAID status and generates reminder for ₹500',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'Rahul Sharma', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-03'), joiningDate: new Date('2026-05-03'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      // Record partial payment
      const payRes = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 300,
        paymentMethod: 'CASH',
      });
      assertEqual(payRes.feeRecord.status, 'PARTIALLY_PAID');
      assertEqual(payRes.feeRecord.outstandingAmount, 500);

      // Generate reminder document token for remaining balance
      const reminderToken = DocumentService.createDocumentToken(db, 'REMINDER', fee.id, {
        studentName: stu.name,
        dueAmount: payRes.feeRecord.outstandingAmount,
      });

      const doc = DocumentService.verifyAndGetDocument(db, reminderToken);
      assertEqual(doc.metadata.dueAmount, 500);

      // Generate WhatsApp reminder message
      const docUrl = `https://dprtuition.vercel.app/api/documents/${reminderToken}`;
      const waMsg = WhatsAppService.generateReminderMessage({
        studentName: stu.name,
        className: 'Class 8',
        dueAmount: payRes.feeRecord.outstandingAmount,
        dueDateStr: '03 June 2026',
        documentUrl: docUrl,
      });

      assertTrue(waMsg.includes('Rahul Sharma'));
      assertTrue(waMsg.includes('₹500'));
      assertTrue(waMsg.includes(reminderToken));
    },
  },
  {
    tier: 3,
    name: 'X02-T02: Second installment of ₹500 settles fee to PAID and receipt message reflects ₹0 balance',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'Rahul Sharma', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-03'), joiningDate: new Date('2026-05-03'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 300, paymentMethod: 'CASH' });
      const pay2 = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 500, paymentMethod: 'UPI' });

      assertEqual(pay2.feeRecord.status, 'PAID');
      assertEqual(pay2.feeRecord.outstandingAmount, 0);

      const receiptMsg = WhatsAppService.generateReceiptMessage({
        studentName: stu.name,
        className: 'Class 8',
        paidAmount: 500,
        receiptNumber: pay2.receiptNumber,
        outstandingAmount: pay2.feeRecord.outstandingAmount,
        documentUrl: `https://dprtuition.vercel.app/api/documents/${pay2.documentToken}`,
      });

      assertTrue(receiptMsg.includes('₹500'));
      assertTrue(receiptMsg.includes('Remaining Balance: ₹0'));
    },
  },
  {
    tier: 3,
    name: 'X02-T03: WhatsApp Click-to-Chat deep link encodes entire partial reminder message correctly',
    fn: () => {
      const phone = '9876543210';
      const msg = 'Dear Parent, Fee Due: ₹500. Download: https://dpr.app/doc/123';
      const url = WhatsAppService.buildClickToChatUrl(phone, msg);
      assertTrue(url.startsWith('https://wa.me/919876543210?text='));
      assertTrue(url.includes('%E2%82%B9500'));
    },
  },
  {
    tier: 3,
    name: 'X02-T04: Receipt document token links directly to payment transaction and preserves receipt number',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'Rahul', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-03'), joiningDate: new Date('2026-05-03'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      const res = await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 800, paymentMethod: 'CASH' });
      const doc = db.documents.find((d) => d.token === res.documentToken);
      assertDefined(doc);
      assertEqual(doc.entityId, res.payment.id);
      assertEqual(doc.metadata.receiptNumber, res.receiptNumber);
    },
  },
  {
    tier: 3,
    name: 'X02-T05: Partial payments maintain separate audit logs for every individual transaction',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'Rahul', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-03'), joiningDate: new Date('2026-05-03'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, stu.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 400, paymentMethod: 'CASH', createdById: 'admin_1' });
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 400, paymentMethod: 'UPI', createdById: 'admin_1' });

      const logs = db.auditLogs.filter((a) => a.action === 'PAYMENT_RECORDED');
      assertEqual(logs.length, 2);
    },
  },
];

if (process.argv[1]?.replace(/\\/g, '/').endsWith('02_partial_payment_reminders.test.ts')) {
  (async () => {
    let passed = 0;
    let failed = 0;
    console.log(`Running ${tier3PartialPaymentRemindersTests.length} tests in 02_partial_payment_reminders.test.ts...`);
    for (const t of tier3PartialPaymentRemindersTests) {
      try {
        await t.fn();
        console.log(`  ✔ PASS: ${t.name}`);
        passed++;
      } catch (err: any) {
        console.error(`  ✖ FAIL: ${t.name}`, err);
        failed++;
      }
    }
    console.log(`\nResult: ${passed} passed, ${failed} failed out of ${tier3PartialPaymentRemindersTests.length} tests.`);
    if (failed > 0) process.exit(1);
  })();
}


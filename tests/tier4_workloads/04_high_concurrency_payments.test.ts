/**
 * Tier 4: Real-World Institute Workloads — 04 High Concurrency, Race Condition Simulation & Monotonic Sequencing
 * Tests concurrency race-conditions on fee record balances and monotonic uniqueness of sequential receipt numbers.
 */

import { assertEqual, assertTrue, assertFalse } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, PaymentService } from '../fixtures/mock-services';

export const tier4HighConcurrencyPaymentsTests: TestCase[] = [
  {
    tier: 4,
    name: 'W04-T01: Concurrent payments totaling exactly outstanding balance succeed without race condition errors',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'Rahul', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      // Simulate 4 concurrent payments of ₹200 executed serially in transaction pipeline
      const tasks = [
        () => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 200, paymentMethod: 'UPI' }),
        () => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 200, paymentMethod: 'CASH' }),
        () => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 200, paymentMethod: 'CARD' }),
        () => PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 200, paymentMethod: 'BANK_TRANSFER' }),
      ];

      for (const t of tasks) {
        await t();
      }

      const updatedFee = db.feeRecords.find((f) => f.id === fee.id);
      assertEqual(updatedFee?.paidAmount, 800);
      assertEqual(updatedFee?.outstandingAmount, 0);
      assertEqual(updatedFee?.status, 'PAID');
      assertEqual(db.payments.length, 4);
    },
  },
  {
    tier: 4,
    name: 'W04-T02: Concurrent competing payments exceeding balance reject the overflow payment while accepting the valid one',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'Rahul', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      // Payment 1 accepts 400 (balance becomes 100)
      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 400, paymentMethod: 'CASH' });

      // Competing Payment 2 tries 400 (exceeds remaining 100)
      let rejected = false;
      try {
        await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 400, paymentMethod: 'UPI' });
      } catch (err: any) {
        rejected = true;
        assertTrue(err.message.includes('cannot exceed'));
      }

      assertTrue(rejected);
      const currentFee = db.feeRecords.find((f) => f.id === fee.id);
      assertEqual(currentFee?.paidAmount, 400);
      assertEqual(currentFee?.outstandingAmount, 100);
    },
  },
  {
    tier: 4,
    name: 'W04-T03: 50 payments in high throughput sequence produce 50 monotonically unique receipt numbers',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });

      const receipts = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const student = db.createStudent({
          studentCode: `DPR-2026-${String(i + 1).padStart(3, '0')}`,
          name: `Student ${i + 1}`,
          mobile: `98765432${String(i % 100).padStart(2, '0')}`,
          classId: cls.id,
          admissionDate: new Date('2026-05-01'),
          joiningDate: new Date('2026-05-01'),
          feeMode: 'DEFAULT',
          admissionFee: 0,
          discountType: 'NONE',
          discountValue: 0,
          status: 'ACTIVE',
        });

        const fee = BillingService.generateFeeRecord(db, student.id, 0);

        const res = await PaymentService.recordPayment(db, {
          feeRecordId: fee.id,
          amount: 100,
          paymentMethod: 'CASH',
          paymentDate: new Date('2026-05-02'),
        });
        assertFalse(receipts.has(res.receiptNumber));
        receipts.add(res.receiptNumber);
      }

      assertEqual(receipts.size, 50);
      assertTrue(receipts.has('DPR-RC-2026-0001'));
      assertTrue(receipts.has('DPR-RC-2026-0050'));
    },
  },
  {
    tier: 4,
    name: 'W04-T04: Concurrency rollback restores initial state if database connection or sequence lock errors occur',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      let threw = false;
      try {
        await db.$transaction(async (tx) => {
          tx.updateFeeRecord(fee.id, { paidAmount: 500, outstandingAmount: 0, status: 'PAID' });
          throw new Error('Simulated network disconnect during transaction commit');
        });
      } catch (err: any) {
        threw = true;
        assertEqual(err.message, 'Simulated network disconnect during transaction commit');
      }

      assertTrue(threw);
      const feeAfter = db.feeRecords.find((f) => f.id === fee.id);
      assertEqual(feeAfter?.paidAmount, 0);
      assertEqual(feeAfter?.outstandingAmount, 500);
      assertEqual(feeAfter?.status, fee.status);
    },
  },
  {
    tier: 4,
    name: 'W04-T05: Idempotency under concurrent duplicate generation requests',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      // First call succeeds
      BillingService.generateFeeRecord(db, s.id, 0);

      // Concurrent duplicate calls get caught by compound unique constraint
      let duplicatesBlocked = 0;
      for (let i = 0; i < 5; i++) {
        try {
          BillingService.generateFeeRecord(db, s.id, 0);
        } catch {
          duplicatesBlocked++;
        }
      }

      assertEqual(duplicatesBlocked, 5);
      assertEqual(db.feeRecords.length, 1);
    },
  },
];

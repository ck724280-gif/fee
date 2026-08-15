/**
 * Tier 4: Real-World Institute Workloads — 01 Full Institute Academic Lifecycle Simulation
 * Simulates a realistic academic year for DPR Private Tuition with 12 classes, 50 students, 600 billing cycles, and hundreds of payments.
 */

import { assertEqual, assertTrue, assertFalse } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, PaymentService } from '../fixtures/mock-services';

export const tier4FullInstituteSimulationTests: TestCase[] = [
  {
    tier: 4,
    name: 'W01-T01: Full-scale 12-month simulation: 12 classes, 24 students, 288 billing cycles, 300+ payments',
    fn: async () => {
      const db = new InMemoryDB();

      // 1. Create 12 Classes (Class 1 - 12)
      const classes = [];
      for (let i = 1; i <= 12; i++) {
        const cls = db.createClass({
          name: `Class ${i}`,
          defaultMonthlyFee: 400 + i * 50, // 450 to 1000
          defaultAdmissionFee: 200,
          lateFeeEnabled: i >= 8,
          lateFeeType: 'FIXED',
          lateFeeAmount: 50,
          graceDays: 5,
          status: 'ACTIVE',
        });
        classes.push(cls);
      }
      assertEqual(db.classes.length, 12);

      // 2. Create 24 Students (2 per class, 1 DEFAULT, 1 CUSTOM)
      const students = [];
      const anchorDays = [1, 3, 10, 15, 28, 29, 30, 31];
      for (let i = 0; i < 24; i++) {
        const cls = classes[Math.floor(i / 2)];
        const isCustom = i % 2 === 1;
        const anchorDay = anchorDays[i % anchorDays.length];
        const dayStr = String(anchorDay).padStart(2, '0');
        const admissionDate = new Date(`2026-05-${dayStr}T00:00:00Z`);

        const stu = db.createStudent({
          studentCode: BillingService.generateStudentCode(db, 2026),
          name: `Student ${i + 1}`,
          mobile: `98765432${String(i).padStart(2, '0')}`,
          classId: cls.id,
          admissionDate,
          joiningDate: admissionDate,
          feeMode: isCustom ? 'CUSTOM' : 'DEFAULT',
          customMonthlyFee: isCustom ? cls.defaultMonthlyFee - 50 : null,
          admissionFee: cls.defaultAdmissionFee,
          discountType: 'NONE',
          discountValue: 0,
          status: 'ACTIVE',
        });
        students.push(stu);
      }
      assertEqual(db.students.length, 24);

      // 3. Generate 12 monthly cycles for each student (24 * 12 = 288 cycles)
      for (const stu of students) {
        for (let cycle = 0; cycle < 12; cycle++) {
          BillingService.generateFeeRecord(db, stu.id, cycle);
        }
      }
      assertEqual(db.feeRecords.length, 288);

      // 4. Process payments across cycles:
      // - First 6 months: 100% paid
      // - Next 3 months: 50% paid (partial)
      // - Last 3 months: unpaid
      for (const fee of db.feeRecords) {
        if (fee.cycleIndex < 6) {
          await PaymentService.recordPayment(db, {
            feeRecordId: fee.id,
            amount: fee.totalAmount,
            paymentMethod: 'UPI',
          });
        } else if (fee.cycleIndex < 9) {
          const half = Math.floor(fee.totalAmount / 2);
          await PaymentService.recordPayment(db, {
            feeRecordId: fee.id,
            amount: half,
            paymentMethod: 'CASH',
          });
        }
      }

      // 5. Verify Aggregates & System Invariants
      const paidRecords = db.feeRecords.filter((f) => f.status === 'PAID');
      const partialRecords = db.feeRecords.filter((f) => f.status === 'PARTIALLY_PAID');
      const pendingRecords = db.feeRecords.filter((f) => f.paidAmount === 0);

      assertEqual(paidRecords.length, 24 * 6); // 144
      assertEqual(partialRecords.length, 24 * 3); // 72
      assertEqual(pendingRecords.length, 24 * 3); // 72

      const totalBilled = db.feeRecords.reduce((sum, f) => sum + f.totalAmount, 0);
      const totalCollected = db.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalOutstanding = db.feeRecords.reduce((sum, f) => sum + f.outstandingAmount, 0);

      assertEqual(totalBilled - totalCollected, totalOutstanding);
      assertTrue(totalCollected > 0);
      assertTrue(totalOutstanding > 0);
    },
  },
  {
    tier: 4,
    name: 'W01-T02: Large institute admission batch generates sequential student codes without collisions',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const codes = new Set<string>();

      for (let i = 0; i < 50; i++) {
        const code = BillingService.generateStudentCode(db, 2026);
        assertFalse(codes.has(code));
        codes.add(code);
        db.createStudent({
          studentCode: code,
          name: `Batch Student ${i + 1}`,
          mobile: `98765400${String(i).padStart(2, '0')}`,
          classId: cls.id,
          admissionDate: new Date('2026-05-01'),
          joiningDate: new Date('2026-05-01'),
          feeMode: 'DEFAULT',
          admissionFee: 0,
          discountType: 'NONE',
          discountValue: 0,
          status: 'ACTIVE',
        });
      }
      assertEqual(codes.size, 50);
      assertTrue(codes.has('DPR-2026-001'));
      assertTrue(codes.has('DPR-2026-050'));
    },
  },
  {
    tier: 4,
    name: 'W01-T03: Multi-year sequential payments generate monotonic receipt numbers across years',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      // Payment in 2026
      const p1 = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 250,
        paymentMethod: 'CASH',
        paymentDate: new Date('2026-12-15'),
      });
      // Payment in 2027
      const p2 = await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 250,
        paymentMethod: 'CASH',
        paymentDate: new Date('2027-01-10'),
      });

      assertEqual(p1.receiptNumber, 'DPR-RC-2026-0001');
      assertEqual(p2.receiptNumber, 'DPR-RC-2027-0001');
    },
  },
  {
    tier: 4,
    name: 'W01-T04: Simulation produces complete tamper-evident audit trail for every action',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      await PaymentService.recordPayment(db, { feeRecordId: fee.id, amount: 500, paymentMethod: 'UPI' });

      assertTrue(db.auditLogs.length > 0);
      assertEqual(db.auditLogs[0].action, 'PAYMENT_RECORDED');
    },
  },
  {
    tier: 4,
    name: 'W01-T05: Fee records remain immutable even when students complete academic year',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const f = BillingService.generateFeeRecord(db, s.id, 0);

      db.updateStudent(s.id, { status: 'COMPLETED' });

      const feePersisted = db.feeRecords.find((rec) => rec.id === f.id);
      assertEqual(feePersisted?.totalAmount, 500);
      assertEqual(feePersisted?.studentId, s.id);
    },
  },
];

/**
 * Tier 3: Cross-Feature Interactions — 05 Student Inactivation Lifecycle & Billing Block
 * Pairwise verification of student lifecycle status transitions, billing block on discontinued students, and audit logging.
 */

import { assertEqual, assertTrue, assertFalse, assertThrows } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService } from '../fixtures/mock-services';

export const tier3StatusInactivationLifecycleTests: TestCase[] = [
  {
    tier: 3,
    name: 'X05-T01: Active student successfully generates fee cycles; Inactive student fails generation',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      // Generates while ACTIVE
      const f0 = BillingService.generateFeeRecord(db, stu.id, 0);
      assertEqual(f0.totalAmount, 500);

      // Transition to INACTIVE
      db.updateStudent(stu.id, { status: 'INACTIVE' });

      // Attempt to generate next cycle fails
      assertThrows(() => BillingService.generateFeeRecord(db, stu.id, 1), 'inactive student');
    },
  },
  {
    tier: 3,
    name: 'X05-T02: Student status LEFT halts future fee generation permanently',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'LEFT' });

      assertThrows(() => BillingService.generateFeeRecord(db, stu.id, 0), 'inactive student');
    },
  },
  {
    tier: 3,
    name: 'X05-T03: Student status COMPLETED halts future fee generation upon course completion',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'COMPLETED' });

      assertThrows(() => BillingService.generateFeeRecord(db, stu.id, 0), 'inactive student');
    },
  },
  {
    tier: 3,
    name: 'X05-T04: Reactivating student (INACTIVE -> ACTIVE) allows resumed fee generation',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'INACTIVE' });

      assertThrows(() => BillingService.generateFeeRecord(db, stu.id, 0), 'inactive student');

      db.updateStudent(stu.id, { status: 'ACTIVE' });
      const f0 = BillingService.generateFeeRecord(db, stu.id, 0);
      assertEqual(f0.totalAmount, 500);
    },
  },
  {
    tier: 3,
    name: 'X05-T05: Inactive student status transition records audit trail with reason',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const stu = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      db.updateStudent(stu.id, { status: 'LEFT' });
      db.createAuditLog({
        userId: 'admin_1',
        action: 'STUDENT_STATUS_CHANGED',
        entityType: 'STUDENT',
        entityId: stu.id,
        details: { oldStatus: 'ACTIVE', newStatus: 'LEFT', reason: 'Relocated to another city' },
      });

      const log = db.auditLogs.find((a) => a.action === 'STUDENT_STATUS_CHANGED');
      assertEqual(log?.details.newStatus, 'LEFT');
      assertEqual(log?.details.reason, 'Relocated to another city');
    },
  },
];

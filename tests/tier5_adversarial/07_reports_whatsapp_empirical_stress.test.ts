/**
 * Tier 5 Adversarial Empirical Stress & Mathematical Integrity Suite:
 * Milestone 4 — 8-Dimension Reports Accuracy, Prisma Aggregation Math,
 * RFC 4180 CSV Export Integrity (UTF-8 BOM), and WhatsApp Deep Linking Engine.
 * 
 * Author: Challenger 2 (Milestone 4)
 */

import { assertEqual, assertTrue, assertFalse, assertApprox, assertThrows, assertRejects } from '../assertions';
import {
  getMonthlyCollectionReport,
  getOverdueFeesReport,
  getClassWiseRevenueReport,
  getPaymentMethodDistributionReport,
  getStudentStatementReport,
  getAdmissionsReport,
  getDiscountReport,
  getDailyCollectionReport,
} from '../../src/lib/reports-service';
import {
  escapeCSVField,
  generateRFC4180CSV,
  CSVColumn,
} from '../../src/lib/csv-export';
import {
  sanitizeIndianPhone,
  isValidIndianPhone,
  buildWhatsAppUrl,
  generateFeeReminderMessage,
  generatePaymentReceiptMessage,
  generateOverdueNoticeMessage,
} from '../../src/lib/whatsapp';
import { reportQuerySchema } from '../../src/lib/validations/report';
import { FeeStatus, PaymentMethod, StudentStatus, DiscountType, FeeMode } from '@prisma/client';

export async function runReportsWhatsAppEmpiricalStressSuite() {
  console.log('\n================================================================================');
  console.log('  CHALLENGER 2 (M4): REPORTS ENGINE, CSV BOM & WHATSAPP DEEP LINKING SUITE');
  console.log('================================================================================\n');

  let total = 0;
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    total++;
    try {
      await fn();
      console.log(`  ✔ PASS [${total}]: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✖ FAIL [${total}]: ${name}`);
      console.error(`     Error: ${err.message || err}`);
      failed++;
    }
  }

  // Helper to build in-memory mock Prisma client for isolated dataset queries
  function createMockPrisma(data: {
    classes?: any[];
    students?: any[];
    feeRecords?: any[];
    payments?: any[];
  }) {
    const classes = data.classes || [];
    const students = data.students || [];
    const feeRecords = data.feeRecords || [];
    const payments = data.payments || [];

    return {
      class: {
        findMany: async (args: any = {}) => {
          let res = classes;
          if (args.where?.id) {
            res = res.filter((c) => c.id === args.where.id);
          }
          return res.map((c) => ({
            ...c,
            students: students.filter((s) => s.classId === c.id),
            feeRecords: feeRecords.filter((f) => f.classId === c.id),
          }));
        },
      },
      student: {
        findMany: async (args: any = {}) => {
          let res = students;
          if (args.where?.classId) {
            res = res.filter((s) => s.classId === args.where.classId);
          }
          if (args.where?.status) {
            res = res.filter((s) => s.status === args.where.status);
          }
          if (args.where?.discountType?.not) {
            res = res.filter((s) => s.discountType !== args.where.discountType.not);
          }
          return res.map((s) => {
            const cls = classes.find((c) => c.id === s.classId);
            const stuFees = feeRecords.filter((f) => f.studentId === s.id);
            return {
              ...s,
              class: cls,
              feeRecords: stuFees,
            };
          });
        },
        findUnique: async (args: any = {}) => {
          const s = students.find((st) => st.id === args.where?.id);
          if (!s) return null;
          const cls = classes.find((c) => c.id === s.classId);
          return { ...s, class: cls };
        },
      },
      feeRecord: {
        findMany: async (args: any = {}) => {
          let res = feeRecords;
          if (args.where?.classId) {
            res = res.filter((f) => f.classId === args.where.classId);
          }
          if (args.where?.studentId) {
            res = res.filter((f) => f.studentId === args.where.studentId);
          }
          if (args.where?.status?.in) {
            res = res.filter((f) => args.where.status.in.includes(f.status));
          }
          if (args.where?.outstandingAmount?.gt !== undefined) {
            res = res.filter((f) => f.outstandingAmount > args.where.outstandingAmount.gt);
          }

          if (args.select) {
            return res.map((f) => {
              const selected: any = {};
              for (const k of Object.keys(args.select)) {
                if (args.select[k]) selected[k] = f[k];
              }
              return selected;
            });
          }

          return res.map((f) => {
            const stu = students.find((s) => s.id === f.studentId);
            const cls = classes.find((c) => c.id === f.classId);
            return {
              ...f,
              student: stu ? { ...stu, class: cls } : null,
              class: cls,
            };
          });
        },
      },
      payment: {
        findMany: async (args: any = {}) => {
          let res = payments;
          if (args.where?.studentId) {
            res = res.filter((p) => p.studentId === args.where.studentId);
          }
          if (args.where?.student?.classId) {
            res = res.filter((p) => {
              const stu = students.find((s) => s.id === p.studentId);
              return stu && stu.classId === args.where.student.classId;
            });
          }
          if (args.where?.paymentMethod) {
            res = res.filter((p) => p.paymentMethod === args.where.paymentMethod);
          }
          if (args.where?.paymentDate?.gte) {
            res = res.filter((p) => new Date(p.paymentDate) >= new Date(args.where.paymentDate.gte));
          }
          if (args.where?.paymentDate?.lte) {
            res = res.filter((p) => new Date(p.paymentDate) <= new Date(args.where.paymentDate.lte));
          }

          if (args.select) {
            return res.map((p) => {
              const selected: any = {};
              for (const k of Object.keys(args.select)) {
                if (args.select[k]) selected[k] = p[k];
              }
              return selected;
            });
          }

          return res.map((p) => {
            const stu = students.find((s) => s.id === p.studentId);
            const cls = stu ? classes.find((c) => c.id === stu.classId) : null;
            const fee = feeRecords.find((f) => f.id === p.feeRecordId);
            return {
              ...p,
              student: stu ? { ...stu, class: cls } : null,
              feeRecord: fee,
              recordedByUser: { name: 'Admin Staff' },
            };
          });
        },
      },
    };
  }

  // ============================================================================
  // SECTION 1: 8-DIMENSION REPORTS ACCURACY & PRISMA AGGREGATION INTEGRITY
  // ============================================================================

  await test('M4-REP-01: Monthly Collection Report — multi-month aggregation & collection rate calculation', async () => {
    const mockPrisma = createMockPrisma({
      classes: [{ id: 'cls_8', name: 'Class 8', defaultMonthlyFee: 800 }],
      students: [{ id: 'stu_1', studentCode: 'DPR-2026-001', name: 'Aarav Patel', classId: 'cls_8' }],
      feeRecords: [
        { id: 'f1', classId: 'cls_8', studentId: 'stu_1', billingPeriodStart: new Date('2026-05-01'), totalAmount: 800, paidAmount: 800, outstandingAmount: 0 },
        { id: 'f2', classId: 'cls_8', studentId: 'stu_1', billingPeriodStart: new Date('2026-06-01'), totalAmount: 800, paidAmount: 400, outstandingAmount: 400 },
        { id: 'f3', classId: 'cls_8', studentId: 'stu_1', billingPeriodStart: new Date('2026-07-01'), totalAmount: 800, paidAmount: 0, outstandingAmount: 800 },
      ],
      payments: [
        { id: 'p1', studentId: 'stu_1', paymentDate: new Date('2026-05-05'), amount: 800, paymentMethod: 'UPI' },
        { id: 'p2', studentId: 'stu_1', paymentDate: new Date('2026-06-10'), amount: 400, paymentMethod: 'CASH' },
      ],
    });

    const report = await getMonthlyCollectionReport(mockPrisma as any);
    assertEqual(report.rows.length, 3);

    // May: 800 billed, 800 collected -> 100% rate, 0 outstanding
    assertEqual(report.rows[0].monthKey, '2026-05');
    assertEqual(report.rows[0].totalBilled, 800);
    assertEqual(report.rows[0].totalCollected, 800);
    assertEqual(report.rows[0].outstandingAmount, 0);
    assertEqual(report.rows[0].collectionRate, 100.0);
    assertEqual(report.rows[0].transactionCount, 1);

    // June: 800 billed, 400 collected -> 50% rate, 400 outstanding
    assertEqual(report.rows[1].monthKey, '2026-06');
    assertEqual(report.rows[1].totalBilled, 800);
    assertEqual(report.rows[1].totalCollected, 400);
    assertEqual(report.rows[1].outstandingAmount, 400);
    assertEqual(report.rows[1].collectionRate, 50.0);
    assertEqual(report.rows[1].transactionCount, 1);

    // July: 800 billed, 0 collected -> 0% rate, 800 outstanding
    assertEqual(report.rows[2].monthKey, '2026-07');
    assertEqual(report.rows[2].totalBilled, 800);
    assertEqual(report.rows[2].totalCollected, 0);
    assertEqual(report.rows[2].outstandingAmount, 800);
    assertEqual(report.rows[2].collectionRate, 0.0);
    assertEqual(report.rows[2].transactionCount, 0);

    // Summary totals
    assertEqual(report.summary.totalBilled, 2400);
    assertEqual(report.summary.totalCollected, 1200);
    assertEqual(report.summary.outstandingAmount, 1200);
    assertEqual(report.summary.transactionCount, 2);
    assertEqual(report.summary.collectionRate, 50.0);
  });

  await test('M4-REP-02: Monthly Collection Report — classId filter isolation and zero edge cases', async () => {
    const mockPrisma = createMockPrisma({
      classes: [
        { id: 'cls_5', name: 'Class 5' },
        { id: 'cls_8', name: 'Class 8' },
      ],
      students: [
        { id: 'stu_5', classId: 'cls_5' },
        { id: 'stu_8', classId: 'cls_8' },
      ],
      feeRecords: [
        { id: 'f5', classId: 'cls_5', studentId: 'stu_5', billingPeriodStart: new Date('2026-05-01'), totalAmount: 500, paidAmount: 500, outstandingAmount: 0 },
        { id: 'f8', classId: 'cls_8', studentId: 'stu_8', billingPeriodStart: new Date('2026-05-01'), totalAmount: 800, paidAmount: 0, outstandingAmount: 800 },
      ],
      payments: [
        { id: 'p5', studentId: 'stu_5', paymentDate: new Date('2026-05-05'), amount: 500, paymentMethod: 'CASH' },
      ],
    });

    // Filter by cls_5
    const rep5 = await getMonthlyCollectionReport(mockPrisma as any, { classId: 'cls_5' });
    assertEqual(rep5.summary.totalBilled, 500);
    assertEqual(rep5.summary.totalCollected, 500);
    assertEqual(rep5.summary.collectionRate, 100.0);

    // Empty dataset
    const repEmpty = await getMonthlyCollectionReport(mockPrisma as any, { classId: 'non_existent' });
    assertEqual(repEmpty.rows.length, 0);
    assertEqual(repEmpty.summary.totalBilled, 0);
    assertEqual(repEmpty.summary.totalCollected, 0);
    assertEqual(repEmpty.summary.collectionRate, 0);
  });

  await test('M4-REP-03: Overdue / Defaulters Report — overdue days calculation, overdue status filtering & WhatsApp deep linking', async () => {
    const mockPrisma = createMockPrisma({
      classes: [{ id: 'cls_8', name: 'Class 8' }],
      students: [
        {
          id: 'stu_1',
          studentCode: 'DPR-2026-001',
          name: 'Rahul Sharma',
          fatherName: 'Alok Sharma',
          mobile: '9876543210',
          whatsappNumber: '+91 9876543210',
          classId: 'cls_8',
        },
        {
          id: 'stu_2',
          studentCode: 'DPR-2026-002',
          name: 'Priya Verma',
          fatherName: 'Ramesh Verma',
          mobile: '9876543211',
          whatsappNumber: null,
          classId: 'cls_8',
        },
      ],
      feeRecords: [
        // Overdue record: due 2026-05-10, reference date 2026-05-25 => 15 days overdue
        {
          id: 'f_overdue',
          studentId: 'stu_1',
          classId: 'cls_8',
          billingPeriodStart: new Date('2026-05-01'),
          billingPeriodEnd: new Date('2026-05-31'),
          dueDate: new Date('2026-05-10'),
          baseAmount: 800,
          lateFeeAmount: 50,
          totalAmount: 850,
          paidAmount: 200,
          outstandingAmount: 650,
          status: FeeStatus.OVERDUE,
        },
        // Due today record: due 2026-05-25 => 0 days overdue
        {
          id: 'f_due',
          studentId: 'stu_2',
          classId: 'cls_8',
          billingPeriodStart: new Date('2026-05-01'),
          billingPeriodEnd: new Date('2026-05-31'),
          dueDate: new Date('2026-05-25'),
          baseAmount: 800,
          lateFeeAmount: 0,
          totalAmount: 800,
          paidAmount: 0,
          outstandingAmount: 800,
          status: FeeStatus.DUE,
        },
        // Fully paid record (should NOT appear)
        {
          id: 'f_paid',
          studentId: 'stu_1',
          classId: 'cls_8',
          billingPeriodStart: new Date('2026-04-01'),
          billingPeriodEnd: new Date('2026-04-30'),
          dueDate: new Date('2026-04-10'),
          baseAmount: 800,
          lateFeeAmount: 0,
          totalAmount: 800,
          paidAmount: 800,
          outstandingAmount: 0,
          status: FeeStatus.PAID,
        },
      ],
    });

    const report = await getOverdueFeesReport(mockPrisma as any, { currentDate: '2026-05-25' });
    assertEqual(report.rows.length, 2);

    const row1 = report.rows.find((r) => r.feeRecordId === 'f_overdue')!;
    assertEqual(row1.studentCode, 'DPR-2026-001');
    assertEqual(row1.overdueDays, 15);
    assertEqual(row1.outstandingAmount, 650);
    assertEqual(row1.lateFee, 50);
    assertTrue(row1.whatsappUrl?.includes('https://wa.me/919876543210?text='));
    assertTrue(row1.whatsappUrl?.includes('URGENT'));

    const row2 = report.rows.find((r) => r.feeRecordId === 'f_due')!;
    assertEqual(row2.studentCode, 'DPR-2026-002');
    assertEqual(row2.overdueDays, 0);
    assertEqual(row2.outstandingAmount, 800);
    // Uses fallback mobile
    assertTrue(row2.whatsappUrl?.includes('https://wa.me/919876543211?text='));

    // Summary
    assertEqual(report.summary.totalOverdueStudents, 2);
    assertEqual(report.summary.totalOutstanding, 1450);
    assertEqual(report.summary.totalLateFees, 50);
  });

  await test('M4-REP-04: Class-Wise Revenue Report — student count, billed, collected and collection percentage', async () => {
    const mockPrisma = createMockPrisma({
      classes: [
        { id: 'c1', name: 'Class 5', defaultMonthlyFee: 500 },
        { id: 'c2', name: 'Class 8', defaultMonthlyFee: 800 },
      ],
      students: [
        { id: 's1', classId: 'c1', status: StudentStatus.ACTIVE },
        { id: 's2', classId: 'c1', status: StudentStatus.INACTIVE },
        { id: 's3', classId: 'c2', status: StudentStatus.ACTIVE },
      ],
      feeRecords: [
        { id: 'f1', classId: 'c1', totalAmount: 500, paidAmount: 500, outstandingAmount: 0 },
        { id: 'f2', classId: 'c1', totalAmount: 500, paidAmount: 250, outstandingAmount: 250 },
        { id: 'f3', classId: 'c2', totalAmount: 800, paidAmount: 400, outstandingAmount: 400 },
      ],
    });

    const report = await getClassWiseRevenueReport(mockPrisma as any);
    assertEqual(report.rows.length, 2);

    const c1 = report.rows.find((r) => r.className === 'Class 5')!;
    assertEqual(c1.totalStudents, 2);
    assertEqual(c1.activeStudents, 1);
    assertEqual(c1.totalBilled, 1000);
    assertEqual(c1.totalCollected, 750);
    assertEqual(c1.outstandingAmount, 250);
    assertEqual(c1.collectionRate, 75.0);

    const c2 = report.rows.find((r) => r.className === 'Class 8')!;
    assertEqual(c2.totalStudents, 1);
    assertEqual(c2.activeStudents, 1);
    assertEqual(c2.totalBilled, 800);
    assertEqual(c2.totalCollected, 400);
    assertEqual(c2.outstandingAmount, 400);
    assertEqual(c2.collectionRate, 50.0);

    assertEqual(report.summary.totalStudents, 3);
    assertEqual(report.summary.activeStudents, 2);
    assertEqual(report.summary.totalBilled, 1800);
    assertEqual(report.summary.totalCollected, 1150);
    assertEqual(report.summary.outstandingAmount, 650);
    // Overall rate: 1150 / 1800 = 63.9%
    assertEqual(report.summary.collectionRate, 63.9);
  });

  await test('M4-REP-05: Payment Method Distribution Report — method split, percentage shares, cash vs digital', async () => {
    const mockPrisma = createMockPrisma({
      payments: [
        { id: 'p1', amount: 1000, paymentMethod: PaymentMethod.CASH },
        { id: 'p2', amount: 500, paymentMethod: PaymentMethod.CASH },
        { id: 'p3', amount: 2000, paymentMethod: PaymentMethod.UPI },
        { id: 'p4', amount: 1500, paymentMethod: PaymentMethod.BANK_TRANSFER },
      ],
    });

    const report = await getPaymentMethodDistributionReport(mockPrisma as any);
    // Grand total = 5000, count = 4
    assertEqual(report.summary.totalAmount, 5000);
    assertEqual(report.summary.transactionCount, 4);
    assertEqual(report.summary.cashShare, 1500);
    assertEqual(report.summary.digitalShare, 3500);

    const cashRow = report.rows.find((r) => r.paymentMethod === 'CASH')!;
    assertEqual(cashRow.transactionCount, 2);
    assertEqual(cashRow.totalAmount, 1500);
    assertEqual(cashRow.percentageShare, 30.0); // 1500 / 5000 = 30%
    assertEqual(cashRow.averageTransaction, 750);

    const upiRow = report.rows.find((r) => r.paymentMethod === 'UPI')!;
    assertEqual(upiRow.transactionCount, 1);
    assertEqual(upiRow.totalAmount, 2000);
    assertEqual(upiRow.percentageShare, 40.0); // 2000 / 5000 = 40%

    const bankRow = report.rows.find((r) => r.paymentMethod === 'BANK_TRANSFER')!;
    assertEqual(bankRow.totalAmount, 1500);
    assertEqual(bankRow.percentageShare, 30.0);
  });

  await test('M4-REP-06: Student Statement / Ledger Report — running balance chronology & net balance due', async () => {
    const mockPrisma = createMockPrisma({
      classes: [{ id: 'cls_7', name: 'Class 7' }],
      students: [
        {
          id: 'stu_100',
          studentCode: 'DPR-2026-050',
          name: 'Ishaan Gupta',
          fatherName: 'Sanjay Gupta',
          mobile: '9876543210',
          classId: 'cls_7',
          feeMode: 'DEFAULT',
        },
      ],
      feeRecords: [
        {
          id: 'f1',
          studentId: 'stu_100',
          billingPeriodStart: new Date('2026-05-01'),
          billingPeriodEnd: new Date('2026-05-31'),
          totalAmount: 700,
          status: FeeStatus.PARTIALLY_PAID,
        },
        {
          id: 'f2',
          studentId: 'stu_100',
          billingPeriodStart: new Date('2026-06-01'),
          billingPeriodEnd: new Date('2026-06-30'),
          totalAmount: 700,
          status: FeeStatus.DUE,
        },
      ],
      payments: [
        {
          id: 'p1',
          studentId: 'stu_100',
          receiptNumber: 'DPR-RC-2026-0001',
          paymentDate: new Date('2026-05-10'),
          amount: 400,
          paymentMethod: 'UPI',
        },
        {
          id: 'p2',
          studentId: 'stu_100',
          receiptNumber: 'DPR-RC-2026-0002',
          paymentDate: new Date('2026-05-15'),
          amount: 300,
          paymentMethod: 'CASH',
        },
      ],
    });

    const report = await getStudentStatementReport(mockPrisma as any, 'stu_100');
    assertEqual(report.student.studentCode, 'DPR-2026-050');
    assertEqual(report.rows.length, 4);

    // Event 1: May Fee (+700) -> running balance: 700
    assertEqual(report.rows[0].transactionType, 'FEE_INVOICE');
    assertEqual(report.rows[0].debit, 700);
    assertEqual(report.rows[0].credit, 0);
    assertEqual(report.rows[0].runningBalance, 700);

    // Event 2: May 10 Payment (-400) -> running balance: 300
    assertEqual(report.rows[1].transactionType, 'PAYMENT_RECEIPT');
    assertEqual(report.rows[1].debit, 0);
    assertEqual(report.rows[1].credit, 400);
    assertEqual(report.rows[1].runningBalance, 300);

    // Event 3: May 15 Payment (-300) -> running balance: 0
    assertEqual(report.rows[2].transactionType, 'PAYMENT_RECEIPT');
    assertEqual(report.rows[2].credit, 300);
    assertEqual(report.rows[2].runningBalance, 0);

    // Event 4: June Fee (+700) -> running balance: 700
    assertEqual(report.rows[3].transactionType, 'FEE_INVOICE');
    assertEqual(report.rows[3].debit, 700);
    assertEqual(report.rows[3].runningBalance, 700);

    assertEqual(report.summary.totalBilled, 1400);
    assertEqual(report.summary.totalPaid, 700);
    assertEqual(report.summary.netBalanceDue, 700);
  });

  await test('M4-REP-07: Student Statement / Ledger Report — non-existent student throws descriptive error', async () => {
    const mockPrisma = createMockPrisma({});
    await assertRejects(
      async () => {
        await getStudentStatementReport(mockPrisma as any, 'missing_student');
      },
      'Student missing_student not found'
    );
  });

  await test('M4-REP-08: Admission Fee Report — tracking first billing cycle admission fee vs student defaults', async () => {
    const mockPrisma = createMockPrisma({
      classes: [{ id: 'cls_6', name: 'Class 6' }],
      students: [
        {
          id: 'stu_1',
          studentCode: 'DPR-2026-010',
          name: 'Ananya Sen',
          admissionDate: new Date('2026-05-01'),
          classId: 'cls_6',
          feeMode: 'DEFAULT',
          admissionFee: 1000,
          status: 'ACTIVE',
        },
        {
          id: 'stu_2',
          studentCode: 'DPR-2026-011',
          name: 'Vikram Das',
          admissionDate: new Date('2026-05-02'),
          classId: 'cls_6',
          feeMode: 'DEFAULT',
          admissionFee: 1000,
          status: 'ACTIVE',
        },
      ],
      feeRecords: [
        // stu_1 billed 1000 admission fee, paid 1000
        {
          id: 'f1',
          studentId: 'stu_1',
          classId: 'cls_6',
          billingPeriodStart: new Date('2026-05-01'),
          admissionFeeAmount: 1000,
          paidAmount: 1600, // 1000 admission + 600 monthly
        },
        // stu_2 billed 1000 admission fee, paid 0
        {
          id: 'f2',
          studentId: 'stu_2',
          classId: 'cls_6',
          billingPeriodStart: new Date('2026-05-02'),
          admissionFeeAmount: 1000,
          paidAmount: 0,
        },
      ],
    });

    const report = await getAdmissionsReport(mockPrisma as any);
    assertEqual(report.rows.length, 2);

    const s1 = report.rows.find((r) => r.studentCode === 'DPR-2026-010')!;
    assertEqual(s1.admissionFeeBilled, 1000);
    assertEqual(s1.admissionFeePaid, 1000);
    assertEqual(s1.outstandingAdmissionFee, 0);

    const s2 = report.rows.find((r) => r.studentCode === 'DPR-2026-011')!;
    assertEqual(s2.admissionFeeBilled, 1000);
    assertEqual(s2.admissionFeePaid, 0);
    assertEqual(s2.outstandingAdmissionFee, 1000);

    assertEqual(report.summary.totalAdmissions, 2);
    assertEqual(report.summary.totalAdmissionFeeBilled, 2000);
    assertEqual(report.summary.totalAdmissionFeePaid, 1000);
    assertEqual(report.summary.outstandingAdmissionFee, 1000);
  });

  await test('M4-REP-09: Discount & Concessions Report — FIXED and PERCENTAGE discounts against DEFAULT and CUSTOM fees', async () => {
    const mockPrisma = createMockPrisma({
      classes: [
        { id: 'cls_8', name: 'Class 8', defaultMonthlyFee: 800 },
        { id: 'cls_10', name: 'Class 10', defaultMonthlyFee: 1200 },
      ],
      students: [
        // S1: Class 8 (₹800), FIXED discount ₹200 => Net ₹600, Annual Concession ₹2400
        {
          id: 's1',
          studentCode: 'DPR-2026-021',
          name: 'Student Fixed',
          classId: 'cls_8',
          feeMode: 'DEFAULT',
          customMonthlyFee: null,
          discountType: 'FIXED',
          discountValue: 200,
        },
        // S2: Class 8 (₹800), PERCENTAGE discount 25% => Net ₹600, Annual Concession ₹2400
        {
          id: 's2',
          studentCode: 'DPR-2026-022',
          name: 'Student Percent',
          classId: 'cls_8',
          feeMode: 'DEFAULT',
          customMonthlyFee: null,
          discountType: 'PERCENTAGE',
          discountValue: 25,
        },
        // S3: CUSTOM fee (₹1500), FIXED discount ₹500 => Net ₹1000, Annual Concession ₹6000
        {
          id: 's3',
          studentCode: 'DPR-2026-023',
          name: 'Student Custom',
          classId: 'cls_10',
          feeMode: 'CUSTOM',
          customMonthlyFee: 1500,
          discountType: 'FIXED',
          discountValue: 500,
        },
        // S4: No discount (should be excluded)
        {
          id: 's4',
          studentCode: 'DPR-2026-024',
          name: 'Student No Discount',
          classId: 'cls_8',
          feeMode: 'DEFAULT',
          customMonthlyFee: null,
          discountType: 'NONE',
          discountValue: 0,
        },
      ],
    });

    const report = await getDiscountReport(mockPrisma as any);
    assertEqual(report.rows.length, 3);

    const r1 = report.rows.find((r) => r.studentCode === 'DPR-2026-021')!;
    assertEqual(r1.monthlyDiscountAmount, 200);
    assertEqual(r1.netMonthlyFee, 600);
    assertEqual(r1.annualConcession, 2400);

    const r2 = report.rows.find((r) => r.studentCode === 'DPR-2026-022')!;
    assertEqual(r2.monthlyDiscountAmount, 200); // 25% of 800 = 200
    assertEqual(r2.netMonthlyFee, 600);
    assertEqual(r2.annualConcession, 2400);

    const r3 = report.rows.find((r) => r.studentCode === 'DPR-2026-023')!;
    assertEqual(r3.monthlyDiscountAmount, 500);
    assertEqual(r3.netMonthlyFee, 1000);
    assertEqual(r3.annualConcession, 6000);

    assertEqual(report.summary.studentsOnDiscount, 3);
    assertEqual(report.summary.totalMonthlyDiscount, 900);
    assertEqual(report.summary.totalAnnualConcession, 10800);
  });

  await test('M4-REP-10: Daily Collection Daybook Register — descending chronological sort & payment totals', async () => {
    const mockPrisma = createMockPrisma({
      classes: [{ id: 'cls_8', name: 'Class 8' }],
      students: [{ id: 'stu_1', studentCode: 'DPR-2026-001', name: 'Aarav Patel', classId: 'cls_8' }],
      feeRecords: [{ id: 'fee_1', billingPeriodStart: new Date('2026-05-01'), billingPeriodEnd: new Date('2026-05-31') }],
      payments: [
        {
          id: 'pay_1',
          receiptNumber: 'DPR-RC-2026-0001',
          paymentDate: new Date('2026-05-10T10:00:00Z'),
          amount: 500,
          paymentMethod: 'CASH',
          transactionId: null,
          studentId: 'stu_1',
          feeRecordId: 'fee_1',
        },
        {
          id: 'pay_2',
          receiptNumber: 'DPR-RC-2026-0002',
          paymentDate: new Date('2026-05-10T14:30:00Z'),
          amount: 1500,
          paymentMethod: 'UPI',
          transactionId: 'UPI-TXN-9988',
          studentId: 'stu_1',
          feeRecordId: 'fee_1',
        },
      ],
    });

    const report = await getDailyCollectionReport(mockPrisma as any);
    assertEqual(report.rows.length, 2);
    assertEqual(report.summary.totalReceipts, 2);
    assertEqual(report.summary.totalCollected, 2000);
    assertEqual(report.summary.cashInHand, 500);
    assertEqual(report.summary.digitalCollections, 1500);
  });

  await test('M4-REP-11: reportQuerySchema Zod validation — query parameter parsing and default values', () => {
    const defaultQuery = reportQuerySchema.parse({});
    assertEqual(defaultQuery.type, 'MONTHLY_COLLECTION');

    const validQuery = reportQuerySchema.parse({
      type: 'DAILY_COLLECTION',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      classId: 'cls_8',
      status: 'PAID',
      paymentMethod: 'UPI',
    });
    assertEqual(validQuery.type, 'DAILY_COLLECTION');
    assertEqual(validQuery.paymentMethod, 'UPI');
    assertEqual(validQuery.status, 'PAID');

    // Invalid report type throws
    assertThrows(() => {
      reportQuerySchema.parse({ type: 'INVALID_REPORT_TYPE' });
    });
  });

  // ============================================================================
  // SECTION 2: RFC 4180 CSV EXPORT INTEGRITY & EXCEL COMPLIANCE
  // ============================================================================

  await test('M4-CSV-01: UTF-8 BOM byte 0 verification — generated CSV starts with \\uFEFF and Buffer bytes 0xEF, 0xBB, 0xBF', () => {
    const data = [{ name: 'Aarav Patel', fee: 800 }];
    const cols: CSVColumn[] = [
      { key: 'name', label: 'Name' },
      { key: 'fee', label: 'Fee' },
    ];

    const csvStr = generateRFC4180CSV(data, cols);
    assertEqual(csvStr.charCodeAt(0), 0xfeff);

    const buf = Buffer.from(csvStr, 'utf8');
    assertEqual(buf[0], 0xef);
    assertEqual(buf[1], 0xbb);
    assertEqual(buf[2], 0xbf);
  });

  await test('M4-CSV-02: Rupee symbol (₹) and Indian Unicode text preservation in CSV buffer', () => {
    const data = [
      { studentName: 'राहुल शर्मा', amount: '₹1,500', city: 'मुंबई' },
      { studentName: 'অরিন্দম রায়', amount: '₹2,000', city: 'কলকাতা' },
      { studentName: 'సురేష్ రెడ్డి', amount: '₹3,500', city: 'హైదరాబాద్' },
    ];
    const cols: CSVColumn[] = [
      { key: 'studentName', label: 'Student Name' },
      { key: 'amount', label: 'Amount' },
      { key: 'city', label: 'City' },
    ];

    const csvStr = generateRFC4180CSV(data, cols);
    assertTrue(csvStr.includes('राहुल शर्मा'));
    assertTrue(csvStr.includes('₹1,500'));
    assertTrue(csvStr.includes('অরিন্দম রায়'));
    assertTrue(csvStr.includes('₹2,000'));
    assertTrue(csvStr.includes('సురేష్ రెడ్డి'));
    assertTrue(csvStr.includes('₹3,500'));

    // Verify UTF-8 buffer roundtrip without corruption
    const buf = Buffer.from(csvStr, 'utf8');
    const decoded = buf.toString('utf8');
    assertEqual(decoded, csvStr);
  });

  await test('M4-CSV-03: RFC 4180 Escaping — fields with commas, quotes, newlines and nulls', () => {
    // 1. Commas
    const commaField = escapeCSVField('Gupta, Amit, Jr.');
    assertEqual(commaField, '"Gupta, Amit, Jr."');

    // 2. Embedded quotes
    const quoteField = escapeCSVField('Flat "4A", Park Street');
    assertEqual(quoteField, '"Flat ""4A"", Park Street"');

    // 3. Newlines
    const newlineField = escapeCSVField('Line 1\nLine 2\r\nLine 3');
    assertEqual(newlineField, '"Line 1\nLine 2\r\nLine 3"');

    // 4. Null & undefined
    assertEqual(escapeCSVField(null), '""');
    assertEqual(escapeCSVField(undefined), '""');

    // 5. Zero and booleans
    assertEqual(escapeCSVField(0), '"0"');
    assertEqual(escapeCSVField(false), '"false"');
  });

  await test('M4-CSV-04: RFC 4180 CSV standard line terminator CRLF (\\r\\n) across multi-row datasets', () => {
    const data = [
      { col1: 'Row 1 Col 1', col2: 'Row 1 Col 2' },
      { col1: 'Row 2 Col 1', col2: 'Row 2 Col 2' },
    ];
    const cols: CSVColumn[] = [
      { key: 'col1', label: 'Col 1' },
      { key: 'col2', label: 'Col 2' },
    ];

    const csv = generateRFC4180CSV(data, cols);
    // Must contain CRLF line breaks
    assertTrue(csv.includes('\r\n'));
    const lines = csv.substring(1).split('\r\n'); // strip BOM
    assertEqual(lines[0], '"Col 1","Col 2"');
    assertEqual(lines[1], '"Row 1 Col 1","Row 1 Col 2"');
    assertEqual(lines[2], '"Row 2 Col 1","Row 2 Col 2"');
    assertEqual(lines[3], ''); // Trailing empty line after final \r\n
  });

  await test('M4-CSV-05: CSVColumn custom formatters execution and empty dataset handling', () => {
    const data = [
      { id: '1', rawDate: new Date('2026-05-15T00:00:00Z'), rawAmount: 1250 },
    ];
    const cols: CSVColumn[] = [
      { key: 'id', label: 'ID' },
      {
        key: 'rawDate',
        label: 'Date',
        formatter: (val) => new Date(val).toISOString().split('T')[0],
      },
      {
        key: 'rawAmount',
        label: 'Formatted Fee',
        formatter: (val) => `₹${Number(val).toLocaleString('en-IN')}`,
      },
    ];

    const csv = generateRFC4180CSV(data, cols);
    assertTrue(csv.includes('"2026-05-15"'));
    assertTrue(csv.includes('"₹1,250"'));

    // Empty dataset produces only headers
    const emptyCsv = generateRFC4180CSV([], cols);
    assertEqual(emptyCsv, '\uFEFF"ID","Date","Formatted Fee"\r\n');
  });

  // ============================================================================
  // SECTION 3: WHATSAPP DEEP LINKING & CLICK-TO-CHAT ENGINE
  // ============================================================================

  await test('M4-WA-01: sanitizeIndianPhone formats 10-digit, +91, 91, and leading zero variants to 91XXXXXXXXXX', () => {
    assertEqual(sanitizeIndianPhone('9876543210'), '919876543210');
    assertEqual(sanitizeIndianPhone('+919876543210'), '919876543210');
    assertEqual(sanitizeIndianPhone('919876543210'), '919876543210');
    assertEqual(sanitizeIndianPhone('09876543210'), '919876543210');
    assertEqual(sanitizeIndianPhone('+91 98765-43210'), '919876543210');
    assertEqual(sanitizeIndianPhone('  +91 (98765) 43210  '), '919876543210');
    assertEqual(sanitizeIndianPhone(null), '');
    assertEqual(sanitizeIndianPhone(undefined), '');
    assertEqual(sanitizeIndianPhone(''), '');
  });

  await test('M4-WA-02: isValidIndianPhone validates legitimate Indian mobile numbers (starts with 6,7,8,9)', () => {
    assertTrue(isValidIndianPhone('9876543210')); // starts with 9
    assertTrue(isValidIndianPhone('+918765432109')); // starts with 8
    assertTrue(isValidIndianPhone('07654321098')); // starts with 7
    assertTrue(isValidIndianPhone('6543210987')); // starts with 6

    // Invalid series (starts with 0-5 in 10-digit mobile)
    assertFalse(isValidIndianPhone('1234567890'));
    assertFalse(isValidIndianPhone('5555555555'));
    assertFalse(isValidIndianPhone('+91 0123456789'));

    // Too short / too long
    assertFalse(isValidIndianPhone('98765'));
    assertFalse(isValidIndianPhone('987654321012345'));
    assertFalse(isValidIndianPhone(''));
    assertFalse(isValidIndianPhone(null));
  });

  await test('M4-WA-03: buildWhatsAppUrl constructs valid wa.me URL with properly encoded body', () => {
    const phone = '9876543210';
    const message = 'Hello DPR! Total Due: ₹800 & Receipt #123.\nClick here: https://dprtuition.vercel.app';
    const url = buildWhatsAppUrl(phone, message);

    assertTrue(url.startsWith('https://wa.me/919876543210?text='));
    assertTrue(url.includes('%E2%82%B9800')); // ₹ URL-encoded
    assertTrue(url.includes('%26')); // & URL-encoded
    assertTrue(url.includes('%23123')); // # URL-encoded
    assertTrue(url.includes('%0A')); // \n URL-encoded
  });

  await test('M4-WA-04: generateFeeReminderMessage renders required reminder structure and tokenized document URL', () => {
    const msg = generateFeeReminderMessage({
      studentName: 'Aarav Patel',
      className: 'Class 8',
      dueAmount: 800,
      dueDateStr: '10 June 2026',
      billingPeriodStr: '01 June 2026 to 30 June 2026',
      documentUrl: 'https://dprtuition.vercel.app/api/documents/550e8400-e29b-41d4-a716-446655440000',
      instituteName: 'DPR Private Tuition',
      contactPhone: '+91 98765 43210',
    });

    assertTrue(msg.includes('Dear Parent/Student,'));
    assertTrue(msg.includes('*Aarav Patel*'));
    assertTrue(msg.includes('Class 8'));
    assertTrue(msg.includes('₹800'));
    assertTrue(msg.includes('10 June 2026'));
    assertTrue(msg.includes('01 June 2026 to 30 June 2026'));
    assertTrue(msg.includes('https://dprtuition.vercel.app/api/documents/550e8400-e29b-41d4-a716-446655440000'));
    assertTrue(msg.includes('DPR Private Tuition'));
  });

  await test('M4-WA-05: generatePaymentReceiptMessage renders receipt details, payment method, and PDF link', () => {
    const msg = generatePaymentReceiptMessage({
      studentName: 'Priya Mukherjee',
      className: 'Class 7',
      paidAmount: 700,
      receiptNumber: 'DPR-RC-2026-0042',
      paymentMethod: 'UPI',
      outstandingAmount: 0,
      documentUrl: 'https://dprtuition.vercel.app/api/documents/6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      instituteName: 'DPR Private Tuition',
    });

    assertTrue(msg.includes('We have received your fee payment'));
    assertTrue(msg.includes('*Priya Mukherjee*'));
    assertTrue(msg.includes('DPR-RC-2026-0042'));
    assertTrue(msg.includes('₹700'));
    assertTrue(msg.includes('Payment Method: UPI'));
    assertTrue(msg.includes('Remaining Balance: *₹0*'));
    assertTrue(msg.includes('https://dprtuition.vercel.app/api/documents/6ba7b810-9dad-11d1-80b4-00c04fd430c8'));
  });

  await test('M4-WA-06: generateOverdueNoticeMessage renders urgent warning, overdue days, and notice link', () => {
    const msg = generateOverdueNoticeMessage({
      studentName: 'Rahul Verma',
      className: 'Class 9',
      overdueAmount: 1600,
      dueDateStr: '05 May 2026',
      overdueDays: 20,
      documentUrl: 'https://dprtuition.vercel.app/api/documents/7c9e6679-7425-40de-944b-e07fc1f90ae7',
    });

    assertTrue(msg.includes('⚠️ *URGENT FEE NOTICE'));
    assertTrue(msg.includes('*Rahul Verma*'));
    assertTrue(msg.includes('₹1,600'));
    assertTrue(msg.includes('05 May 2026'));
    assertTrue(msg.includes('20 days'));
    assertTrue(msg.includes('https://dprtuition.vercel.app/api/documents/7c9e6679-7425-40de-944b-e07fc1f90ae7'));
  });

  // ============================================================================
  // SECTION 4: CROSS-REPORT RECONCILIATION & MATHEMATICAL CONSISTENCY
  // ============================================================================

  await test('M4-SIM-01: End-to-end reconciliation across Daily, Monthly, Payment Method, and Class Revenue reports', async () => {
    const mockPrisma = createMockPrisma({
      classes: [
        { id: 'c1', name: 'Class 5', defaultMonthlyFee: 500 },
        { id: 'c2', name: 'Class 8', defaultMonthlyFee: 800 },
      ],
      students: [
        { id: 's1', studentCode: 'DPR-001', name: 'Student 1', classId: 'c1', status: StudentStatus.ACTIVE },
        { id: 's2', studentCode: 'DPR-002', name: 'Student 2', classId: 'c2', status: StudentStatus.ACTIVE },
      ],
      feeRecords: [
        { id: 'f1', classId: 'c1', studentId: 's1', billingPeriodStart: new Date('2026-05-01'), billingPeriodEnd: new Date('2026-05-31'), totalAmount: 500, paidAmount: 500, outstandingAmount: 0 },
        { id: 'f2', classId: 'c2', studentId: 's2', billingPeriodStart: new Date('2026-05-01'), billingPeriodEnd: new Date('2026-05-31'), totalAmount: 800, paidAmount: 400, outstandingAmount: 400 },
      ],
      payments: [
        { id: 'p1', studentId: 's1', feeRecordId: 'f1', amount: 500, paymentMethod: PaymentMethod.CASH, paymentDate: new Date('2026-05-05T10:00:00Z'), receiptNumber: 'DPR-RC-2026-0001' },
        { id: 'p2', studentId: 's2', feeRecordId: 'f2', amount: 400, paymentMethod: PaymentMethod.UPI, paymentDate: new Date('2026-05-06T11:00:00Z'), receiptNumber: 'DPR-RC-2026-0002' },
      ],
    });

    const [monthlyRep, classRep, payMethodRep, dailyRep] = await Promise.all([
      getMonthlyCollectionReport(mockPrisma as any),
      getClassWiseRevenueReport(mockPrisma as any),
      getPaymentMethodDistributionReport(mockPrisma as any),
      getDailyCollectionReport(mockPrisma as any),
    ]);

    // 1. Total revenue collected must match across all 4 reports:
    const totalCollected = 900;
    assertEqual(monthlyRep.summary.totalCollected, totalCollected);
    assertEqual(classRep.summary.totalCollected, totalCollected);
    assertEqual(payMethodRep.summary.totalAmount, totalCollected);
    assertEqual(dailyRep.summary.totalCollected, totalCollected);

    // 2. Total billed must match across Monthly and Class reports:
    const totalBilled = 1300;
    assertEqual(monthlyRep.summary.totalBilled, totalBilled);
    assertEqual(classRep.summary.totalBilled, totalBilled);

    // 3. Outstanding amount must match across Monthly and Class reports:
    const totalOutstanding = 400;
    assertEqual(monthlyRep.summary.outstandingAmount, totalOutstanding);
    assertEqual(classRep.summary.outstandingAmount, totalOutstanding);

    // 4. Transaction count must match across Monthly, Payment Method, and Daily reports:
    assertEqual(monthlyRep.summary.transactionCount, 2);
    assertEqual(payMethodRep.summary.transactionCount, 2);
    assertEqual(dailyRep.summary.totalReceipts, 2);
  });

  // ============================================================================
  // FINAL SUITE EXECUTION SUMMARY
  // ============================================================================
  console.log('\n--------------------------------------------------------------------------------');
  console.log(`  M4 EMPIRICAL SUITE COMPLETE: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log('--------------------------------------------------------------------------------\n');

  if (failed > 0) {
    throw new Error(`Empirical stress suite failed with ${failed} failure(s) out of ${total} tests.`);
  }
}

// Auto-run if executed directly via tsx
if (require.main === module || process.argv[1]?.includes('07_reports_whatsapp_empirical_stress')) {
  runReportsWhatsAppEmpiricalStressSuite().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

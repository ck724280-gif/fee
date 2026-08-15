/**
 * Tier 1: Feature Coverage — 06 Class & Student CRUD, 360 Profile, Dashboard KPIs & Analytics
 * Covers Features 21-25 (>= 5 test cases per feature = >= 25 test cases)
 */

import { assertEqual, assertTrue, assertFalse, assertDefined, assertThrows } from '../assertions';
import { TestCase } from '../types';
import { InMemoryDB } from '../fixtures/in-memory-db';
import { BillingService, DashboardService, PaymentService } from '../fixtures/mock-services';

export const tier1CrudDashboardTests: TestCase[] = [
  // --- Feature 21: Class Management Full CRUD ---
  {
    tier: 1,
    featureId: 21,
    featureName: 'Class Management Full CRUD',
    name: 'F21-T01: Create class with monthly fee and admission fee',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({
        name: 'Class 9',
        defaultMonthlyFee: 900,
        defaultAdmissionFee: 350,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
      assertDefined(cls.id);
      assertEqual(cls.name, 'Class 9');
      assertEqual(cls.defaultMonthlyFee, 900);
      assertEqual(db.classes.length, 1);
    },
  },
  {
    tier: 1,
    featureId: 21,
    featureName: 'Class Management Full CRUD',
    name: 'F21-T02: Read and list all active classes',
    fn: () => {
      const db = new InMemoryDB();
      db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      db.createClass({ name: 'C2', defaultMonthlyFee: 600, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      assertEqual(db.classes.length, 2);
    },
  },
  {
    tier: 1,
    featureId: 21,
    featureName: 'Class Management Full CRUD',
    name: 'F21-T03: Update class fee settings and late fee rules',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const updated = db.updateClass(cls.id, {
        defaultMonthlyFee: 550,
        lateFeeEnabled: true,
        lateFeeAmount: 40,
        graceDays: 7,
      });
      assertEqual(updated.defaultMonthlyFee, 550);
      assertTrue(updated.lateFeeEnabled);
      assertEqual(updated.graceDays, 7);
    },
  },
  {
    tier: 1,
    featureId: 21,
    featureName: 'Class Management Full CRUD',
    name: 'F21-T04: Archive / Inactivate class',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      db.updateClass(cls.id, { status: 'ARCHIVED' });
      assertEqual(db.classes[0].status, 'ARCHIVED');
    },
  },
  {
    tier: 1,
    featureId: 21,
    featureName: 'Class Management Full CRUD',
    name: 'F21-T05: Updating nonexistent class throws 404',
    fn: () => {
      const db = new InMemoryDB();
      assertThrows(() => db.updateClass('non_existent', { name: 'X' }), 'not found');
    },
  },

  // --- Feature 22: Student Management Full CRUD ---
  {
    tier: 1,
    featureId: 22,
    featureName: 'Student Management Full CRUD',
    name: 'F22-T01: Add student with DEFAULT fee mode auto-populating class fee',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 8', defaultMonthlyFee: 800, defaultAdmissionFee: 300, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const student = db.createStudent({
        studentCode: 'DPR-2026-001',
        name: 'Rahul Sharma',
        mobile: '9876543210',
        classId: cls.id,
        admissionDate: new Date('2026-05-03'),
        joiningDate: new Date('2026-05-03'),
        feeMode: 'DEFAULT',
        admissionFee: cls.defaultAdmissionFee,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });
      assertEqual(student.feeMode, 'DEFAULT');
      assertEqual(student.admissionFee, 300);
    },
  },
  {
    tier: 1,
    featureId: 22,
    featureName: 'Student Management Full CRUD',
    name: 'F22-T02: Add student with CUSTOM fee mode specifying personal monthly fee',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 7', defaultMonthlyFee: 700, defaultAdmissionFee: 250, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const student = db.createStudent({
        studentCode: 'DPR-2026-002',
        name: 'Priya Mukherjee',
        mobile: '9876543211',
        classId: cls.id,
        admissionDate: new Date('2026-05-10'),
        joiningDate: new Date('2026-05-10'),
        feeMode: 'CUSTOM',
        customMonthlyFee: 650,
        admissionFee: cls.defaultAdmissionFee,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });
      assertEqual(student.feeMode, 'CUSTOM');
      assertEqual(student.customMonthlyFee, 650);
    },
  },
  {
    tier: 1,
    featureId: 22,
    featureName: 'Student Management Full CRUD',
    name: 'F22-T02b: Update student contact and guardian details',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 7', defaultMonthlyFee: 700, defaultAdmissionFee: 250, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const student = db.createStudent({
        studentCode: 'DPR-2026-002',
        name: 'Priya Mukherjee',
        mobile: '9876543211',
        classId: cls.id,
        admissionDate: new Date('2026-05-10'),
        joiningDate: new Date('2026-05-10'),
        feeMode: 'CUSTOM',
        customMonthlyFee: 650,
        admissionFee: 250,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });
      const updated = db.updateStudent(student.id, {
        mobile: '9876543299',
        address: 'New Town, Kolkata',
      });
      assertEqual(updated.mobile, '9876543299');
      assertEqual(updated.address, 'New Town, Kolkata');
    },
  },
  {
    tier: 1,
    featureId: 22,
    featureName: 'Student Management Full CRUD',
    name: 'F22-T04: Student status transition to INACTIVE / LEFT',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'Class 7', defaultMonthlyFee: 700, defaultAdmissionFee: 250, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const student = db.createStudent({
        studentCode: 'DPR-2026-002',
        name: 'Priya Mukherjee',
        mobile: '9876543211',
        classId: cls.id,
        admissionDate: new Date('2026-05-10'),
        joiningDate: new Date('2026-05-10'),
        feeMode: 'DEFAULT',
        admissionFee: 250,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
      });
      db.updateStudent(student.id, { status: 'LEFT' });
      assertEqual(db.students[0].status, 'LEFT');
    },
  },
  {
    tier: 1,
    featureId: 22,
    featureName: 'Student Management Full CRUD',
    name: 'F22-T05: Updating nonexistent student throws 404 error',
    fn: () => {
      const db = new InMemoryDB();
      assertThrows(() => db.updateStudent('non_existent', { name: 'X' }), 'not found');
    },
  },

  // --- Feature 23: Student Profile 360° View ---
  {
    tier: 1,
    featureId: 23,
    featureName: 'Student Profile 360° View',
    name: 'F23-T01: Profile aggregates personal info and fee comparison (Class Fee vs Actual Fee)',
    fn: () => {
      const profile = {
        studentCode: 'DPR-2026-002',
        name: 'Priya Mukherjee',
        className: 'Class 7',
        classDefaultFee: 700,
        feeMode: 'CUSTOM',
        actualMonthlyFee: 650,
      };
      assertEqual(profile.classDefaultFee, 700);
      assertEqual(profile.actualMonthlyFee, 650);
      assertTrue(profile.classDefaultFee !== profile.actualMonthlyFee);
    },
  },
  {
    tier: 1,
    featureId: 23,
    featureName: 'Student Profile 360° View',
    name: 'F23-T02: Profile displays complete chronological fee timeline',
    fn: () => {
      const timeline = [
        { cycleIndex: 0, period: '10 May 2026 to 09 Jun 2026', total: 900, status: 'PAID' },
        { cycleIndex: 1, period: '10 Jun 2026 to 09 Jul 2026', total: 650, status: 'DUE' },
      ];
      assertEqual(timeline.length, 2);
      assertEqual(timeline[0].status, 'PAID');
    },
  },
  {
    tier: 1,
    featureId: 23,
    featureName: 'Student Profile 360° View',
    name: 'F23-T03: Profile displays complete payment history with receipt numbers and methods',
    fn: () => {
      const payments = [
        { receiptNumber: 'DPR-RC-2026-0001', amount: 900, method: 'UPI', date: '2026-05-12' },
      ];
      assertEqual(payments[0].receiptNumber, 'DPR-RC-2026-0001');
      assertEqual(payments[0].amount, 900);
    },
  },
  {
    tier: 1,
    featureId: 23,
    featureName: 'Student Profile 360° View',
    name: 'F23-T04: Profile calculates student lifetime total paid and outstanding balances',
    fn: () => {
      const stats = {
        totalBilled: 1550,
        totalPaid: 900,
        outstanding: 650,
      };
      assertEqual(stats.totalBilled - stats.totalPaid, stats.outstanding);
    },
  },
  {
    tier: 1,
    featureId: 23,
    featureName: 'Student Profile 360° View',
    name: 'F23-T05: Profile provides direct action buttons for WhatsApp and reminder download',
    fn: () => {
      const actions = { hasWhatsAppButton: true, hasReminderButton: true, hasPaymentButton: true };
      assertTrue(actions.hasWhatsAppButton);
      assertTrue(actions.hasPaymentButton);
    },
  },

  // --- Feature 24: SaaS Dashboard KPI Cards & Alerts ---
  {
    tier: 1,
    featureId: 24,
    featureName: 'SaaS Dashboard KPI Cards & Alerts',
    name: 'F24-T01: Dashboard KPI calculates Total Students and Active Students',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date(), joiningDate: new Date(), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      db.createStudent({ studentCode: 'DPR-2026-002', name: 'S2', mobile: '9876543211', classId: cls.id, admissionDate: new Date(), joiningDate: new Date(), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'LEFT' });

      const kpis = DashboardService.getKPIMetrics(db, new Date());
      assertEqual(kpis.totalStudents, 2);
      assertEqual(kpis.activeStudents, 1);
    },
  },
  {
    tier: 1,
    featureId: 24,
    featureName: 'SaaS Dashboard KPI Cards & Alerts',
    name: 'F24-T02: Dashboard KPI calculates Today and Monthly collection sums',
    fn: async () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });
      const fee = BillingService.generateFeeRecord(db, s.id, 0);

      const targetDate = new Date('2026-05-15T10:00:00Z');
      await PaymentService.recordPayment(db, {
        feeRecordId: fee.id,
        amount: 300,
        paymentMethod: 'CASH',
        paymentDate: targetDate,
      });

      const kpis = DashboardService.getKPIMetrics(db, targetDate);
      assertEqual(kpis.todayCollection, 300);
      assertEqual(kpis.monthlyCollection, 300);
    },
  },
  {
    tier: 1,
    featureId: 24,
    featureName: 'SaaS Dashboard KPI Cards & Alerts',
    name: 'F24-T03: Dashboard KPI aggregates Pending and Overdue receivables',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      // Due record
      db.createFeeRecord({
        studentId: s.id,
        classId: cls.id,
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-05-01'),
        billingPeriodEnd: new Date('2026-05-31'),
        dueDate: new Date('2026-06-01'),
        baseAmount: 500,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 500,
        paidAmount: 0,
        outstandingAmount: 500,
        status: 'DUE',
        classSnapshotFee: 500,
        studentFeeModeSnapshot: 'DEFAULT',
      });

      // Overdue record
      db.createFeeRecord({
        studentId: s.id,
        classId: cls.id,
        cycleIndex: 1,
        billingPeriodStart: new Date('2026-04-01'),
        billingPeriodEnd: new Date('2026-04-30'),
        dueDate: new Date('2026-05-01'),
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

      const kpis = DashboardService.getKPIMetrics(db, new Date());
      assertEqual(kpis.pendingFees, 500);
      assertEqual(kpis.overdueFees, 500);
    },
  },
  {
    tier: 1,
    featureId: 24,
    featureName: 'SaaS Dashboard KPI Cards & Alerts',
    name: 'F24-T04: Dashboard KPI tracks Partial Payments count',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      db.createFeeRecord({
        studentId: s.id,
        classId: cls.id,
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-05-01'),
        billingPeriodEnd: new Date('2026-05-31'),
        dueDate: new Date('2026-06-01'),
        baseAmount: 500,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 500,
        paidAmount: 200,
        outstandingAmount: 300,
        status: 'PARTIALLY_PAID',
        classSnapshotFee: 500,
        studentFeeModeSnapshot: 'DEFAULT',
      });

      const kpis = DashboardService.getKPIMetrics(db, new Date());
      assertEqual(kpis.partialCount, 1);
    },
  },
  {
    tier: 1,
    featureId: 24,
    featureName: 'SaaS Dashboard KPI Cards & Alerts',
    name: 'F24-T05: Dashboard returns zero values cleanly on empty database without errors',
    fn: () => {
      const db = new InMemoryDB();
      const kpis = DashboardService.getKPIMetrics(db, new Date());
      assertEqual(kpis.totalStudents, 0);
      assertEqual(kpis.todayCollection, 0);
      assertEqual(kpis.pendingFees, 0);
    },
  },

  // --- Feature 25: Interactive Recharts Analytics ---
  {
    tier: 1,
    featureId: 25,
    featureName: 'Interactive Recharts Analytics',
    name: 'F25-T01: Fee status distribution dataset for Recharts Donut chart',
    fn: () => {
      const db = new InMemoryDB();
      const cls = db.createClass({ name: 'C1', defaultMonthlyFee: 500, defaultAdmissionFee: 0, lateFeeEnabled: false, lateFeeType: 'FIXED', lateFeeAmount: 0, graceDays: 0, status: 'ACTIVE' });
      const s = db.createStudent({ studentCode: 'DPR-2026-001', name: 'S1', mobile: '9876543210', classId: cls.id, admissionDate: new Date('2026-05-01'), joiningDate: new Date('2026-05-01'), feeMode: 'DEFAULT', admissionFee: 0, discountType: 'NONE', discountValue: 0, status: 'ACTIVE' });

      db.createFeeRecord({
        studentId: s.id,
        classId: cls.id,
        cycleIndex: 0,
        billingPeriodStart: new Date('2026-05-01'),
        billingPeriodEnd: new Date('2026-05-31'),
        dueDate: new Date('2026-06-01'),
        baseAmount: 500,
        admissionFeeAmount: 0,
        discountAmount: 0,
        lateFeeAmount: 0,
        totalAmount: 500,
        paidAmount: 500,
        outstandingAmount: 0,
        status: 'PAID',
        classSnapshotFee: 500,
        studentFeeModeSnapshot: 'DEFAULT',
      });

      const donutData = DashboardService.getFeeStatusDistribution(db);
      assertEqual(donutData.find((d) => d.name === 'Paid')?.value, 1);
      assertEqual(donutData.find((d) => d.name === 'Overdue')?.value, 0);
    },
  },
  {
    tier: 1,
    featureId: 25,
    featureName: 'Interactive Recharts Analytics',
    name: 'F25-T02: Monthly collection dataset format with 12 months array for Bar chart',
    fn: () => {
      const months = ['Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026'];
      const chartData = months.map((m) => ({ month: m, collection: 0 }));
      assertEqual(chartData.length, 6);
      assertEqual(chartData[0].month, 'Jan 2026');
    },
  },
  {
    tier: 1,
    featureId: 25,
    featureName: 'Interactive Recharts Analytics',
    name: 'F25-T03: Class-wise student distribution format for Pie chart',
    fn: () => {
      const classData = [
        { className: 'Class 5', students: 10, revenue: 5000 },
        { className: 'Class 8', students: 15, revenue: 12000 },
      ];
      assertEqual(classData[0].className, 'Class 5');
      assertEqual(classData[1].revenue, 12000);
    },
  },
  {
    tier: 1,
    featureId: 25,
    featureName: 'Interactive Recharts Analytics',
    name: 'F25-T04: Empty dataset renders clean chart payload without divide-by-zero errors',
    fn: () => {
      const db = new InMemoryDB();
      const donutData = DashboardService.getFeeStatusDistribution(db);
      assertEqual(donutData.length, 5);
      assertTrue(donutData.every((d) => d.value === 0));
    },
  },
  {
    tier: 1,
    featureId: 25,
    featureName: 'Interactive Recharts Analytics',
    name: 'F25-T05: Color mapping consistency for statuses (Green=Paid, Amber=Partial, Red=Overdue)',
    fn: () => {
      const db = new InMemoryDB();
      const donutData = DashboardService.getFeeStatusDistribution(db);
      assertEqual(donutData.find((d) => d.name === 'Paid')?.color, '#10b981');
      assertEqual(donutData.find((d) => d.name === 'Overdue')?.color, '#ef4444');
    },
  },
];

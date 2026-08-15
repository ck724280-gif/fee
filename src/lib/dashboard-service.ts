import { PrismaClient, FeeStatus, StudentStatus } from '@prisma/client';
import prisma from './prisma';
import { formatYMD, startOfDay } from './billing-engine';
import { buildWhatsAppUrl, generateOverdueNoticeMessage } from './whatsapp';

export interface DashboardKPIData {
  totalStudents: number;
  activeStudents: number;
  todayCollection: number;
  monthlyCollection: number;
  pendingFees: number;
  overdueFees: number;
  partialCount: number;
  newAdmissions: number;
}

export interface FeeStatusDonutItem {
  name: string;
  value: number;
  amount: number;
  color: string;
}

export interface MonthlyTrendItem {
  month: string;
  collection: number;
  billed: number;
}

export interface ClassDistributionItem {
  className: string;
  studentCount: number;
  monthlyFee: number;
  revenue: number;
}

export interface UrgentOverdueItem {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  className: string;
  outstandingAmount: number;
  dueDate: string;
  overdueDays: number;
  mobile: string;
  whatsappUrl?: string;
}

export interface RecentPaymentItem {
  id: string;
  receiptNumber: string;
  studentName: string;
  studentCode: string;
  className: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  documentToken?: string;
}

export async function getDashboardStats(
  prismaClient: PrismaClient | any = prisma,
  currentDateInput?: Date | string
) {
  const now = startOfDay(currentDateInput ? new Date(currentDateInput) : new Date());
  const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

  // 1. Fetch KPI aggregates in parallel
  const [
    totalStudents,
    activeStudents,
    todayPaymentsAgg,
    monthlyPaymentsAgg,
    pendingFeesAgg,
    overdueFeesAgg,
    partialCount,
    newAdmissions,
    allFeeRecords,
    allClasses,
    recentPaymentsRaw,
    urgentOverdueRaw,
    allPayments,
  ] = await Promise.all([
    prismaClient.student.count(),
    prismaClient.student.count({ where: { status: StudentStatus.ACTIVE } }),
    prismaClient.payment.aggregate({
      where: {
        paymentDate: {
          gte: now,
          lt: nextDay,
        },
      },
      _sum: { amount: true },
    }),
    prismaClient.payment.aggregate({
      where: {
        paymentDate: {
          gte: currentMonthStart,
          lt: nextMonthStart,
        },
      },
      _sum: { amount: true },
    }),
    prismaClient.feeRecord.aggregate({
      where: {
        status: { in: [FeeStatus.DUE, FeeStatus.PARTIALLY_PAID] },
      },
      _sum: { outstandingAmount: true },
    }),
    prismaClient.feeRecord.aggregate({
      where: {
        status: FeeStatus.OVERDUE,
      },
      _sum: { outstandingAmount: true },
    }),
    prismaClient.feeRecord.count({
      where: { status: FeeStatus.PARTIALLY_PAID },
    }),
    prismaClient.student.count({
      where: {
        admissionDate: {
          gte: currentMonthStart,
          lt: nextMonthStart,
        },
      },
    }),
    prismaClient.feeRecord.findMany({
      select: {
        id: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        outstandingAmount: true,
        billingPeriodStart: true,
      },
    }),
    prismaClient.class.findMany({
      include: {
        students: {
          where: { status: StudentStatus.ACTIVE },
        },
        feeRecords: true,
      },
      orderBy: { name: 'asc' },
    }),
    prismaClient.payment.findMany({
      take: 8,
      orderBy: { paymentDate: 'desc' },
      include: {
        student: {
          include: { class: true },
        },
      },
    }),
    prismaClient.feeRecord.findMany({
      where: {
        status: FeeStatus.OVERDUE,
        outstandingAmount: { gt: 0 },
      },
      take: 6,
      orderBy: { dueDate: 'asc' },
      include: {
        student: true,
        class: true,
      },
    }),
    prismaClient.payment.findMany({
      select: {
        amount: true,
        paymentDate: true,
      },
    }),
  ]);

  const kpis: DashboardKPIData = {
    totalStudents,
    activeStudents,
    todayCollection: todayPaymentsAgg._sum.amount || 0,
    monthlyCollection: monthlyPaymentsAgg._sum.amount || 0,
    pendingFees: pendingFeesAgg._sum.outstandingAmount || 0,
    overdueFees: overdueFeesAgg._sum.outstandingAmount || 0,
    partialCount,
    newAdmissions,
  };

  // 2. Compute Fee Status Distribution for Donut Chart
  const statusCountMap: Record<string, { count: number; amount: number }> = {
    PAID: { count: 0, amount: 0 },
    PARTIALLY_PAID: { count: 0, amount: 0 },
    DUE: { count: 0, amount: 0 },
    OVERDUE: { count: 0, amount: 0 },
    UPCOMING: { count: 0, amount: 0 },
  };

  allFeeRecords.forEach((f: any) => {
    const st = f.status as string;
    if (statusCountMap[st]) {
      statusCountMap[st].count += 1;
      statusCountMap[st].amount += f.outstandingAmount || f.totalAmount;
    }
  });

  const feeStatusDistribution: FeeStatusDonutItem[] = [
    { name: 'Paid', value: statusCountMap.PAID.count, amount: statusCountMap.PAID.amount, color: '#10b981' },
    { name: 'Partial', value: statusCountMap.PARTIALLY_PAID.count, amount: statusCountMap.PARTIALLY_PAID.amount, color: '#f59e0b' },
    { name: 'Due', value: statusCountMap.DUE.count, amount: statusCountMap.DUE.amount, color: '#3b82f6' },
    { name: 'Overdue', value: statusCountMap.OVERDUE.count, amount: statusCountMap.OVERDUE.amount, color: '#ef4444' },
    { name: 'Upcoming', value: statusCountMap.UPCOMING.count, amount: statusCountMap.UPCOMING.amount, color: '#8b5cf6' },
  ];

  // 3. Compute 12-Month Collection Trend
  const monthlyTrend: MonthlyTrendItem[] = [];
  for (let i = 11; i >= 0; i--) {
    const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mYear = targetMonthDate.getFullYear();
    const mMonth = targetMonthDate.getMonth();
    const mStart = new Date(mYear, mMonth, 1, 0, 0, 0, 0);
    const mEnd = new Date(mYear, mMonth + 1, 1, 0, 0, 0, 0);

    const monthLabel = targetMonthDate.toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });

    let collectedInMonth = 0;
    allPayments.forEach((p: any) => {
      const pTime = new Date(p.paymentDate).getTime();
      if (pTime >= mStart.getTime() && pTime < mEnd.getTime()) {
        collectedInMonth += p.amount;
      }
    });

    let billedInMonth = 0;
    allFeeRecords.forEach((f: any) => {
      const fTime = new Date(f.billingPeriodStart).getTime();
      if (fTime >= mStart.getTime() && fTime < mEnd.getTime()) {
        billedInMonth += f.totalAmount;
      }
    });

    monthlyTrend.push({
      month: monthLabel,
      collection: collectedInMonth,
      billed: billedInMonth,
    });
  }

  // 4. Compute Class Distribution
  const classDistribution: ClassDistributionItem[] = allClasses.map((c: any) => {
    let revenue = 0;
    c.feeRecords.forEach((f: any) => {
      revenue += f.paidAmount;
    });

    return {
      className: c.name,
      studentCount: c.students.length,
      monthlyFee: c.defaultMonthlyFee,
      revenue,
    };
  });

  // 5. Urgent Overdue Accounts
  const urgentOverdueList: UrgentOverdueItem[] = urgentOverdueRaw.map((f: any) => {
    const due = startOfDay(f.dueDate);
    const diffTime = now.getTime() - due.getTime();
    const overdueDays = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
    const dueStr = formatYMD(new Date(f.dueDate));

    const phone = f.student.whatsappNumber || f.student.mobile;
    const msg = generateOverdueNoticeMessage({
      studentName: f.student.name,
      className: f.class.name,
      overdueAmount: f.outstandingAmount,
      dueDateStr: dueStr,
      overdueDays,
      documentUrl: `https://dprtuition.vercel.app/fees`,
    });
    const whatsappUrl = phone ? buildWhatsAppUrl(phone, msg) : undefined;

    return {
      id: f.id,
      studentId: f.student.id,
      studentName: f.student.name,
      studentCode: f.student.studentCode,
      className: f.class.name,
      outstandingAmount: f.outstandingAmount,
      dueDate: dueStr,
      overdueDays,
      mobile: f.student.mobile,
      whatsappUrl,
    };
  });

  // 6. Recent Payments List
  const recentPayments: RecentPaymentItem[] = recentPaymentsRaw.map((p: any) => {
    return {
      id: p.id,
      receiptNumber: p.receiptNumber,
      studentName: p.student?.name || 'Unknown',
      studentCode: p.student?.studentCode || 'N/A',
      className: p.student?.class?.name || 'N/A',
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paymentDate: formatYMD(new Date(p.paymentDate)),
    };
  });

  return {
    kpis,
    charts: {
      feeStatusDistribution,
      monthlyCollectionTrend: monthlyTrend,
      classDistribution,
    },
    urgentOverdueList,
    recentPayments,
  };
}

export const DashboardService = {
  getDashboardStats,
};

export default DashboardService;

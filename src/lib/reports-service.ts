import { PrismaClient, Prisma, FeeStatus, PaymentMethod } from '@prisma/client';
import prisma from './prisma';
import { formatYMD, startOfDay } from './billing-engine';
import { buildWhatsAppUrl, generateOverdueNoticeMessage } from './whatsapp';

const DEFAULT_ORG_ID = 'e0000000-0000-4000-a000-000000000001';

export interface ReportFilterOptions {
  startDate?: string;
  endDate?: string;
  classId?: string;
  studentId?: string;
  status?: FeeStatus;
  paymentMethod?: PaymentMethod;
  search?: string;
  currentDate?: string;
}

export interface MonthlyCollectionRow {
  monthKey: string;
  monthLabel: string;
  totalBilled: number;
  totalCollected: number;
  outstandingAmount: number;
  collectionRate: number;
  transactionCount: number;
}

export interface OverdueFeeRow {
  feeRecordId: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  fatherName: string;
  mobile: string;
  whatsappNumber: string | null;
  className: string;
  billingPeriod: string;
  dueDate: string;
  overdueDays: number;
  baseFee: number;
  lateFee: number;
  paidAmount: number;
  outstandingAmount: number;
  status: FeeStatus;
  whatsappUrl?: string;
}

export interface ClassWiseRevenueRow {
  classId: string;
  className: string;
  totalStudents: number;
  activeStudents: number;
  defaultMonthlyFee: number;
  totalBilled: number;
  totalCollected: number;
  outstandingAmount: number;
  collectionRate: number;
}

export interface PaymentMethodRow {
  paymentMethod: PaymentMethod | string;
  methodLabel: string;
  transactionCount: number;
  totalAmount: number;
  percentageShare: number;
  averageTransaction: number;
}

export interface StudentStatementRow {
  id: string;
  date: string;
  transactionType: 'FEE_INVOICE' | 'PAYMENT_RECEIPT';
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  paymentMethod?: string;
  status: string;
}

export interface AdmissionFeeRow {
  studentId: string;
  studentCode: string;
  studentName: string;
  admissionDate: string;
  className: string;
  feeMode: string;
  admissionFeeBilled: number;
  admissionFeePaid: number;
  outstandingAdmissionFee: number;
  status: string;
}

export interface DiscountRow {
  studentId: string;
  studentCode: string;
  studentName: string;
  className: string;
  classDefaultFee: number;
  feeMode: string;
  discountType: string;
  discountValue: number;
  monthlyDiscountAmount: number;
  netMonthlyFee: number;
  annualConcession: number;
}

export interface DailyCollectionRow {
  paymentId: string;
  paymentDate: string;
  receiptNumber: string;
  studentCode: string;
  studentName: string;
  className: string;
  paymentMethod: string;
  transactionId: string | null;
  amount: number;
  recordedBy: string;
  feePeriod: string;
}

function parseOrgAndFilters(
  orgOrFilters?: string | ReportFilterOptions,
  maybeFilters?: ReportFilterOptions
): { organizationId: string; filters: ReportFilterOptions } {
  let organizationId = DEFAULT_ORG_ID;
  let filters: ReportFilterOptions = {};

  if (typeof orgOrFilters === 'string') {
    organizationId = orgOrFilters;
    if (maybeFilters) filters = maybeFilters;
  } else if (typeof orgOrFilters === 'object' && orgOrFilters !== null) {
    filters = orgOrFilters;
  }

  return { organizationId, filters };
}

/**
 * 1. Monthly Collection Report
 */
export async function getMonthlyCollectionReport(
  prismaClient: PrismaClient | any = prisma,
  organizationIdOrFilters?: string | ReportFilterOptions,
  maybeFilters?: ReportFilterOptions
) {
  const { organizationId, filters } = parseOrgAndFilters(organizationIdOrFilters, maybeFilters);

  const feeWhere: Prisma.FeeRecordWhereInput = { organizationId };
  const payWhere: Prisma.PaymentWhereInput = { organizationId };

  if (filters.classId) {
    feeWhere.classId = filters.classId;
    payWhere.student = { classId: filters.classId };
  }

  const [feeRecords, payments] = await Promise.all([
    prismaClient.feeRecord.findMany({
      where: feeWhere,
      select: {
        billingPeriodStart: true,
        totalAmount: true,
        paidAmount: true,
        outstandingAmount: true,
      },
    }),
    prismaClient.payment.findMany({
      where: payWhere,
      select: {
        paymentDate: true,
        amount: true,
      },
    }),
  ]);

  const monthMap: Record<string, { billed: number; collected: number; txCount: number }> = {};

  feeRecords.forEach((f: any) => {
    const d = new Date(f.billingPeriodStart);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) {
      monthMap[key] = { billed: 0, collected: 0, txCount: 0 };
    }
    monthMap[key].billed += f.totalAmount;
  });

  payments.forEach((p: any) => {
    const d = new Date(p.paymentDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap[key]) {
      monthMap[key] = { billed: 0, collected: 0, txCount: 0 };
    }
    monthMap[key].collected += p.amount;
    monthMap[key].txCount += 1;
  });

  const sortedKeys = Object.keys(monthMap).sort();
  const rows: MonthlyCollectionRow[] = sortedKeys.map((key) => {
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const dateObj = new Date(year, month, 1);
    const monthLabel = dateObj.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

    const item = monthMap[key];
    const outstanding = Math.max(0, item.billed - item.collected);
    const rate = item.billed > 0 ? Number(((item.collected / item.billed) * 100).toFixed(1)) : 0;

    return {
      monthKey: key,
      monthLabel,
      totalBilled: item.billed,
      totalCollected: item.collected,
      outstandingAmount: outstanding,
      collectionRate: rate,
      transactionCount: item.txCount,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.totalBilled += r.totalBilled;
      acc.totalCollected += r.totalCollected;
      acc.outstandingAmount += r.outstandingAmount;
      acc.transactionCount += r.transactionCount;
      return acc;
    },
    { totalBilled: 0, totalCollected: 0, outstandingAmount: 0, transactionCount: 0 }
  );

  const overallCollectionRate =
    totals.totalBilled > 0
      ? Number(((totals.totalCollected / totals.totalBilled) * 100).toFixed(1))
      : 0;

  return {
    rows,
    summary: {
      ...totals,
      collectionRate: overallCollectionRate,
    },
  };
}

/**
 * 2. Overdue / Defaulters Report
 */
export async function getOverdueFeesReport(
  prismaClient: PrismaClient | any = prisma,
  organizationIdOrFilters?: string | ReportFilterOptions,
  maybeFilters?: ReportFilterOptions
) {
  const { organizationId, filters } = parseOrgAndFilters(organizationIdOrFilters, maybeFilters);

  const now = startOfDay(filters.currentDate ? new Date(filters.currentDate) : new Date());

  const where: Prisma.FeeRecordWhereInput = {
    organizationId,
    status: { in: [FeeStatus.OVERDUE, FeeStatus.DUE] },
    outstandingAmount: { gt: 0 },
  };

  if (filters.classId) {
    where.classId = filters.classId;
  }
  if (filters.studentId) {
    where.studentId = filters.studentId;
  }

  const [feeRecords, settings, org] = await Promise.all([
    prismaClient.feeRecord.findMany({
      where,
      include: {
        student: {
          include: {
            class: true,
          },
        },
        class: true,
      },
      orderBy: { dueDate: 'asc' },
    }),
    typeof prismaClient?.organizationSetting?.findUnique === 'function'
      ? prismaClient.organizationSetting.findUnique({ where: { organizationId } }).catch(() => null)
      : null,
    typeof prismaClient?.organization?.findUnique === 'function'
      ? prismaClient.organization.findUnique({ where: { id: organizationId } }).catch(() => null)
      : null,
  ]);

  const origin = process.env.NEXT_PUBLIC_APP_URL || '';
  const instituteName = settings?.instituteName || org?.name || 'Education Institute';

  let totalLateFees = 0;

  const rows: OverdueFeeRow[] = feeRecords.map((f: any) => {
    const dueDateObj = startOfDay(f.dueDate);
    const diffMs = now.getTime() - dueDateObj.getTime();
    const overdueDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    const startStr = formatYMD(new Date(f.billingPeriodStart));
    const endStr = formatYMD(new Date(f.billingPeriodEnd));
    const dueStr = formatYMD(new Date(f.dueDate));

    totalLateFees += f.lateFeeAmount || 0;

    const phone = f.student.whatsappNumber || f.student.mobile;
    const noticeMsg = generateOverdueNoticeMessage({
      studentName: f.student.name,
      className: f.student.class?.name || f.class?.name || 'Class',
      outstandingAmount: f.outstandingAmount,
      overdueDays,
      dueDateStr: dueStr,
      documentUrl: origin ? `${origin}/fees/${f.id}` : `/fees/${f.id}`,
      instituteName,
      contactPhone: settings?.phone || settings?.whatsapp || '',
    });

    const whatsappUrl = phone ? buildWhatsAppUrl(phone, noticeMsg) : undefined;

    return {
      feeRecordId: f.id,
      studentId: f.studentId,
      studentCode: f.student.studentCode,
      studentName: f.student.name,
      fatherName: f.student.fatherName,
      mobile: f.student.mobile,
      whatsappNumber: f.student.whatsappNumber,
      className: f.student.class?.name || f.class?.name || 'N/A',
      billingPeriod: `${startStr} to ${endStr}`,
      dueDate: dueStr,
      overdueDays,
      baseFee: f.baseAmount,
      lateFee: f.lateFeeAmount,
      paidAmount: f.paidAmount,
      outstandingAmount: f.outstandingAmount,
      status: f.status,
      whatsappUrl,
    };
  });

  const summary = rows.reduce(
    (acc, r) => {
      acc.totalDefaulters += 1;
      acc.totalOverdueStudents += 1;
      acc.totalOverdueAmount += r.outstandingAmount;
      acc.totalOutstanding += r.outstandingAmount;
      if (r.overdueDays > acc.maxOverdueDays) {
        acc.maxOverdueDays = r.overdueDays;
      }
      return acc;
    },
    {
      totalDefaulters: 0,
      totalOverdueStudents: 0,
      totalOverdueAmount: 0,
      totalOutstanding: 0,
      totalLateFees,
      maxOverdueDays: 0,
    }
  );

  return { rows, summary };
}

/**
 * 3. Class-Wise Revenue Summary
 */
export async function getClassWiseRevenueReport(
  prismaClient: PrismaClient | any = prisma,
  organizationIdOrFilters?: string | ReportFilterOptions,
  maybeFilters?: ReportFilterOptions
) {
  const { organizationId, filters } = parseOrgAndFilters(organizationIdOrFilters, maybeFilters);

  const classWhere: Prisma.ClassWhereInput = { organizationId };
  if (filters.classId) {
    classWhere.id = filters.classId;
  }

  const [classes, students, feeRecords] = await Promise.all([
    prismaClient.class.findMany({
      where: classWhere,
      orderBy: { name: 'asc' },
    }),
    prismaClient.student.findMany({
      where: { organizationId },
      select: { id: true, classId: true, status: true },
    }),
    prismaClient.feeRecord.findMany({
      where: {
        organizationId,
        ...(filters.classId ? { classId: filters.classId } : {}),
        ...(filters.startDate || filters.endDate
          ? {
              billingPeriodStart: {
                ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
                ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
              },
            }
          : {}),
      },
      select: {
        classId: true,
        totalAmount: true,
        paidAmount: true,
        outstandingAmount: true,
      },
    }),
  ]);

  const rows: ClassWiseRevenueRow[] = classes.map((cls: any) => {
    const classStudents = students.filter((s: any) => s.classId === cls.id);
    const activeCount = classStudents.filter((s: any) => s.status === 'ACTIVE').length;

    const classFees = feeRecords.filter((f: any) => f.classId === cls.id);
    const totalBilled = classFees.reduce((sum: number, f: any) => sum + (f.totalAmount || 0), 0);
    const totalCollected = classFees.reduce((sum: number, f: any) => sum + (f.paidAmount || 0), 0);
    const outstandingAmount = classFees.reduce(
      (sum: number, f: any) => sum + (f.outstandingAmount || 0),
      0
    );
    const collectionRate =
      totalBilled > 0 ? Number(((totalCollected / totalBilled) * 100).toFixed(1)) : 0;

    return {
      classId: cls.id,
      className: cls.name,
      totalStudents: classStudents.length,
      activeStudents: activeCount,
      totalBilled,
      totalCollected,
      outstandingAmount,
      collectionRate,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.totalStudents += r.totalStudents;
      acc.activeStudents += r.activeStudents;
      acc.totalBilled += r.totalBilled;
      acc.totalCollected += r.totalCollected;
      acc.outstandingAmount += r.outstandingAmount;
      return acc;
    },
    { totalStudents: 0, activeStudents: 0, totalBilled: 0, totalCollected: 0, outstandingAmount: 0 }
  );

  const overallCollectionRate =
    totals.totalBilled > 0
      ? Number(((totals.totalCollected / totals.totalBilled) * 100).toFixed(1))
      : 0;

  return {
    rows,
    summary: {
      ...totals,
      collectionRate: overallCollectionRate,
    },
  };
}

/**
 * 4. Payment Method Distribution
 */
export async function getPaymentMethodDistributionReport(
  prismaClient: PrismaClient | any = prisma,
  organizationIdOrFilters?: string | ReportFilterOptions,
  maybeFilters?: ReportFilterOptions
) {
  const { organizationId, filters } = parseOrgAndFilters(organizationIdOrFilters, maybeFilters);

  const where: Prisma.PaymentWhereInput = { organizationId };

  if (filters.startDate || filters.endDate) {
    where.paymentDate = {};
    if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
    if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
  }

  const payments = await prismaClient.payment.findMany({
    where,
    select: {
      paymentMethod: true,
      amount: true,
    },
  });

  const methodMap: Record<string, { count: number; total: number }> = {
    CASH: { count: 0, total: 0 },
    UPI: { count: 0, total: 0 },
    BANK_TRANSFER: { count: 0, total: 0 },
    CARD: { count: 0, total: 0 },
    CHEQUE: { count: 0, total: 0 },
    OTHER: { count: 0, total: 0 },
  };

  let grandTotal = 0;
  let totalTransactions = 0;
  let cashTotal = 0;
  let digitalTotal = 0;

  payments.forEach((p: any) => {
    const m = p.paymentMethod || 'OTHER';
    if (!methodMap[m]) {
      methodMap[m] = { count: 0, total: 0 };
    }
    methodMap[m].count += 1;
    methodMap[m].total += p.amount;
    grandTotal += p.amount;
    totalTransactions += 1;

    if (m === 'CASH') {
      cashTotal += p.amount;
    } else {
      digitalTotal += p.amount;
    }
  });

  const methodLabels: Record<string, string> = {
    CASH: 'Cash Payments',
    UPI: 'UPI / QR Code',
    BANK_TRANSFER: 'Bank Transfer / NEFT / IMPS',
    CARD: 'Credit / Debit Card',
    CHEQUE: 'Cheque Payment',
    OTHER: 'Other / Custom Methods',
  };

  const rows: PaymentMethodRow[] = Object.entries(methodMap)
    .filter(([_, data]) => data.count > 0)
    .map(([method, data]) => {
      const share = grandTotal > 0 ? Number(((data.total / grandTotal) * 100).toFixed(1)) : 0;
      const avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
      return {
        paymentMethod: method,
        methodLabel: methodLabels[method] || method,
        transactionCount: data.count,
        totalAmount: data.total,
        percentageShare: share,
        averageTransaction: avg,
      };
    });

  const cashShare = grandTotal > 0 ? Number(((cashTotal / grandTotal) * 100).toFixed(1)) : 0;
  const digitalShare = grandTotal > 0 ? Number(((digitalTotal / grandTotal) * 100).toFixed(1)) : 0;

  return {
    rows,
    summary: {
      totalTransactions,
      transactionCount: totalTransactions,
      grandTotal,
      totalAmount: grandTotal,
      cashShare: cashTotal,
      digitalShare: digitalTotal,
      cashTotal,
      digitalTotal,
      cashPercentage: cashShare,
      digitalPercentage: digitalShare,
    },
  };
}

/**
 * 5. Student Ledger Statement Report
 */
export async function getStudentStatementReport(
  prismaClient: PrismaClient | any = prisma,
  studentId: string,
  organizationIdOrFilters?: string | ReportFilterOptions,
  maybeFilters?: ReportFilterOptions
) {
  const { organizationId } = parseOrgAndFilters(organizationIdOrFilters, maybeFilters);

  let student: any = null;
  if (typeof prismaClient?.student?.findUnique === 'function') {
    try {
      student = await prismaClient.student.findUnique({
        where: { id: studentId },
        include: { class: true },
      });
    } catch {}
  }
  if (!student && typeof prismaClient?.student?.findFirst === 'function') {
    try {
      student = await prismaClient.student.findFirst({
        where: {
          id: studentId,
          ...(organizationId ? { organizationId } : {}),
        },
        include: { class: true },
      });
    } catch {}
  }

  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }

  const orgId = organizationId || student.organizationId || DEFAULT_ORG_ID;

  const [feeRecords, payments] = await Promise.all([
    prismaClient.feeRecord.findMany({
      where: { studentId: student.id, organizationId: orgId },
      orderBy: { billingPeriodStart: 'asc' },
    }),
    prismaClient.payment.findMany({
      where: { studentId: student.id, organizationId: orgId },
      orderBy: { paymentDate: 'asc' },
    }),
  ]);

  interface LedgerEvent {
    id: string;
    date: Date;
    type: 'FEE_INVOICE' | 'PAYMENT_RECEIPT';
    referenceNumber: string;
    description: string;
    debit: number;
    credit: number;
    paymentMethod?: string;
    status: string;
  }

  const events: LedgerEvent[] = [];

  feeRecords.forEach((f: any, idx: number) => {
    const startStr = formatYMD(new Date(f.billingPeriodStart));
    const endStr = formatYMD(new Date(f.billingPeriodEnd));
    events.push({
      id: f.id,
      date: new Date(f.billingPeriodStart),
      type: 'FEE_INVOICE',
      referenceNumber: `Cycle ${idx + 1}`,
      description: `Fee Cycle (${startStr} to ${endStr})`,
      debit: f.totalAmount,
      credit: 0,
      status: f.status,
    });
  });

  payments.forEach((p: any) => {
    events.push({
      id: p.id,
      date: new Date(p.paymentDate),
      type: 'PAYMENT_RECEIPT',
      referenceNumber: p.receiptNumber,
      description: `Fee Payment via ${p.paymentMethod}`,
      debit: 0,
      credit: p.amount,
      paymentMethod: p.paymentMethod,
      status: 'PAID',
    });
  });

  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  let runningBalance = 0;
  const rows: StudentStatementRow[] = events.map((ev) => {
    runningBalance += ev.debit - ev.credit;
    return {
      id: ev.id,
      date: formatYMD(ev.date),
      transactionType: ev.type,
      referenceNumber: ev.referenceNumber,
      description: ev.description,
      debit: ev.debit,
      credit: ev.credit,
      runningBalance,
      paymentMethod: ev.paymentMethod,
      status: ev.status,
    };
  });

  const totalBilled = events.reduce((sum, e) => sum + e.debit, 0);
  const totalPaid = events.reduce((sum, e) => sum + e.credit, 0);

  return {
    student: {
      id: student.id,
      studentCode: student.studentCode,
      name: student.name,
      fatherName: student.fatherName,
      className: student.class.name,
      mobile: student.mobile,
      feeMode: student.feeMode,
    },
    rows,
    summary: {
      totalBilled,
      totalPaid,
      netBalanceDue: runningBalance,
    },
  };
}

/**
 * 6. Admission Fee Report
 */
export async function getAdmissionsReport(
  prismaClient: PrismaClient | any = prisma,
  organizationIdOrFilters?: string | ReportFilterOptions,
  maybeFilters?: ReportFilterOptions
) {
  const { organizationId, filters } = parseOrgAndFilters(organizationIdOrFilters, maybeFilters);

  const where: Prisma.StudentWhereInput = { organizationId };
  if (filters.classId) where.classId = filters.classId;
  if (filters.status) where.status = filters.status as any;

  const students = await prismaClient.student.findMany({
    where,
    include: {
      class: true,
      feeRecords: {
        orderBy: { billingPeriodStart: 'asc' },
        take: 1,
      },
    },
    orderBy: { admissionDate: 'desc' },
  });

  const rows: AdmissionFeeRow[] = students.map((s: any) => {
    const firstCycle = s.feeRecords[0];
    const admissionFeeBilled = firstCycle ? firstCycle.admissionFeeAmount : s.admissionFee;
    const admissionFeePaid = firstCycle && firstCycle.paidAmount > 0
      ? Math.min(firstCycle.paidAmount, admissionFeeBilled)
      : 0;
    const outstandingAdmissionFee = Math.max(0, admissionFeeBilled - admissionFeePaid);

    return {
      studentId: s.id,
      studentCode: s.studentCode,
      studentName: s.name,
      admissionDate: formatYMD(new Date(s.admissionDate)),
      className: s.class.name,
      feeMode: s.feeMode,
      admissionFeeBilled,
      admissionFeePaid,
      outstandingAdmissionFee,
      status: s.status,
    };
  });

  const summary = rows.reduce(
    (acc, r) => {
      acc.totalAdmissions += 1;
      acc.totalAdmissionFeeBilled += r.admissionFeeBilled;
      acc.totalAdmissionFeePaid += r.admissionFeePaid;
      acc.outstandingAdmissionFee += r.outstandingAdmissionFee;
      return acc;
    },
    {
      totalAdmissions: 0,
      totalAdmissionFeeBilled: 0,
      totalAdmissionFeePaid: 0,
      outstandingAdmissionFee: 0,
    }
  );

  return { rows, summary };
}

/**
 * 7. Discount & Concessions Report
 */
export async function getDiscountReport(
  prismaClient: PrismaClient | any = prisma,
  organizationIdOrFilters?: string | ReportFilterOptions,
  maybeFilters?: ReportFilterOptions
) {
  const { organizationId, filters } = parseOrgAndFilters(organizationIdOrFilters, maybeFilters);

  const where: Prisma.StudentWhereInput = {
    organizationId,
    discountType: { not: 'NONE' },
  };
  if (filters.classId) where.classId = filters.classId;

  const students = await prismaClient.student.findMany({
    where,
    include: { class: true },
    orderBy: { name: 'asc' },
  });

  const rows: DiscountRow[] = students.map((s: any) => {
    const baseFee = s.feeMode === 'CUSTOM' && s.customMonthlyFee !== null
      ? s.customMonthlyFee
      : s.class.defaultMonthlyFee;

    let monthlyDiscountAmount = 0;
    if (s.discountType === 'FIXED') {
      monthlyDiscountAmount = Math.min(s.discountValue, baseFee);
    } else if (s.discountType === 'PERCENTAGE') {
      monthlyDiscountAmount = Math.round((baseFee * s.discountValue) / 100);
    }

    const netMonthlyFee = Math.max(0, baseFee - monthlyDiscountAmount);
    const annualConcession = monthlyDiscountAmount * 12;

    return {
      studentId: s.id,
      studentCode: s.studentCode,
      studentName: s.name,
      className: s.class.name,
      classDefaultFee: s.class.defaultMonthlyFee,
      feeMode: s.feeMode,
      discountType: s.discountType,
      discountValue: s.discountValue,
      monthlyDiscountAmount,
      netMonthlyFee,
      annualConcession,
    };
  });

  const summary = rows.reduce(
    (acc, r) => {
      acc.studentsOnDiscount += 1;
      acc.totalMonthlyDiscount += r.monthlyDiscountAmount;
      acc.totalAnnualConcession += r.annualConcession;
      return acc;
    },
    { studentsOnDiscount: 0, totalMonthlyDiscount: 0, totalAnnualConcession: 0 }
  );

  return { rows, summary };
}

/**
 * 8. Daily Collection Daybook Register
 */
export async function getDailyCollectionReport(
  prismaClient: PrismaClient | any = prisma,
  organizationIdOrFilters?: string | ReportFilterOptions,
  maybeFilters?: ReportFilterOptions
) {
  const { organizationId, filters } = parseOrgAndFilters(organizationIdOrFilters, maybeFilters);

  const where: Prisma.PaymentWhereInput = { organizationId };

  if (filters.startDate || filters.endDate) {
    where.paymentDate = {};
    if (filters.startDate) {
      where.paymentDate.gte = startOfDay(filters.startDate);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.paymentDate.lte = end;
    }
  }
  if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;
  if (filters.classId) where.student = { classId: filters.classId };

  const payments = await prismaClient.payment.findMany({
    where,
    include: {
      student: { include: { class: true } },
      feeRecord: true,
      recordedByUser: true,
    },
    orderBy: { paymentDate: 'desc' },
  });

  const rows: DailyCollectionRow[] = payments.map((p: any) => {
    const periodStr = p.feeRecord
      ? `${formatYMD(new Date(p.feeRecord.billingPeriodStart))} to ${formatYMD(new Date(p.feeRecord.billingPeriodEnd))}`
      : 'N/A';

    return {
      paymentId: p.id,
      paymentDate: new Date(p.paymentDate).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      receiptNumber: p.receiptNumber,
      studentCode: p.student.studentCode,
      studentName: p.student.name,
      className: p.student.class?.name || 'N/A',
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId,
      amount: p.amount,
      recordedBy: p.recordedByUser?.name || 'Admin',
      feePeriod: periodStr,
    };
  });

  const summary = rows.reduce(
    (acc, r) => {
      acc.totalReceipts += 1;
      acc.totalCollected += r.amount;
      if (r.paymentMethod === 'CASH') {
        acc.cashInHand += r.amount;
      } else {
        acc.digitalCollections += r.amount;
      }
      return acc;
    },
    { totalReceipts: 0, totalCollected: 0, cashInHand: 0, digitalCollections: 0 }
  );

  return { rows, summary };
}

export const ReportsService = {
  getMonthlyCollectionReport,
  getOverdueFeesReport,
  getClassWiseRevenueReport,
  getPaymentMethodDistributionReport,
  getStudentStatementReport,
  getAdmissionsReport,
  getDiscountReport,
  getDailyCollectionReport,
};

export default ReportsService;

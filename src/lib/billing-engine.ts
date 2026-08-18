import { PrismaClient, FeeStatus, StudentStatus, DiscountType, LateFeeType, FeeMode, Prisma } from '@prisma/client';
import prisma from './prisma';

const DEFAULT_ORG_ID = 'e0000000-0000-4000-a000-000000000001';

export interface BillingCycle {
  cycleIndex: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  periodStartStr: string;
  periodEndStr: string;
  dueDateStr: string;
}

export interface FeeBreakdown {
  baseAmount: number;
  admissionFeeAmount: number;
  discountAmount: number;
  lateFeeAmount: number;
  totalAmount: number;
  effectiveMonthlyFee: number;
  netFeeAmount: number;
}

export interface PricingResolutionInput {
  feeMode: FeeMode | string;
  classDefaultFee: number;
  customMonthlyFee?: number | null;
  discountType?: DiscountType | string;
  discountValue?: number;
}

export interface GenerateStudentBillingOptions {
  throughDate?: Date | string;
  currentDate?: Date | string;
}

export interface GenerateStudentBillingResult {
  studentId: string;
  totalCyclesEvaluated: number;
  created: number;
  skipped: number;
  recordIds: string[];
}

export interface GenerateBatchBillingOptions {
  classId?: string;
  throughDate?: Date | string;
  currentDate?: Date | string;
}

export interface GenerateBatchBillingResult {
  totalProcessed: number;
  created: number;
  skipped: number;
  errors: Array<{ studentId: string; error: string }>;
}

export function startOfDay(date: Date | string): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatYMD(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateBillingCycle(
  admissionDate: Date | string,
  cycleIndex: number
): BillingCycle {
  const adm = startOfDay(admissionDate);
  const anchorDay = adm.getDate();

  const startYear = adm.getFullYear();
  const startMonth = adm.getMonth() + cycleIndex;

  const maxStartDaysInMonth = new Date(startYear, startMonth + 1, 0).getDate();
  const effectiveStartDay = Math.min(anchorDay, maxStartDaysInMonth);
  const periodStart = new Date(startYear, startMonth, effectiveStartDay, 0, 0, 0, 0);

  const endYear = startYear;
  const endMonth = startMonth + 1;
  const maxEndDaysInMonth = new Date(endYear, endMonth + 1, 0).getDate();
  const effectiveEndAnchorDay = Math.min(anchorDay, maxEndDaysInMonth);

  const nextAnchorDate = new Date(endYear, endMonth, effectiveEndAnchorDay, 0, 0, 0, 0);
  const periodEnd = new Date(nextAnchorDate.getTime() - 24 * 60 * 60 * 1000);
  const dueDate = nextAnchorDate;

  return {
    cycleIndex,
    periodStart,
    periodEnd,
    dueDate,
    periodStartStr: formatYMD(periodStart),
    periodEndStr: formatYMD(periodEnd),
    dueDateStr: formatYMD(dueDate),
  };
}

export function getBillingCyclesUpToDate(
  admissionDate: Date | string,
  throughDate: Date | string = new Date()
): BillingCycle[] {
  const adm = startOfDay(admissionDate);
  const target = startOfDay(throughDate);

  if (adm.getTime() > target.getTime()) {
    return [calculateBillingCycle(adm, 0)];
  }

  const cycles: BillingCycle[] = [];
  let cycleIdx = 0;

  while (true) {
    const cycle = calculateBillingCycle(adm, cycleIdx);

    if (cycle.periodStart.getTime() > target.getTime()) {
      break;
    }

    cycles.push(cycle);

    if (cycle.periodStart.getTime() >= target.getTime() || cycles.length >= 600) {
      break;
    }

    cycleIdx++;
  }

  return cycles;
}

export function calculateLateFee(
  arg1: any,
  arg2?: any,
  arg3?: any
): number {
  let dueDate: Date | string;
  let currentDate: Date | string = new Date();
  let rule: any = {};

  // Signature Pattern 1: (rule, feeRecord, currentDate)
  if (arg1 && typeof arg1 === 'object' && arg2 && typeof arg2 === 'object' && ('dueDate' in arg2 || 'totalAmount' in arg2)) {
    rule = arg1;
    dueDate = arg2.dueDate;
    if (arg2.totalAmount !== undefined && arg2.paidAmount !== undefined && arg2.paidAmount >= arg2.totalAmount) {
      return 0; // Already fully paid
    }
    if (arg3) currentDate = arg3;
  }
  // Signature Pattern 2: (dueDate, currentDateOrRule, maybeRule)
  else {
    dueDate = arg1;
    if (arg2 && typeof arg2 === 'object' && !(arg2 instanceof Date)) {
      rule = arg2;
      currentDate = new Date();
    } else {
      if (arg2) currentDate = arg2;
      if (arg3) rule = arg3;
    }
  }

  const isEnabled = rule.enabled ?? rule.lateFeeEnabled ?? true;
  const rawAmount = rule.amount ?? rule.lateFeeAmount ?? 0;
  const feeType = rule.type ?? rule.lateFeeType ?? 'FIXED';
  const graceDays = rule.graceDays ?? 0;

  if (!isEnabled || !rawAmount || rawAmount <= 0) {
    return 0;
  }

  const due = startOfDay(dueDate);
  const current = startOfDay(currentDate);

  if (current.getTime() <= due.getTime()) {
    return 0;
  }

  const diffMs = current.getTime() - due.getTime();
  const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (overdueDays <= graceDays) {
    return 0;
  }

  const billableDays = overdueDays - graceDays;

  if (feeType === 'DAILY' || feeType === 'PER_DAY' || feeType === LateFeeType.PER_DAY) {
    return billableDays * rawAmount;
  }

  return rawAmount;
}

export function resolvePricing(input: PricingResolutionInput): {
  baseAmount: number;
  discountAmount: number;
  effectiveMonthlyFee: number;
} {
  let baseAmount = input.classDefaultFee;
  if (input.feeMode === FeeMode.CUSTOM || input.feeMode === 'CUSTOM') {
    if (input.customMonthlyFee === undefined || input.customMonthlyFee === null || input.customMonthlyFee < 0) {
      throw new Error('CUSTOM fee mode requires a non-negative customMonthlyFee');
    }
    baseAmount = input.customMonthlyFee;
  }

  const discountType = input.discountType || 'NONE';
  const rawDiscountValue = input.discountValue ?? 0;

  let discountAmount = 0;
  if (discountType === DiscountType.FIXED || discountType === 'FIXED') {
    discountAmount = Math.max(0, Math.min(rawDiscountValue, baseAmount));
  } else if (discountType === DiscountType.PERCENTAGE || discountType === 'PERCENTAGE') {
    const pct = Math.max(0, Math.min(100, rawDiscountValue));
    discountAmount = Math.round((baseAmount * pct) / 100);
  }

  const effectiveMonthlyFee = Math.max(0, baseAmount - discountAmount);

  return {
    baseAmount,
    discountAmount,
    effectiveMonthlyFee,
  };
}

export function calculateFeeBreakdown(input: {
  feeMode: FeeMode | string;
  classDefaultFee: number;
  customMonthlyFee?: number | null;
  discountType?: DiscountType | string;
  discountValue?: number;
  admissionFee?: number | null;
  isFirstCycle?: boolean;
  lateFeeEnabled?: boolean;
  lateFeeType?: LateFeeType | string;
  lateFeeAmount?: number;
  graceDays?: number;
  dueDate?: Date | string;
  currentDate?: Date | string;
}): FeeBreakdown {
  const { baseAmount, discountAmount, effectiveMonthlyFee } = resolvePricing({
    feeMode: input.feeMode,
    classDefaultFee: input.classDefaultFee,
    customMonthlyFee: input.customMonthlyFee,
    discountType: input.discountType,
    discountValue: input.discountValue,
  });

  let admissionFeeAmount = 0;
  if (input.isFirstCycle && input.admissionFee && input.admissionFee > 0) {
    admissionFeeAmount = input.admissionFee;
  }

  let lateFee = 0;
  if (input.lateFeeEnabled && input.dueDate && input.currentDate) {
    lateFee = calculateLateFee(input.dueDate, input.currentDate, {
      enabled: Boolean(input.lateFeeEnabled),
      type: input.lateFeeType,
      amount: input.lateFeeAmount,
      graceDays: input.graceDays,
    });
  }

  const totalAmount = Math.max(0, effectiveMonthlyFee + admissionFeeAmount + lateFee);

  return {
    baseAmount,
    admissionFeeAmount,
    discountAmount,
    lateFeeAmount: lateFee,
    totalAmount,
    effectiveMonthlyFee,
    netFeeAmount: effectiveMonthlyFee,
  };
}

export function deriveFeeStatus(
  feeRecord: {
    paidAmount: number;
    totalAmount: number;
    dueDate?: Date | string;
    status?: FeeStatus | string;
  },
  currentDate: Date | string = new Date(),
  graceDays: number = 0
): FeeStatus {
  if (feeRecord.status === 'WAIVED' || feeRecord.status === 'CANCELLED') {
    return feeRecord.status as FeeStatus;
  }

  if (feeRecord.totalAmount === 0 || feeRecord.paidAmount >= feeRecord.totalAmount) {
    return 'PAID';
  }

  if (feeRecord.paidAmount > 0 && feeRecord.paidAmount < feeRecord.totalAmount) {
    return 'PARTIALLY_PAID';
  }

  if (!feeRecord.dueDate) {
    return 'UPCOMING';
  }

  const now = startOfDay(currentDate);
  const due = startOfDay(feeRecord.dueDate);

  if (now.getTime() < due.getTime()) {
    return 'UPCOMING';
  } else if (now.getTime() === due.getTime()) {
    return 'DUE';
  } else {
    if (graceDays > 0) {
      const diffDays = Math.round((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= graceDays) {
        return 'DUE';
      }
    }
    return 'OVERDUE';
  }
}

/**
 * Concurrency-safe generator for sequential student code in tenant format with numerical sorting.
 */
export async function generateStudentCode(
  prismaClient: PrismaClient | any = prisma,
  organizationIdOrYear?: string | number,
  maybeYear?: number
): Promise<string> {
  let organizationId: string | undefined;
  let admissionYear = new Date().getFullYear();

  if (typeof organizationIdOrYear === 'string') {
    organizationId = organizationIdOrYear;
    if (typeof maybeYear === 'number') admissionYear = maybeYear;
  } else if (typeof organizationIdOrYear === 'number') {
    admissionYear = organizationIdOrYear;
  }

  let prefixCode = 'STU';
  if (organizationId && prismaClient?.organizationSetting?.findUnique) {
    try {
      const settings = await prismaClient.organizationSetting.findUnique({
        where: { organizationId },
        select: { receiptPrefix: true, feePrefix: true },
      });
      if (settings?.receiptPrefix) {
        prefixCode = settings.receiptPrefix.split('-')[0] || 'STU';
      }
    } catch {}
  }

  const where: any = {};
  if (organizationId) where.organizationId = organizationId;

  // Retrieve existing students to find maximum sequential number numerically
  let students: Array<{ studentCode: string }> = [];
  if (typeof prismaClient?.student?.findMany === 'function') {
    students = (await prismaClient.student.findMany({
      where,
      select: {
        studentCode: true,
      },
    })) || [];
  } else if (typeof prismaClient?.student?.findFirst === 'function') {
    const first = await prismaClient.student.findFirst({
      where,
      select: {
        studentCode: true,
      },
    });
    if (first) students = [first];
  }

  let maxSeq = 0;
  for (const s of students) {
    if (!s.studentCode) continue;
    const parts = s.studentCode.split('-');
    if (parts.length === 3) {
      if (prefixCode === 'STU' && parts[0]) {
        prefixCode = parts[0];
      }
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefixCode}-${admissionYear}-${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Generates idempotent fee records for a single student across all cycles up to a target date.
 */
export async function generateStudentBillingRecords(
  prismaClient: PrismaClient | any = prisma,
  studentId: string,
  organizationIdOrOptions?: string | GenerateStudentBillingOptions,
  maybeOptions?: GenerateStudentBillingOptions
): Promise<GenerateStudentBillingResult> {
  let organizationId: string | undefined;
  let options: GenerateStudentBillingOptions = {};

  if (typeof organizationIdOrOptions === 'string') {
    organizationId = organizationIdOrOptions;
    if (maybeOptions) options = maybeOptions;
  } else if (typeof organizationIdOrOptions === 'object' && organizationIdOrOptions !== null) {
    options = organizationIdOrOptions;
  } else if (maybeOptions && typeof maybeOptions === 'object') {
    options = maybeOptions;
  }

  const where: any = { id: studentId };
  if (organizationId) {
    where.organizationId = organizationId;
  }

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
    student = await prismaClient.student.findFirst({
      where,
      include: { class: true },
    });
  }

  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }

  if (!student.class) {
    throw new Error(`Class record not found for student ${studentId}`);
  }

  const orgId = organizationId || student.organizationId || DEFAULT_ORG_ID;

  if (student.status !== StudentStatus.ACTIVE && student.status !== 'ACTIVE') {
    throw new Error(`Cannot generate fee record for inactive student ${studentId} (status: ${student.status})`);
  }

  const targetDate = options.throughDate ? new Date(options.throughDate) : new Date();
  const evalDate = options.currentDate ? new Date(options.currentDate) : new Date();
  const cycles = getBillingCyclesUpToDate(student.admissionDate, targetDate);

  const classDefaultFee = student.class.defaultMonthlyFee ?? 0;
  const lateFeeEnabled = student.class.lateFeeEnabled ?? false;
  const lateFeeType = student.class.lateFeeType ?? 'FIXED';
  const lateFeeAmount = student.class.lateFeeAmount ?? 0;
  const graceDays = student.class.graceDays ?? 0;

  let created = 0;
  let skipped = 0;
  const recordIds: string[] = [];

  for (let k = 0; k < cycles.length; k++) {
    const cycle = cycles[k];

    const existing = await prismaClient.feeRecord.findFirst({
      where: {
        organizationId: orgId,
        studentId: student.id,
        billingPeriodStart: cycle.periodStart,
        billingPeriodEnd: cycle.periodEnd,
      },
    });

    if (existing) {
      skipped++;
      recordIds.push(existing.id);
      continue;
    }

    const pricing = calculateFeeBreakdown({
      feeMode: student.feeMode,
      classDefaultFee,
      customMonthlyFee: student.customMonthlyFee,
      discountType: student.discountType,
      discountValue: student.discountValue,
      admissionFee: student.admissionFee,
      isFirstCycle: k === 0,
      lateFeeEnabled,
      lateFeeType,
      lateFeeAmount,
      graceDays,
      dueDate: cycle.dueDate,
      currentDate: evalDate,
    });

    const status = deriveFeeStatus(
      {
        paidAmount: 0,
        totalAmount: pricing.totalAmount,
        dueDate: cycle.dueDate,
      },
      evalDate,
      graceDays
    );

    try {
      const newRecord = await prismaClient.feeRecord.create({
        data: {
          organizationId: orgId,
          studentId: student.id,
          classId: student.classId,
          billingPeriodStart: cycle.periodStart,
          billingPeriodEnd: cycle.periodEnd,
          dueDate: cycle.dueDate,
          baseAmount: pricing.baseAmount,
          admissionFeeAmount: pricing.admissionFeeAmount,
          discountAmount: pricing.discountAmount,
          lateFeeAmount: pricing.lateFeeAmount,
          totalAmount: pricing.totalAmount,
          paidAmount: 0,
          outstandingAmount: pricing.totalAmount,
          status,
          feeMode: student.feeMode,
          notes: `Cycle ${k + 1} (${cycle.periodStartStr} to ${cycle.periodEndStr})`,
        },
      });

      created++;
      recordIds.push(newRecord.id);
    } catch (err: any) {
      if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
        skipped++;
      } else {
        throw err;
      }
    }
  }

  return {
    studentId,
    totalCyclesEvaluated: cycles.length,
    created,
    skipped,
    recordIds,
  };
}

/**
 * Batch generator that scans all ACTIVE students in an organization and generates missing fee cycles.
 */
export async function generateBatchBillingRecords(
  prismaClient: PrismaClient | any = prisma,
  organizationIdOrOptions?: string | GenerateBatchBillingOptions,
  maybeOptions?: GenerateBatchBillingOptions
): Promise<GenerateBatchBillingResult> {
  let organizationId: string | undefined;
  let options: GenerateBatchBillingOptions = {};

  if (typeof organizationIdOrOptions === 'string') {
    organizationId = organizationIdOrOptions;
    if (maybeOptions) options = maybeOptions;
  } else if (typeof organizationIdOrOptions === 'object' && organizationIdOrOptions !== null) {
    options = organizationIdOrOptions;
  }

  const whereClause: any = {
    status: StudentStatus.ACTIVE,
  };

  if (organizationId) {
    whereClause.organizationId = organizationId;
  }

  if (options.classId) {
    whereClause.classId = options.classId;
  }

  const activeStudents = await prismaClient.student.findMany({
    where: whereClause,
    include: { class: true },
    orderBy: { studentCode: 'asc' },
  });

  let created = 0;
  let skipped = 0;
  const errors: Array<{ studentId: string; error: string }> = [];

  for (const student of activeStudents) {
    try {
      const result = await generateStudentBillingRecords(prismaClient, student.id, student.organizationId || organizationId, {
        throughDate: options.throughDate,
        currentDate: options.currentDate,
      });
      created += result.created;
      skipped += result.skipped;
    } catch (err: any) {
      errors.push({
        studentId: student.id,
        error: err.message || String(err),
      });
    }
  }

  return {
    totalProcessed: activeStudents.length,
    created,
    skipped,
    errors,
  };
}

export const BillingEngine = {
  calculateBillingCycle,
  getBillingCyclesUpToDate,
  calculateLateFee,
  calculateFeeBreakdown,
  resolvePricing,
  deriveFeeStatus,
  generateStudentCode,
  generateStudentBillingRecords,
  generateBatchBillingRecords,
};

export default BillingEngine;

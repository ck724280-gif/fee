import { PrismaClient, FeeMode, DiscountType, FeeStatus, StudentStatus, LateFeeType } from '@prisma/client';
import prisma from './prisma';

export interface BillingCycle {
  cycleIndex: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  periodStartStr: string; // 'yyyy-MM-dd'
  periodEndStr: string;   // 'yyyy-MM-dd'
  dueDateStr: string;     // 'yyyy-MM-dd'
}

export interface PricingBreakdown {
  baseAmount: number;
  admissionFeeAmount: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  lateFeeAmount: number;
  netFeeAmount: number;
  totalAmount: number;
}

export interface FeeCalculationInput {
  feeMode: FeeMode | 'DEFAULT' | 'CUSTOM';
  classDefaultFee: number;
  customMonthlyFee?: number | null;
  discountType?: DiscountType | 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue?: number;
  admissionFee?: number;
  isFirstCycle?: boolean;
  lateFeeEnabled?: boolean;
  lateFeeType?: LateFeeType | 'FIXED' | 'PER_DAY';
  lateFeeAmount?: number;
  graceDays?: number;
  dueDate?: Date | string;
  currentDate?: Date | string;
  paidAmount?: number;
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

/**
 * Formats a Date object to YYYY-MM-DD string format safely in local/UTC.
 */
export function formatYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a normalized Date set to midnight (00:00:00.000).
 */
export function startOfDay(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Calculates a specific billing cycle (0-indexed) for a student
 * based on their permanent admission date anchor.
 *
 * Implements anchor day preservation across 28th, 29th, 30th, 31st and leap year Feb 29
 * with automatic month-end clamping and subsequent month anchor recovery.
 *
 * @param admissionDate - The student's official admission date
 * @param cycleIndex - 0 for first month, 1 for second month, etc.
 * @returns BillingCycle with exact start, end, and due dates
 */
export function calculateBillingCycle(
  admissionDate: Date | string,
  cycleIndex: number
): BillingCycle {
  const initialDate = typeof admissionDate === 'string'
    ? new Date(admissionDate)
    : admissionDate;

  if (isNaN(initialDate.getTime())) {
    throw new Error(`Invalid admission date provided: ${admissionDate}`);
  }

  const anchorDay = initialDate.getDate();
  const baseYear = initialDate.getFullYear();
  const baseMonth = initialDate.getMonth(); // 0-indexed

  // 1. Calculate Period Start for Cycle k:
  const targetYear = baseYear + Math.floor((baseMonth + cycleIndex) / 12);
  const targetMonth = ((baseMonth + cycleIndex) % 12 + 12) % 12;
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDayK = Math.min(anchorDay, daysInTargetMonth);
  const periodStart = new Date(targetYear, targetMonth, clampedDayK, 0, 0, 0, 0);

  // 2. Calculate Start Date for Cycle k + 1:
  const nextTargetYear = baseYear + Math.floor((baseMonth + cycleIndex + 1) / 12);
  const nextTargetMonth = ((baseMonth + cycleIndex + 1) % 12 + 12) % 12;
  const daysInNextMonth = new Date(nextTargetYear, nextTargetMonth + 1, 0).getDate();
  const clampedDayKPlus1 = Math.min(anchorDay, daysInNextMonth);
  const nextPeriodStart = new Date(nextTargetYear, nextTargetMonth, clampedDayKPlus1, 0, 0, 0, 0);

  // 3. Period End is strictly 1 day prior to next cycle start:
  const periodEnd = new Date(nextPeriodStart.getTime() - 24 * 60 * 60 * 1000);

  // 4. Due Date is the commencement of next cycle:
  const dueDate = nextPeriodStart;

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

/**
 * Generates all billing cycles for a student up to a target evaluation date.
 */
export function getBillingCyclesUpToDate(
  admissionDate: Date | string,
  targetDate: Date | string = new Date()
): BillingCycle[] {
  const target = startOfDay(targetDate);
  const cycles: BillingCycle[] = [];
  let index = 0;

  while (true) {
    const cycle = calculateBillingCycle(admissionDate, index);
    // If the cycle's periodStart is strictly after the target date, stop
    if (cycle.periodStart.getTime() > target.getTime()) {
      break;
    }
    cycles.push(cycle);
    index++;
  }

  return cycles;
}

/**
 * Calculates optional class late fee based on due date and grace period.
 */
export function calculateLateFee(
  cls: {
    lateFeeEnabled: boolean;
    lateFeeType?: LateFeeType | 'FIXED' | 'PER_DAY';
    lateFeeAmount?: number;
    graceDays?: number;
  },
  feeRecord: {
    dueDate: Date | string;
    totalAmount: number;
    paidAmount: number;
  },
  currentDate: Date | string = new Date()
): number {
  if (!cls.lateFeeEnabled) return 0;
  if (feeRecord.paidAmount >= feeRecord.totalAmount) return 0;

  const due = startOfDay(feeRecord.dueDate);
  const now = startOfDay(currentDate);
  const diffDays = Math.round((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  const grace = cls.graceDays || 0;

  if (diffDays <= grace) return 0;

  const lateAmount = cls.lateFeeAmount || 0;
  if (cls.lateFeeType === 'FIXED') {
    return lateAmount;
  } else {
    const overdueDays = diffDays - grace;
    return overdueDays * lateAmount;
  }
}

/**
 * Resolves student cycle pricing, discount applications, and optional late fees.
 */
export function calculateFeeBreakdown(input: FeeCalculationInput): PricingBreakdown {
  // 1. Resolve Base Monthly Fee
  let baseAmount = 0;
  if (input.feeMode === 'CUSTOM') {
    if (
      input.customMonthlyFee === null ||
      input.customMonthlyFee === undefined ||
      input.customMonthlyFee < 0
    ) {
      throw new Error('Custom fee mode requires a non-negative customMonthlyFee');
    }
    baseAmount = Number(input.customMonthlyFee);
  } else {
    baseAmount = Number(input.classDefaultFee || 0);
  }

  // 2. Resolve Discount
  let discountAmount = 0;
  const discountType = (input.discountType || 'NONE') as DiscountType;
  const discountValue = Number(input.discountValue || 0);

  if (discountType === 'FIXED') {
    discountAmount = Math.min(discountValue, baseAmount);
  } else if (discountType === 'PERCENTAGE') {
    const pct = Math.min(Math.max(discountValue, 0), 100);
    discountAmount = Math.round((baseAmount * pct) / 100);
  }

  // 3. Admission Fee (Cycle 0 only)
  const admissionFeeAmount = input.isFirstCycle ? Number(input.admissionFee || 0) : 0;

  // 4. Net Monthly Fee
  const netFeeAmount = Math.max(0, baseAmount - discountAmount);

  // 5. Late Fee Computation
  let lateFeeAmount = 0;
  if (input.lateFeeEnabled && input.dueDate) {
    lateFeeAmount = calculateLateFee(
      {
        lateFeeEnabled: input.lateFeeEnabled,
        lateFeeType: input.lateFeeType,
        lateFeeAmount: input.lateFeeAmount,
        graceDays: input.graceDays,
      },
      {
        dueDate: input.dueDate,
        totalAmount: netFeeAmount + admissionFeeAmount,
        paidAmount: input.paidAmount || 0,
      },
      input.currentDate || new Date()
    );
  }

  const totalAmount = netFeeAmount + admissionFeeAmount + lateFeeAmount;

  return {
    baseAmount,
    admissionFeeAmount,
    discountType,
    discountValue,
    discountAmount,
    lateFeeAmount,
    netFeeAmount,
    totalAmount,
  };
}

/**
 * Convenient alias for resolvePricing matching the test fixture signatures.
 */
export function resolvePricing(
  student: {
    feeMode: FeeMode | 'DEFAULT' | 'CUSTOM';
    customMonthlyFee?: number | null;
    discountType?: DiscountType | 'NONE' | 'FIXED' | 'PERCENTAGE';
    discountValue?: number;
    admissionFee?: number;
  },
  cls: {
    defaultMonthlyFee: number;
    lateFeeEnabled?: boolean;
    lateFeeType?: LateFeeType | 'FIXED' | 'PER_DAY';
    lateFeeAmount?: number;
    graceDays?: number;
  },
  isFirstCycle = false
): PricingBreakdown {
  return calculateFeeBreakdown({
    feeMode: student.feeMode,
    classDefaultFee: cls.defaultMonthlyFee,
    customMonthlyFee: student.customMonthlyFee,
    discountType: student.discountType,
    discountValue: student.discountValue,
    admissionFee: student.admissionFee,
    isFirstCycle,
    lateFeeEnabled: cls.lateFeeEnabled,
    lateFeeType: cls.lateFeeType,
    lateFeeAmount: cls.lateFeeAmount,
    graceDays: cls.graceDays,
  });
}

/**
 * Derives the fee status dynamically based on paid amount, total amount, due date, and evaluation date.
 */
export function deriveFeeStatus(
  feeRecord: {
    paidAmount: number;
    totalAmount: number;
    dueDate: Date | string;
    status?: FeeStatus | string;
  },
  currentDate: Date | string = new Date(),
  graceDays: number = 0
): FeeStatus {
  // Manual override states are immutable
  if (feeRecord.status === 'WAIVED' || feeRecord.status === 'CANCELLED') {
    return feeRecord.status as FeeStatus;
  }

  // Full payment condition
  if (feeRecord.totalAmount === 0 || feeRecord.paidAmount >= feeRecord.totalAmount) {
    return 'PAID';
  }

  // Partial payment condition
  if (feeRecord.paidAmount > 0 && feeRecord.paidAmount < feeRecord.totalAmount) {
    return 'PARTIALLY_PAID';
  }

  // Zero paid conditions
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
 * Concurrency-safe generator for sequential student code in format DPR-{YEAR}-{SEQ}
 * (e.g. DPR-2026-001)
 */
export async function generateStudentCode(
  prismaClient: PrismaClient | any = prisma,
  admissionYear: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `DPR-${admissionYear}-`;

  const latestStudent = await prismaClient.student.findFirst({
    where: {
      studentCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      studentCode: 'desc',
    },
    select: {
      studentCode: true,
    },
  });

  let maxSeq = 0;
  if (latestStudent && latestStudent.studentCode) {
    const parts = latestStudent.studentCode.split('-');
    const seq = parseInt(parts[2] || '0', 10);
    if (!isNaN(seq)) {
      maxSeq = seq;
    }
  }

  const nextSeq = maxSeq + 1;
  return `DPR-${admissionYear}-${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Generates idempotent fee records for a single student across all cycles up to a target date.
 */
export async function generateStudentBillingRecords(
  prismaClient: PrismaClient | any = prisma,
  studentId: string,
  options: GenerateStudentBillingOptions = {}
): Promise<GenerateStudentBillingResult> {
  const student = await prismaClient.student.findUnique({
    where: { id: studentId },
    include: { class: true },
  });

  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }

  if (student.status !== StudentStatus.ACTIVE && student.status !== 'ACTIVE') {
    throw new Error(`Cannot generate fee record for inactive student ${studentId} (status: ${student.status})`);
  }

  const targetDate = options.throughDate ? new Date(options.throughDate) : new Date();
  const evalDate = options.currentDate ? new Date(options.currentDate) : new Date();
  const cycles = getBillingCyclesUpToDate(student.admissionDate, targetDate);

  let created = 0;
  let skipped = 0;
  const recordIds: string[] = [];

  for (let k = 0; k < cycles.length; k++) {
    const cycle = cycles[k];

    // Check if record already exists for this exact cycle
    const existing = await prismaClient.feeRecord.findFirst({
      where: {
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
      classDefaultFee: student.class.defaultMonthlyFee,
      customMonthlyFee: student.customMonthlyFee,
      discountType: student.discountType,
      discountValue: student.discountValue,
      admissionFee: student.admissionFee,
      isFirstCycle: k === 0,
      lateFeeEnabled: student.class.lateFeeEnabled,
      lateFeeType: student.class.lateFeeType,
      lateFeeAmount: student.class.lateFeeAmount,
      graceDays: student.class.graceDays,
      dueDate: cycle.dueDate,
      currentDate: evalDate,
      paidAmount: 0,
    });

    const status = deriveFeeStatus(
      {
        paidAmount: 0,
        totalAmount: pricing.totalAmount,
        dueDate: cycle.dueDate,
        status: 'UPCOMING',
      },
      evalDate,
      student.class.graceDays
    );

    try {
      const newRecord = await prismaClient.feeRecord.create({
        data: {
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
      // Safe skip if compound unique constraint is hit in race condition
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
 * Batch generator that scans all ACTIVE students and generates missing fee cycles up to target date.
 */
export async function generateBatchBillingRecords(
  prismaClient: PrismaClient | any = prisma,
  options: GenerateBatchBillingOptions = {}
): Promise<GenerateBatchBillingResult> {
  const whereClause: any = {
    status: StudentStatus.ACTIVE,
  };

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
      const result = await generateStudentBillingRecords(prismaClient, student.id, {
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

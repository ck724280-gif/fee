/**
 * High-Fidelity Domain Services Implementation for Opaque-Box E2E Testing
 * Zero-dependency pure TypeScript implementation fully mirroring production contracts.
 */

import { InMemoryDB, InMemoryFeeRecord, InMemoryStudent, InMemoryClass, InMemoryPayment } from './in-memory-db';

// --- Pure Zero-Dependency Date Math Utilities ---
export function getDate(d: Date): number {
  return d.getDate();
}

export function getDaysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function addMonths(d: Date, months: number): Date {
  const targetYear = d.getFullYear() + Math.floor((d.getMonth() + months) / 12);
  const targetMonth = ((d.getMonth() + months) % 12 + 12) % 12;
  return new Date(targetYear, targetMonth, 1, 0, 0, 0, 0);
}

export function setDate(d: Date, day: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), day, 0, 0, 0, 0);
}

export function subDays(d: Date, days: number): Date {
  const res = new Date(d.getTime());
  res.setDate(res.getDate() - days);
  return res;
}

export function format(d: Date, fmt: string): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (fmt === 'yyyy-MM-dd') return `${year}-${month}-${day}`;
  if (fmt === 'yyyy-MM') return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

export function isBefore(d1: Date, d2: Date): boolean {
  return d1.getTime() < d2.getTime();
}

export function isAfter(d1: Date, d2: Date): boolean {
  return d1.getTime() > d2.getTime();
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function differenceInCalendarDays(d1: Date, d2: Date): number {
  return Math.round((startOfDay(d1).getTime() - startOfDay(d2).getTime()) / (1000 * 60 * 60 * 24));
}

export interface BillingCycle {
  cycleIndex: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  periodStartStr: string;
  periodEndStr: string;
  dueDateStr: string;
}

export interface PricingBreakdown {
  baseAmount: number;
  admissionFeeAmount: number;
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  discountAmount: number;
  netFeeAmount: number;
  totalAmount: number;
}

export class BillingService {
  /**
   * Calculates a specific billing cycle (0-indexed) for a student based on admission date anchor.
   */
  public static calculateBillingCycle(admissionDate: Date, cycleIndex: number): BillingCycle {
    const anchorDay = getDate(admissionDate);
    const baseDate = startOfDay(admissionDate);

    // Start date for cycle k
    const targetMonthStart = addMonths(baseDate, cycleIndex);
    const daysInTargetMonth = getDaysInMonth(targetMonthStart);
    const clampedDayK = Math.min(anchorDay, daysInTargetMonth);
    const periodStart = setDate(targetMonthStart, clampedDayK);

    // Start date for cycle k + 1
    const nextMonthStart = addMonths(baseDate, cycleIndex + 1);
    const daysInNextMonth = getDaysInMonth(nextMonthStart);
    const clampedDayKPlus1 = Math.min(anchorDay, daysInNextMonth);
    const nextPeriodStart = setDate(nextMonthStart, clampedDayKPlus1);

    // Period end is 1 day prior to next cycle start
    const periodEnd = subDays(nextPeriodStart, 1);
    const dueDate = nextPeriodStart;

    return {
      cycleIndex,
      periodStart,
      periodEnd,
      dueDate,
      periodStartStr: format(periodStart, 'yyyy-MM-dd'),
      periodEndStr: format(periodEnd, 'yyyy-MM-dd'),
      dueDateStr: format(dueDate, 'yyyy-MM-dd'),
    };
  }

  /**
   * Resolves fee pricing and discounts.
   */
  public static resolvePricing(
    student: Pick<InMemoryStudent, 'feeMode' | 'customMonthlyFee' | 'discountType' | 'discountValue' | 'admissionFee'>,
    cls: Pick<InMemoryClass, 'defaultMonthlyFee'>,
    isFirstCycle = false
  ): PricingBreakdown {
    let baseAmount = 0;
    if (student.feeMode === 'CUSTOM') {
      if (student.customMonthlyFee === null || student.customMonthlyFee === undefined || student.customMonthlyFee < 0) {
        throw new Error('Custom fee mode requires a non-negative customMonthlyFee');
      }
      baseAmount = student.customMonthlyFee;
    } else {
      baseAmount = cls.defaultMonthlyFee;
    }

    let discountAmount = 0;
    if (student.discountType === 'FIXED') {
      discountAmount = Math.min(student.discountValue, baseAmount);
    } else if (student.discountType === 'PERCENTAGE') {
      const pct = Math.min(Math.max(student.discountValue, 0), 100);
      discountAmount = Math.round((baseAmount * pct) / 100);
    }

    const admissionFeeAmount = isFirstCycle ? student.admissionFee || 0 : 0;
    const netFeeAmount = Math.max(0, baseAmount - discountAmount);
    const totalAmount = netFeeAmount + admissionFeeAmount;

    return {
      baseAmount,
      admissionFeeAmount,
      discountType: student.discountType,
      discountValue: student.discountValue,
      discountAmount,
      netFeeAmount,
      totalAmount,
    };
  }

  /**
   * Derives fee status based on paid amounts, due date, and current date.
   */
  public static deriveFeeStatus(
    feeRecord: Pick<InMemoryFeeRecord, 'paidAmount' | 'totalAmount' | 'dueDate' | 'status'>,
    currentDate: Date = new Date()
  ): InMemoryFeeRecord['status'] {
    if (feeRecord.status === 'WAIVED' || feeRecord.status === 'CANCELLED') {
      return feeRecord.status;
    }

    if (feeRecord.totalAmount === 0 || feeRecord.paidAmount >= feeRecord.totalAmount) {
      return 'PAID';
    }

    if (feeRecord.paidAmount > 0 && feeRecord.paidAmount < feeRecord.totalAmount) {
      return 'PARTIALLY_PAID';
    }

    const now = startOfDay(currentDate);
    const due = startOfDay(new Date(feeRecord.dueDate));

    if (now.getTime() < due.getTime()) {
      return 'UPCOMING';
    } else if (now.getTime() === due.getTime()) {
      return 'DUE';
    } else {
      return 'OVERDUE';
    }
  }

  /**
   * Generates a single idempotent fee record for a student cycle.
   */
  public static generateFeeRecord(
    db: InMemoryDB,
    studentId: string,
    cycleIndex: number,
    currentDate: Date = new Date()
  ): InMemoryFeeRecord {
    const student = db.students.find((s) => s.id === studentId);
    if (!student) throw new Error(`Student ${studentId} not found`);
    if (student.status !== 'ACTIVE') {
      throw new Error(`Cannot generate fee record for inactive student ${studentId} (status: ${student.status})`);
    }

    const cls = db.classes.find((c) => c.id === student.classId);
    if (!cls) throw new Error(`Class ${student.classId} not found`);

    const cycle = this.calculateBillingCycle(new Date(student.admissionDate), cycleIndex);
    const pricing = this.resolvePricing(student, cls, cycleIndex === 0);

    const initialStatus = this.deriveFeeStatus(
      {
        paidAmount: 0,
        totalAmount: pricing.totalAmount,
        dueDate: cycle.dueDate,
        status: 'UPCOMING',
      },
      currentDate
    );

    return db.createFeeRecord({
      studentId: student.id,
      classId: cls.id,
      cycleIndex,
      billingPeriodStart: cycle.periodStart,
      billingPeriodEnd: cycle.periodEnd,
      dueDate: cycle.dueDate,
      baseAmount: pricing.baseAmount,
      admissionFeeAmount: pricing.admissionFeeAmount,
      discountAmount: pricing.discountAmount,
      lateFeeAmount: 0,
      totalAmount: pricing.totalAmount,
      paidAmount: 0,
      outstandingAmount: pricing.totalAmount,
      status: initialStatus,
      classSnapshotFee: cls.defaultMonthlyFee,
      studentFeeModeSnapshot: student.feeMode,
      notes: `Cycle ${cycleIndex + 1} (${cycle.periodStartStr} to ${cycle.periodEndStr})`,
    });
  }

  /**
   * Generates unique sequential student code DPR-YYYY-SEQ
   */
  public static generateStudentCode(db: InMemoryDB, year: number): string {
    const prefix = `DPR-${year}-`;
    const existing = db.students.filter((s) => s.studentCode.startsWith(prefix));
    let maxSeq = 0;
    for (const s of existing) {
      const parts = s.studentCode.split('-');
      const seq = parseInt(parts[2] || '0', 10);
      if (seq > maxSeq) maxSeq = seq;
    }
    const nextSeq = maxSeq + 1;
    return `DPR-${year}-${String(nextSeq).padStart(3, '0')}`;
  }

  /**
   * Calculates optional class late fee
   */
  public static calculateLateFee(cls: InMemoryClass, feeRecord: InMemoryFeeRecord, currentDate: Date = new Date()): number {
    if (!cls.lateFeeEnabled) return 0;
    if (feeRecord.paidAmount >= feeRecord.totalAmount) return 0;

    const due = startOfDay(new Date(feeRecord.dueDate));
    const now = startOfDay(currentDate);
    const diffDays = differenceInCalendarDays(now, due);

    if (diffDays <= cls.graceDays) return 0;

    if (cls.lateFeeType === 'FIXED') {
      return cls.lateFeeAmount;
    } else {
      const overdueDays = diffDays - cls.graceDays;
      return overdueDays * cls.lateFeeAmount;
    }
  }
}

export class PaymentService {
  /**
   * Generates sequential receipt number DPR-RC-YYYY-SEQ
   */
  public static generateReceiptNumber(db: InMemoryDB, year: number): string {
    const prefix = `DPR-RC-${year}-`;
    const existing = db.payments.filter((p) => p.receiptNumber.startsWith(prefix));
    let maxSeq = 0;
    for (const p of existing) {
      const parts = p.receiptNumber.split('-');
      const seq = parseInt(parts[3] || '0', 10);
      if (seq > maxSeq) maxSeq = seq;
    }
    const nextSeq = maxSeq + 1;
    return `DPR-RC-${year}-${String(nextSeq).padStart(4, '0')}`;
  }

  /**
   * Atomically records a payment and updates fee balances.
   */
  public static async recordPayment(
    db: InMemoryDB,
    input: {
      feeRecordId: string;
      amount: number;
      paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
      transactionId?: string | null;
      paymentDate?: Date;
      notes?: string | null;
      createdById?: string | null;
    }
  ): Promise<{ payment: InMemoryPayment; feeRecord: InMemoryFeeRecord; receiptNumber: string; documentToken: string }> {
    return await db.$transaction(async (tx) => {
      const fee = tx.feeRecords.find((f) => f.id === input.feeRecordId);
      if (!fee) throw new Error(`Fee record ${input.feeRecordId} not found`);

      if (input.amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      if (input.amount > fee.outstandingAmount) {
        throw new Error(`Payment amount (₹${input.amount}) cannot exceed outstanding balance of ₹${fee.outstandingAmount}`);
      }

      const year = (input.paymentDate || new Date()).getFullYear();
      const receiptNumber = this.generateReceiptNumber(tx, year);

      const payment = tx.createPayment({
        feeRecordId: fee.id,
        studentId: fee.studentId,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        transactionId: input.transactionId || null,
        receiptNumber,
        paymentDate: input.paymentDate || new Date(),
        notes: input.notes || null,
        createdById: input.createdById || null,
      });

      const newPaid = fee.paidAmount + input.amount;
      const newOutstanding = fee.outstandingAmount - input.amount;
      const newStatus: InMemoryFeeRecord['status'] = newOutstanding === 0 ? 'PAID' : 'PARTIALLY_PAID';

      const updatedFee = tx.updateFeeRecord(fee.id, {
        paidAmount: newPaid,
        outstandingAmount: newOutstanding,
        status: newStatus,
      });

      const docToken = `tok_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
      tx.createDocument({
        token: docToken,
        documentType: 'RECEIPT',
        entityId: payment.id,
        metadata: {
          receiptNumber,
          feeRecordId: fee.id,
          studentId: fee.studentId,
          amount: input.amount,
        },
        expiresAt: null,
      });

      tx.createAuditLog({
        userId: input.createdById || 'SYSTEM',
        action: 'PAYMENT_RECORDED',
        entityType: 'PAYMENT',
        entityId: payment.id,
        details: {
          receiptNumber,
          amount: input.amount,
          feeRecordId: fee.id,
          newOutstanding,
          newStatus,
        },
      });

      return {
        payment,
        feeRecord: updatedFee,
        receiptNumber,
        documentToken: docToken,
      };
    });
  }
}

export class DocumentService {
  public static createDocumentToken(
    db: InMemoryDB,
    type: 'RECEIPT' | 'REMINDER' | 'STATEMENT',
    entityId: string,
    metadata?: any,
    expiresAt?: Date | null
  ): string {
    const token = `doc_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    db.createDocument({
      token,
      documentType: type,
      entityId,
      metadata,
      expiresAt: expiresAt || null,
    });
    return token;
  }

  public static verifyAndGetDocument(db: InMemoryDB, token: string, currentDate: Date = new Date()) {
    const doc = db.documents.find((d) => d.token === token);
    if (!doc) {
      throw new Error('Document not found (404)');
    }
    if (doc.expiresAt && currentDate.getTime() > new Date(doc.expiresAt).getTime()) {
      throw new Error('Document link has expired (410)');
    }
    return doc;
  }
}

export class WhatsAppService {
  public static sanitizePhone(phone: string): string {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return cleaned;
  }

  public static buildClickToChatUrl(phone: string, text: string): string {
    const cleanPhone = this.sanitizePhone(phone);
    const encoded = encodeURIComponent(text);
    return `https://wa.me/${cleanPhone}?text=${encoded}`;
  }

  public static generateReceiptMessage(data: {
    studentName: string;
    className: string;
    paidAmount: number;
    receiptNumber: string;
    outstandingAmount: number;
    documentUrl: string;
  }): string {
    return (
      `Dear Parent/Student,\n\n` +
      `We have received a payment of ₹${data.paidAmount} for ${data.studentName} (${data.className}).\n` +
      `Receipt No: ${data.receiptNumber}\n` +
      `Remaining Balance: ₹${data.outstandingAmount}\n\n` +
      `Download your official receipt here:\n${data.documentUrl}\n\n` +
      `Thank you,\nDPR Private Tuition`
    );
  }

  public static generateReminderMessage(data: {
    studentName: string;
    className: string;
    dueAmount: number;
    dueDateStr: string;
    documentUrl: string;
  }): string {
    return (
      `Dear Parent/Student,\n\n` +
      `This is a gentle fee reminder for ${data.studentName} (${data.className}).\n` +
      `Amount Due: ₹${data.dueAmount}\n` +
      `Due Date: ${data.dueDateStr}\n\n` +
      `View your fee notice here:\n${data.documentUrl}\n\n` +
      `Thank you,\nDPR Private Tuition`
    );
  }
}

export class DashboardService {
  public static getKPIMetrics(db: InMemoryDB, currentDate: Date = new Date()) {
    const totalStudents = db.students.length;
    const activeStudents = db.students.filter((s) => s.status === 'ACTIVE').length;

    const todayStr = format(currentDate, 'yyyy-MM-dd');
    const currentMonthStr = format(currentDate, 'yyyy-MM');

    const todayPayments = db.payments.filter((p) => format(new Date(p.paymentDate), 'yyyy-MM-dd') === todayStr);
    const todayCollection = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    const monthPayments = db.payments.filter((p) => format(new Date(p.paymentDate), 'yyyy-MM') === currentMonthStr);
    const monthlyCollection = monthPayments.reduce((sum, p) => sum + p.amount, 0);

    const pendingFeeRecords = db.feeRecords.filter((f) => f.status === 'DUE' || f.status === 'PARTIALLY_PAID');
    const pendingFees = pendingFeeRecords.reduce((sum, f) => sum + f.outstandingAmount, 0);

    const overdueFeeRecords = db.feeRecords.filter((f) => f.status === 'OVERDUE');
    const overdueFees = overdueFeeRecords.reduce((sum, f) => sum + f.outstandingAmount, 0);

    const partialCount = db.feeRecords.filter((f) => f.status === 'PARTIALLY_PAID').length;

    const newAdmissions = db.students.filter((s) => format(new Date(s.admissionDate), 'yyyy-MM') === currentMonthStr).length;

    return {
      totalStudents,
      activeStudents,
      todayCollection,
      monthlyCollection,
      pendingFees,
      overdueFees,
      partialCount,
      newAdmissions,
    };
  }

  public static getFeeStatusDistribution(db: InMemoryDB) {
    const counts = { PAID: 0, PARTIALLY_PAID: 0, DUE: 0, OVERDUE: 0, UPCOMING: 0, WAIVED: 0, CANCELLED: 0 };
    for (const f of db.feeRecords) {
      if (counts[f.status] !== undefined) {
        counts[f.status]++;
      }
    }
    return [
      { name: 'Paid', value: counts.PAID, color: '#10b981' },
      { name: 'Partial', value: counts.PARTIALLY_PAID, color: '#f59e0b' },
      { name: 'Due', value: counts.DUE, color: '#3b82f6' },
      { name: 'Overdue', value: counts.OVERDUE, color: '#ef4444' },
      { name: 'Upcoming', value: counts.UPCOMING, color: '#8b5cf6' },
    ];
  }
}

export class ReportsService {
  public static exportToCSV(data: Record<string, any>[], headers: { key: string; label: string }[]): string {
    if (!data || data.length === 0) {
      return headers.map((h) => `"${h.label}"`).join(',') + '\n';
    }

    const headerLine = headers.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');
    const rows = data.map((row) =>
      headers
        .map((h) => {
          const val = row[h.key];
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    );

    return [headerLine, ...rows].join('\n') + '\n';
  }
}

export class AuthService {
  public static createFakeJWT(payload: any, secret: string, expiresInSeconds: number = 3600): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const body = Buffer.from(JSON.stringify({ ...payload, exp, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
    const sig = Buffer.from(`${header}.${body}.${secret}`).toString('base64url');
    return `${header}.${body}.${sig}`;
  }

  public static verifyFakeJWT(token: string, secret: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Malformed token');
    const [header, body, sig] = parts;
    const expectedSig = Buffer.from(`${header}.${body}.${secret}`).toString('base64url');
    if (sig !== expectedSig) throw new Error('Invalid signature');

    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Token expired');
    }
    return decoded;
  }

  public static simulateMiddleware(pathname: string, authCookie?: string, secret = 'super-secret'): { status: number; redirect?: string } {
    // Public paths
    if (pathname === '/login' || pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/documents/')) {
      return { status: 200 };
    }

    if (!authCookie) {
      if (pathname.startsWith('/api/')) {
        return { status: 401 };
      }
      return { status: 307, redirect: '/login' };
    }

    try {
      this.verifyFakeJWT(authCookie, secret);
      return { status: 200 };
    } catch {
      if (pathname.startsWith('/api/')) {
        return { status: 401 };
      }
      return { status: 307, redirect: '/login' };
    }
  }
}

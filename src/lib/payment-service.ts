import { PrismaClient, PaymentMethod, FeeStatus, Prisma } from '@prisma/client';
import prisma from './prisma';

export interface RecordPaymentInput {
  feeRecordId: string;
  amount: number;
  paymentMethod: PaymentMethod | 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
  transactionId?: string | null;
  paymentDate?: Date | string | null;
  notes?: string | null;
  recordedByUserId?: string | null;
  createdById?: string | null;
}

export interface RecordPaymentResult {
  payment: any;
  feeRecord: any;
  receiptNumber: string;
  documentToken: string;
  documentUrl: string;
}

export interface ListPaymentsOptions {
  studentId?: string;
  feeRecordId?: string;
  classId?: string;
  paymentMethod?: PaymentMethod | string;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'paymentDate' | 'createdAt' | 'amount' | 'receiptNumber';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Generates a sequential, formatted receipt number DPR-RC-{YEAR}-{SEQ}
 * (e.g. DPR-RC-2026-0001).
 */
export async function generateReceiptNumber(
  prismaClient: PrismaClient | Prisma.TransactionClient | any = prisma,
  year: number = new Date().getFullYear()
): Promise<string> {
  const prefix = `DPR-RC-${year}-`;

  const latestPayment = await prismaClient.payment.findFirst({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNumber: 'desc',
    },
    select: {
      receiptNumber: true,
    },
  });

  let maxSeq = 0;
  if (latestPayment && latestPayment.receiptNumber) {
    const parts = latestPayment.receiptNumber.split('-');
    const seq = parseInt(parts[3] || '0', 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSeq = maxSeq + 1;
  return `DPR-RC-${year}-${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Atomically records a full or partial payment against a fee record.
 * Executes within a database transaction:
 * 1. Validates fee record exists
 * 2. Checks overpayment guard (amount <= outstandingAmount)
 * 3. Creates Payment record with unique receipt number DPR-RC-{YEAR}-{SEQ}
 * 4. Updates FeeRecord balances (paidAmount, outstandingAmount) and status (PAID / PARTIALLY_PAID)
 * 5. Generates public Document token for on-demand PDF receipt streaming
 * 6. Emits AuditLog entry
 */
export async function recordPayment(
  input: RecordPaymentInput,
  prismaClient: PrismaClient | any = prisma
): Promise<RecordPaymentResult> {
  const paymentAmount = Number(input.amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }

  return await prismaClient.$transaction(async (tx: Prisma.TransactionClient | any) => {
    // 1. Fetch fee record with student and class relation
    const fee = await tx.feeRecord.findUnique({
      where: { id: input.feeRecordId },
      include: {
        student: {
          include: { class: true },
        },
        class: true,
      },
    });

    if (!fee) {
      throw new Error(`Fee record ${input.feeRecordId} not found`);
    }

    // 2. Overpayment validation guard
    if (paymentAmount > fee.outstandingAmount) {
      throw new Error(
        `Payment amount (₹${paymentAmount}) cannot exceed outstanding balance of ₹${fee.outstandingAmount}`
      );
    }

    const pDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
    const year = pDate.getFullYear();

    // 3. Generate unique sequential receipt number
    const receiptNumber = await generateReceiptNumber(tx, year);

    const userId = input.recordedByUserId || input.createdById || null;

    // 4. Create Payment record
    const payment = await tx.payment.create({
      data: {
        receiptNumber,
        feeRecordId: fee.id,
        studentId: fee.studentId,
        amount: paymentAmount,
        paymentMethod: (input.paymentMethod || 'CASH') as PaymentMethod,
        transactionId: input.transactionId || null,
        notes: input.notes || null,
        paymentDate: pDate,
        recordedByUserId: userId,
      },
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            name: true,
            mobile: true,
            whatsappNumber: true,
            classId: true,
          },
        },
        feeRecord: true,
      },
    });

    // 5. Compute new balances and status
    const newPaidAmount = fee.paidAmount + paymentAmount;
    const newOutstandingAmount = Math.max(0, fee.outstandingAmount - paymentAmount);
    const newStatus: FeeStatus = newOutstandingAmount === 0 ? FeeStatus.PAID : FeeStatus.PARTIALLY_PAID;

    const updatedFeeRecord = await tx.feeRecord.update({
      where: { id: fee.id },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstandingAmount,
        status: newStatus,
      },
      include: {
        student: {
          include: { class: true },
        },
        class: true,
      },
    });

    // 6. Create secure UUID document token for PDF receipt
    const documentToken = crypto.randomUUID();
    await tx.document.create({
      data: {
        token: documentToken,
        documentType: 'RECEIPT',
        referenceId: payment.id,
        studentId: fee.studentId,
        metadata: {
          receiptNumber,
          paymentId: payment.id,
          feeRecordId: fee.id,
          studentId: fee.studentId,
          studentName: fee.student?.name,
          studentCode: fee.student?.studentCode,
          className: fee.student?.class?.name,
          amount: paymentAmount,
          paidAmount: newPaidAmount,
          outstandingAmount: newOutstandingAmount,
          paymentMethod: input.paymentMethod,
          transactionId: input.transactionId || null,
          paymentDate: pDate.toISOString(),
          billingPeriodStart: fee.billingPeriodStart,
          billingPeriodEnd: fee.billingPeriodEnd,
        },
        expiresAt: null,
      },
    });

    // 7. Create Audit Log
    await tx.auditLog.create({
      data: {
        userId,
        action: 'PAYMENT_RECORDED',
        entity: 'PAYMENT',
        entityId: payment.id,
        details: {
          receiptNumber,
          amount: paymentAmount,
          feeRecordId: fee.id,
          studentId: fee.studentId,
          paymentMethod: input.paymentMethod,
          newStatus,
          newPaidAmount,
          remainingOutstanding: newOutstandingAmount,
        },
      },
    });

    return {
      payment,
      feeRecord: updatedFeeRecord,
      receiptNumber,
      documentToken,
      documentUrl: `/api/documents/${documentToken}`,
    };
  });
}

/**
 * Retrieves payment details by Payment ID with full relations.
 */
export async function getPaymentById(
  paymentId: string,
  prismaClient: PrismaClient | any = prisma
) {
  return await prismaClient.payment.findUnique({
    where: { id: paymentId },
    include: {
      student: {
        include: {
          class: true,
        },
      },
      feeRecord: {
        include: {
          class: true,
        },
      },
      recordedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Retrieves payment details by Receipt Number.
 */
export async function getPaymentByReceiptNumber(
  receiptNumber: string,
  prismaClient: PrismaClient | any = prisma
) {
  return await prismaClient.payment.findUnique({
    where: { receiptNumber },
    include: {
      student: {
        include: {
          class: true,
        },
      },
      feeRecord: {
        include: {
          class: true,
        },
      },
    },
  });
}

/**
 * Lists payments with pagination, multi-field filtering, and aggregation.
 */
export async function listPayments(
  options: ListPaymentsOptions = {},
  prismaClient: PrismaClient | any = prisma
) {
  const {
    studentId,
    feeRecordId,
    classId,
    paymentMethod,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 20,
    sortBy = 'paymentDate',
    sortOrder = 'desc',
  } = options;

  const where: Prisma.PaymentWhereInput = {};

  if (studentId) {
    where.studentId = studentId;
  }

  if (feeRecordId) {
    where.feeRecordId = feeRecordId;
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod as PaymentMethod;
  }

  if (classId) {
    where.student = {
      classId: classId,
    };
  }

  if (startDate || endDate) {
    where.paymentDate = {};
    if (startDate) {
      where.paymentDate.gte = new Date(startDate);
    }
    if (endDate) {
      where.paymentDate.lte = new Date(endDate);
    }
  }

  if (search && search.trim()) {
    const searchTerm = search.trim();
    where.OR = [
      { receiptNumber: { contains: searchTerm, mode: 'insensitive' } },
      { transactionId: { contains: searchTerm, mode: 'insensitive' } },
      {
        student: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { studentCode: { contains: searchTerm, mode: 'insensitive' } },
            { mobile: { contains: searchTerm } },
          ],
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, payments, aggregations] = await Promise.all([
    prismaClient.payment.count({ where }),
    prismaClient.payment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentCode: true,
            name: true,
            mobile: true,
            whatsappNumber: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        feeRecord: {
          select: {
            id: true,
            billingPeriodStart: true,
            billingPeriodEnd: true,
            dueDate: true,
            totalAmount: true,
            paidAmount: true,
            outstandingAmount: true,
            status: true,
          },
        },
        recordedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),
    prismaClient.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    payments,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    summary: {
      totalAmount: aggregations._sum.amount || 0,
      totalTransactions: aggregations._count.id || 0,
    },
  };
}

export const PaymentEngine = {
  generateReceiptNumber,
  recordPayment,
  getPaymentById,
  getPaymentByReceiptNumber,
  listPayments,
};

export default PaymentEngine;

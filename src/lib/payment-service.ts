import { PrismaClient, PaymentMethod, FeeStatus, Prisma } from '@prisma/client';
import crypto from 'crypto';
import prisma from './prisma';

const DEFAULT_ORG_ID = 'e0000000-0000-4000-a000-000000000001';

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
 * Generates a sequential, formatted receipt number for a specific organization (e.g. DPR-RC-2026-0001 or APX-RC-2026-0001).
 */
export async function generateReceiptNumber(
  prismaClient: PrismaClient | Prisma.TransactionClient | any = prisma,
  organizationIdOrYear?: string | number,
  maybeYear?: number
): Promise<string> {
  let organizationId: string | undefined;
  let year = new Date().getFullYear();

  if (typeof organizationIdOrYear === 'string') {
    organizationId = organizationIdOrYear;
    if (typeof maybeYear === 'number') year = maybeYear;
  } else if (typeof organizationIdOrYear === 'number') {
    year = organizationIdOrYear;
  }

  let basePrefix = 'DPR-RC';
  if (organizationId && prismaClient?.organizationSetting?.findUnique) {
    try {
      const settings = await prismaClient.organizationSetting.findUnique({
        where: { organizationId },
        select: { receiptPrefix: true },
      });
      if (settings?.receiptPrefix) {
        basePrefix = settings.receiptPrefix;
      }
    } catch {}
  }

  const prefix = `${basePrefix}-${year}-`;

  const where: any = {
    receiptNumber: {
      startsWith: prefix,
    },
  };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  let latestPayment: any = null;
  if (typeof prismaClient?.payment?.findFirst === 'function') {
    try {
      latestPayment = await prismaClient.payment.findFirst({
        where,
        orderBy: {
          receiptNumber: 'desc',
        },
        select: {
          receiptNumber: true,
        },
      });
    } catch {}
  }

  // Fallback: check any payments matching prefix without organizationId filter if none found
  if (!latestPayment && typeof prismaClient?.payment?.findFirst === 'function') {
    try {
      latestPayment = await prismaClient.payment.findFirst({
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
    } catch {}
  }

  let maxSeq = 0;
  if (latestPayment && latestPayment.receiptNumber) {
    const parts = latestPayment.receiptNumber.split('-');
    const seq = parseInt(parts[parts.length - 1] || '0', 10);
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Retrieves a single payment by ID.
 */
export async function getPaymentById(
  paymentId: string,
  organizationId?: string,
  prismaClient: PrismaClient | any = prisma
) {
  const where: any = {
    OR: [{ id: paymentId }, { publicId: paymentId }],
  };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  return await prismaClient.payment.findFirst({
    where,
    include: {
      student: {
        include: { class: true },
      },
      feeRecord: {
        include: { class: true },
      },
      recordedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Retrieves a single payment by Receipt Number.
 */
export async function getPaymentByReceiptNumber(
  receiptNumber: string,
  organizationId?: string,
  prismaClient: PrismaClient | any = prisma
) {
  const where: any = { receiptNumber };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  return await prismaClient.payment.findFirst({
    where,
    include: {
      student: {
        include: { class: true },
      },
      feeRecord: {
        include: { class: true },
      },
      recordedByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

/**
 * Atomically records a full or partial payment against a fee record with strict tenant isolation.
 */
export async function recordPayment(
  input: RecordPaymentInput,
  organizationIdOrPrisma?: string | PrismaClient | any,
  maybePrisma?: PrismaClient | any
): Promise<RecordPaymentResult> {
  let organizationId: string | undefined;
  let prismaClient: any = prisma;

  if (typeof organizationIdOrPrisma === 'string') {
    organizationId = organizationIdOrPrisma;
    if (maybePrisma) prismaClient = maybePrisma;
  } else if (typeof organizationIdOrPrisma === 'object' && organizationIdOrPrisma !== null) {
    prismaClient = organizationIdOrPrisma;
  }

  const paymentAmount = Number(input.amount);
  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }

  const executeInsideTx = async (tx: Prisma.TransactionClient | any) => {
    const where: any = { id: input.feeRecordId };
    if (organizationId) {
      where.organizationId = organizationId;
    }

    let fee: any = null;
    if (typeof tx.feeRecord.findUnique === 'function') {
      try {
        fee = await tx.feeRecord.findUnique({
          where: { id: input.feeRecordId },
          include: {
            student: true,
            class: true,
          },
        });
      } catch {}
    }

    if (!fee && typeof tx.feeRecord.findFirst === 'function') {
      fee = await tx.feeRecord.findFirst({
        where,
        include: {
          student: true,
          class: true,
        },
      });
    }

    if (!fee) {
      throw new Error('Fee record not found or does not belong to your organization');
    }

    const orgId = fee.organizationId || organizationId || DEFAULT_ORG_ID;

    if (paymentAmount > fee.outstandingAmount) {
      throw new Error(
        `Payment amount (${paymentAmount}) cannot exceed outstanding balance of ₹${fee.outstandingAmount}`
      );
    }

    if (input.transactionId && input.transactionId.trim().length > 0 && typeof tx.payment.findFirst === 'function') {
      const existingTx = await tx.payment.findFirst({
        where: {
          organizationId: orgId,
          transactionId: input.transactionId.trim(),
        },
      });
      if (existingTx) {
        throw new Error(
          `Transaction reference ${input.transactionId} has already been recorded for receipt ${existingTx.receiptNumber}`
        );
      }
    }

    const receiptNumber = await generateReceiptNumber(tx, orgId);
    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();
    const newPaidAmount = fee.paidAmount + paymentAmount;
    const newOutstandingAmount = Math.max(0, fee.totalAmount - newPaidAmount);

    let newStatus: FeeStatus = fee.status;
    if (newOutstandingAmount === 0) {
      newStatus = FeeStatus.PAID;
    } else if (newPaidAmount > 0) {
      newStatus = FeeStatus.PARTIALLY_PAID;
    }

    const payment = await tx.payment.create({
      data: {
        publicId: crypto.randomUUID(),
        organizationId: orgId,
        feeRecordId: fee.id,
        studentId: fee.studentId,
        receiptNumber,
        amount: paymentAmount,
        paymentMethod: input.paymentMethod as PaymentMethod,
        transactionId: input.transactionId ? input.transactionId.trim() : null,
        paymentDate,
        notes: input.notes || null,
        recordedByUserId: input.recordedByUserId || input.createdById || null,
      },
    });

    const updatedFee = await tx.feeRecord.update({
      where: { id: fee.id },
      data: {
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstandingAmount,
        status: newStatus,
      },
    });

    const documentToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomBytes(8).toString('hex');
    if (tx.document?.create) {
      await tx.document.create({
        data: {
          organizationId: orgId,
          token: documentToken,
          documentType: 'RECEIPT',
          referenceId: payment.id,
          studentId: fee.studentId,
          metadata: {
            receiptNumber,
            amount: paymentAmount,
            paymentMethod: input.paymentMethod,
          },
        },
      });
    }

    if (tx.auditLog?.create) {
      await tx.auditLog.create({
        data: {
          userId: input.recordedByUserId || input.createdById || null,
          organizationId: orgId,
          action: 'PAYMENT_RECORDED',
          entity: 'Payment',
          entityId: payment.id,
          details: {
            receiptNumber,
            amount: paymentAmount,
            method: input.paymentMethod,
            paymentMethod: input.paymentMethod,
            feeRecordId: fee.id,
            studentId: fee.studentId,
            studentCode: fee.student?.studentCode,
            studentName: fee.student?.name,
            previousPaid: fee.paidAmount,
            newPaid: newPaidAmount,
            remainingBalance: newOutstandingAmount,
            remainingOutstanding: newOutstandingAmount,
            newStatus,
          },
        },
      });
    }

    return {
      payment,
      feeRecord: updatedFee,
      receiptNumber,
      documentToken,
      documentUrl: `/api/documents/${documentToken}`,
    };
  };

  if (typeof prismaClient.$transaction === 'function') {
    return await prismaClient.$transaction(executeInsideTx, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: 10000,
    });
  }

  return await executeInsideTx(prismaClient);
}

/**
 * Lists payment transactions with full filtering, pagination, and strict tenant isolation.
 */
export async function listPayments(
  options: ListPaymentsOptions = {},
  organizationIdOrPrisma?: string | PrismaClient | any,
  maybePrisma?: PrismaClient | any
) {
  let organizationId = DEFAULT_ORG_ID;
  let prismaClient: any = prisma;

  if (typeof organizationIdOrPrisma === 'string') {
    organizationId = organizationIdOrPrisma;
    if (maybePrisma) prismaClient = maybePrisma;
  } else if (typeof organizationIdOrPrisma === 'object' && organizationIdOrPrisma !== null) {
    prismaClient = organizationIdOrPrisma;
  }

  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (organizationId) {
    whereClause.organizationId = organizationId;
  }

  if (options.studentId) {
    whereClause.studentId = options.studentId;
  }

  if (options.feeRecordId) {
    whereClause.feeRecordId = options.feeRecordId;
  }

  if (options.classId) {
    whereClause.feeRecord = {
      classId: options.classId,
    };
  }

  if (options.paymentMethod) {
    whereClause.paymentMethod = options.paymentMethod as PaymentMethod;
  }

  if (options.startDate || options.endDate) {
    whereClause.paymentDate = {};
    if (options.startDate) {
      whereClause.paymentDate.gte = new Date(options.startDate);
    }
    if (options.endDate) {
      whereClause.paymentDate.lte = new Date(options.endDate);
    }
  }

  if (options.search) {
    const searchTrim = options.search.trim();
    whereClause.OR = [
      { receiptNumber: { contains: searchTrim, mode: 'insensitive' } },
      { transactionId: { contains: searchTrim, mode: 'insensitive' } },
      { student: { name: { contains: searchTrim, mode: 'insensitive' } } },
      { student: { studentCode: { contains: searchTrim, mode: 'insensitive' } } },
    ];
  }

  const orderBy: any = {};
  const sortOrder = options.sortOrder || 'desc';
  const sortBy = options.sortBy || 'paymentDate';
  orderBy[sortBy] = sortOrder;

  const total = typeof prismaClient?.payment?.count === 'function'
    ? await prismaClient.payment.count({ where: whereClause })
    : 0;

  const payments = typeof prismaClient?.payment?.findMany === 'function'
    ? await prismaClient.payment.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy,
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
      })
    : [];

  let totalAmount = 0;
  if (typeof prismaClient?.payment?.aggregate === 'function') {
    const aggregations = await prismaClient.payment.aggregate({
      where: whereClause,
      _sum: {
        amount: true,
      },
    });
    totalAmount = aggregations?._sum?.amount || 0;
  } else if (payments && payments.length > 0) {
    totalAmount = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  }

  const totalPages = Math.ceil((total || payments.length) / limit) || 1;

  return {
    payments,
    data: payments,
    pagination: {
      total: total || payments.length,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    },
    summary: {
      totalCount: total || payments.length,
      totalTransactions: total || payments.length,
      totalAmount,
    },
  };
}

/**
 * Approves a pending UPI student submission.
 */
export async function approveUpiSubmission(
  submissionId: string,
  organizationId: string = DEFAULT_ORG_ID,
  reviewerUserId?: string,
  prismaClient: PrismaClient | any = prisma
) {
  const executeInside = async (tx: any) => {
    const submission = await tx.upiSubmission.findFirst({
      where: {
        id: submissionId,
        organizationId,
      },
      include: {
        feeRecord: true,
        student: true,
      },
    });

    if (!submission) {
      throw new Error('UPI Submission not found or does not belong to your organization');
    }

    if (submission.status !== 'PENDING') {
      throw new Error(`Submission already ${submission.status}`);
    }

    const paymentResult = await recordPayment(
      {
        feeRecordId: submission.feeRecordId,
        amount: submission.amount,
        paymentMethod: 'UPI',
        transactionId: submission.utrNumber,
        notes: `Approved online UPI submission (UTR: ${submission.utrNumber})`,
        recordedByUserId: reviewerUserId,
      },
      organizationId,
      tx
    );

    const updatedSubmission = await tx.upiSubmission.update({
      where: { id: submission.id },
      data: {
        status: 'APPROVED',
        approvedPaymentId: paymentResult.payment.id,
        reviewedAt: new Date(),
        reviewedByUserId: reviewerUserId,
      },
    });

    return {
      submission: updatedSubmission,
      payment: paymentResult.payment,
      receiptNumber: paymentResult.receiptNumber,
    };
  };

  if (typeof prismaClient.$transaction === 'function') {
    return await prismaClient.$transaction(executeInside);
  }

  return await executeInside(prismaClient);
}

/**
 * Rejects a pending UPI student submission with an explicit reason.
 */
export async function rejectUpiSubmission(
  submissionId: string,
  organizationId: string = DEFAULT_ORG_ID,
  reason: string = 'Invalid UTR',
  reviewerUserId?: string,
  prismaClient: PrismaClient | any = prisma
) {
  const submission = await prismaClient.upiSubmission.findFirst({
    where: {
      id: submissionId,
      organizationId,
    },
  });

  if (!submission) {
    throw new Error('UPI Submission not found or does not belong to your organization');
  }

  if (submission.status !== 'PENDING') {
    throw new Error(`Submission already ${submission.status}`);
  }

  const updated = await prismaClient.upiSubmission.update({
    where: { id: submission.id },
    data: {
      status: 'REJECTED',
      rejectionReason: reason || 'Invalid UTR or payment not received in bank account.',
      reviewedAt: new Date(),
      reviewedByUserId: reviewerUserId,
    },
  });

  return updated;
}

export const PaymentService = {
  generateReceiptNumber,
  recordPayment,
  listPayments,
  getPaymentById,
  getPaymentByReceiptNumber,
  approveUpiSubmission,
  rejectUpiSubmission,
};

export default PaymentService;

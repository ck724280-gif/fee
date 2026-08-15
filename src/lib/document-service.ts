import { PrismaClient, DocumentType, Prisma } from '@prisma/client';
import prisma from './prisma';

export interface CreateDocumentTokenOptions {
  studentId?: string | null;
  metadata?: Record<string, any> | null;
  expiresAt?: Date | string | null;
  expiryDays?: number | null;
}

export class DocumentNotFoundError extends Error {
  statusCode = 404;
  constructor(message = 'Document not found or access revoked') {
    super(message);
    this.name = 'DocumentNotFoundError';
  }
}

export class DocumentExpiredError extends Error {
  statusCode = 410;
  constructor(message = 'This document link has expired. Please request a new link.') {
    super(message);
    this.name = 'DocumentExpiredError';
  }
}

/**
 * Creates a secure random UUID document token in the database.
 */
export async function createDocumentToken(
  documentType: DocumentType | 'RECEIPT' | 'REMINDER' | 'STATEMENT' | 'REPORT',
  referenceId: string,
  options: CreateDocumentTokenOptions = {},
  prismaClient: PrismaClient | Prisma.TransactionClient | any = prisma
) {
  const token = crypto.randomUUID();

  let expiresAt: Date | null = null;
  if (options.expiresAt) {
    expiresAt = new Date(options.expiresAt);
  } else if (options.expiryDays && options.expiryDays > 0) {
    expiresAt = new Date(Date.now() + options.expiryDays * 24 * 60 * 60 * 1000);
  }

  const document = await prismaClient.document.create({
    data: {
      token,
      documentType: documentType as DocumentType,
      referenceId,
      studentId: options.studentId || null,
      metadata: options.metadata || undefined,
      expiresAt,
    },
  });

  return document;
}

/**
 * Validates document token and verifies expiration against evaluation date.
 */
export async function verifyAndGetDocument(
  token: string,
  currentDate: Date = new Date(),
  prismaClient: PrismaClient | any = prisma
) {
  if (!token || typeof token !== 'string' || token.trim() === '') {
    throw new DocumentNotFoundError('Invalid token format');
  }

  const doc = await prismaClient.document.findUnique({
    where: { token: token.trim() },
    include: {
      student: {
        include: {
          class: true,
        },
      },
    },
  });

  if (!doc) {
    throw new DocumentNotFoundError(`Document not found for token: ${token} (404)`);
  }

  if (doc.expiresAt && currentDate.getTime() > new Date(doc.expiresAt).getTime()) {
    throw new DocumentExpiredError(`Document link has expired on ${doc.expiresAt.toISOString()} (410)`);
  }

  return doc;
}

/**
 * Creates a document token specifically for a Payment Receipt.
 */
export async function createReceiptDocumentToken(
  paymentId: string,
  expiryDays?: number | null,
  prismaClient: PrismaClient | any = prisma
) {
  const payment = await prismaClient.payment.findUnique({
    where: { id: paymentId },
    include: {
      student: { include: { class: true } },
      feeRecord: true,
    },
  });

  if (!payment) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  return await createDocumentToken(
    'RECEIPT',
    payment.id,
    {
      studentId: payment.studentId,
      metadata: {
        receiptNumber: payment.receiptNumber,
        paymentId: payment.id,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        studentName: payment.student?.name,
        className: payment.student?.class?.name,
      },
      expiryDays,
    },
    prismaClient
  );
}

/**
 * Creates a document token specifically for a Fee Reminder.
 */
export async function createReminderDocumentToken(
  feeRecordId: string,
  expiryDays?: number | null,
  prismaClient: PrismaClient | any = prisma
) {
  const feeRecord = await prismaClient.feeRecord.findUnique({
    where: { id: feeRecordId },
    include: {
      student: { include: { class: true } },
      class: true,
    },
  });

  if (!feeRecord) {
    throw new Error(`Fee record ${feeRecordId} not found`);
  }

  return await createDocumentToken(
    'REMINDER',
    feeRecord.id,
    {
      studentId: feeRecord.studentId,
      metadata: {
        feeRecordId: feeRecord.id,
        studentId: feeRecord.studentId,
        studentName: feeRecord.student?.name,
        className: feeRecord.student?.class?.name,
        outstandingAmount: feeRecord.outstandingAmount,
        dueDate: feeRecord.dueDate.toISOString(),
      },
      expiryDays: expiryDays ?? 30, // Default 30-day link for reminders
    },
    prismaClient
  );
}

/**
 * Assembles all required data for PDF rendering based on document type and token.
 */
export async function getDocumentDataForRendering(
  token: string,
  currentDate: Date = new Date(),
  prismaClient: PrismaClient | any = prisma
) {
  const doc = await verifyAndGetDocument(token, currentDate, prismaClient);

  // Fetch institute settings for branding
  const instituteSettings = await prismaClient.instituteSetting.findFirst();
  const defaultBranding = {
    instituteName: instituteSettings?.instituteName || 'DPR Private Tuition',
    tagline: instituteSettings?.tagline || 'Excellence in Academic Coaching & Guidance',
    address: instituteSettings?.address || 'Station Road, Near City Center, West Bengal',
    phone: instituteSettings?.phone || '+91 98765 43210',
    email: instituteSettings?.email || 'info@dprtuition.com',
    currencySymbol: instituteSettings?.currencySymbol || '₹',
    upiId: 'dprtuition@upi',
    bankAccountDetails: {
      bankName: 'State Bank of India',
      accountNumber: '919876543210',
      ifscCode: 'SBIN0001234',
      accountHolder: 'DPR Private Tuition',
    },
  };

  if (doc.documentType === 'RECEIPT') {
    const payment = await prismaClient.payment.findUnique({
      where: { id: doc.referenceId },
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
          },
        },
      },
    });

    if (!payment) {
      throw new DocumentNotFoundError(`Associated payment record not found for document ${token}`);
    }

    return {
      documentType: 'RECEIPT' as const,
      document: doc,
      institute: defaultBranding,
      payment: {
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
        paymentDate: payment.paymentDate,
        notes: payment.notes,
        recordedBy: payment.recordedByUser?.name,
      },
      student: {
        id: payment.student.id,
        studentCode: payment.student.studentCode,
        name: payment.student.name,
        fatherName: payment.student.fatherName,
        mobile: payment.student.mobile,
        whatsappNumber: payment.student.whatsappNumber,
        className: payment.student.class.name,
      },
      feeRecord: {
        id: payment.feeRecord.id,
        billingPeriodStart: payment.feeRecord.billingPeriodStart,
        billingPeriodEnd: payment.feeRecord.billingPeriodEnd,
        dueDate: payment.feeRecord.dueDate,
        baseAmount: payment.feeRecord.baseAmount,
        admissionFeeAmount: payment.feeRecord.admissionFeeAmount,
        discountAmount: payment.feeRecord.discountAmount,
        lateFeeAmount: payment.feeRecord.lateFeeAmount,
        totalAmount: payment.feeRecord.totalAmount,
        paidAmount: payment.feeRecord.paidAmount,
        outstandingAmount: payment.feeRecord.outstandingAmount,
        status: payment.feeRecord.status,
      },
      authorizedSignature: 'DPR Authorized Signatory',
    };
  } else if (doc.documentType === 'REMINDER') {
    const feeRecord = await prismaClient.feeRecord.findUnique({
      where: { id: doc.referenceId },
      include: {
        student: {
          include: {
            class: true,
          },
        },
        class: true,
      },
    });

    if (!feeRecord) {
      throw new DocumentNotFoundError(`Associated fee record not found for document ${token}`);
    }

    return {
      documentType: 'REMINDER' as const,
      document: doc,
      institute: defaultBranding,
      student: {
        id: feeRecord.student.id,
        studentCode: feeRecord.student.studentCode,
        name: feeRecord.student.name,
        fatherName: feeRecord.student.fatherName,
        mobile: feeRecord.student.mobile,
        whatsappNumber: feeRecord.student.whatsappNumber,
        className: feeRecord.class.name,
      },
      feeRecord: {
        id: feeRecord.id,
        billingPeriodStart: feeRecord.billingPeriodStart,
        billingPeriodEnd: feeRecord.billingPeriodEnd,
        dueDate: feeRecord.dueDate,
        baseAmount: feeRecord.baseAmount,
        admissionFeeAmount: feeRecord.admissionFeeAmount,
        discountAmount: feeRecord.discountAmount,
        lateFeeAmount: feeRecord.lateFeeAmount,
        totalAmount: feeRecord.totalAmount,
        paidAmount: feeRecord.paidAmount,
        outstandingAmount: feeRecord.outstandingAmount,
        status: feeRecord.status,
      },
    };
  }

  throw new Error(`Unsupported document type for rendering: ${doc.documentType}`);
}

export const DocumentService = {
  createDocumentToken,
  verifyAndGetDocument,
  createReceiptDocumentToken,
  createReminderDocumentToken,
  getDocumentDataForRendering,
};

export default DocumentService;

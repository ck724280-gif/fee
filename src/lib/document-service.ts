import { PrismaClient, DocumentType, Prisma } from '@prisma/client';
import crypto from 'crypto';
import prisma from './prisma';

const DEFAULT_ORG_ID = 'e0000000-0000-4000-a000-000000000001';

export interface CreateDocumentTokenOptions {
  studentId?: string | null;
  metadata?: Record<string, any> | null;
  expiresAt?: Date | string | null;
  expiryDays?: number | null;
}

export class DocumentNotFoundError extends Error {
  statusCode = 404;
  constructor(message = 'Document not found or access revoked (404 Not Found)') {
    super(message);
    this.name = 'DocumentNotFoundError';
  }
}

export class DocumentExpiredError extends Error {
  statusCode = 410;
  constructor(message = 'This document link has expired (410 Gone). Please request a new link.') {
    super(message);
    this.name = 'DocumentExpiredError';
  }
}

/**
 * Creates a secure random UUID document token scoped to an organization.
 */
export async function createDocumentToken(
  documentType: DocumentType | 'RECEIPT' | 'REMINDER' | 'STATEMENT' | 'REPORT',
  referenceId: string,
  arg3?: string | CreateDocumentTokenOptions | any,
  arg4?: CreateDocumentTokenOptions | any,
  arg5?: any
) {
  let organizationId = DEFAULT_ORG_ID;
  let options: CreateDocumentTokenOptions = {};
  let prismaClient: any = prisma;

  if (typeof arg3 === 'string') {
    organizationId = arg3;
    if (arg4 && !arg4.document && !arg4.$transaction) {
      options = arg4;
      if (arg5) prismaClient = arg5;
    } else if (arg4 && (arg4.document || arg4.$transaction)) {
      prismaClient = arg4;
    }
  } else if (typeof arg3 === 'object' && arg3 !== null) {
    if (arg3.document || arg3.$transaction) {
      prismaClient = arg3;
    } else {
      options = arg3;
      if (arg4 && (arg4.document || arg4.$transaction)) {
        prismaClient = arg4;
      } else if (typeof arg4 === 'string') {
        organizationId = arg4;
      }
    }
  }

  const token = crypto.randomUUID();

  let expiresAt: Date | null = null;
  if (options.expiresAt) {
    expiresAt = new Date(options.expiresAt);
  } else if (options.expiryDays && options.expiryDays > 0) {
    expiresAt = new Date(Date.now() + options.expiryDays * 24 * 60 * 60 * 1000);
  }

  const document = await prismaClient.document.create({
    data: {
      organizationId,
      token,
      documentType: documentType as DocumentType,
      referenceId,
      studentId: options.studentId || null,
      metadata: options.metadata || undefined,
      expiresAt,
    },
  });

  return {
    ...document,
    document,
    token,
    url: `/api/documents/${token}`,
    publicUrl: `/api/documents/${token}`,
    downloadUrl: `/api/documents/download/${token}`,
  };
}

/**
 * Validates a document token. If expired or non-existent, throws appropriate domain errors.
 */
export async function verifyAndGetDocument(
  token: string,
  arg2?: string | Date | PrismaClient | any,
  arg3?: PrismaClient | any
) {
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new DocumentNotFoundError();
  }

  let organizationId: string | undefined;
  let evalDate = new Date();
  let prismaClient: any = prisma;

  if (arg2 instanceof Date) {
    evalDate = arg2;
    if (arg3) prismaClient = arg3;
  } else if (typeof arg2 === 'string') {
    organizationId = arg2;
    if (arg3) prismaClient = arg3;
  } else if (typeof arg2 === 'object' && arg2 !== null) {
    if (arg2.document || arg2.$transaction) {
      prismaClient = arg2;
    }
  }

  const doc = await prismaClient.document.findUnique({
    where: { token },
    include: {
      student: {
        include: { class: true },
      },
    },
  });

  if (!doc) {
    throw new DocumentNotFoundError();
  }

  if (organizationId && doc.organizationId && doc.organizationId !== organizationId) {
    throw new DocumentNotFoundError();
  }

  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < evalDate.getTime()) {
    throw new DocumentExpiredError();
  }

  return doc;
}

/**
 * Creates receipt document token helper.
 */
export async function createReceiptDocumentToken(
  paymentId: string,
  arg2?: string | number | CreateDocumentTokenOptions,
  arg3?: string | PrismaClient | any,
  arg4?: PrismaClient | any
) {
  let studentId: string | undefined;
  let organizationId = DEFAULT_ORG_ID;
  let options: CreateDocumentTokenOptions = { expiryDays: 365 };
  let prismaClient: any = prisma;

  if (typeof arg2 === 'string') {
    studentId = arg2;
    options.studentId = studentId;
  } else if (typeof arg2 === 'number') {
    options.expiryDays = arg2;
  } else if (typeof arg2 === 'object' && arg2 !== null) {
    options = { ...options, ...arg2 };
  }

  if (typeof arg3 === 'string') {
    organizationId = arg3;
    if (arg4) prismaClient = arg4;
  } else if (arg3) {
    prismaClient = arg3;
  }

  return await createDocumentToken(
    'RECEIPT',
    paymentId,
    organizationId,
    options,
    prismaClient
  );
}

/**
 * Creates reminder document token helper.
 */
export async function createReminderDocumentToken(
  feeRecordId: string,
  arg2?: string | number | CreateDocumentTokenOptions,
  arg3?: string | PrismaClient | any,
  arg4?: PrismaClient | any
) {
  let studentId: string | undefined;
  let organizationId = DEFAULT_ORG_ID;
  let options: CreateDocumentTokenOptions = { expiryDays: 30 };
  let prismaClient: any = prisma;

  if (typeof arg2 === 'string') {
    studentId = arg2;
    options.studentId = studentId;
  } else if (typeof arg2 === 'number') {
    options.expiryDays = arg2;
  } else if (typeof arg2 === 'object' && arg2 !== null) {
    options = { ...options, ...arg2 };
  }

  if (typeof arg3 === 'string') {
    organizationId = arg3;
    if (arg4) prismaClient = arg4;
  } else if (arg3) {
    prismaClient = arg3;
  }

  return await createDocumentToken(
    'REMINDER',
    feeRecordId,
    organizationId,
    options,
    prismaClient
  );
}

/**
 * Loads complete rendering data for either a RECEIPT or REMINDER document, including dynamic tenant settings.
 */
export async function getDocumentDataForRendering(
  token: string,
  arg2?: string | Date | PrismaClient | any,
  arg3?: PrismaClient | any
) {
  let organizationId: string | undefined;
  let evalDate = new Date();
  let prismaClient: any = prisma;

  if (arg2 instanceof Date) {
    evalDate = arg2;
    if (arg3) prismaClient = arg3;
  } else if (typeof arg2 === 'string') {
    organizationId = arg2;
    if (arg3) prismaClient = arg3;
  } else if (typeof arg2 === 'object' && arg2 !== null) {
    if (arg2.document || arg2.$transaction) {
      prismaClient = arg2;
    }
  }

  const document = await verifyAndGetDocument(token, evalDate, prismaClient);
  const orgId = document.organizationId || organizationId || DEFAULT_ORG_ID;

  let settings = null;
  if (typeof prismaClient?.organizationSetting?.findUnique === 'function') {
    try {
      settings = await prismaClient.organizationSetting.findUnique({
        where: { organizationId: orgId },
      });
    } catch {}
  }

  if (!settings && typeof prismaClient?.organizationSetting?.findFirst === 'function') {
    try {
      settings = await prismaClient.organizationSetting.findFirst();
    } catch {}
  }

  if (!settings && typeof prismaClient?.instituteSetting?.findFirst === 'function') {
    try {
      settings = await prismaClient.instituteSetting.findFirst();
    } catch {}
  }

  const defaultBranding = {
    instituteName: settings?.instituteName || 'DPR Private Tuition',
    tagline: settings?.tagline || 'Excellence in Academic Coaching & Guidance',
    address: settings?.address || 'Station Road, Near City Center, West Bengal',
    phone: settings?.phone || '+91 98765 43210',
    whatsapp: settings?.whatsapp || '+91 98765 43210',
    email: settings?.email || 'info@dprtuition.com',
    currencySymbol: settings?.currencySymbol || '₹',
    logoUrl: settings?.logoUrl || null,
    signatureUrl: settings?.signatureUrl || null,
    upiId: settings?.upiId || 'dprtuition@upi',
    upiPayeeName: settings?.upiPayeeName || 'DPR Private Tuition',
    upiEnabled: settings?.upiEnabled ?? true,
    customQrUrl: settings?.customQrUrl || null,
  };

  if (document.documentType === 'RECEIPT') {
    const payment = await prismaClient.payment.findUnique({
      where: { id: document.referenceId },
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

    if (!payment) {
      throw new DocumentNotFoundError('Associated payment record not found (404 Not Found)');
    }

    return {
      document,
      documentType: 'RECEIPT',
      type: 'RECEIPT',
      payment,
      student: payment.student,
      feeRecord: payment.feeRecord,
      institute: defaultBranding,
      settings: defaultBranding,
    };
  }

  if (document.documentType === 'REMINDER') {
    const feeRecord = await prismaClient.feeRecord.findUnique({
      where: { id: document.referenceId },
      include: {
        student: {
          include: { class: true },
        },
        class: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!feeRecord) {
      throw new DocumentNotFoundError('Associated fee record not found (404 Not Found)');
    }

    return {
      document,
      documentType: 'REMINDER',
      type: 'REMINDER',
      feeRecord,
      student: feeRecord.student,
      institute: defaultBranding,
      settings: defaultBranding,
    };
  }

  return {
    document,
    documentType: document.documentType,
    type: document.documentType,
    institute: defaultBranding,
    settings: defaultBranding,
  };
}

export const DocumentService = {
  createDocumentToken,
  verifyAndGetDocument,
  createReceiptDocumentToken,
  createReminderDocumentToken,
  getDocumentDataForRendering,
  DocumentNotFoundError,
  DocumentExpiredError,
};

export default DocumentService;

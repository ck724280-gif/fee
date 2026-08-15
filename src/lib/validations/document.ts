import { z } from 'zod';
import { DocumentType } from '@prisma/client';

export const generateDocumentSchema = z.object({
  documentType: z.nativeEnum(DocumentType, {
    errorMap: () => ({ message: 'Invalid document type' }),
  }),
  referenceId: z.string().min(1, 'Reference ID is required'),
  studentId: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
  expiresAt: z.union([z.string(), z.date()]).optional().nullable(),
  expiryDays: z.coerce.number().positive().optional().nullable(),
});

export const generateReminderDocSchema = z.object({
  feeRecordId: z.string().min(1, 'Fee record ID is required'),
  expiryDays: z.coerce.number().positive().optional(),
});

export const generateReceiptDocSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  expiryDays: z.coerce.number().positive().optional(),
});

export type GenerateDocumentInput = z.infer<typeof generateDocumentSchema>;
export type GenerateReminderDocInput = z.infer<typeof generateReminderDocSchema>;
export type GenerateReceiptDocInput = z.infer<typeof generateReceiptDocSchema>;

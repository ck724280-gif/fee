import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const recordPaymentSchema = z.object({
  feeRecordId: z.string().min(1, 'Fee record ID is required'),
  amount: z.number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' })
    .positive('Payment amount must be greater than zero'),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Invalid payment method' }),
  }).default(PaymentMethod.CASH),
  transactionId: z.string().trim().max(100, 'Transaction ID cannot exceed 100 characters').optional().nullable(),
  paymentDate: z.union([z.string(), z.date()]).optional().nullable(),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
  recordedByUserId: z.string().optional().nullable(),
  createdById: z.string().optional().nullable(),
});

export const paymentFilterSchema = z.object({
  studentId: z.string().optional(),
  feeRecordId: z.string().optional(),
  classId: z.string().optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['paymentDate', 'createdAt', 'amount', 'receiptNumber']).default('paymentDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type PaymentFilterInput = z.infer<typeof paymentFilterSchema>;

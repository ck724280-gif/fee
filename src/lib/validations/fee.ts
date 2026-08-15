import { z } from 'zod';
import { FeeStatus, FeeMode, DiscountType, LateFeeType } from '@prisma/client';

export const generateFeesSchema = z.object({
  studentId: z.string().optional(),
  classId: z.string().optional(),
  throughDate: z.string().optional(),
  currentDate: z.string().optional(),
});

export const feeFilterSchema = z.object({
  classId: z.string().optional(),
  studentId: z.string().optional(),
  status: z.nativeEnum(FeeStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['dueDate', 'createdAt', 'totalAmount', 'outstandingAmount', 'billingPeriodStart']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const updateFeeRecordSchema = z.object({
  status: z.nativeEnum(FeeStatus).optional(),
  notes: z.string().optional().nullable(),
  lateFeeAmount: z.number().min(0).optional(),
});

export type GenerateFeesInput = z.infer<typeof generateFeesSchema>;
export type FeeFilterInput = z.infer<typeof feeFilterSchema>;
export type UpdateFeeRecordInput = z.infer<typeof updateFeeRecordSchema>;

import { z } from 'zod';
import { FeeStatus, PaymentMethod } from '@prisma/client';

export const reportTypeEnum = z.enum([
  'MONTHLY_COLLECTION',
  'OVERDUE_FEES',
  'CLASS_WISE_REVENUE',
  'PAYMENT_METHOD_DISTRIBUTION',
  'STUDENT_STATEMENT',
  'ADMISSIONS_REPORT',
  'DISCOUNT_REPORT',
  'DAILY_COLLECTION',
]);

export const reportQuerySchema = z.object({
  type: reportTypeEnum.default('MONTHLY_COLLECTION'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  status: z.nativeEnum(FeeStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  search: z.string().optional(),
  currentDate: z.string().optional(),
});

export type ReportType = z.infer<typeof reportTypeEnum>;
export type ReportQueryInput = z.infer<typeof reportQuerySchema>;

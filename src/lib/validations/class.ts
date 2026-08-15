import { z } from 'zod';
import { ClassStatus, LateFeeType } from '@prisma/client';

export const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required').max(100),
  defaultMonthlyFee: z.coerce.number().min(0, 'Monthly fee must be >= 0'),
  defaultAdmissionFee: z.coerce.number().min(0, 'Admission fee must be >= 0').default(0),
  lateFeeEnabled: z.boolean().default(false),
  lateFeeType: z.nativeEnum(LateFeeType).default(LateFeeType.FIXED),
  lateFeeAmount: z.coerce.number().min(0, 'Late fee amount must be >= 0').default(0),
  graceDays: z.coerce.number().int().min(0, 'Grace days must be >= 0').default(0),
  status: z.nativeEnum(ClassStatus).default(ClassStatus.ACTIVE),
});

export const updateClassSchema = createClassSchema.partial();

export const classFilterSchema = z.object({
  search: z.string().optional(),
  status: z.nativeEnum(ClassStatus).optional(),
  includeStats: z.string().optional(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type ClassFilterInput = z.infer<typeof classFilterSchema>;

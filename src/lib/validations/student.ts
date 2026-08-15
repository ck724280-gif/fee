import { z } from 'zod';
import { FeeMode, DiscountType, StudentStatus, Gender } from '@prisma/client';

export const createStudentSchema = z.object({
  name: z.string().trim().min(1, 'Student name is required').max(100),
  fatherName: z.string().trim().min(1, "Father's name is required").max(100),
  motherName: z.string().trim().max(100).optional().nullable(),
  guardianName: z.string().trim().max(100).optional().nullable(),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number (starts with 6-9)'),
  whatsappNumber: z.string().trim().optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  dob: z.union([z.string(), z.date()]).optional().nullable(),
  gender: z.nativeEnum(Gender).default(Gender.MALE),
  school: z.string().trim().max(150).optional().nullable(),
  classId: z.string().min(1, 'Class selection is required'),
  admissionDate: z.union([z.string(), z.date()], { required_error: 'Admission date is required' }),
  joiningDate: z.union([z.string(), z.date()]).optional().nullable(),
  feeMode: z.nativeEnum(FeeMode).default(FeeMode.DEFAULT),
  customMonthlyFee: z.coerce.number().min(0).optional().nullable(),
  admissionFee: z.coerce.number().min(0).default(0),
  discountType: z.nativeEnum(DiscountType).default(DiscountType.NONE),
  discountValue: z.coerce.number().min(0).default(0),
  status: z.nativeEnum(StudentStatus).default(StudentStatus.ACTIVE),
  autoGenerateFees: z.boolean().optional().default(false),
}).refine(
  (data) => {
    if (data.feeMode === FeeMode.CUSTOM) {
      return data.customMonthlyFee !== undefined && data.customMonthlyFee !== null && data.customMonthlyFee >= 0;
    }
    return true;
  },
  {
    message: 'Custom monthly fee is required when Fee Mode is set to CUSTOM',
    path: ['customMonthlyFee'],
  }
);

export const updateStudentSchema = z.object({
  name: z.string().trim().min(1, 'Student name is required').max(100).optional(),
  fatherName: z.string().trim().min(1, "Father's name is required").max(100).optional(),
  motherName: z.string().trim().max(100).optional().nullable(),
  guardianName: z.string().trim().max(100).optional().nullable(),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Must be a valid 10-digit Indian mobile number').optional(),
  whatsappNumber: z.string().trim().optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  dob: z.union([z.string(), z.date()]).optional().nullable(),
  gender: z.nativeEnum(Gender).optional(),
  school: z.string().trim().max(150).optional().nullable(),
  classId: z.string().min(1).optional(),
  admissionDate: z.union([z.string(), z.date()]).optional(),
  joiningDate: z.union([z.string(), z.date()]).optional().nullable(),
  feeMode: z.nativeEnum(FeeMode).optional(),
  customMonthlyFee: z.coerce.number().min(0).optional().nullable(),
  admissionFee: z.coerce.number().min(0).optional(),
  discountType: z.nativeEnum(DiscountType).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  status: z.nativeEnum(StudentStatus).optional(),
});

export const studentQuerySchema = z.object({
  classId: z.string().optional(),
  status: z.nativeEnum(StudentStatus).optional(),
  feeMode: z.nativeEnum(FeeMode).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['studentCode', 'name', 'admissionDate', 'createdAt']).default('studentCode'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type StudentQueryInput = z.infer<typeof studentQuerySchema>;

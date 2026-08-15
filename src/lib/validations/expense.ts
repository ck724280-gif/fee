import { z } from 'zod';

export const ExpenseCategoryEnum = z.enum([
  'TEACHER_SALARY',
  'RENT',
  'ELECTRICITY_BILL',
  'STUDY_MATERIALS_PRINTING',
  'MARKETING_PROMOTION',
  'INTERNET_STATIONERY',
  'MAINTENANCE_REPAIRS',
  'OTHER',
]);

export const PaymentMethodEnum = z.enum([
  'CASH',
  'UPI',
  'BANK_TRANSFER',
  'CARD',
  'OTHER',
]);

export const createExpenseSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(100, 'Title cannot exceed 100 characters'),
  category: ExpenseCategoryEnum,
  amount: z.coerce.number().positive('Expense amount must be greater than 0'),
  expenseDate: z.string().or(z.date()).transform((val) => new Date(val)),
  paymentMethod: PaymentMethodEnum.default('CASH'),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  payeeName: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  receiptUrl: z.string().trim().url().optional().nullable().or(z.literal('')),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const EXPENSE_CATEGORY_LABELS: Record<z.infer<typeof ExpenseCategoryEnum>, { label: string; icon: string; color: string }> = {
  TEACHER_SALARY: { label: 'Teacher / Faculty Salary', icon: 'UserCheck', color: '#3B82F6' },
  RENT: { label: 'Premises Rent', icon: 'Building2', color: '#8B5CF6' },
  ELECTRICITY_BILL: { label: 'Electricity & Power', icon: 'Zap', color: '#F59E0B' },
  STUDY_MATERIALS_PRINTING: { label: 'Notes & Exam Printing', icon: 'BookOpen', color: '#10B981' },
  MARKETING_PROMOTION: { label: 'Marketing & Banners', icon: 'Megaphone', color: '#EC4899' },
  INTERNET_STATIONERY: { label: 'Wi-Fi & Stationery', icon: 'Wifi', color: '#06B6D4' },
  MAINTENANCE_REPAIRS: { label: 'Maintenance & Repairs', icon: 'Wrench', color: '#6366F1' },
  OTHER: { label: 'Miscellaneous / Other', icon: 'Package', color: '#64748B' },
};

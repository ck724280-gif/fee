import { z } from 'zod';

export const updateSettingsSchema = z.object({
  instituteName: z.string().trim().min(1, 'Institute name is required').max(150),
  tagline: z.string().trim().max(200).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  whatsapp: z.string().trim().max(50).optional().nullable(),
  email: z.string().trim().email('Must be a valid email').optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  receiptPrefix: z.string().trim().min(1).max(20).default('DPR-RC'),
  currencySymbol: z.string().trim().min(1).max(5).default('₹'),
  defaultGraceDays: z.coerce.number().int().min(0).default(0),
  upiId: z.string().trim().max(100).optional().nullable(),
  upiPayeeName: z.string().trim().max(150).optional().nullable(),
  upiEnabled: z.boolean().default(true),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

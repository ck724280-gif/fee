export type FeeModeType = 'DEFAULT' | 'CUSTOM';
export type DiscountType = 'NONE' | 'FIXED' | 'PERCENTAGE';
export type StudentStatusType = 'ACTIVE' | 'INACTIVE' | 'LEFT' | 'COMPLETED';
export type ClassStatusType = 'ACTIVE' | 'INACTIVE';
export type LateFeeType = 'FIXED' | 'PER_DAY';
export type GenderType = 'MALE' | 'FEMALE' | 'OTHER';
export type FeeStatusType = 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'WAIVED' | 'CANCELLED';
export type PaymentMethodType = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
export type DocumentType = 'RECEIPT' | 'REMINDER' | 'STATEMENT' | 'REPORT';

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface BillingCycleCalculation {
  cycleIndex: number;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  periodStartStr: string;
  periodEndStr: string;
  dueDateStr: string;
}

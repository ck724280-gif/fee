/**
 * WhatsApp Click-to-Chat Deep Linking & Messaging Engine
 * Formats Indian phone numbers and produces URL-encoded wa.me links
 * with customizable professional message templates.
 */

export function sanitizeIndianPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  if (digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

export function isValidIndianPhone(phone: string | null | undefined): boolean {
  const sanitized = sanitizeIndianPhone(phone);
  return /^91[6-9]\d{9}$/.test(sanitized);
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const sanitized = sanitizeIndianPhone(phone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${sanitized}?text=${encoded}`;
}

export interface FeeReminderData {
  studentName: string;
  className: string;
  dueAmount: number;
  dueDateStr: string;
  billingPeriodStr?: string;
  documentUrl: string;
  instituteName?: string;
  contactPhone?: string;
}

export function generateFeeReminderMessage(data: FeeReminderData): string {
  const institute = data.instituteName || 'DPR Private Tuition';
  const phone = data.contactPhone || '+91 98765 43210';

  const lines = [
    `Dear Parent/Student,`,
    ``,
    `This is a gentle fee reminder from *${institute}* for *${data.studentName}* (${data.className}).`,
    ``,
    data.billingPeriodStr ? `📌 *Billing Period*: ${data.billingPeriodStr}` : null,
    `💰 *Amount Due*: *₹${data.dueAmount.toLocaleString('en-IN')}*`,
    `📅 *Due Date*: *${data.dueDateStr}*`,
    ``,
    `📄 *View / Download Fee Notice*:`,
    `${data.documentUrl}`,
    ``,
    `💳 *Payment Modes*: Cash, UPI, Bank Transfer.`,
    `_Please ignore this notice if payment has already been made._`,
    ``,
    `Thank you,`,
    `*${institute}*`,
    `📞 ${phone}`,
  ];

  return lines.filter((l) => l !== null).join('\n');
}

export interface PaymentReceiptData {
  studentName: string;
  className: string;
  paidAmount: number;
  receiptNumber: string;
  paymentMethod?: string;
  outstandingAmount: number;
  documentUrl: string;
  instituteName?: string;
  contactPhone?: string;
}

export function generatePaymentReceiptMessage(data: PaymentReceiptData): string {
  const institute = data.instituteName || 'DPR Private Tuition';
  const phone = data.contactPhone || '+91 98765 43210';

  const lines = [
    `Dear Parent/Student,`,
    ``,
    `We have received your fee payment for *${data.studentName}* (${data.className}) at *${institute}*.`,
    ``,
    `🧾 *Receipt No*: *${data.receiptNumber}*`,
    `💵 *Amount Paid*: *₹${data.paidAmount.toLocaleString('en-IN')}*`,
    data.paymentMethod ? `💳 *Payment Method*: ${data.paymentMethod}` : null,
    `📊 *Remaining Balance*: *₹${data.outstandingAmount.toLocaleString('en-IN')}*`,
    ``,
    `📄 *Download Official Receipt PDF*:`,
    `${data.documentUrl}`,
    ``,
    `Thank you for your prompt payment and cooperation.`,
    ``,
    `Warm regards,`,
    `*${institute}*`,
    `📞 ${phone}`,
  ];

  return lines.filter((l) => l !== null).join('\n');
}

export interface OverdueNoticeData {
  studentName: string;
  className: string;
  overdueAmount: number;
  dueDateStr: string;
  overdueDays: number;
  documentUrl: string;
  instituteName?: string;
  contactPhone?: string;
}

export function generateOverdueNoticeMessage(data: OverdueNoticeData): string {
  const institute = data.instituteName || 'DPR Private Tuition';
  const phone = data.contactPhone || '+91 98765 43210';

  const lines = [
    `⚠️ *URGENT FEE NOTICE — ${institute.toUpperCase()}*`,
    ``,
    `Dear Parent/Student,`,
    ``,
    `Our records indicate an overdue fee balance for *${data.studentName}* (${data.className}).`,
    ``,
    `📌 *Overdue Amount*: *₹${data.overdueAmount.toLocaleString('en-IN')}*`,
    `📅 *Originally Due Date*: *${data.dueDateStr}*`,
    `⏳ *Days Overdue*: *${data.overdueDays} days*`,
    ``,
    `📄 *View Official Notice*:`,
    `${data.documentUrl}`,
    ``,
    `Please clear the outstanding dues at your earliest convenience. If you have already paid, kindly share the receipt transaction reference.`,
    ``,
    `Thank you,`,
    `*${institute}*`,
    `📞 ${phone}`,
  ];

  return lines.filter((l) => l !== null).join('\n');
}

export const WhatsAppService = {
  sanitizePhone: sanitizeIndianPhone,
  isValidPhone: isValidIndianPhone,
  buildClickToChatUrl: buildWhatsAppUrl,
  generateReminderMessage: generateFeeReminderMessage,
  generateReceiptMessage: generatePaymentReceiptMessage,
  generateOverdueMessage: generateOverdueNoticeMessage,
};

export default WhatsAppService;

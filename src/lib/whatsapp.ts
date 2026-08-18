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
  dueAmount?: number;
  amountDue?: number;
  dueDateStr: string;
  billingPeriodStr?: string;
  documentUrl: string;
  instituteName?: string;
  contactPhone?: string;
}

export function generateFeeReminderMessage(data: FeeReminderData): string {
  const institute = data.instituteName || 'Education Institute';
  const phone = data.contactPhone || '';
  const due = data.dueAmount ?? data.amountDue ?? 0;

  const lines = [
    `Dear Parent/Student,`,
    ``,
    `This is a gentle fee reminder from *${institute}* for *${data.studentName}* (${data.className}).`,
    ``,
    data.billingPeriodStr ? `📌 *Billing Period*: ${data.billingPeriodStr}` : null,
    `💰 *Amount Due*: *₹${due.toLocaleString('en-IN')}*`,
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
    phone ? `📞 ${phone}` : null,
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
  const institute = data.instituteName || 'Education Institute';
  const phone = data.contactPhone || '';

  const lines = [
    `Dear Parent/Student,`,
    ``,
    `We have received your fee payment for *${data.studentName}* (${data.className}) at *${institute}*.`,
    ``,
    `🧾 *Receipt No*: *${data.receiptNumber}*`,
    `💵 *Amount Paid*: *₹${data.paidAmount.toLocaleString('en-IN')}*`,
    data.paymentMethod ? `💳 Payment Method: ${data.paymentMethod}` : null,
    `📊 Remaining Balance: *₹${data.outstandingAmount.toLocaleString('en-IN')}*`,
    ``,
    `📄 *Download Official Receipt PDF*:`,
    `${data.documentUrl}`,
    ``,
    `Thank you for your prompt payment and cooperation.`,
    ``,
    `Best regards,`,
    `*${institute}*`,
    phone ? `📞 ${phone}` : null,
  ];

  return lines.filter((l) => l !== null).join('\n');
}

export interface OverdueNoticeData {
  studentName: string;
  className: string;
  outstandingAmount?: number;
  overdueAmount?: number;
  overdueDays: number;
  dueDateStr: string;
  documentUrl: string;
  instituteName?: string;
  contactPhone?: string;
}

export function generateOverdueNoticeMessage(data: OverdueNoticeData): string {
  const institute = data.instituteName || 'Education Institute';
  const phone = data.contactPhone || '';
  const overdue = data.overdueAmount ?? data.outstandingAmount ?? 0;

  const lines = [
    `⚠️ *URGENT FEE NOTICE* ⚠️`,
    ``,
    `Dear Parent/Student,`,
    ``,
    `This is an overdue fee notification from *${institute}* for *${data.studentName}* (${data.className}).`,
    ``,
    `❗ *Outstanding Fee*: *₹${overdue.toLocaleString('en-IN')}*`,
    `📅 *Original Due Date*: *${data.dueDateStr}*`,
    `⏳ *Overdue By*: *${data.overdueDays} days*`,
    ``,
    `📄 *View Overdue Notice & Clear Dues*:`,
    `${data.documentUrl}`,
    ``,
    `Please clear the outstanding amount immediately to avoid disruption in academic classes.`,
    ``,
    `For any assistance, please contact the institute office.`,
    ``,
    `Regards,`,
    `*${institute}*`,
    phone ? `📞 ${phone}` : null,
  ];

  return lines.filter((l) => l !== null).join('\n');
}

export const WhatsApp = {
  sanitizeIndianPhone,
  isValidIndianPhone,
  buildWhatsAppUrl,
  generateFeeReminderMessage,
  generatePaymentReceiptMessage,
  generateOverdueNoticeMessage,
};

export default WhatsApp;

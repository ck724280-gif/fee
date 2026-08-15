import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#d97706',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
    marginBottom: 16,
  },
  instituteTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  instituteTagline: {
    fontSize: 9,
    fontFamily: 'Helvetica-Oblique',
    color: '#64748b',
    marginTop: 2,
  },
  instituteContact: {
    fontSize: 8.5,
    color: '#475569',
    marginTop: 4,
  },
  noticeBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  noticeTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  noticeStatus: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#fafafa',
  },
  infoColumn: {
    width: '48%',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: '42%',
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    fontSize: 9,
  },
  infoValue: {
    width: '58%',
    color: '#0f172a',
    fontSize: 9,
  },
  dueSummaryBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dueLabel: {
    fontSize: 9.5,
    color: '#334155',
  },
  dueValue: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  highlightDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  highlightDueLabel: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },
  highlightDueValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#dc2626',
  },
  messageSection: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 12,
    marginBottom: 16,
  },
  messageHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  messageParagraph: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.5,
    marginBottom: 6,
  },
  paymentInstructionsBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 4,
    padding: 10,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#166534',
    marginBottom: 6,
  },
  instructionItem: {
    fontSize: 8.5,
    color: '#14532d',
    marginBottom: 3,
    lineHeight: 1.3,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerNote: {
    width: '60%',
    fontSize: 8,
    color: '#64748b',
    lineHeight: 1.3,
  },
  signatureSection: {
    width: '35%',
    textAlign: 'center',
    alignItems: 'center',
  },
  signatureLine: {
    width: 140,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  signatureInstitute: {
    fontSize: 7.5,
    color: '#64748b',
  },
});

export interface ReminderPDFProps {
  data: {
    institute?: {
      instituteName?: string;
      tagline?: string;
      address?: string;
      phone?: string;
      email?: string;
      currencySymbol?: string;
      upiId?: string;
      bankAccountDetails?: {
        bankName?: string;
        accountNumber?: string;
        ifscCode?: string;
        accountHolder?: string;
      };
    };
    student: {
      id?: string;
      studentCode: string;
      name: string;
      fatherName?: string | null;
      mobile?: string | null;
      whatsappNumber?: string | null;
      className: string;
    };
    feeRecord: {
      id?: string;
      billingPeriodStart: Date | string;
      billingPeriodEnd: Date | string;
      dueDate: Date | string;
      baseAmount: number;
      admissionFeeAmount: number;
      discountAmount: number;
      lateFeeAmount: number;
      totalAmount: number;
      paidAmount: number;
      outstandingAmount: number;
      status: string;
    };
  };
}

function formatDateStr(d: Date | string | undefined): string {
  if (!d) return 'N/A';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatINR(val: number): string {
  return `₹${val.toFixed(2)}`;
}

export const ReminderPDF: React.FC<ReminderPDFProps> = ({ data }) => {
  const institute = data.institute || {};
  const student = data.student;
  const fee = data.feeRecord;

  const periodStartStr = formatDateStr(fee.billingPeriodStart);
  const periodEndStr = formatDateStr(fee.billingPeriodEnd);
  const dueDateStr = formatDateStr(fee.dueDate);
  const isOverdue = fee.status === 'OVERDUE';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Branding */}
        <View style={styles.headerContainer}>
          <Text style={styles.instituteTitle}>
            {institute.instituteName || 'DPR PRIVATE TUITION'}
          </Text>
          <Text style={styles.instituteTagline}>
            {institute.tagline || 'Excellence in Academic Coaching & Guidance'}
          </Text>
          <Text style={styles.instituteContact}>
            {institute.address || 'Station Road, Near City Center, West Bengal'} | Phone:{' '}
            {institute.phone || '+91 98765 43210'} | Email: {institute.email || 'info@dprtuition.com'}
          </Text>
        </View>

        {/* Title & Status Badge */}
        <View style={styles.noticeBadgeContainer}>
          <Text style={styles.noticeTitle}>Fee Payment Notice / Reminder</Text>
          <Text style={styles.noticeStatus}>
            {isOverdue ? 'STATUS: OVERDUE' : 'STATUS: PAYMENT DUE'}
          </Text>
        </View>

        {/* Student & Period Information */}
        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Student Code:</Text>
              <Text style={styles.infoValue}>{student.studentCode}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Student Name:</Text>
              <Text style={styles.infoValue}>{student.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Class:</Text>
              <Text style={styles.infoValue}>{student.className}</Text>
            </View>
            {student.fatherName ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Guardian:</Text>
                <Text style={styles.infoValue}>{student.fatherName}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Billing Period:</Text>
              <Text style={styles.infoValue}>
                {periodStartStr} to {periodEndStr}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Due Date:</Text>
              <Text style={styles.infoValue}>{dueDateStr}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact Mobile:</Text>
              <Text style={styles.infoValue}>{student.mobile || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notice Date:</Text>
              <Text style={styles.infoValue}>{formatDateStr(new Date())}</Text>
            </View>
          </View>
        </View>

        {/* Fee Due Summary */}
        <View style={styles.dueSummaryBox}>
          <View style={styles.dueRow}>
            <Text style={styles.dueLabel}>Total Monthly Billed Fee:</Text>
            <Text style={styles.dueValue}>{formatINR(fee.totalAmount)}</Text>
          </View>
          <View style={styles.dueRow}>
            <Text style={styles.dueLabel}>Amount Paid So Far:</Text>
            <Text style={styles.dueValue}>
              {formatINR(fee.paidAmount)}{' '}
              {fee.paidAmount > 0 ? '(Partial Payment Received)' : '(Nil)'}
            </Text>
          </View>
          {fee.lateFeeAmount > 0 ? (
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>Late Fee Charges Applied:</Text>
              <Text style={styles.dueValue}>{formatINR(fee.lateFeeAmount)}</Text>
            </View>
          ) : null}
          <View style={styles.highlightDueRow}>
            <Text style={styles.highlightDueLabel}>NET OUTSTANDING AMOUNT DUE:</Text>
            <Text style={styles.highlightDueValue}>{formatINR(fee.outstandingAmount)}</Text>
          </View>
        </View>

        {/* Formal Reminder Letter */}
        <View style={styles.messageSection}>
          <Text style={styles.messageHeading}>Dear Parent / Student,</Text>
          <Text style={styles.messageParagraph}>
            This is a friendly reminder that the tuition fee for {student.name} ({student.className}) for the
            billing period {periodStartStr} to {periodEndStr} is due on {dueDateStr}.
          </Text>
          <Text style={styles.messageParagraph}>
            Kindly arrange to settle the outstanding balance of {formatINR(fee.outstandingAmount)} at your earliest
            convenience to ensure uninterrupted academic sessions and tutoring support.
          </Text>
          {isOverdue ? (
            <Text style={[styles.messageParagraph, { color: '#dc2626', fontFamily: 'Helvetica-Bold' }]}>
              Please note that this fee is currently past due date. We request prompt clearance to avoid any
              administrative complications.
            </Text>
          ) : null}
        </View>

        {/* Payment Instructions */}
        <View style={styles.paymentInstructionsBox}>
          <Text style={styles.instructionsTitle}>Payment Instructions & Modes Accepted:</Text>
          <Text style={styles.instructionItem}>
            • UPI / QR Code: {institute.upiId || 'dprtuition@upi'} (Scan and pay at institute or mobile app)
          </Text>
          <Text style={styles.instructionItem}>
            • Bank Transfer (NEFT/IMPS): Bank: {institute.bankAccountDetails?.bankName || 'State Bank of India'},
            A/C: {institute.bankAccountDetails?.accountNumber || '919876543210'}, IFSC:{' '}
            {institute.bankAccountDetails?.ifscCode || 'SBIN0001234'}
          </Text>
          <Text style={styles.instructionItem}>
            • Cash Payment: At Institute Accounts Desk (Monday to Saturday, 4:00 PM - 8:00 PM)
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            If you have already made this payment in the last 24 hours, please disregard this notice.{'\n'}
            For accounts assistance: {institute.phone || '+91 98765 43210'} | {institute.email || 'info@dprtuition.com'}
          </Text>

          <View style={styles.signatureSection}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Accounts Office</Text>
            <Text style={styles.signatureInstitute}>
              {institute.instituteName || 'DPR Private Tuition'}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReminderPDF;

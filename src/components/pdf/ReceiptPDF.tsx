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
    borderBottomColor: '#2563eb',
    borderBottomStyle: 'solid',
    paddingBottom: 12,
    marginBottom: 16,
  },
  instituteTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a8a',
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
  receiptBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  receiptTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textTransform: 'uppercase',
  },
  receiptNumber: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
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
    width: '40%',
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    fontSize: 9,
  },
  infoValue: {
    width: '60%',
    color: '#0f172a',
    fontSize: 9,
  },
  table: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    padding: 8,
  },
  tableHeaderCell: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#334155',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 8,
  },
  colDesc: { width: '50%' },
  colRate: { width: '18%', textAlign: 'right' },
  colDisc: { width: '14%', textAlign: 'right' },
  colNet: { width: '18%', textAlign: 'right' },
  totalsBox: {
    marginLeft: 'auto',
    width: '55%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#f8fafc',
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 9,
    color: '#475569',
  },
  totalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
  paidHighlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  paidHighlightLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
  },
  paidHighlightValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#15803d',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  balanceLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#b91c1c',
  },
  balanceValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#b91c1c',
  },
  notesBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#fffbeb',
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#92400e',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 8,
    color: '#78350f',
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
  termsSection: {
    width: '60%',
  },
  termsText: {
    fontSize: 7.5,
    color: '#64748b',
    lineHeight: 1.4,
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

export interface ReceiptPDFProps {
  data: {
    institute?: {
      instituteName?: string;
      tagline?: string;
      address?: string;
      phone?: string;
      email?: string;
      currencySymbol?: string;
    };
    payment: {
      id: string;
      receiptNumber: string;
      amount: number;
      paymentMethod: string;
      transactionId?: string | null;
      paymentDate: Date | string;
      notes?: string | null;
      recordedBy?: string | null;
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
    authorizedSignature?: string;
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

export const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ data }) => {
  const institute = data.institute || {};
  const payment = data.payment;
  const student = data.student;
  const fee = data.feeRecord;

  const paymentDateStr = formatDateStr(payment.paymentDate);
  const periodStartStr = formatDateStr(fee.billingPeriodStart);
  const periodEndStr = formatDateStr(fee.billingPeriodEnd);
  const dueDateStr = formatDateStr(fee.dueDate);

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

        {/* Title & Receipt Badge */}
        <View style={styles.receiptBadgeContainer}>
          <Text style={styles.receiptTitle}>Fee Payment Receipt</Text>
          <Text style={styles.receiptNumber}>Receipt No: {payment.receiptNumber}</Text>
        </View>

        {/* Information Grid */}
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
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact Mobile:</Text>
              <Text style={styles.infoValue}>{student.mobile || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoColumn}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Date:</Text>
              <Text style={styles.infoValue}>{paymentDateStr}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Payment Mode:</Text>
              <Text style={styles.infoValue}>{payment.paymentMethod}</Text>
            </View>
            {payment.transactionId ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Transaction Ref:</Text>
                <Text style={styles.infoValue}>{payment.transactionId}</Text>
              </View>
            ) : null}
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
          </View>
        </View>

        {/* Fee Itemization Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>Fee Description</Text>
            <Text style={[styles.tableHeaderCell, styles.colRate]}>Rate (INR)</Text>
            <Text style={[styles.tableHeaderCell, styles.colDisc]}>Discount</Text>
            <Text style={[styles.tableHeaderCell, styles.colNet]}>Net Amount</Text>
          </View>

          <View style={styles.tableRow}>
            <Text style={styles.colDesc}>Monthly Tuition Fee ({student.className})</Text>
            <Text style={styles.colRate}>{formatINR(fee.baseAmount)}</Text>
            <Text style={styles.colDisc}>
              {fee.discountAmount > 0 ? `-${formatINR(fee.discountAmount)}` : '₹0.00'}
            </Text>
            <Text style={styles.colNet}>{formatINR(fee.baseAmount - fee.discountAmount)}</Text>
          </View>

          {fee.admissionFeeAmount > 0 ? (
            <View style={styles.tableRow}>
              <Text style={styles.colDesc}>One-Time Admission Fee</Text>
              <Text style={styles.colRate}>{formatINR(fee.admissionFeeAmount)}</Text>
              <Text style={styles.colDisc}>-</Text>
              <Text style={styles.colNet}>{formatINR(fee.admissionFeeAmount)}</Text>
            </View>
          ) : null}

          {fee.lateFeeAmount > 0 ? (
            <View style={styles.tableRow}>
              <Text style={styles.colDesc}>Late Fee Surcharge</Text>
              <Text style={styles.colRate}>{formatINR(fee.lateFeeAmount)}</Text>
              <Text style={styles.colDisc}>-</Text>
              <Text style={styles.colNet}>{formatINR(fee.lateFeeAmount)}</Text>
            </View>
          ) : null}
        </View>

        {/* Totals & Outstanding Summary */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Billed Amount:</Text>
            <Text style={styles.totalValue}>{formatINR(fee.totalAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Paid To Date:</Text>
            <Text style={styles.totalValue}>{formatINR(fee.paidAmount)}</Text>
          </View>
          <View style={styles.paidHighlightRow}>
            <Text style={styles.paidHighlightLabel}>Amount Paid This Receipt:</Text>
            <Text style={styles.paidHighlightValue}>{formatINR(payment.amount)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Remaining Outstanding Balance:</Text>
            <Text style={styles.balanceValue}>{formatINR(fee.outstandingAmount)}</Text>
          </View>
        </View>

        {/* Notes if any */}
        {payment.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Payment Remarks / Notes:</Text>
            <Text style={styles.notesText}>{payment.notes}</Text>
          </View>
        ) : null}

        {/* Footer with Signatory & Terms */}
        <View style={styles.footer}>
          <View style={styles.termsSection}>
            <Text style={styles.termsText}>
              1. Fees once paid are non-refundable and non-transferable.{'\n'}
              2. This is a computer-generated official receipt issued by DPR Private Tuition.{'\n'}
              3. For billing queries, contact institute office at {institute.phone || '+91 98765 43210'}.
            </Text>
          </View>

          <View style={styles.signatureSection}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Authorized Signatory</Text>
            <Text style={styles.signatureInstitute}>
              {institute.instituteName || 'DPR Private Tuition'}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ReceiptPDF;

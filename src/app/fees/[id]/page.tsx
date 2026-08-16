import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatYMD } from '@/lib/billing-engine';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import PublicUpiPaymentCard from '@/components/public/PublicUpiPaymentCard';
import {
  GraduationCap,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageCircle,
  CreditCard,
  Building2,
  FileText,
  User,
  ShieldCheck,
  Receipt,
  Share2,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicFeeNoticePage({ params }: PageProps) {
  const { id } = await params;

  if (!id || typeof id !== 'string') {
    notFound();
  }

  // 1. Fetch Fee Record and Settings
  let fee = await prisma.feeRecord.findUnique({
    where: { id },
    include: {
      student: {
        include: { class: true },
      },
      class: true,
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
      upiSubmissions: {
        orderBy: { submittedAt: 'desc' },
        take: 1,
      },
    },
  });

  // Fallback: If id is a document token
  if (!fee) {
    const doc = await prisma.document.findUnique({
      where: { token: id },
    });
    if (doc) {
      fee = await prisma.feeRecord.findUnique({
        where: { id: doc.referenceId },
        include: {
          student: { include: { class: true } },
          class: true,
          payments: { orderBy: { paymentDate: 'desc' } },
          upiSubmissions: {
            orderBy: { submittedAt: 'desc' },
            take: 1,
          },
        },
      });
    }
  }

  const settings = (await prisma.instituteSetting.findFirst()) || {
    instituteName: 'DPR Private Tuition',
    tagline: 'Excellence in Academic Coaching & Guidance',
    address: 'Station Road, Near City Center, West Bengal',
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    email: 'info@dprtuition.com',
    upiId: 'dprtuition@upi',
    upiPayeeName: 'DPR Private Tuition',
    upiEnabled: true,
    receiptPrefix: 'DPR-RC',
    customQrUrl: null as string | null,
  };

  if (!fee || !fee.student) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Fee Notice Not Found</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            The fee notice link you followed may have expired or is invalid. Please contact{' '}
            <strong className="text-slate-800">{settings.instituteName}</strong> for an updated notice.
          </p>
          {settings.phone && (
            <a
              href={`tel:${settings.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
            >
              <Phone className="w-4 h-4" />
              <span>Call Helpline: {settings.phone}</span>
            </a>
          )}
        </div>
      </main>
    );
  }

  // Find or create document token for PDF generation
  let doc = await prisma.document.findFirst({
    where: { referenceId: fee.id, documentType: 'REMINDER' },
  });

  if (!doc) {
    doc = await prisma.document.create({
      data: {
        token: crypto.randomUUID(),
        documentType: 'REMINDER',
        referenceId: fee.id,
        studentId: fee.studentId,
        metadata: {
          feeRecordId: fee.id,
          studentId: fee.studentId,
          studentName: fee.student?.name,
          className: fee.class?.name,
          outstandingAmount: fee.outstandingAmount,
          dueDate: fee.dueDate,
          billingPeriodStart: fee.billingPeriodStart,
          billingPeriodEnd: fee.billingPeriodEnd,
        },
      },
    });
  }

  const isPaid = fee.status === 'PAID' || fee.outstandingAmount === 0;
  const isOverdue = fee.status === 'OVERDUE';
  const isPartial = fee.status === 'PARTIALLY_PAID';

  const contactPhone = settings.whatsapp || settings.phone || '+91 98765 43210';
  const upiVpa = settings.upiId || (settings.phone ? `${settings.phone.replace(/\D/g, '')}@upi` : 'dprtuition@upi');
  const upiPayee = settings.upiPayeeName || settings.instituteName || 'DPR Private Tuition';

  const whatsappHelplineUrl = buildWhatsAppUrl(
    contactPhone,
    `Hello, I am inquiring about the fee notice for ${fee.student.name} (${fee.class.name}) - DPR ID: ${fee.student.studentCode}.`
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 py-6 sm:py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Branding Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {settings.instituteName}
              </h1>
              {settings.tagline && (
                <p className="text-xs text-slate-500 font-medium">{settings.tagline}</p>
              )}
              {settings.address && (
                <p className="text-[11px] text-slate-400 mt-0.5">{settings.address}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappHelplineUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Helpline WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Main Invoice / Notice Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
          {/* Status Bar */}
          <div
            className={`px-6 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-between ${
              isPaid
                ? 'bg-emerald-500 text-white'
                : isOverdue
                ? 'bg-rose-500 text-white'
                : isPartial
                ? 'bg-amber-500 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Official Tuition Fee Notice</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-0.5 rounded-full text-[11px] backdrop-blur-xs">
              {isPaid ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PAID IN FULL</span>
                </>
              ) : isOverdue ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>PAYMENT OVERDUE</span>
                </>
              ) : isPartial ? (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>PARTIALLY PAID</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>PAYMENT DUE</span>
                </>
              )}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Student & Class Details Grid */}
            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Student Name</span>
                <span className="text-sm font-bold text-slate-900">{fee.student.name}</span>
                {fee.student.fatherName && (
                  <span className="text-slate-500 block mt-0.5">S/D of: {fee.student.fatherName}</span>
                )}
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Enrolled Class & Roll</span>
                <span className="text-sm font-bold text-slate-900">{fee.class.name}</span>
                <span className="text-slate-500 block font-mono mt-0.5">ID: {fee.student.studentCode}</span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Billing Period</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(fee.billingPeriodStart)} to {formatDate(fee.billingPeriodEnd)}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Due Date</span>
                <span className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {formatDate(fee.dueDate)}
                </span>
              </div>
            </div>

            {/* Itemized Fee Breakdown */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5">Fee Particulars</th>
                    <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-4 py-2.5 font-medium">Monthly Tuition Fee ({fee.class.name})</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(fee.baseAmount)}</td>
                  </tr>
                  {fee.admissionFeeAmount > 0 && (
                    <tr>
                      <td className="px-4 py-2.5 font-medium">Admission / Registration Fee</td>
                      <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(fee.admissionFeeAmount)}</td>
                    </tr>
                  )}
                  {fee.discountAmount > 0 && (
                    <tr className="text-emerald-700">
                      <td className="px-4 py-2.5 font-medium">Scholarship / Fee Concession</td>
                      <td className="px-4 py-2.5 text-right font-mono">-{formatCurrency(fee.discountAmount)}</td>
                    </tr>
                  )}
                  {fee.lateFeeAmount > 0 && (
                    <tr className="text-rose-700">
                      <td className="px-4 py-2.5 font-medium">Late Payment Fee</td>
                      <td className="px-4 py-2.5 text-right font-mono">+{formatCurrency(fee.lateFeeAmount)}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50/60 font-semibold text-slate-900 border-t border-slate-200">
                    <td className="px-4 py-2.5">Total Invoiced Amount</td>
                    <td className="px-4 py-2.5 text-right font-mono">{formatCurrency(fee.totalAmount)}</td>
                  </tr>
                  {fee.paidAmount > 0 && (
                    <tr className="text-emerald-700 font-medium">
                      <td className="px-4 py-2.5">Less: Amount Paid to Date</td>
                      <td className="px-4 py-2.5 text-right font-mono">-{formatCurrency(fee.paidAmount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Outstanding Total Banner */}
              <div
                className={`p-4 flex items-center justify-between ${
                  isPaid ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-900 text-white'
                }`}
              >
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold opacity-80 block">
                    {isPaid ? 'Status' : 'Net Outstanding Due'}
                  </span>
                  <span className="text-xs opacity-70">
                    {isPaid ? 'Payment verified and settled' : 'Payable by due date'}
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight">
                  {isPaid ? '₹0.00 (PAID)' : formatCurrency(fee.outstandingAmount)}
                </div>
              </div>
            </div>

            {/* Zero-Cost Interactive UPI Payment & Dynamic QR Gateway */}
            {!isPaid && settings.upiEnabled !== false && (
              <div className="pt-2">
                <PublicUpiPaymentCard
                  feeId={fee.id}
                  studentName={fee.student.name}
                  studentCode={fee.student.studentCode}
                  className={fee.class.name}
                  outstandingAmount={fee.outstandingAmount}
                  upiId={upiVpa}
                  payeeName={upiPayee}
                  receiptPrefix={(settings as any).receiptPrefix || 'DPR-RC'}
                  customQrUrl={(settings as any).customQrUrl}
                  studentPhone={fee.student.whatsappNumber || fee.student.mobile}
                  existingSubmission={fee.upiSubmissions?.[0] as any}
                />
              </div>
            )}

            {/* Payment History if any payments exist */}
            {fee.payments.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-blue-600" />
                  <span>Verified Payment Receipts on Record</span>
                </h4>
                <div className="space-y-2">
                  {fee.payments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs shadow-xs"
                    >
                      <div>
                        <div className="font-semibold text-emerald-950 flex items-center gap-2">
                          <span className="font-mono">{p.receiptNumber}</span>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-800 text-[10px] font-bold">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Received on {formatDate(p.paymentDate)}
                          {p.transactionId && ` • UTR: ${p.transactionId}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold font-mono text-emerald-700 text-sm">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons: PDF Download & Contact */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href={`/api/documents/download/${doc.token}`}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Official PDF Notice</span>
              </a>

              {settings.whatsapp && (
                <a
                  href={whatsappHelplineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Inquire / Helpline WhatsApp</span>
                </a>
              )}
            </div>

            {/* Helpline Footer */}
            <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-400 space-y-1">
              <p>For any queries or receipt confirmation, contact {settings.instituteName}.</p>
              <div className="flex items-center justify-center gap-4 text-slate-500 pt-1 font-medium">
                {settings.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{settings.phone}</span>
                  </span>
                )}
                {settings.email && (
                  <span className="flex items-center gap-1">
                    <span>{settings.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Official Secured Digital Notice issued by {settings.instituteName}</span>
        </div>
      </div>
    </main>
  );
}

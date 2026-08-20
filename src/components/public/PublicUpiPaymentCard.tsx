'use client';

import React, { useState } from 'react';
import {
  QrCode,
  Smartphone,
  Copy,
  Check,
  Send,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileCheck,
  ShieldAlert,
  Download,
  Building,
  UserCheck,
  Lock,
} from 'lucide-react';
import { formatCurrency, copyToClipboard } from '@/lib/utils';

interface PublicUpiPaymentCardProps {
  feeId: string;
  studentName: string;
  studentCode: string;
  className: string;
  studentPhone?: string | null;
  outstandingAmount: number;
  upiId: string;
  payeeName: string;
  receiptPrefix?: string;
  customQrUrl?: string | null;
  existingSubmission?: {
    id: string;
    utrNumber: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason?: string | null;
    submittedAt: string | Date;
  } | null;
  onPaymentSuccess?: (receiptData: any) => void;
}

export default function PublicUpiPaymentCard({
  feeId,
  studentName,
  studentCode,
  className,
  studentPhone,
  outstandingAmount,
  upiId,
  payeeName,
  receiptPrefix = 'DPR-RC',
  customQrUrl,
  existingSubmission,
  onPaymentSuccess,
}: PublicUpiPaymentCardProps) {
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<any | null>(
    existingSubmission || null
  );

  const cleanUpiId = upiId?.trim() || 'dprtuition@upi';
  const cleanPayee = payeeName?.trim() || 'DPR Private Tuition';
  const refCode = `${receiptPrefix}-${studentCode.replace(/[^A-Za-z0-9]/g, '')}`;
  const note = `Tuition Fee ${studentName} (${className})`;

  // Construct strict UPI Deep Link URI
  const rawUpiUri = `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(
    cleanPayee
  )}&am=${outstandingAmount.toFixed(2)}&tr=${encodeURIComponent(refCode)}&tn=${encodeURIComponent(
    note
  )}&cu=INR`;

  // Dynamic QR Code image URL via secure SVG/PNG generator or custom scanner QR
  const qrImageUrl =
    customQrUrl && customQrUrl.trim().length > 5
      ? customQrUrl.trim()
      : `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
          rawUpiUri
        )}&format=svg`;

  const handleCopyUpi = () => {
    copyToClipboard(cleanUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      setError('Please enter the 12-digit UTR/Reference ID from your payment app.');
      return;
    }

    if (utrNumber.trim().length < 6) {
      setError('UTR/Transaction Reference number must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/fees/submit-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeId,
          utrNumber: utrNumber.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit payment verification proof.');
      }

      setSubmissionStatus({
        id: data.submission?.id,
        utrNumber: utrNumber.trim(),
        status: 'PENDING',
        submittedAt: new Date(),
      });
      setUtrNumber('');
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-indigo-500/20 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
              <span>0% Extra Fee • Instant UPI</span>
            </div>
            <h3 className="text-base font-bold text-slate-100">Pay Tuition Fee Online</h3>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[11px] text-slate-400 block font-medium">Payable Amount</span>
          <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {formatCurrency(outstandingAmount)}
          </span>
        </div>
      </div>

      {/* Locked Student Profile Summary (Cannot be edited by student) */}
      <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-slate-400" />
            <span>Student Name</span>
          </span>
          <span className="font-bold text-slate-100 block truncate">{studentName}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-slate-400" />
            <span>Student ID / Roll</span>
          </span>
          <span className="font-mono font-bold text-slate-100 block truncate">{studentCode}</span>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <span className="text-slate-400 block text-[10px] uppercase font-bold flex items-center gap-1">
            <Lock className="w-2.5 h-2.5 text-slate-400" />
            <span>Class</span>
          </span>
          <span className="font-bold text-slate-100 block truncate">{className}</span>
        </div>
      </div>

      {/* PENDING APPROVAL BANNER (If UTR is submitted and waiting for admin review) */}
      {submissionStatus && submissionStatus.status === 'PENDING' && (
        <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-200 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
            <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            <span>Payment Proof Submitted &amp; Pending Admin Verification</span>
          </div>
          <p className="text-xs text-amber-200/90 leading-relaxed">
            You submitted UTR Reference: <strong className="font-mono text-amber-100">{submissionStatus.utrNumber}</strong>.
            The institute admin is currently verifying this transaction in their bank statement. Once verified, your fee status will automatically update to <strong>PAID</strong> and official receipt will be generated.
          </p>
          <div className="pt-1 flex items-center justify-between text-[11px] text-amber-300/80">
            <span>Submitted on {new Date(submissionStatus.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <button
              type="button"
              onClick={() => setSubmissionStatus(null)}
              className="text-xs underline text-amber-300 hover:text-amber-100 cursor-pointer"
            >
              Re-enter different UTR
            </button>
          </div>
        </div>
      )}

      {/* REJECTED BANNER (If previous submission was rejected) */}
      {submissionStatus && submissionStatus.status === 'REJECTED' && (
        <div className="p-4 rounded-xl bg-rose-500/10 border-2 border-rose-500/30 text-rose-200 space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Previous UTR Verification Failed</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            Your submitted UTR (<span className="font-mono font-bold">{submissionStatus.utrNumber}</span>) was rejected by admin:{' '}
            <strong className="text-rose-100">{submissionStatus.rejectionReason || 'Payment not found in institute account.'}</strong>
          </p>
          <p className="text-[11px] text-rose-300/80">
            Please check your UPI payment app (GPay/PhonePe/Paytm), copy the correct 12-digit UTR/Ref ID, and submit below.
          </p>
        </div>
      )}

      {/* Main Payment Columns (QR Code + Mobile Launch & UTR form) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Dynamic QR Code Box */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-950/80 rounded-xl border border-slate-800 text-center space-y-3">
          <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-200">
            <img
              src={qrImageUrl}
              alt="Scan to Pay UPI QR Code"
              className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
            />
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
              Scan with Any UPI App
            </span>
            <span className="text-[10px] text-slate-400 block">
              Google Pay • PhonePe • Paytm • BHIM • CRED
            </span>
          </div>
        </div>

        {/* Right: One-Tap Launch & 12-Digit UTR Form */}
        <div className="md:col-span-7 space-y-4">
          {/* One-Tap Mobile App Button */}
          <div>
            <a
              href={rawUpiUri}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>One-Tap Pay via Mobile UPI App</span>
            </a>
            <span className="text-[10px] text-slate-400 block text-center mt-1">
              (Opens Google Pay, PhonePe, or Paytm with pre-filled ₹{outstandingAmount})
            </span>
          </div>

          {/* Copy UPI ID Row */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Institute Payee VPA / UPI ID
              </span>
              <span className="font-mono font-bold text-emerald-400 truncate block">
                {cleanUpiId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* 12-Digit UTR Form */}
          {(!submissionStatus || submissionStatus.status === 'REJECTED') && (
            <form onSubmit={handleSubmitUtr} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                  <span>Enter 12-Digit UTR / Transaction Ref No.</span>
                  <span className="text-[10px] text-emerald-400 font-normal">After Paying</span>
                </label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                  placeholder="e.g. 523412348901 (from GPay / PhonePe / Paytm)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs sm:text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  maxLength={30}
                  required
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !utrNumber.trim()}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting Proof...' : 'Submit Payment Proof for Verification'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

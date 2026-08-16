'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2,
  Download,
  AlertCircle,
  Receipt,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface PublicUpiPaymentCardProps {
  feeId: string;
  studentName: string;
  studentCode: string;
  className: string;
  outstandingAmount: number;
  upiId: string;
  payeeName: string;
  receiptPrefix?: string;
  customQrUrl?: string | null;
  onPaymentSuccess?: (receiptData: any) => void;
}

export default function PublicUpiPaymentCard({
  feeId,
  studentName,
  studentCode,
  className,
  outstandingAmount,
  upiId,
  payeeName,
  receiptPrefix = 'DPR-RC',
  customQrUrl,
  onPaymentSuccess,
}: PublicUpiPaymentCardProps) {
  const [copied, setCopied] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);

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
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(cleanUpiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      setError('Please enter a valid 12-digit UTR / UPI Reference Number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/fees/submit-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeRecordId: feeId,
          utrNumber: utrNumber.trim(),
          payerName: payerName.trim() || studentName,
          payerPhone: payerPhone.trim(),
          amount: outstandingAmount,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to verify UTR number.');
      }

      setSuccessReceipt(json.data);
      if (onPaymentSuccess) {
        onPaymentSuccess(json.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error recording payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successReceipt) {
    return (
      <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-xl shadow-emerald-500/10 animate-in fade-in">
        <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-bounce">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wider">
            Payment Verified & Recorded
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">
            Payment Received Successfully!
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Thank you! Your payment of <strong>{formatCurrency(successReceipt.paidAmount)}</strong> has been verified.
          </p>
        </div>

        <div className="max-w-md mx-auto bg-white rounded-xl p-4 border border-emerald-200 shadow-sm text-left text-xs space-y-2">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Official Receipt No:</span>
            <span className="font-mono font-bold text-slate-900">{successReceipt.receiptNumber}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">UTR / Reference ID:</span>
            <span className="font-mono font-semibold text-slate-800">{utrNumber}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-500">Payment Mode:</span>
            <span className="font-semibold text-emerald-700">UPI Instant Gateway</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Remaining Balance:</span>
            <span className="font-bold text-emerald-600">₹0.00 (Settled)</span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          {successReceipt.documentToken && (
            <a
              href={`/api/documents/download/${successReceipt.documentToken}`}
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-emerald-600/30"
            >
              <Download className="w-4 h-4" />
              <span>Download Official Payment Receipt (PDF)</span>
            </a>
          )}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs sm:text-sm font-semibold transition-all"
          >
            <span>Refresh Invoice</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
              Zero-Cost Instant UPI
            </span>
            <span className="text-xs text-slate-400">Direct Institute Account</span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white mt-1">
            Pay Online via UPI & Dynamic QR
          </h3>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 block">Amount Payable</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(outstandingAmount)}
          </span>
        </div>
      </div>

      {/* Grid: Left Column QR & One-Tap Launch, Right Column UTR submission */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: QR & Deep Link */}
        <div className="lg:col-span-5 flex flex-col items-center text-center space-y-4 bg-slate-800/60 rounded-xl p-5 border border-slate-700/60">
          <span className="text-xs font-semibold text-slate-300">
            Scan using any UPI App (GPay, PhonePe, Paytm, BHIM)
          </span>

          {/* QR Code Container */}
          <div className="bg-white p-3.5 rounded-2xl shadow-xl border-4 border-emerald-500/30">
            <img
              src={qrImageUrl}
              alt="UPI QR Code"
              className="w-44 h-44 sm:w-48 sm:h-48 object-contain rounded-lg"
              loading="lazy"
            />
          </div>

          {/* VPA & Copy Button */}
          <div className="w-full bg-slate-900/80 rounded-xl p-2.5 border border-slate-700/80 flex items-center justify-between gap-2 text-xs">
            <div className="text-left truncate">
              <span className="text-[10px] text-slate-400 block">UPI ID / VPA</span>
              <span className="font-mono font-bold text-slate-200 truncate block">{cleanUpiId}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          {/* One-Tap Mobile Launcher Button */}
          <div className="w-full pt-1">
            <a
              href={rawUpiUri}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-500/25 active:scale-[0.98]"
            >
              <Smartphone className="w-4 h-4" />
              <span>One-Tap Pay via Mobile UPI App</span>
            </a>
            <span className="text-[10px] text-slate-400 block mt-1.5">
              Supports Google Pay, PhonePe, Paytm, BHIM, CRED
            </span>
          </div>
        </div>

        {/* Right Column: UTR Reference Submission */}
        <div className="lg:col-span-7 bg-slate-800/40 rounded-xl p-5 border border-slate-700/60 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Step 2: Submit 12-Digit UTR / Reference ID</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              After completing the UPI transfer, enter your 12-digit transaction UTR number below for instant payment confirmation.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleUtrSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                12-Digit UTR / UPI Reference Number *
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
                placeholder="e.g. 423456789012"
                maxLength={32}
                required
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Found in your UPI App payment receipt (GPay / PhonePe / Paytm / BHIM)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Payer Name (Optional)
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder={studentName}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Sender Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  value={payerPhone}
                  onChange={(e) => setPayerPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !utrNumber.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying & Recording Payment...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Generate Official Receipt</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Anti-Tamper Cryptographic Ledger</span>
            </span>
            <span>Zero Convenience Fees</span>
          </div>
        </div>
      </div>
    </div>
  );
}

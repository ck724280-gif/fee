'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  QrCode,
  Copy,
  ExternalLink,
  Receipt,
  ArrowRight,
  RefreshCw,
  Building2,
  Zap,
  Check,
  X,
  IndianRupee,
} from 'lucide-react';

import { copyToClipboard } from '@/lib/utils';

const DURATION_OPTIONS = [
  { months: 1, label: '1 Month', discount: 0, tag: 'Standard' },
  { months: 3, label: '3 Months', discount: 5, tag: 'Popular (5% OFF)' },
  { months: 6, label: '6 Months', discount: 10, tag: 'Best Value (10% OFF)' },
  { months: 12, label: '1 Year', discount: 15, tag: 'Super Saver (15% OFF)' },
];

export default function InstituteSubscriptionPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Payment Modal State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [utrNumber, setUtrNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/subscriptions/my-plan');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load subscription details');
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlanDetails();
  }, []);

  const handleCopyUpi = (upiId: string) => {
    copyToClipboard(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Calculate renewal price
  const baseMonthlyPrice = data?.subscription?.pricePerCycle || 499;
  const currentOption = DURATION_OPTIONS.find((o) => o.months === selectedDuration) || DURATION_OPTIONS[0];
  const grossAmount = baseMonthlyPrice * currentOption.months;
  const discountAmount = Math.round((grossAmount * currentOption.discount) / 100);
  const finalPayableAmount = grossAmount - discountAmount;

  // Generate UPI payment intent URI & QR Code
  const upiId = data?.platformUpi?.upiId || 'admin@dprtuition.com';
  const payeeName = data?.platformUpi?.upiPayeeName || 'DPR Tuition Platform';
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${finalPayableAmount}&cu=INR&tn=${encodeURIComponent(
    `Subscription renewal for ${data?.organization?.name || 'Institute'}`
  )}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
    upiUri
  )}`;

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim() || utrNumber.trim().length < 6) {
      setError('Please enter a valid 12-digit UPI Transaction / UTR Number.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/subscriptions/upi-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utrNumber: utrNumber.trim(),
          amount: finalPayableAmount,
          durationMonths: selectedDuration,
          plan: data?.subscription?.plan || 'BASIC',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit payment reference');

      setSuccessMsg(json.message || 'Payment reference submitted successfully!');
      setPayModalOpen(false);
      setUtrNumber('');
      fetchPlanDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs text-slate-400 font-semibold">Loading membership plan and validity...</p>
      </div>
    );
  }

  const sub = data?.subscription;
  const isExpired = sub?.isExpired || false;
  const isExpiringSoon = sub?.isExpiringSoon || false;
  const daysLeft = sub?.daysLeft ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INSTITUTION MEMBERSHIP &amp; BILLING</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Membership Plan &amp; Validity
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Check your current active subscription plan, days remaining until expiry, and renew securely via UPI.
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setPayModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-black shadow-xl shadow-indigo-600/30 transition duration-200 flex items-center gap-2 cursor-pointer w-fit active:scale-95"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Pay / Renew Membership Plan</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Card */}
        <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Membership</span>
                  <div className="text-xl font-black text-white flex items-center gap-2">
                    <span>{sub?.plan || 'Standard'} Plan</span>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        isExpired
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : isExpiringSoon
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 animate-pulse'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isExpired ? 'EXPIRED' : isExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Rate</span>
                <span className="text-lg font-bold text-white">
                  ₹{sub?.pricePerCycle || 0}
                  <span className="text-xs text-slate-400 font-normal"> / {sub?.billingCycle?.toLowerCase() || 'month'}</span>
                </span>
              </div>
            </div>

            {/* Days Left Meter */}
            <div className="mt-8 p-5 rounded-2xl bg-slate-800/50 border border-slate-700/60">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Validity Remaining</span>
                </span>
                <span className={`font-black text-sm ${isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isExpired ? '0 Days (Expired)' : `${daysLeft} Days Remaining`}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-700/50 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isExpired
                      ? 'bg-rose-500 w-full'
                      : isExpiringSoon
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 w-1/4 animate-pulse'
                      : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 w-3/4'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-700/40">
                <div>
                  <span className="text-slate-500 block text-[10px]">Start Date</span>
                  <span className="font-semibold text-slate-200">
                    {sub?.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN') : 'N/A'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 block text-[10px]">Expiry Date</span>
                  <span className="font-semibold text-rose-300">
                    {sub?.expiryDate ? new Date(sub.expiryDate).toLocaleDateString('en-IN') : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Full Institute Workspace &amp; Student Management Access</span>
            </div>
            <button
              onClick={() => setPayModalOpen(true)}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Renew Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick UPI Card */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 text-white font-bold text-sm mb-4">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <QrCode className="w-4 h-4" />
              </div>
              <span>Official Platform UPI</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Super Admin Payee Name</span>
                <span className="text-xs font-bold text-white">{data?.platformUpi?.upiPayeeName || 'DPR Tuition Platform'}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">UPI ID for Payment</span>
                <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-700 mt-1">
                  <code className="text-xs font-mono font-bold text-amber-300 truncate">
                    {data?.platformUpi?.upiId || 'admin@dprtuition.com'}
                  </code>
                  <button
                    onClick={() => handleCopyUpi(data?.platformUpi?.upiId || 'admin@dprtuition.com')}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer shrink-0 ml-2"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 text-[11px] text-slate-400 space-y-1.5">
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Instant Dynamic QR Code Generation</span>
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Supports GPay, PhonePe, Paytm, &amp; BHIM</span>
              </p>
              <p className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Immediate UTR Verification</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setPayModalOpen(true)}
            className="mt-6 w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Generate Renewal QR Code</span>
          </button>
        </div>
      </div>

      {/* Payment History Ledger */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Receipt className="w-4 h-4 text-blue-400" />
            <span>Membership Payment &amp; Renewal History</span>
          </div>
          <span className="text-xs text-slate-400">
            Total Submissions: {sub?.payments?.length || 0}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-5">Receipt / Ref</th>
                <th className="py-3.5 px-4">Amount Paid</th>
                <th className="py-3.5 px-4">Method &amp; UTR</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {sub?.payments?.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition duration-150">
                  <td className="py-3.5 px-5 font-mono font-bold text-white text-xs">
                    {p.receiptNumber || 'SAAS-PAY'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-emerald-400">
                    ₹{p.amount?.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200">{p.paymentMethod}</div>
                    {p.transactionReference && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        UTR: {p.transactionReference}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                    {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        p.status === 'SETTLED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : p.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {p.status === 'SETTLED' ? 'APPROVED' : p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!sub?.payments || sub?.payments?.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No membership payment history found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Membership Plan via UPI Modal */}
      <AnimatePresence>
        {payModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 text-white font-bold text-base">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
                    <Zap className="w-4 h-4 text-amber-300" />
                  </div>
                  <span>Renew Membership via UPI</span>
                </div>
                <button
                  onClick={() => setPayModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitPayment} className="mt-5 space-y-4">
                {/* Duration Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    1. Select Renewal Duration
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {DURATION_OPTIONS.map((opt) => {
                      const isSelected = selectedDuration === opt.months;
                      return (
                        <button
                          key={opt.months}
                          type="button"
                          onClick={() => setSelectedDuration(opt.months)}
                          className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 text-white shadow-lg shadow-blue-600/20 ring-1 ring-blue-500'
                              : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-xs font-black block">{opt.label}</span>
                          <span className="text-[10px] text-emerald-400 font-semibold mt-1">{opt.tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount Calculation */}
                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Calculated Total</span>
                    <div className="text-xs text-slate-300">
                      ₹{baseMonthlyPrice} × {selectedDuration} month(s)
                      {currentOption.discount > 0 && (
                        <span className="text-emerald-400 ml-1 font-semibold">({currentOption.discount}% discount applied)</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-emerald-400">₹{finalPayableAmount}</span>
                  </div>
                </div>

                {/* UPI QR Code Display */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    2. Scan &amp; Pay ₹{finalPayableAmount}
                  </span>

                  <div className="p-2.5 bg-white rounded-2xl shadow-xl">
                    <img src={qrCodeUrl} alt="UPI QR Code" className="w-40 h-40" />
                  </div>

                  <div className="text-xs text-slate-400">
                    Payee: <strong className="text-white">{payeeName}</strong>
                    <div className="mt-1 font-mono text-amber-300 text-[11px] flex items-center justify-center gap-1.5">
                      <span>UPI ID: {upiId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyUpi(upiId)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Direct Mobile App Trigger */}
                  <a
                    href={upiUri}
                    className="sm:hidden px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md"
                  >
                    <span>Open in GPay / PhonePe / Paytm</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* UTR Number Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    3. Enter 12-Digit UPI Transaction / UTR Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    placeholder="e.g. 423819283746"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    After paying from your UPI app, enter the 12-digit UTR reference number from the payment receipt.
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setPayModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Payment...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit UPI Payment for Approval</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

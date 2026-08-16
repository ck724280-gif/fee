'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { buildWhatsAppUrl, generatePaymentReceiptMessage } from '@/lib/whatsapp';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  Phone,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Receipt,
  MessageSquare,
  QrCode,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export default function UpiApprovalsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const [instituteSettings, setInstituteSettings] = useState<any | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const [res, setRes] = await Promise.all([
        fetch(`/api/payments/upi-submissions?${params.toString()}`),
        fetch('/api/settings'),
      ]);

      const json = await res.json();
      const setJson = await setRes.json();

      if (setJson.success && setJson.data) {
        setInstituteSettings(setJson.data);
      }

      if (json.success && json.data) {
        setSubmissions(json.data);
        setPendingCount(json.meta?.pendingCount ?? 0);
      }
    } catch (err) {
      console.error('Failed to load UPI submissions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Handle Approve Submission
  const handleApprove = async (sub: any) => {
    if (
      !confirm(
        `Confirm Approval for ${sub.student?.name}?\n\nUTR: ${sub.utrNumber}\nAmount: ₹${sub.amount}\n\nThis will mark the fee as PAID and issue official receipt.`
      )
    ) {
      return;
    }

    setProcessingId(sub.id);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/payments/upi-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: sub.id,
          action: 'APPROVE',
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to approve submission');
      }

      setSuccessMsg(json.message || 'Payment verified & approved successfully! Receipt issued.');
      fetchSubmissions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve payment');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Reject Submission
  const handleReject = async (sub: any) => {
    const reason = prompt(
      `Enter reason for rejecting UTR ${sub.utrNumber} (${sub.student?.name}):`,
      'Payment not found in institute bank account statement.'
    );

    if (reason === null) return;

    setProcessingId(sub.id);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/payments/upi-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId: sub.id,
          action: 'REJECT',
          rejectionReason: reason.trim() || 'Payment not found in bank statement.',
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to reject submission');
      }

      setSuccessMsg('Payment proof rejected. The student invoice has been notified to re-submit.');
      fetchSubmissions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject payment');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyUtr = (utr: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      setTimeout(() => setCopiedUtr(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Online UPI Approvals
            </h1>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-black animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verify student-submitted 12-digit UTR payment proofs with your bank statement and issue official receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/payments"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>View All Receipts Ledger</span>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchSubmissions} title="Refresh submissions">
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Info Guide Card for Admin */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm text-blue-950 block">How UPI Approval Works:</span>
            <span className="text-blue-800 leading-relaxed">
              1. Copy the 12-digit UTR below. 2. Check your GPay / PhonePe / Bank app to confirm money received. 3. Click <strong>&quot;Approve &amp; Settle&quot;</strong> to issue the receipt.
            </span>
          </div>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button type="button" onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900">
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {st === 'PENDING' ? `Pending (${pendingCount})` : st}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by UTR number, student name, roll..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-slate-400" />}
          />
        </div>
      </div>

      {/* Submissions List Card */}
      <Card>
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="p-12 text-center flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Loading payment verification proofs...</span>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No {statusFilter.toLowerCase()} submissions found</h3>
              <p className="text-xs text-slate-400">
                When students submit their 12-digit UTR after paying via UPI, their proofs will appear here for verification.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Submitted UTR / Ref ID</th>
                  <th className="px-5 py-3.5">Student Details</th>
                  <th className="px-5 py-3.5">Class</th>
                  <th className="px-5 py-3.5">Amount (₹)</th>
                  <th className="px-5 py-3.5">Submission Time</th>
                  <th className="px-5 py-3.5">Current Status</th>
                  <th className="px-5 py-3.5 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {submissions.map((sub) => {
                  const isProcessing = processingId === sub.id;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* UTR with 1-click Copy */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 text-sm">
                          <span>{sub.utrNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyUtr(sub.utrNumber)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                            title="Copy UTR to check in Bank App"
                          >
                            {copiedUtr === sub.utrNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Check in GPay / PhonePe Statement
                        </span>
                      </td>

                      {/* Student Info */}
                      <td className="px-5 py-4">
                        <Link
                          href={`/students/${sub.student?.id}`}
                          className="font-bold text-slate-900 hover:underline"
                        >
                          {sub.student?.name}
                        </Link>
                        <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono">{sub.student?.studentCode}</span>
                          {(sub.student?.whatsappNumber || sub.student?.mobile) && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{sub.student?.whatsappNumber || sub.student?.mobile}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Class */}
                      <td className="px-5 py-4">
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px]">
                          {sub.student?.class?.name || sub.feeRecord?.class?.name}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 font-bold text-emerald-600 text-sm font-mono">
                        {formatCurrency(sub.amount)}
                      </td>

                      {/* Time */}
                      <td className="px-5 py-4 text-slate-500 text-[11px]">
                        {new Date(sub.submittedAt).toLocaleDateString()}{' '}
                        <span className="text-slate-400">
                          {new Date(sub.submittedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {sub.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-amber-500 animate-spin" />
                            <span>Needs Verification</span>
                          </span>
                        ) : sub.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Verified &amp; Settled</span>
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                            {sub.rejectionReason && (
                              <span className="text-[10px] text-rose-600 block mt-1 max-w-xs truncate" title={sub.rejectionReason}>
                                {sub.rejectionReason}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        {sub.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleApprove(sub)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                            >
                              {isProcessing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  <span>Approve &amp; Settle</span>
                                </>
                              )}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isProcessing}
                              onClick={() => handleReject(sub)}
                              className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              <span>Reject</span>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

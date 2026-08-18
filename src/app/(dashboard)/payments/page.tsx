'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import { buildWhatsAppUrl, generatePaymentReceiptMessage } from '@/lib/whatsapp';
import {
  Receipt,
  Search,
  Download,
  MessageSquare,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Phone,
  RefreshCw,
} from 'lucide-react';

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState<'settled' | 'approvals'>('settled');

  // Settled Payments State
  const [payments, setPayments] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [summary, setSummary] = useState({
    totalAmount: 0,
    totalTransactions: 0,
  });
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);

  // Filters for Settled Payments
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // UPI Submissions State
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [processingSubmissionId, setProcessingSubmissionId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  const [instituteSettings, setInstituteSettings] = useState<{
    instituteName?: string;
    phone?: string;
    whatsapp?: string;
  } | null>(null);

  // Fetch Settled Payments
  const fetchPayments = useCallback(
    async (pageNumber = 1) => {
      try {
        setIsLoadingPayments(true);
        const params = new URLSearchParams();
        params.set('page', pageNumber.toString());
        params.set('limit', '20');
        if (search.trim()) params.set('search', search.trim());
        if (paymentMethod) params.set('paymentMethod', paymentMethod);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const [res, setRes] = await Promise.all([
          fetch(`/api/payments?${params.toString()}`),
          fetch('/api/settings'),
        ]);
        const json = await res.json();
        const setJson = await setRes.json();

        if (setJson.success && setJson.data) {
          setInstituteSettings(setJson.data);
        }

        const dataObj = json.data || json;
        if (dataObj.payments) {
          setPayments(dataObj.payments);
          setPagination(dataObj.pagination);
          setSummary(dataObj.summary);
        }
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setIsLoadingPayments(false);
      }
    },
    [search, paymentMethod, startDate, endDate]
  );

  // Fetch UPI Submissions (Approvals)
  const fetchSubmissions = useCallback(async () => {
    try {
      setIsLoadingSubmissions(true);
      const params = new URLSearchParams();
      if (submissionStatusFilter !== 'ALL') params.set('status', submissionStatusFilter);
      if (submissionSearch.trim()) params.set('search', submissionSearch.trim());

      const res = await fetch(`/api/payments/upi-submissions?${params.toString()}`);
      const json = await res.json();

      if (json.success && json.data) {
        setSubmissions(json.data);
        setPendingCount(json.meta?.pendingCount ?? 0);
      }
    } catch (err) {
      console.error('Failed to load UPI submissions:', err);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [submissionStatusFilter, submissionSearch]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'approvals') {
        setActiveTab('approvals');
      }
    }
  }, []);

  useEffect(() => {
    fetchPayments(1);
    fetchSubmissions();
  }, [fetchPayments, fetchSubmissions]);

  // Handle Approve UPI Submission
  const handleApproveSubmission = async (sub: any) => {
    if (!confirm(`Are you sure you want to approve UTR ${sub.utrNumber} for ₹${sub.amount} (${sub.student?.name})? This will settle the fee and issue an official receipt.`)) {
      return;
    }

    setProcessingSubmissionId(sub.id);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

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

      setActionSuccessMsg(json.message || 'Payment verified & approved successfully!');
      fetchSubmissions();
      fetchPayments(1);
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to approve payment');
    } finally {
      setProcessingSubmissionId(null);
    }
  };

  // Handle Reject UPI Submission
  const handleRejectSubmission = async (sub: any) => {
    const reason = prompt(
      `Enter reason for rejecting UTR ${sub.utrNumber} (${sub.student?.name}):`,
      'Payment not found in institute bank account statement.'
    );

    if (reason === null) return; // User cancelled prompt

    setProcessingSubmissionId(sub.id);
    setActionSuccessMsg(null);
    setActionErrorMsg(null);

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

      setActionSuccessMsg('Payment submission rejected. Student invoice has been updated.');
      fetchSubmissions();
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Failed to reject payment');
    } finally {
      setProcessingSubmissionId(null);
    }
  };

  const handleCopyUtr = (utr: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      setTimeout(() => setCopiedUtr(null), 2000);
    }
  };

  const handleWhatsAppReceipt = (p: any) => {
    const phone = p.student?.whatsappNumber || p.student?.phone || p.student?.mobile;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const docPath = p.documentUrl || `/api/documents/${p.documentToken || p.id}`;
    const msg = generatePaymentReceiptMessage({
      studentName: p.student?.name,
      className: p.student?.class?.name,
      paidAmount: p.amount,
      receiptNumber: p.receiptNumber,
      paymentMethod: p.paymentMethod,
      outstandingAmount: p.feeRecord?.outstandingAmount ?? 0,
      documentUrl: `${origin}${docPath}`,
      instituteName: instituteSettings?.instituteName || 'DPR Private Tuition',
      contactPhone: instituteSettings?.phone || instituteSettings?.whatsapp || '+91 98765 43210',
    });

    const url = buildWhatsAppUrl(phone, msg);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Payments &amp; Receipts Ledger
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage official fee receipts, transaction logs, and online UPI payment proof approvals
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('settled')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settled'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settled Receipts ({pagination.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approvals'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>UPI Approvals</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Action Messages */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionErrorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionErrorMsg(null)}
            className="text-rose-600 hover:text-rose-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: SETTLED PAYMENTS & RECEIPTS */}
      {activeTab === 'settled' && (
        <div className="space-y-4">
          {/* Filter Bar & Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <Input
                  placeholder="Search receipt no (DPR-RC-2026-0001), student name, txn ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                />
              </div>

              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </Select>

              <Input
                type="date"
                placeholder="From Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Button variant="primary" size="sm" onClick={() => fetchPayments(1)}>
                Apply Filters
              </Button>
            </div>

            {/* Totals Summary */}
            <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>
                Total Transactions: <strong className="text-slate-900">{summary.totalTransactions}</strong>
              </span>
              <span>
                Cumulative Collected Revenue:{' '}
                <strong className="text-emerald-600 font-bold text-sm">
                  {formatCurrency(summary.totalAmount)}
                </strong>
              </span>
            </div>
          </div>

          {/* Payments Table */}
          <Card>
            <div className="overflow-x-auto w-full">
              {isLoadingPayments ? (
                <div className="p-12 text-center flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Loading payment ledger...</span>
                </div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-medium">No payment records found</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Receipt No</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Student Details</th>
                      <th className="px-5 py-3.5">Class</th>
                      <th className="px-5 py-3.5">Method</th>
                      <th className="px-5 py-3.5">Transaction ID / UTR</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-blue-600">
                          {p.receiptNumber}
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          {formatDate(p.paymentDate)}
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/students/${p.student?.id}`}
                            className="font-bold text-slate-900 hover:underline"
                          >
                            {p.student?.name}
                          </Link>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.student?.studentCode}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px]">
                            {p.student?.class?.name}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Badge variant="default" size="sm">
                            {p.paymentMethod}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 font-mono text-slate-500">
                          {p.transactionId || '—'}
                        </td>

                        <td className="px-5 py-4 font-bold text-emerald-600 text-sm">
                          {formatCurrency(p.amount)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleWhatsAppReceipt(p)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Share Receipt on WhatsApp"
                            >
                              <MessageSquare className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={(p) => fetchPayments(p)}
            />
          </Card>
        </div>
      )}

      {/* TAB 2: UPI PROOF APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          {/* Submissions Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSubmissionStatusFilter(st)}
                    className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                      submissionStatusFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {st === 'PENDING' ? `Pending (${pendingCount})` : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-72">
              <Input
                placeholder="Search UTR, student name..."
                value={submissionSearch}
                onChange={(e) => setSubmissionSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSubmissions}
                title="Refresh submissions"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Submissions Table / Cards */}
          <Card>
            <div className="overflow-x-auto w-full">
              {isLoadingSubmissions ? (
                <div className="p-12 text-center flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>Loading UPI proof submissions...</span>
                </div>
              ) : submissions.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-medium">No {submissionStatusFilter.toLowerCase()} UPI submissions found</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3.5">Submitted UTR / Ref</th>
                      <th className="px-5 py-3.5">Student Details</th>
                      <th className="px-5 py-3.5">Class</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Submitted Time</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Admin Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {submissions.map((sub) => {
                      const isProcessing = processingSubmissionId === sub.id;

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                              <span>{sub.utrNumber}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyUtr(sub.utrNumber)}
                                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                title="Copy UTR to verify in Bank App"
                              >
                                {copiedUtr === sub.utrNumber ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Verify in PhonePe / GPay / Bank App
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <Link
                              href={`/students/${sub.student?.id}`}
                              className="font-bold text-slate-900 hover:underline"
                            >
                              {sub.student?.name}
                            </Link>
                            <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className="font-mono">{sub.student?.studentCode}</span>
                              {sub.student?.phone && (
                                <span className="flex items-center gap-0.5 text-slate-400">
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{sub.student?.phone}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px]">
                              {sub.student?.class?.name || sub.feeRecord?.class?.name}
                            </span>
                          </td>

                          <td className="px-5 py-4 font-bold text-emerald-600 text-sm">
                            {formatCurrency(sub.amount)}
                          </td>

                          <td className="px-5 py-4 text-slate-500 text-[11px]">
                            {new Date(sub.submittedAt).toLocaleDateString()}{' '}
                            <span className="text-slate-400">
                              {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            {sub.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                                <Clock className="w-3 h-3 text-amber-500 animate-spin" />
                                <span>Needs Review</span>
                              </span>
                            ) : sub.status === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Verified &amp; Paid</span>
                              </span>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Rejected</span>
                                </span>
                                {sub.rejectionReason && (
                                  <span className="text-[10px] text-rose-600 block mt-1 max-w-xs truncate" title={sub.rejectionReason}>
                                    Reason: {sub.rejectionReason}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            {sub.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  disabled={isProcessing}
                                  onClick={() => handleApproveSubmission(sub)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
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
                                  onClick={() => handleRejectSubmission(sub)}
                                  className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
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
      )}
    </div>
  );
}

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
} from 'lucide-react';

export default function PaymentsPage() {
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

  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchPayments = useCallback(
    async (pageNumber = 1) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.set('page', pageNumber.toString());
        params.set('limit', '20');
        if (search.trim()) params.set('search', search.trim());
        if (paymentMethod) params.set('paymentMethod', paymentMethod);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const res = await fetch(`/api/payments?${params.toString()}`);
        const json = await res.json();

        if (json.payments) {
          setPayments(json.payments);
          setPagination(json.pagination);
          setSummary(json.summary);
        }
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [search, paymentMethod, startDate, endDate]
  );

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const handleWhatsAppReceipt = (p: any) => {
    const phone = p.student?.whatsappNumber || p.student?.mobile;
    const msg = generatePaymentReceiptMessage({
      studentName: p.student?.name,
      className: p.student?.class?.name,
      paidAmount: p.amount,
      receiptNumber: p.receiptNumber,
      paymentMethod: p.paymentMethod,
      outstandingAmount: p.feeRecord?.outstandingAmount ?? 0,
      documentUrl: `https://dprtuition.vercel.app/api/documents/${p.id}`,
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
            Payment History & Receipts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Complete transaction ledger with monotonic DPR receipt sequences and on-demand PDF receipts
          </p>
        </div>
      </div>

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
          {isLoading ? (
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
                  <th className="px-5 py-3.5">Transaction ID</th>
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
  );
}

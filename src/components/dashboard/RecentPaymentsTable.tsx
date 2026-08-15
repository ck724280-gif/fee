'use client';

import React from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { RecentPaymentItem } from '@/lib/dashboard-service';
import { ArrowRight, Receipt } from 'lucide-react';

export interface RecentPaymentsTableProps {
  payments: RecentPaymentItem[];
}

export function RecentPaymentsTable({ payments }: RecentPaymentsTableProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Payment Ledger</h3>
            <p className="text-xs text-slate-500">Latest recorded fee receipts</p>
          </div>
        </div>
        <Link
          href="/payments"
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-3">Receipt No</th>
              <th className="px-6 py-3">Student</th>
              <th className="px-6 py-3">Class</th>
              <th className="px-6 py-3">Method</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  No payment transactions recorded yet
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 font-mono font-semibold text-blue-600">
                    {p.receiptNumber}
                  </td>
                  <td className="px-6 py-3.5 font-medium text-slate-900">
                    <div>{p.studentName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.studentCode}</div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {p.className}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <Badge variant="default" size="sm">
                      {p.paymentMethod}
                    </Badge>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500">{p.paymentDate}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                    {formatCurrency(p.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

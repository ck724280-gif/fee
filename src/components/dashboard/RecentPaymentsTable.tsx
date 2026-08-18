'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { RecentPaymentItem } from '@/lib/dashboard-service';
import { ArrowRight, Receipt, CheckCircle2, CreditCard, Banknote, QrCode } from 'lucide-react';

export interface RecentPaymentsTableProps {
  payments: RecentPaymentItem[];
}

export function RecentPaymentsTable({ payments }: RecentPaymentsTableProps) {
  const getMethodIcon = (method: string) => {
    switch (method.toUpperCase()) {
      case 'UPI':
        return <QrCode className="w-3 h-3 text-indigo-500" />;
      case 'CASH':
        return <Banknote className="w-3 h-3 text-emerald-500" />;
      default:
        return <CreditCard className="w-3 h-3 text-blue-500" />;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-xl shadow-xs overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100/90 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Live Payment Ledger Inflow
            </h3>
            <p className="text-xs text-slate-500 font-medium">Real-time settled tuition fee collections</p>
          </div>
        </div>
        <Link
          href="/payments"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-colors px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100"
        >
          <span>View All Transactions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-3">Receipt No</th>
              <th className="px-6 py-3">Student &amp; Roll</th>
              <th className="px-6 py-3">Class</th>
              <th className="px-6 py-3">Mode</th>
              <th className="px-6 py-3">Settled Date</th>
              <th className="px-6 py-3 text-right">Settled Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                  No payment transactions recorded in current cycle
                </td>
              </tr>
            ) : (
              payments.map((p, idx) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  className="hover:bg-slate-50/80 transition-colors group cursor-default"
                >
                  <td className="px-6 py-3.5">
                    <span className="font-mono font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50/80 border border-blue-200/60 text-[11px]">
                      {p.receiptNumber}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {p.studentName.charAt(0)}
                      </span>
                      <span>{p.studentName}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono ml-7.5">{p.studentCode}</div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                      {p.className}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-800 uppercase">
                      {getMethodIcon(p.paymentMethod)}
                      {p.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-500 font-medium">{p.paymentDate}</td>
                  <td className="px-6 py-3.5 text-right font-mono font-extrabold text-emerald-600 text-sm">
                    {formatCurrency(p.amount)}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

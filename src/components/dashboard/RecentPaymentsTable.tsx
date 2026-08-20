'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { RecentPaymentItem } from '@/lib/dashboard-service';
import { ArrowRight, Receipt, CreditCard, Banknote, QrCode } from 'lucide-react';

export interface RecentPaymentsTableProps {
  payments: RecentPaymentItem[];
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-purple-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-blue-600',
  'from-rose-500 to-red-600',
];

export function RecentPaymentsTable({ payments }: RecentPaymentsTableProps) {
  const getMethodBadge = (method?: string | null) => {
    const safeMethod = (method || 'OTHER').toUpperCase();
    switch (safeMethod) {
      case 'UPI':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 text-[10px] font-black text-purple-800 uppercase shadow-2xs">
            <QrCode className="w-3 h-3 text-purple-600" />
            UPI Digital
          </span>
        );
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-[10px] font-black text-emerald-800 uppercase shadow-2xs">
            <Banknote className="w-3 h-3 text-emerald-600" />
            Cash Flow
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 text-[10px] font-black text-blue-800 uppercase shadow-2xs">
            <CreditCard className="w-3 h-3 text-blue-600" />
            {method}
          </span>
        );
    }
  };

  return (
    <div className="rounded-3xl border border-white/90 bg-white/90 backdrop-blur-2xl shadow-xs overflow-hidden">
      <div className="px-6 py-4.5 border-b border-slate-100/90 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 ring-2 ring-emerald-200/60">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Live Inflow Transaction Ledger</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            </h3>
            <p className="text-xs text-slate-500 font-medium">Real-time tuition fee settled receipts</p>
          </div>
        </div>
        <Link
          href="/payments"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 transition-all px-3.5 py-2 rounded-xl bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/60 shadow-2xs cursor-pointer"
        >
          <span>View All Transactions</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-3.5">Receipt Reference</th>
              <th className="px-6 py-3.5">Student Account</th>
              <th className="px-6 py-3.5">Class Cohort</th>
              <th className="px-6 py-3.5">Payment Mode</th>
              <th className="px-6 py-3.5">Settled Date</th>
              <th className="px-6 py-3.5 text-right">Settled Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-medium">
                  No payment transactions recorded in current billing cycle
                </td>
              </tr>
            ) : (
              payments.map((p, idx) => {
                const avatarGrad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.035, duration: 0.3 }}
                    className="hover:bg-blue-50/30 transition-colors group cursor-default"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono font-black text-blue-600 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-[11px] shadow-2xs">
                        {p.receiptNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2.5">
                        <span className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${avatarGrad} text-white flex items-center justify-center text-[11px] font-black shrink-0 shadow-xs`}>
                          {p.studentName.charAt(0)}
                        </span>
                        <div>
                          <div>{p.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono font-medium">{p.studentCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200/60">
                        {p.className}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getMethodBadge(p.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-semibold">{p.paymentDate}</td>
                    <td className="px-6 py-4 text-right font-mono font-black text-emerald-600 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

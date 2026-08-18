'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, ArrowRight, MessageSquare, Flame } from 'lucide-react';
import { UrgentOverdueItem } from '@/lib/dashboard-service';

export interface OverdueAlertBannerProps {
  overdueCount: number;
  totalOverdueAmount: number;
  urgentList?: UrgentOverdueItem[];
}

export function OverdueAlertBanner({
  overdueCount,
  totalOverdueAmount,
  urgentList = [],
}: OverdueAlertBannerProps) {
  if (overdueCount === 0 && totalOverdueAmount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border-2 border-rose-400/40 bg-gradient-to-r from-rose-50/95 via-rose-100/60 to-white/90 backdrop-blur-xl p-4 sm:p-5 text-rose-950 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      {/* Ambient Pulsing Side Line */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500 animate-pulse" />

      <div className="flex items-start gap-3.5 pl-1.5">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/25">
          <AlertCircle className="w-6 h-6 animate-bounce" />
        </div>
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-200/60 text-rose-800 text-[10px] font-black uppercase tracking-wider mb-1 w-fit">
            <Flame className="w-3 h-3 text-rose-600" />
            <span>Delinquency Alert</span>
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-rose-950 tracking-tight">
            Action Required: {overdueCount} Overdue Accounts ({formatCurrency(totalOverdueAmount)})
          </h4>
          <p className="text-xs text-rose-700/90 mt-0.5 leading-relaxed">
            There are students with unpaid fees past their due date. Review accounts and share WhatsApp reminders.
          </p>

          {urgentList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {urgentList.slice(0, 4).map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs bg-white/90 border border-rose-200 text-rose-900 font-semibold shadow-xs hover:border-rose-300 transition-colors"
                >
                  <span className="truncate max-w-[120px]">{item.studentName}</span>
                  <span className="font-mono font-bold text-rose-600">
                    {formatCurrency(item.outstandingAmount)}
                  </span>
                  {item.whatsappUrl && (
                    <a
                      href={item.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title="Send WhatsApp Notice"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </a>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
        <Link
          href="/fees?status=OVERDUE"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-600/20 active:scale-95"
        >
          <span>Review All Overdue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}

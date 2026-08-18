'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, ArrowRight, MessageSquare, Flame, ShieldAlert } from 'lucide-react';
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
      className="relative overflow-hidden rounded-3xl border-2 border-rose-400/60 bg-gradient-to-r from-rose-50/95 via-red-100/50 to-orange-50/80 backdrop-blur-2xl p-5 sm:p-6 text-rose-950 shadow-xl shadow-rose-500/10 flex flex-col md:flex-row md:items-center justify-between gap-5"
    >
      {/* Ambient Pulsing Side Line */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-rose-500 via-red-600 to-orange-500 animate-pulse" />

      {/* Floating Background Glow */}
      <div className="absolute right-0 top-0 w-64 h-64 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-start gap-4 pl-2 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-500 to-pink-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/35 ring-4 ring-rose-200/60">
          <ShieldAlert className="w-6 h-6 animate-bounce" />
        </div>
        <div className="flex flex-col">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-200/80 text-rose-900 text-[10px] font-black uppercase tracking-wider mb-1.5 w-fit border border-rose-300 shadow-xs">
            <Flame className="w-3.5 h-3.5 text-rose-600" />
            <span>High-Priority Delinquency</span>
          </div>
          <h4 className="font-black text-base sm:text-lg text-rose-950 tracking-tight flex items-center gap-2">
            <span>Action Required: {overdueCount} Overdue Accounts</span>
            <span className="font-mono text-rose-600 font-extrabold">({formatCurrency(totalOverdueAmount)})</span>
          </h4>
          <p className="text-xs text-rose-800/90 mt-0.5 leading-relaxed font-medium">
            Outstanding fees past cycle due dates. Verify student accounts and trigger 1-click WhatsApp payment reminders.
          </p>

          {urgentList.length > 0 && (
            <div className="flex flex-wrap gap-2.5 mt-3">
              {urgentList.slice(0, 4).map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs bg-white/95 border border-rose-200 text-rose-900 font-bold shadow-xs hover:border-rose-300 hover:shadow-md transition-all"
                >
                  <span className="truncate max-w-[130px]">{item.studentName}</span>
                  <span className="font-mono font-black text-rose-600">
                    {formatCurrency(item.outstandingAmount)}
                  </span>
                  {item.whatsappUrl && (
                    <a
                      href={item.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors shadow-2xs"
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

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center relative z-10">
        <Link
          href="/fees?status=OVERDUE"
          className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-black rounded-2xl transition-all shadow-lg shadow-rose-600/30 active:scale-95 cursor-pointer"
        >
          <span>Review All Overdue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </motion.div>
  );
}

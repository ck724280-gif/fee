'use client';

import React from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { AlertCircle, ArrowRight, MessageSquare } from 'lucide-react';
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
    <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5 text-rose-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/30">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <h4 className="font-bold text-sm sm:text-base text-rose-950">
            Action Required: {overdueCount} Overdue Accounts ({formatCurrency(totalOverdueAmount)})
          </h4>
          <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
            There are students with unpaid fees past their due date. Review accounts and share WhatsApp reminders.
          </p>
          {urgentList.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {urgentList.slice(0, 3).map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] bg-white border border-rose-200 text-rose-800 font-medium"
                >
                  <span>{item.studentName}</span>
                  <span className="font-bold text-rose-600">({formatCurrency(item.outstandingAmount)})</span>
                  {item.whatsappUrl && (
                    <a
                      href={item.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700"
                      title="Send WhatsApp Notice"
                    >
                      <MessageSquare className="w-3 h-3" />
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
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
        >
          <span>Review All Overdue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

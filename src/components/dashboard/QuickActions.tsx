'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { UserPlus, CreditCard, RefreshCw, BarChart3, Clock, WalletCards } from 'lucide-react';
import Link from 'next/link';

export interface QuickActionsProps {
  onAddStudent: () => void;
  onCollectFee: () => void;
  onGenerateBilling: () => void;
  onRefreshStatuses: () => void;
  isRefreshing?: boolean;
}

export function QuickActions({
  onAddStudent,
  onCollectFee,
  onGenerateBilling,
  onRefreshStatuses,
  isRefreshing = false,
}: QuickActionsProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Quick Actions:
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="primary"
          size="sm"
          onClick={onAddStudent}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add Student
        </Button>

        <Button
          variant="success"
          size="sm"
          onClick={onCollectFee}
          leftIcon={<CreditCard className="w-4 h-4" />}
        >
          Collect Fee
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onGenerateBilling}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Generate Cycles
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRefreshStatuses}
          isLoading={isRefreshing}
          leftIcon={<Clock className="w-4 h-4" />}
        >
          Refresh Statuses
        </Button>

        <Link href="/expenses">
          <Button variant="outline" size="sm" className="text-rose-700 hover:bg-rose-50 border-rose-200" leftIcon={<WalletCards className="w-4 h-4 text-rose-600" />}>
            Record Expense
          </Button>
        </Link>

        <Link href="/reports">
          <Button variant="ghost" size="sm" leftIcon={<BarChart3 className="w-4 h-4" />}>
            View Reports
          </Button>
        </Link>
      </div>
    </div>
  );
}

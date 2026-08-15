'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import {
  Users,
  UserCheck,
  Coins,
  TrendingUp,
  Clock,
  AlertTriangle,
  Receipt,
  UserPlus,
} from 'lucide-react';

export interface KPICardsProps {
  data: {
    totalStudents: number;
    activeStudents: number;
    todayCollection: number;
    monthlyCollection: number;
    pendingFees: number;
    overdueFees: number;
    partialCount: number;
    newAdmissions: number;
  };
}

export function KPICards({ data }: KPICardsProps) {
  const cards = [
    {
      title: 'Total Students',
      value: data.totalStudents.toString(),
      subtitle: `${data.activeStudents} active enrolled`,
      icon: Users,
      color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    },
    {
      title: 'Active Students',
      value: data.activeStudents.toString(),
      subtitle: `${data.totalStudents > 0 ? Math.round((data.activeStudents / data.totalStudents) * 100) : 100}% active rate`,
      icon: UserCheck,
      color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
    },
    {
      title: "Today's Collection",
      value: formatCurrency(data.todayCollection),
      subtitle: 'Cash & Digital receipts',
      icon: Coins,
      color: 'bg-green-500/10 text-green-600 border-green-200',
    },
    {
      title: 'Monthly Collection',
      value: formatCurrency(data.monthlyCollection),
      subtitle: 'Current calendar month',
      icon: TrendingUp,
      color: 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
    },
    {
      title: 'Pending Due Fees',
      value: formatCurrency(data.pendingFees),
      subtitle: 'Due within active cycle',
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-600 border-amber-200',
    },
    {
      title: 'Overdue Arrears',
      value: formatCurrency(data.overdueFees),
      subtitle: 'Past due date balance',
      icon: AlertTriangle,
      color: 'bg-rose-500/10 text-rose-600 border-rose-200',
    },
    {
      title: 'Partial Accounts',
      value: data.partialCount.toString(),
      subtitle: 'Paying in installments',
      icon: Receipt,
      color: 'bg-violet-500/10 text-violet-600 border-violet-200',
    },
    {
      title: 'New Admissions',
      value: data.newAdmissions.toString(),
      subtitle: 'Admitted this month',
      icon: UserPlus,
      color: 'bg-teal-500/10 text-teal-600 border-teal-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-start justify-between gap-4 transition-all hover:shadow-md"
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
                {c.title}
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-1 truncate">
                {c.value}
              </span>
              <span className="text-xs text-slate-400 mt-1 truncate">{c.subtitle}</span>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${c.color}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

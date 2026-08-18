'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { UserPlus, CreditCard, RefreshCw, BarChart3, Clock, WalletCards, Zap } from 'lucide-react';
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-xl p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
          <Zap className="w-4 h-4" />
        </div>
        <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
          Quick Actions Hub
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="primary"
            size="sm"
            onClick={onAddStudent}
            leftIcon={<UserPlus className="w-4 h-4" />}
            className="shadow-sm shadow-blue-500/20"
          >
            Add Student
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="success"
            size="sm"
            onClick={onCollectFee}
            leftIcon={<CreditCard className="w-4 h-4" />}
            className="shadow-sm shadow-emerald-500/20"
          >
            Collect Fee
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={onGenerateBilling}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Generate Cycles
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefreshStatuses}
            isLoading={isRefreshing}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            Refresh Statuses
          </Button>
        </motion.div>

        <Link href="/expenses">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              variant="outline"
              size="sm"
              className="text-rose-700 hover:bg-rose-50 border-rose-200"
              leftIcon={<WalletCards className="w-4 h-4 text-rose-600" />}
            >
              Record Expense
            </Button>
          </motion.div>
        </Link>

        <Link href="/reports">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button variant="ghost" size="sm" leftIcon={<BarChart3 className="w-4 h-4 text-indigo-600" />}>
              Reports
            </Button>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}

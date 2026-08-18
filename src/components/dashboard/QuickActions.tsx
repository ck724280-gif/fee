'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { UserPlus, CreditCard, RefreshCw, BarChart3, Clock, WalletCards, Zap, Sparkles } from 'lucide-react';
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
      className="rounded-3xl border border-white/90 bg-white/90 backdrop-blur-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white flex items-center justify-center shadow-md shadow-amber-500/25">
          <Zap className="w-4 h-4" />
        </div>
        <div>
          <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
            Command Actions
          </span>
          <span className="text-[10px] text-slate-400 font-medium">1-Click Fast Operations</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Add Student with Electric Blue Glow */}
        <motion.button
          whileHover={{ scale: 1.04, translateY: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={onAddStudent}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/25 hover:shadow-lg hover:shadow-blue-600/35 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Student</span>
        </motion.button>

        {/* Collect Fee with Vivid Emerald Glow */}
        <motion.button
          whileHover={{ scale: 1.04, translateY: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={onCollectFee}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 text-white font-bold text-xs shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/35 transition-all cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>Collect Fee</span>
        </motion.button>

        {/* Generate Cycles with Violet Glow */}
        <motion.button
          whileHover={{ scale: 1.04, translateY: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={onGenerateBilling}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4 text-violet-600" />
          <span>Generate Cycles</span>
        </motion.button>

        {/* Refresh Statuses */}
        <motion.button
          whileHover={{ scale: 1.04, translateY: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={onRefreshStatuses}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50"
        >
          <Clock className={`w-4 h-4 text-amber-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Statuses</span>
        </motion.button>

        {/* Record Expense with Coral Rose Glow */}
        <Link href="/expenses">
          <motion.div
            whileHover={{ scale: 1.04, translateY: -2 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs shadow-2xs hover:bg-rose-100/80 transition-all cursor-pointer"
          >
            <WalletCards className="w-4 h-4 text-rose-600" />
            <span>Record Expense</span>
          </motion.div>
        </Link>

        {/* Reports with Indigo Glow */}
        <Link href="/reports">
          <motion.div
            whileHover={{ scale: 1.04, translateY: -2 }}
            whileTap={{ scale: 0.96 }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold text-xs shadow-2xs hover:bg-indigo-100/80 transition-all cursor-pointer"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Reports</span>
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}

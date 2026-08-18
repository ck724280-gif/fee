'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { KPICards } from '@/components/dashboard/KPICards';
import { OverdueAlertBanner } from '@/components/dashboard/OverdueAlertBanner';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { MonthlyTrendChart } from '@/components/dashboard/MonthlyTrendChart';
import { FeeStatusDonutChart } from '@/components/dashboard/FeeStatusDonutChart';
import { ClassDistributionChart } from '@/components/dashboard/ClassDistributionChart';
import { RecentPaymentsTable } from '@/components/dashboard/RecentPaymentsTable';
import { StudentModal, ClassOption } from '@/components/modals/StudentModal';
import { CollectFeeModal, FeeRecordSummary } from '@/components/modals/CollectFeeModal';
import { GenerateBillingModal } from '@/components/modals/GenerateBillingModal';
import Link from 'next/link';
import { QrCode, ArrowRight, Clock, Sparkles, Activity, Layers, BarChart3, PieChart, Users2 } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingStatuses, setIsRefreshingStatuses] = useState(false);

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<FeeRecordSummary | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, classesRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/classes'),
      ]);

      const statsJson = await statsRes.json();
      const classesJson = await classesRes.json();

      if (statsJson.success) {
        setStats(statsJson.data);
      }
      if (classesJson.success) {
        setClasses(classesJson.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefreshStatuses = async () => {
    setIsRefreshingStatuses(true);
    try {
      await fetch('/api/fees/refresh-statuses', { method: 'POST' });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to refresh fee statuses:', err);
    } finally {
      setIsRefreshingStatuses(false);
    }
  };

  const handleOpenCollectFee = () => {
    if (stats?.urgentOverdueList?.length > 0) {
      const urgent = stats.urgentOverdueList[0];
      setSelectedFeeRecord({
        id: urgent.id,
        studentId: urgent.studentId,
        studentName: urgent.studentName,
        studentCode: urgent.studentCode,
        mobile: urgent.mobile,
        className: urgent.className,
        totalAmount: urgent.outstandingAmount,
        paidAmount: 0,
        outstandingAmount: urgent.outstandingAmount,
      });
    } else {
      setSelectedFeeRecord(null);
    }
    setIsCollectModalOpen(true);
  };

  // Skeleton Loading Shimmer
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-slate-200/70 rounded-3xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200/60 rounded-2xl" />
          ))}
        </div>
        <div className="h-20 bg-slate-200/60 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200/60 rounded-3xl" />
          <div className="lg:col-span-1 h-80 bg-slate-200/60 rounded-3xl" />
        </div>
      </div>
    );
  }

  const kpis = stats?.kpis || {
    totalStudents: 0,
    activeStudents: 0,
    todayCollection: 0,
    monthlyCollection: 0,
    pendingFees: 0,
    overdueFees: 0,
    partialCount: 0,
    newAdmissions: 0,
  };

  return (
    <div className="space-y-6 relative z-10">
      {/* Top Hero Section with Shimmering Gradient Title & Status Badges */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/60 backdrop-blur-xl p-5 rounded-3xl border border-white/80 shadow-xs"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-pink-500/10 border border-indigo-200/80 text-indigo-700 text-xs font-extrabold mb-1.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
            <span className="gradient-text-vivid">Automated Financial Intelligence System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Institute Command Center</span>
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/80 animate-pulse" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            DPR Private Tuition — Academic Operations &amp; Real-time Multi-ledger Analytics
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 shadow-xs text-xs font-bold text-emerald-800">
            <Activity className="w-4 h-4 text-emerald-600 animate-pulse" />
            <span>{kpis.activeStudents} Active Students</span>
          </div>
        </div>
      </motion.div>

      {/* Overdue Delinquencies Alert Banner */}
      <OverdueAlertBanner
        overdueCount={stats?.urgentOverdueList?.length || 0}
        totalOverdueAmount={kpis.overdueFees}
        urgentList={stats?.urgentOverdueList}
      />

      {/* Online UPI Proof Submissions Pending Verification Banner with Glowing Glass */}
      {Boolean(stats?.pendingUpiCount && stats.pendingUpiCount > 0) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="p-5 bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 text-white rounded-3xl border-2 border-emerald-400/80 shadow-2xl shadow-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden ring-4 ring-emerald-500/10"
        >
          {/* Ambient Glow Orbs */}
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-emerald-400/40 ring-4 ring-emerald-300/30">
              <QrCode className="w-7 h-7" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1.5 border border-emerald-400/40">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Verification Required</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {stats.pendingUpiCount} Online UPI Payment Proof{stats.pendingUpiCount > 1 ? 's' : ''} Awaiting Approval
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Students submitted 12-digit UTR transaction codes. Match with bank statement &amp; approve monotonic receipts.
              </p>
            </div>
          </div>

          <Link
            href="/payments?tab=approvals"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 hover:from-emerald-300 hover:to-cyan-200 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-xl shadow-emerald-500/30 shrink-0 cursor-pointer active:scale-95 relative z-10"
          >
            <span>Review &amp; Approve Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* 8-Dimension 3D Perspective KPI Cards */}
      <KPICards data={kpis} />

      {/* Quick Action Control Bar */}
      <QuickActions
        onAddStudent={() => setIsStudentModalOpen(true)}
        onCollectFee={handleOpenCollectFee}
        onGenerateBilling={() => setIsGenerateModalOpen(true)}
        onRefreshStatuses={handleRefreshStatuses}
        isRefreshing={isRefreshingStatuses}
      />

      {/* Analytics Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Collection Trend (2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl border border-white/90 bg-white/90 backdrop-blur-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-slate-100/90">
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <span>Monthly Collection &amp; Invoiced Trajectory</span>
            </h3>
          </div>
          <MonthlyTrendChart data={stats?.charts?.monthlyCollectionTrend || []} />
        </div>

        {/* Fee Status Breakdown (1 Col) */}
        <div className="lg:col-span-1 rounded-3xl border border-white/90 bg-white/90 backdrop-blur-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-slate-100/90">
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <span>Fee Status Distribution</span>
            </h3>
          </div>
          <FeeStatusDonutChart data={stats?.charts?.feeStatusDistribution || []} />
        </div>
      </div>

      {/* Secondary Grid: Class Distribution & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-3xl border border-white/90 bg-white/90 backdrop-blur-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-slate-100/90">
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center">
                <Users2 className="w-3.5 h-3.5" />
              </div>
              <span>Class Cohort Distribution</span>
            </h3>
          </div>
          <ClassDistributionChart data={stats?.charts?.classDistribution || []} />
        </div>

        <div className="lg:col-span-2">
          <RecentPaymentsTable payments={stats?.recentPayments || []} />
        </div>
      </div>

      {/* Modals */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSuccess={fetchDashboardData}
        classes={classes}
      />

      {selectedFeeRecord && (
        <CollectFeeModal
          isOpen={isCollectModalOpen}
          onClose={() => {
            setIsCollectModalOpen(false);
            setSelectedFeeRecord(null);
          }}
          onSuccess={fetchDashboardData}
          feeRecord={selectedFeeRecord}
        />
      )}

      <GenerateBillingModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSuccess={fetchDashboardData}
        classes={classes}
      />
    </div>
  );
}

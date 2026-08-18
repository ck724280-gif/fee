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
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StudentModal, ClassOption } from '@/components/modals/StudentModal';
import { CollectFeeModal, FeeRecordSummary } from '@/components/modals/CollectFeeModal';
import { GenerateBillingModal } from '@/components/modals/GenerateBillingModal';
import Link from 'next/link';
import { QrCode, ArrowRight, Clock, Sparkles, Activity, Layers } from 'lucide-react';

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
        <div className="h-16 bg-slate-200/70 rounded-2xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200/60 rounded-2xl" />
          ))}
        </div>
        <div className="h-20 bg-slate-200/60 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200/60 rounded-2xl" />
          <div className="lg:col-span-1 h-80 bg-slate-200/60 rounded-2xl" />
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
      {/* Top Hero Section with Animated Badge & Gradient Header */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold mb-1.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-spin" />
            <span>Smart Automated Tuition System</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Institute Command Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            DPR Private Tuition — Real-time Financial Ledger &amp; Student Operations
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200/80 backdrop-blur-md shadow-xs text-xs font-semibold text-slate-700">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>{kpis.activeStudents} Students Active</span>
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
          className="p-4.5 bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 text-white rounded-2xl border-2 border-emerald-500/50 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-emerald-500/30">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider mb-1 border border-emerald-400/30">
                <Clock className="w-3 h-3 animate-spin" />
                <span>Verification Required</span>
              </div>
              <h3 className="text-base font-extrabold text-white tracking-tight">
                {stats.pendingUpiCount} Online UPI Payment Proof{stats.pendingUpiCount > 1 ? 's' : ''} Pending Review
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Students submitted UTR transaction codes. Match with bank statement &amp; approve receipts.
              </p>
            </div>
          </div>

          <Link
            href="/payments?tab=approvals"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/25 shrink-0 cursor-pointer active:scale-95 relative z-10"
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
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Monthly Collection &amp; Invoiced Trajectory
            </h3>
          </div>
          <MonthlyTrendChart data={stats?.charts?.monthlyCollectionTrend || []} />
        </div>

        {/* Fee Status Breakdown (1 Col) */}
        <div className="lg:col-span-1 rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Fee Status Distribution
            </h3>
          </div>
          <FeeStatusDonutChart data={stats?.charts?.feeStatusDistribution || []} />
        </div>
      </div>

      {/* Secondary Grid: Class Distribution & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-2xl border border-slate-200/90 bg-white/80 backdrop-blur-xl p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Class Cohort Distribution
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

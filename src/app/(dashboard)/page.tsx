'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Loader2, QrCode, ArrowRight, Clock } from 'lucide-react';

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
    // If there are urgent overdue records, pre-select the first one
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-slate-500">Loading DPR Fee Dashboard...</span>
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Institute Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            DPR Private Tuition — Academic & Financial Command Center
          </p>
        </div>
      </div>

      {/* Overdue Delinquencies Alert Banner */}
      <OverdueAlertBanner
        overdueCount={stats?.urgentOverdueList?.length || 0}
        totalOverdueAmount={kpis.overdueFees}
        urgentList={stats?.urgentOverdueList}
      />

      {/* Online UPI Proof Submissions Pending Verification Banner */}
      {Boolean(stats?.pendingUpiCount && stats.pendingUpiCount > 0) && (
        <div className="p-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl border-2 border-emerald-500/40 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-lg shadow-emerald-500/30">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-0.5">
                <Clock className="w-3 h-3 animate-spin" />
                <span>Action Required</span>
              </div>
              <h3 className="text-base font-extrabold text-white">
                {stats.pendingUpiCount} Online UPI Payment Proof{stats.pendingUpiCount > 1 ? 's' : ''} Pending Verification
              </h3>
              <p className="text-xs text-slate-300">
                Students have submitted UTR transaction references. Verify with your bank statement and issue receipts.
              </p>
            </div>
          </div>

          <Link
            href="/upi-approvals"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 shrink-0 cursor-pointer"
          >
            <span>Review &amp; Approve Now</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* 8-Dimension KPI Cards */}
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
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Collection & Invoiced Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart data={stats?.charts?.monthlyCollectionTrend || []} />
          </CardContent>
        </Card>

        {/* Fee Status Breakdown (1 Col) */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Fee Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <FeeStatusDonutChart data={stats?.charts?.feeStatusDistribution || []} />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Grid: Class Distribution & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Class Cohort Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassDistributionChart data={stats?.charts?.classDistribution || []} />
          </CardContent>
        </Card>

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

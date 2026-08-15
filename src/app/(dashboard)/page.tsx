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
import { Loader2 } from 'lucide-react';

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

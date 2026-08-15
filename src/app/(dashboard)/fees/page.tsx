'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { CollectFeeModal, FeeRecordSummary } from '@/components/modals/CollectFeeModal';
import { GenerateBillingModal } from '@/components/modals/GenerateBillingModal';
import { ClassOption } from '@/components/modals/StudentModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatYMD } from '@/lib/billing-engine';
import { buildWhatsAppUrl, generateFeeReminderMessage } from '@/lib/whatsapp';
import {
  CreditCard,
  RefreshCw,
  Search,
  MessageSquare,
  Clock,
  Download,
  Eye,
  Loader2,
  FileText,
} from 'lucide-react';

export default function FeesPage() {
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [summary, setSummary] = useState({
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectingFeeRecord, setCollectingFeeRecord] = useState<FeeRecordSummary | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      const res = await fetch('/api/classes');
      const json = await res.json();
      if (json.success) setClasses(json.data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  }, []);

  const fetchFees = useCallback(
    async (pageNumber = 1) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.set('page', pageNumber.toString());
        params.set('limit', '20');
        if (search.trim()) params.set('search', search.trim());
        if (classId) params.set('classId', classId);
        if (status) params.set('status', status);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);

        const res = await fetch(`/api/fees?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          setFeeRecords(json.data.feeRecords);
          setPagination(json.data.pagination);
          if (json.data.summary) {
            setSummary(json.data.summary);
          }
        }
      } catch (err) {
        console.error('Failed to load fee records:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [search, classId, status, startDate, endDate]
  );

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchFees(1);
  }, [fetchFees]);

  const handleRefreshStatuses = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/fees/refresh-statuses', { method: 'POST' });
      await fetchFees(pagination.page);
    } catch (err) {
      console.error('Failed to refresh fee statuses:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCollect = (f: any) => {
    setCollectingFeeRecord({
      id: f.id,
      studentId: f.studentId,
      studentName: f.student?.name,
      studentCode: f.student?.studentCode,
      mobile: f.student?.mobile,
      whatsappNumber: f.student?.whatsappNumber,
      className: f.class?.name,
      billingPeriodStr: `${formatDate(f.billingPeriodStart)} to ${formatDate(f.billingPeriodEnd)}`,
      totalAmount: f.totalAmount,
      paidAmount: f.paidAmount,
      outstandingAmount: f.outstandingAmount,
    });
    setIsCollectModalOpen(true);
  };

  const handleWhatsAppReminder = (f: any) => {
    const phone = f.student?.whatsappNumber || f.student?.mobile;
    const msg = generateFeeReminderMessage({
      studentName: f.student?.name,
      className: f.class?.name,
      dueAmount: f.outstandingAmount,
      dueDateStr: formatYMD(new Date(f.dueDate)),
      billingPeriodStr: `${formatDate(f.billingPeriodStart)} to ${formatDate(f.billingPeriodEnd)}`,
      documentUrl: `https://dprtuition.vercel.app/fees/${f.id}`,
    });
    const url = buildWhatsAppUrl(phone, msg);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Fee Records & Billing Cycles
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View admission-anchored monthly fee records, track collections, and issue reminders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefreshStatuses}
            isLoading={isRefreshing}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            Refresh Statuses
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsGenerateModalOpen(true)}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Batch Generate Cycles
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-2">
            <Input
              placeholder="Search by student name or student code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Fee Statuses</option>
            <option value="UPCOMING">UPCOMING</option>
            <option value="DUE">DUE</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
            <option value="WAIVED">WAIVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </Select>

          <Button variant="primary" size="sm" onClick={() => fetchFees(1)}>
            Apply Filters
          </Button>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Total Records: <strong className="text-slate-900">{pagination.total}</strong>
          </span>
          <div className="flex gap-4">
            <span>
              Total Invoiced: <strong className="text-slate-900">{formatCurrency(summary.totalBilled)}</strong>
            </span>
            <span>
              Total Collected: <strong className="text-emerald-600 font-bold">{formatCurrency(summary.totalPaid)}</strong>
            </span>
            <span>
              Outstanding: <strong className="text-rose-600 font-bold">{formatCurrency(summary.totalOutstanding)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Fee Records Table */}
      <Card>
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="p-12 text-center flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading fee records...</span>
            </div>
          ) : feeRecords.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <p className="text-sm font-medium">No fee records found for the selected filters</p>
              <Button variant="primary" size="sm" onClick={() => setIsGenerateModalOpen(true)}>
                Generate Billing Cycles
              </Button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Student Details</th>
                  <th className="px-5 py-3.5">Class</th>
                  <th className="px-5 py-3.5">Billing Period</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5">Fee Breakdown</th>
                  <th className="px-5 py-3.5">Total / Paid</th>
                  <th className="px-5 py-3.5">Outstanding</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {feeRecords.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/students/${f.studentId}`} className="hover:underline font-bold text-slate-900">
                        {f.student?.name}
                      </Link>
                      <div className="text-[10px] text-blue-600 font-mono font-bold">
                        {f.student?.studentCode}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {f.class?.name}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {formatDate(f.billingPeriodStart)} to {formatDate(f.billingPeriodEnd)}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-slate-600">
                      {formatDate(f.dueDate)}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      <div>Base: {formatCurrency(f.baseAmount)}</div>
                      {f.admissionFeeAmount > 0 && (
                        <div className="text-[10px] text-blue-600">+ Adm: {formatCurrency(f.admissionFeeAmount)}</div>
                      )}
                      {f.discountAmount > 0 && (
                        <div className="text-[10px] text-emerald-600">- Disc: {formatCurrency(f.discountAmount)}</div>
                      )}
                      {f.lateFeeAmount > 0 && (
                        <div className="text-[10px] text-rose-600">+ Late: {formatCurrency(f.lateFeeAmount)}</div>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{formatCurrency(f.totalAmount)}</div>
                      <div className="text-[11px] text-emerald-600">Paid: {formatCurrency(f.paidAmount)}</div>
                    </td>

                    <td className="px-5 py-3.5 font-bold">
                      {f.outstandingAmount > 0 ? (
                        <span className="text-rose-600">{formatCurrency(f.outstandingAmount)}</span>
                      ) : (
                        <span className="text-emerald-600">₹0.00</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant={f.status} size="sm">
                        {f.status}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {f.outstandingAmount > 0 && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleCollect(f)}
                            leftIcon={<CreditCard className="w-3.5 h-3.5" />}
                          >
                            Collect
                          </Button>
                        )}
                        {f.outstandingAmount > 0 && (
                          <button
                            onClick={() => handleWhatsAppReminder(f)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="WhatsApp Reminder"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={(p) => fetchFees(p)}
        />
      </Card>

      {/* Modals */}
      <GenerateBillingModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSuccess={() => fetchFees(pagination.page)}
        classes={classes}
      />

      {collectingFeeRecord && (
        <CollectFeeModal
          isOpen={isCollectModalOpen}
          onClose={() => {
            setIsCollectModalOpen(false);
            setCollectingFeeRecord(null);
          }}
          onSuccess={() => fetchFees(pagination.page)}
          feeRecord={collectingFeeRecord}
        />
      )}
    </div>
  );
}

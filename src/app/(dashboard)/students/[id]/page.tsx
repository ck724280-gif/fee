'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { CollectFeeModal, FeeRecordSummary } from '@/components/modals/CollectFeeModal';
import { StudentModal, ClassOption } from '@/components/modals/StudentModal';
import { GenerateBillingModal } from '@/components/modals/GenerateBillingModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { buildWhatsAppUrl, generateFeeReminderMessage, generatePaymentReceiptMessage } from '@/lib/whatsapp';
import {
  ArrowLeft,
  User,
  CreditCard,
  Receipt,
  Clock,
  MessageSquare,
  Download,
  Calendar,
  Phone,
  School,
  MapPin,
  RefreshCw,
  Edit2,
  Loader2,
  FileText,
  AlertCircle,
  Coins,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const router = useRouter();
  const [studentData, setStudentData] = useState<any>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [activeTab, setActiveTab] = useState('timeline');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectingFeeRecord, setCollectingFeeRecord] = useState<FeeRecordSummary | null>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        router.push('/students');
      } else {
        alert(json.error || 'Failed to delete student');
        setIsDeleting(false);
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting student');
      setIsDeleting(false);
    }
  };

  const fetchStudentProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [profRes, clsRes] = await Promise.all([
        fetch(`/api/students/${id}`),
        fetch('/api/classes'),
      ]);

      const profJson = await profRes.json();
      const clsJson = await clsRes.json();

      if (!profRes.ok || !profJson.success) {
        throw new Error(profJson.error || 'Failed to load student profile');
      }

      setStudentData(profJson.data);
      if (clsJson.success) {
        setClasses(clsJson.data);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading student');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStudentProfile();
  }, [fetchStudentProfile]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-slate-500">Loading Student 360° Profile...</span>
      </div>
    );
  }

  if (error || !studentData) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">{error || 'Student not found'}</h2>
        <Link href="/students">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            Back to Student Directory
          </Button>
        </Link>
      </div>
    );
  }

  const { student, feeConfiguration, financialSummary, feeTimeline, paymentHistory, actions } = studentData;

  const handleOpenCollectForCycle = (fee: any) => {
    setCollectingFeeRecord({
      id: fee.id,
      studentId: student.id,
      studentName: student.name,
      studentCode: student.studentCode,
      mobile: student.mobile,
      whatsappNumber: student.whatsappNumber,
      className: student.class.name,
      billingPeriodStr: fee.billingPeriodStr,
      totalAmount: fee.totalAmount,
      paidAmount: fee.paidAmount,
      outstandingAmount: fee.outstandingAmount,
    });
    setIsCollectModalOpen(true);
  };

  const handleWhatsAppReminder = (fee: any) => {
    const phone = student.whatsappNumber || student.mobile;
    const msg = generateFeeReminderMessage({
      studentName: student.name,
      className: student.class.name,
      dueAmount: fee.outstandingAmount,
      dueDateStr: fee.dueDateStr,
      billingPeriodStr: fee.billingPeriodStr,
      documentUrl: `https://dprtuition.vercel.app/fees/${fee.id}`,
    });
    const url = buildWhatsAppUrl(phone, msg);
    window.open(url, '_blank');
  };

  const handleWhatsAppReceipt = (p: any) => {
    const phone = student.whatsappNumber || student.mobile;
    const msg = generatePaymentReceiptMessage({
      studentName: student.name,
      className: student.class.name,
      paidAmount: p.amount,
      receiptNumber: p.receiptNumber,
      paymentMethod: p.paymentMethod,
      outstandingAmount: financialSummary.totalOutstanding,
      documentUrl: `https://dprtuition.vercel.app${p.documentUrl || `/api/documents/${p.documentToken}`}`,
    });
    const url = buildWhatsAppUrl(phone, msg);
    window.open(url, '_blank');
  };

  const tabs = [
    { id: 'timeline', label: 'Billing Cycles & Fee Timeline', count: feeTimeline.length, icon: <Clock className="w-4 h-4" /> },
    { id: 'payments', label: 'Payment Receipts Ledger', count: paymentHistory.length, icon: <Receipt className="w-4 h-4" /> },
    { id: 'personal', label: 'Personal & Guardian Details', icon: <User className="w-4 h-4" /> },
    { id: 'config', label: 'Fee Configuration Snapshot', icon: <Coins className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Back link & Student Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {actions.hasPendingBalance && (
            <Button
              variant="success"
              size="sm"
              onClick={() => {
                const unpaid = feeTimeline.find((f: any) => f.outstandingAmount > 0);
                if (unpaid) handleOpenCollectForCycle(unpaid);
              }}
              leftIcon={<CreditCard className="w-4 h-4" />}
            >
              Collect Outstanding Due
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsGenerateModalOpen(true)}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Generate Next Cycles
          </Button>

          {actions.whatsappReminderUrl && (
            <a href={actions.whatsappReminderUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
                className="text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                leftIcon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
              >
                WhatsApp Reminder
              </Button>
            </a>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsStudentModalOpen(true)}
            leftIcon={<Edit2 className="w-4 h-4" />}
          >
            Edit Profile
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Student
          </Button>
        </div>
      </div>

      {/* Student Identity Cockpit Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shadow-blue-600/30 shrink-0">
            {student.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {student.name}
              </h1>
              <span className="font-mono text-sm px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {student.studentCode}
              </span>
              <Badge variant={student.class.name} size="sm">
                {student.class.name}
              </Badge>
              <Badge variant={student.status} size="sm">
                {student.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Father: <strong>{student.fatherName}</strong></span>
              <span>•</span>
              <span>Mobile: <strong>{student.mobile}</strong></span>
              <span>•</span>
              <span>
                Admission Anchor: <strong>Day {new Date(student.admissionDate).getDate()}</strong> ({formatDate(student.admissionDate)})
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Fee Rate</span>
            <div className="text-base font-extrabold text-slate-900">
              {formatCurrency(feeConfiguration.effectiveMonthlyFee)} / mo
            </div>
            <span className="text-[10px] text-blue-600 font-semibold uppercase">
              {feeConfiguration.studentFeeMode} MODE
            </span>
          </div>
        </div>
      </div>

      {/* 4 Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Invoiced</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(financialSummary.totalBilled)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Across {financialSummary.totalCyclesCount} generated cycle(s)
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Total Paid to Date</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(financialSummary.totalPaid)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {financialSummary.paidCyclesCount} fully settled cycles
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Outstanding Balance</span>
          <div
            className={`text-2xl font-black mt-1 ${
              financialSummary.totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(financialSummary.totalOutstanding)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {financialSummary.dueCyclesCount + financialSummary.overdueCyclesCount} unpaid / partial cycles
          </span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase">Overdue Arrears</span>
          <div
            className={`text-2xl font-black mt-1 ${
              financialSummary.overdueAmount > 0 ? 'text-rose-700' : 'text-slate-800'
            }`}
          >
            {formatCurrency(financialSummary.overdueAmount)}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {financialSummary.overdueCyclesCount} delinquent billing cycle(s)
          </span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Billing Cycles & Fee Timeline */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Admission-Date Billing Cycles Timeline</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto w-full">
            {feeTimeline.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No billing cycles generated yet for this student
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Cycle #</th>
                    <th className="px-6 py-3.5">Billing Period</th>
                    <th className="px-6 py-3.5">Due Date</th>
                    <th className="px-6 py-3.5">Fee Breakdown</th>
                    <th className="px-6 py-3.5">Total / Paid</th>
                    <th className="px-6 py-3.5">Balance</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {feeTimeline.map((f: any) => (
                    <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        Cycle {f.cycleIndex + 1}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {f.billingPeriodStr}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-mono">
                        {f.dueDateStr}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div>Base: {formatCurrency(f.baseAmount)}</div>
                        {f.admissionFeeAmount > 0 && (
                          <div className="text-[11px] text-blue-600">+ Adm: {formatCurrency(f.admissionFeeAmount)}</div>
                        )}
                        {f.discountAmount > 0 && (
                          <div className="text-[11px] text-emerald-600">- Disc: {formatCurrency(f.discountAmount)}</div>
                        )}
                        {f.lateFeeAmount > 0 && (
                          <div className="text-[11px] text-rose-600">+ Late: {formatCurrency(f.lateFeeAmount)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{formatCurrency(f.totalAmount)}</div>
                        <div className="text-[11px] text-emerald-600">Paid: {formatCurrency(f.paidAmount)}</div>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {f.outstandingAmount > 0 ? (
                          <span className="text-rose-600">{formatCurrency(f.outstandingAmount)}</span>
                        ) : (
                          <span className="text-emerald-600">₹0.00</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={f.status} size="sm">
                          {f.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {f.outstandingAmount > 0 && (
                            <Button
                              variant="success"
                              size="sm"
                              onClick={() => handleOpenCollectForCycle(f)}
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
        </Card>
      )}

      {/* Tab 2: Payment Receipts Ledger */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader>
            <CardTitle>Recorded Payment Receipts</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto w-full">
            {paymentHistory.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No payments recorded for this student yet
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Receipt No</th>
                    <th className="px-6 py-3.5">Payment Date</th>
                    <th className="px-6 py-3.5">Fee Period</th>
                    <th className="px-6 py-3.5">Method</th>
                    <th className="px-6 py-3.5">Transaction ID</th>
                    <th className="px-6 py-3.5">Amount Paid</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {paymentHistory.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">
                        {p.receiptNumber}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-slate-700">{p.feePeriod}</td>
                      <td className="px-6 py-4">
                        <Badge variant="default" size="sm">
                          {p.paymentMethod}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500">
                        {p.transactionId || '—'}
                      </td>
                      <td className="px-6 py-4 font-bold text-emerald-600 text-sm">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.documentUrl && (
                            <a
                              href={p.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors font-medium text-xs"
                            >
                              <Download className="w-3.5 h-3.5 text-blue-600" />
                              <span>PDF</span>
                            </a>
                          )}
                          <button
                            onClick={() => handleWhatsAppReceipt(p)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Share Receipt on WhatsApp"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* Tab 3: Personal & Guardian Details */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Demographic & Academic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Full Name</span>
                <span className="font-semibold text-slate-900">{student.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Student Code</span>
                <span className="font-mono font-bold text-blue-600">{student.studentCode}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Class Cohort</span>
                <span className="font-semibold text-slate-900">{student.class.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Gender</span>
                <span className="font-semibold text-slate-900">{student.gender}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Date of Birth</span>
                <span className="font-semibold text-slate-900">{formatDate(student.dob)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">School Name</span>
                <span className="font-semibold text-slate-900">{student.school || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Admission Date</span>
                <span className="font-semibold text-slate-900">{formatDate(student.admissionDate)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guardian & Residential Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Father's Name</span>
                <span className="font-semibold text-slate-900">{student.fatherName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Mother's Name</span>
                <span className="font-semibold text-slate-900">{student.motherName || '—'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Primary Mobile</span>
                <a href={`tel:${student.mobile}`} className="font-semibold text-blue-600 hover:underline">
                  {student.mobile}
                </a>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">WhatsApp Number</span>
                <span className="font-semibold text-slate-900">{student.whatsappNumber || student.mobile}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Full Residential Address</span>
                <span className="font-semibold text-slate-900 text-right max-w-[200px]">
                  {student.address || '—'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Fee Configuration Snapshot */}
      {activeTab === 'config' && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Configuration & Pricing Engine Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Class Standard Rate</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(feeConfiguration.classDefaultFee)} / mo
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Student Fee Mode</span>
                <span className="text-lg font-bold text-blue-600">
                  {feeConfiguration.studentFeeMode}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {feeConfiguration.studentFeeMode === 'CUSTOM' ? 'Locked custom rate' : 'Inherits class rate'}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Active Concession</span>
                <span className="text-lg font-bold text-emerald-600">
                  {feeConfiguration.discountType === 'NONE'
                    ? 'None'
                    : feeConfiguration.discountType === 'FIXED'
                    ? `₹${feeConfiguration.discountValue} Off`
                    : `${feeConfiguration.discountValue}% Off`}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block">Net Effective Monthly Fee</span>
                <span className="text-lg font-bold text-emerald-700">
                  {formatCurrency(feeConfiguration.effectiveMonthlyFee)} / mo
                </span>
              </div>
            </div>

            <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-blue-900 leading-relaxed">
              💡 <strong>System Invariant</strong>: Changing the Class Default Fee immediately affects future cycles for students on <code>DEFAULT</code> mode only. Historical fee records and students configured with <code>CUSTOM</code> mode remain completely unchanged.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSuccess={fetchStudentProfile}
        classes={classes}
        initialData={{
          id: student.id,
          name: student.name,
          fatherName: student.fatherName,
          motherName: student.motherName,
          guardianName: student.guardianName,
          mobile: student.mobile,
          whatsappNumber: student.whatsappNumber,
          address: student.address,
          dob: student.dob,
          gender: student.gender,
          school: student.school,
          classId: student.classId,
          admissionDate: student.admissionDate,
          joiningDate: student.joiningDate,
          feeMode: student.feeMode,
          customMonthlyFee: student.customMonthlyFee,
          admissionFee: student.admissionFee,
          discountType: student.discountType,
          discountValue: student.discountValue,
          status: student.status,
        }}
      />

      {collectingFeeRecord && (
        <CollectFeeModal
          isOpen={isCollectModalOpen}
          onClose={() => {
            setIsCollectModalOpen(false);
            setCollectingFeeRecord(null);
          }}
          onSuccess={fetchStudentProfile}
          feeRecord={collectingFeeRecord}
        />
      )}

      <GenerateBillingModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSuccess={fetchStudentProfile}
        classes={classes}
        studentId={student.id}
        studentName={student.name}
      />

      {/* Delete Student Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
          title="Delete Student Record"
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                isLoading={isDeleting}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Permanently Delete
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-900 font-semibold mb-0.5">Warning: Irreversible Action</strong>
                Are you sure you want to permanently delete <strong className="text-slate-900 font-bold">{student.name}</strong> ({student.studentCode})? All historical fee cycles, recorded receipts, and invoices will be purged.
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Note: If this student simply discontinued coaching, you can change their status to <span className="font-semibold text-slate-700">LEFT</span> or <span className="font-semibold text-slate-700">INACTIVE</span> via "Edit Profile" instead.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

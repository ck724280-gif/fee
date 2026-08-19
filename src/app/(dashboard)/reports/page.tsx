'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { generateRFC4180CSV, downloadCSVFile, CSVColumn } from '@/lib/csv-export';
import { ClassOption } from '@/components/modals/StudentModal';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Loader2,
  AlertTriangle,
  Receipt,
  Users,
  Coins,
  FileSpreadsheet,
} from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string>('MONTHLY_COLLECTION');
  const [reportData, setReportData] = useState<any>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [studentsList, setStudentsList] = useState<any[]>([]);

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchClassesAndStudents = useCallback(async () => {
    try {
      const [clsRes, stRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/students?limit=100'),
      ]);

      const clsJson = await clsRes.json();
      const stJson = await stRes.json();

      if (clsJson.success) setClasses(clsJson.data);
      if (stJson.success || stJson.data || Array.isArray(stJson.students)) {
        const list = stJson.data?.students || (Array.isArray(stJson.data) ? stJson.data : stJson.students || []);
        setStudentsList(list);
        if (list.length > 0 && !studentId) {
          setStudentId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load classes or students for reports:', err);
    }
  }, [studentId]);

  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set('type', reportType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (classId) params.set('classId', classId);
      if (reportType === 'STUDENT_STATEMENT' && studentId) {
        params.set('studentId', studentId);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setReportData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, startDate, endDate, classId, studentId]);

  useEffect(() => {
    fetchClassesAndStudents();
  }, [fetchClassesAndStudents]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (!reportData || !reportData.rows || reportData.rows.length === 0) {
      alert('No data to export');
      return;
    }

    let columns: CSVColumn[] = [];
    const filename = `DPR_Report_${reportType}_${new Date().toISOString().slice(0, 10)}`;

    switch (reportType) {
      case 'MONTHLY_COLLECTION':
        columns = [
          { key: 'monthLabel', label: 'Month' },
          { key: 'totalBilled', label: 'Invoiced (₹)', formatter: (v) => v },
          { key: 'totalCollected', label: 'Collected (₹)', formatter: (v) => v },
          { key: 'outstandingAmount', label: 'Outstanding (₹)', formatter: (v) => v },
          { key: 'collectionRate', label: 'Rate (%)', formatter: (v) => `${v}%` },
          { key: 'transactionCount', label: 'Receipts Count' },
        ];
        break;
      case 'OVERDUE_FEES':
        columns = [
          { key: 'studentCode', label: 'Student Code' },
          { key: 'studentName', label: 'Student Name' },
          { key: 'className', label: 'Class' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'dueDate', label: 'Due Date' },
          { key: 'overdueDays', label: 'Days Overdue' },
          { key: 'outstandingAmount', label: 'Overdue Amount (₹)' },
        ];
        break;
      case 'CLASS_WISE_REVENUE':
        columns = [
          { key: 'className', label: 'Class Name' },
          { key: 'totalStudents', label: 'Total Enrolled' },
          { key: 'activeStudents', label: 'Active Students' },
          { key: 'defaultMonthlyFee', label: 'Class Rate (₹)' },
          { key: 'totalBilled', label: 'Total Billed (₹)' },
          { key: 'totalCollected', label: 'Total Collected (₹)' },
          { key: 'outstandingAmount', label: 'Outstanding (₹)' },
          { key: 'collectionRate', label: 'Recovery Rate (%)', formatter: (v) => `${v}%` },
        ];
        break;
      case 'PAYMENT_METHOD_DISTRIBUTION':
        columns = [
          { key: 'methodLabel', label: 'Payment Mode' },
          { key: 'transactionCount', label: 'Transactions' },
          { key: 'totalAmount', label: 'Total Amount (₹)' },
          { key: 'percentageShare', label: 'Revenue Share (%)', formatter: (v) => `${v}%` },
          { key: 'averageTransaction', label: 'Avg Transaction (₹)' },
        ];
        break;
      case 'STUDENT_STATEMENT':
        columns = [
          { key: 'date', label: 'Date' },
          { key: 'transactionType', label: 'Type' },
          { key: 'referenceNumber', label: 'Reference No' },
          { key: 'description', label: 'Description' },
          { key: 'debit', label: 'Debit (₹)' },
          { key: 'credit', label: 'Credit (₹)' },
          { key: 'runningBalance', label: 'Balance Due (₹)' },
        ];
        break;
      case 'ADMISSIONS_REPORT':
        columns = [
          { key: 'studentCode', label: 'Student Code' },
          { key: 'studentName', label: 'Student Name' },
          { key: 'admissionDate', label: 'Admission Date' },
          { key: 'className', label: 'Class' },
          { key: 'admissionFeeBilled', label: 'Admission Fee (₹)' },
          { key: 'admissionFeePaid', label: 'Fee Paid (₹)' },
          { key: 'outstandingAdmissionFee', label: 'Outstanding (₹)' },
        ];
        break;
      case 'DISCOUNT_REPORT':
        columns = [
          { key: 'studentCode', label: 'Student Code' },
          { key: 'studentName', label: 'Student Name' },
          { key: 'className', label: 'Class' },
          { key: 'feeMode', label: 'Fee Mode' },
          { key: 'discountType', label: 'Discount Type' },
          { key: 'discountValue', label: 'Discount Value' },
          { key: 'monthlyDiscountAmount', label: 'Monthly Concession (₹)' },
          { key: 'netMonthlyFee', label: 'Net Monthly Rate (₹)' },
          { key: 'annualConcession', label: 'Annual Concession (₹)' },
        ];
        break;
      case 'DAILY_COLLECTION':
        columns = [
          { key: 'paymentDate', label: 'Date & Time' },
          { key: 'receiptNumber', label: 'Receipt No' },
          { key: 'studentCode', label: 'Student Code' },
          { key: 'studentName', label: 'Student Name' },
          { key: 'className', label: 'Class' },
          { key: 'paymentMethod', label: 'Payment Mode' },
          { key: 'transactionId', label: 'Txn ID' },
          { key: 'amount', label: 'Amount Paid (₹)' },
        ];
        break;
    }

    const csvContent = generateRFC4180CSV(reportData.rows, columns);
    downloadCSVFile(filename, csvContent);
  };

  const handlePrint = () => {
    window.print();
  };

  const reportNames: Record<string, string> = {
    MONTHLY_COLLECTION: 'Monthly Collection & Invoicing Report',
    OVERDUE_FEES: 'Delinquent Accounts & Overdue Arrears Ledger',
    CLASS_WISE_REVENUE: 'Class-Wise Revenue & Recovery Efficiency',
    PAYMENT_METHOD_DISTRIBUTION: 'Payment Mode Breakdown (Cash vs Digital)',
    STUDENT_STATEMENT: 'Student Statement & Running Balance Ledger',
    ADMISSIONS_REPORT: 'Student Admissions & Admission Fee Register',
    DISCOUNT_REPORT: 'Scholarships & Fee Concessions Audit',
    DAILY_COLLECTION: 'Daily Cashier Collection Register (Daybook)',
  };

  return (
    <div className="space-y-6">
      {/* Printable Branded Header (visible only on browser print) */}
      <div className="hidden print:block mb-6 border-b border-black pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-black">DPR Private Tuition</h1>
            <p className="text-xs text-gray-600">
              Station Road, Near City Center, West Bengal | Phone: +91 98765 43210
            </p>
          </div>
          <div className="text-right text-xs text-gray-700">
            <p className="font-bold text-black text-sm">{reportNames[reportType]}</p>
            <p>Generated: {new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Financial & Operational Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            8-dimension analytics engine with RFC 4180 CSV export and print-ready ledgers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Export to CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            Print Report
          </Button>
        </div>
      </div>

      {/* Dimension Selector & Filter Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <Select
              label="Select Report Dimension"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="MONTHLY_COLLECTION">1. Monthly Collection & Recovery</option>
              <option value="OVERDUE_FEES">2. Defaulters & Overdue Ledger</option>
              <option value="CLASS_WISE_REVENUE">3. Class-Wise Revenue Summary</option>
              <option value="PAYMENT_METHOD_DISTRIBUTION">4. Payment Mode Breakdown (Cash/UPI)</option>
              <option value="STUDENT_STATEMENT">5. Student Statement (Running Balance)</option>
              <option value="ADMISSIONS_REPORT">6. Admissions & Admission Fees</option>
              <option value="DISCOUNT_REPORT">7. Concessions & Scholarships Audit</option>
              <option value="DAILY_COLLECTION">8. Daily Collection Daybook Register</option>
            </Select>
          </div>

          {reportType === 'STUDENT_STATEMENT' ? (
            <div className="md:col-span-2">
              <Select
                label="Select Student"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                {studentsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.studentCode}) - {s.className}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <>
              <Select
                label="Class Filter"
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>

              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </>
          )}
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      {reportData?.summary && (
        <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md flex flex-wrap items-center justify-around gap-4 text-center">
          {reportType === 'MONTHLY_COLLECTION' && (
            <>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Total Invoiced</span>
                <span className="text-lg font-bold text-blue-400">
                  {formatCurrency(reportData.summary.totalBilled)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Total Collected</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(reportData.summary.totalCollected)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Total Outstanding</span>
                <span className="text-lg font-bold text-rose-400">
                  {formatCurrency(reportData.summary.outstandingAmount)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Collection Rate</span>
                <span className="text-lg font-bold text-white">
                  {reportData.summary.collectionRate}%
                </span>
              </div>
            </>
          )}

          {reportType === 'OVERDUE_FEES' && (
            <>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Delinquent Students</span>
                <span className="text-lg font-bold text-amber-400">
                  {reportData.summary.totalOverdueStudents}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Total Overdue Arrears</span>
                <span className="text-lg font-bold text-rose-400">
                  {formatCurrency(reportData.summary.totalOutstanding)}
                </span>
              </div>
            </>
          )}

          {reportType === 'PAYMENT_METHOD_DISTRIBUTION' && (
            <>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Total Receipts Issued</span>
                <span className="text-lg font-bold text-white">
                  {reportData.summary.transactionCount}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Cash In-Hand</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(reportData.summary.cashShare)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Digital Share (UPI/Bank)</span>
                <span className="text-lg font-bold text-sky-400">
                  {formatCurrency(reportData.summary.digitalShare)}
                </span>
              </div>
            </>
          )}

          {reportType === 'STUDENT_STATEMENT' && (
            <>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Total Billed</span>
                <span className="text-lg font-bold text-blue-400">
                  {formatCurrency(reportData.summary.totalBilled)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Total Paid</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(reportData.summary.totalPaid)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Net Running Balance Due</span>
                <span
                  className={`text-lg font-bold ${
                    reportData.summary.netBalanceDue > 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(reportData.summary.netBalanceDue)}
                </span>
              </div>
            </>
          )}

          {reportType === 'DAILY_COLLECTION' && (
            <>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Receipts Issued</span>
                <span className="text-lg font-bold text-white">
                  {reportData.summary.totalReceipts}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Cash Collections</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(reportData.summary.cashInHand)}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block uppercase">Total Day Revenue</span>
                <span className="text-lg font-bold text-emerald-400">
                  {formatCurrency(reportData.summary.totalCollected)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Dynamic Report Table */}
      <Card>
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="p-12 text-center flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Generating report dataset...</span>
            </div>
          ) : !reportData || !reportData.rows || reportData.rows.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              No matching records found for this report configuration
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              {/* 1. Monthly Collection */}
              {reportType === 'MONTHLY_COLLECTION' && (
                <>
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3.5">Month</th>
                      <th className="px-6 py-3.5">Total Invoiced</th>
                      <th className="px-6 py-3.5">Total Collected</th>
                      <th className="px-6 py-3.5">Outstanding Due</th>
                      <th className="px-6 py-3.5">Recovery Rate</th>
                      <th className="px-6 py-3.5 text-right">Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.rows.map((r: any) => (
                      <tr key={r.monthKey} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{r.monthLabel}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-800">
                          {formatCurrency(r.totalBilled)}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-emerald-600">
                          {formatCurrency(r.totalCollected)}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-rose-600">
                          {formatCurrency(r.outstandingAmount)}
                        </td>
                        <td className="px-6 py-3.5 font-semibold">{r.collectionRate}%</td>
                        <td className="px-6 py-3.5 text-right font-mono">{r.transactionCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 2. Overdue Fees */}
              {reportType === 'OVERDUE_FEES' && (
                <>
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3.5">Student</th>
                      <th className="px-6 py-3.5">Class</th>
                      <th className="px-6 py-3.5">Billing Period</th>
                      <th className="px-6 py-3.5">Due Date</th>
                      <th className="px-6 py-3.5">Days Overdue</th>
                      <th className="px-6 py-3.5">Overdue Amount</th>
                      <th className="px-6 py-3.5 text-right no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.rows.map((r: any) => (
                      <tr key={r.feeRecordId} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-bold text-slate-900">
                          <div>{r.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.studentCode}</div>
                        </td>
                        <td className="px-6 py-3.5">{r.className}</td>
                        <td className="px-6 py-3.5 text-slate-600">{r.billingPeriod}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-600">{r.dueDate}</td>
                        <td className="px-6 py-3.5 font-bold text-rose-600">{r.overdueDays} days</td>
                        <td className="px-6 py-3.5 font-bold text-rose-700">
                          {formatCurrency(r.outstandingAmount)}
                        </td>
                        <td className="px-6 py-3.5 text-right no-print">
                          {r.whatsappUrl && (
                            <a
                              href={r.whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold"
                            >
                              <span>Notice</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 3. Class-Wise Revenue */}
              {reportType === 'CLASS_WISE_REVENUE' && (
                <>
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3.5">Class</th>
                      <th className="px-6 py-3.5">Enrolled</th>
                      <th className="px-6 py-3.5">Class Rate</th>
                      <th className="px-6 py-3.5">Total Billed</th>
                      <th className="px-6 py-3.5">Total Collected</th>
                      <th className="px-6 py-3.5">Outstanding</th>
                      <th className="px-6 py-3.5 text-right">Recovery Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.rows.map((r: any) => (
                      <tr key={r.classId} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{r.className}</td>
                        <td className="px-6 py-3.5">{r.activeStudents} active</td>
                        <td className="px-6 py-3.5">{formatCurrency(r.defaultMonthlyFee)}/mo</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-800">
                          {formatCurrency(r.totalBilled)}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-emerald-600">
                          {formatCurrency(r.totalCollected)}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-rose-600">
                          {formatCurrency(r.outstandingAmount)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                          {r.collectionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 4. Payment Method Distribution */}
              {reportType === 'PAYMENT_METHOD_DISTRIBUTION' && (
                <>
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3.5">Payment Mode</th>
                      <th className="px-6 py-3.5">Receipt Count</th>
                      <th className="px-6 py-3.5">Total Amount Collected</th>
                      <th className="px-6 py-3.5">Revenue Share (%)</th>
                      <th className="px-6 py-3.5 text-right">Average Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.rows.map((r: any) => (
                      <tr key={r.paymentMethod} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-bold text-slate-900">{r.methodLabel}</td>
                        <td className="px-6 py-3.5 font-mono">{r.transactionCount}</td>
                        <td className="px-6 py-3.5 font-bold text-emerald-600">
                          {formatCurrency(r.totalAmount)}
                        </td>
                        <td className="px-6 py-3.5 font-semibold">{r.percentageShare}%</td>
                        <td className="px-6 py-3.5 text-right font-semibold">
                          {formatCurrency(r.averageTransaction)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 5. Student Statement */}
              {reportType === 'STUDENT_STATEMENT' && (
                <>
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Type</th>
                      <th className="px-6 py-3.5">Reference No</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5">Debit (+)</th>
                      <th className="px-6 py-3.5">Credit (-)</th>
                      <th className="px-6 py-3.5 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.rows.map((r: any) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-mono text-slate-600">{r.date}</td>
                        <td className="px-6 py-3.5">
                          <Badge
                            variant={r.transactionType === 'FEE_INVOICE' ? 'DUE' : 'PAID'}
                            size="sm"
                          >
                            {r.transactionType === 'FEE_INVOICE' ? 'INVOICE' : 'PAYMENT'}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 font-mono font-bold text-blue-600">
                          {r.referenceNumber}
                        </td>
                        <td className="px-6 py-3.5 font-medium text-slate-900">{r.description}</td>
                        <td className="px-6 py-3.5 font-semibold text-slate-800">
                          {r.debit > 0 ? formatCurrency(r.debit) : '—'}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-emerald-600">
                          {r.credit > 0 ? formatCurrency(r.credit) : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                          {formatCurrency(r.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 6. Admissions Report */}
              {reportType === 'ADMISSIONS_REPORT' && (
                <>
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3.5">Code</th>
                      <th className="px-6 py-3.5">Student Name</th>
                      <th className="px-6 py-3.5">Admission Date</th>
                      <th className="px-6 py-3.5">Class</th>
                      <th className="px-6 py-3.5">Admission Fee</th>
                      <th className="px-6 py-3.5">Amount Paid</th>
                      <th className="px-6 py-3.5 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.rows.map((r: any) => (
                      <tr key={r.studentId} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-mono font-bold text-blue-600">
                          {r.studentCode}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">{r.studentName}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-600">{r.admissionDate}</td>
                        <td className="px-6 py-3.5">{r.className}</td>
                        <td className="px-6 py-3.5 font-semibold">
                          {formatCurrency(r.admissionFeeBilled)}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-emerald-600">
                          {formatCurrency(r.admissionFeePaid)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold">
                          {r.outstandingAdmissionFee > 0 ? (
                            <span className="text-rose-600">
                              {formatCurrency(r.outstandingAdmissionFee)}
                            </span>
                          ) : (
                            <span className="text-emerald-600">₹0.00</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 7. Discount Report */}
              {reportType === 'DISCOUNT_REPORT' && (
                <>
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3.5">Student</th>
                      <th className="px-6 py-3.5">Class</th>
                      <th className="px-6 py-3.5">Standard Rate</th>
                      <th className="px-6 py-3.5">Discount Type</th>
                      <th className="px-6 py-3.5">Monthly Concession</th>
                      <th className="px-6 py-3.5">Net Monthly Charge</th>
                      <th className="px-6 py-3.5 text-right">Annual Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.rows.map((r: any) => (
                      <tr key={r.studentId} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-bold text-slate-900">
                          <div>{r.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.studentCode}</div>
                        </td>
                        <td className="px-6 py-3.5">{r.className}</td>
                        <td className="px-6 py-3.5">{formatCurrency(r.classDefaultFee)}</td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex px-2 py-0.5 rounded text-[11px] bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                            {r.discountType === 'FIXED' ? `₹${r.discountValue} Fixed` : `${r.discountValue}% Pct`}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-bold text-rose-600">
                          -{formatCurrency(r.monthlyDiscountAmount)}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-emerald-600">
                          {formatCurrency(r.netMonthlyFee)} / mo
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                          {formatCurrency(r.annualConcession)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}

              {/* 8. Daily Collection Register */}
              {reportType === 'DAILY_COLLECTION' && (
                <>
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-6 py-3.5">Receipt No</th>
                      <th className="px-6 py-3.5">Date & Time</th>
                      <th className="px-6 py-3.5">Student</th>
                      <th className="px-6 py-3.5">Class</th>
                      <th className="px-6 py-3.5">Mode</th>
                      <th className="px-6 py-3.5">Transaction ID</th>
                      <th className="px-6 py-3.5 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {reportData.rows.map((r: any) => (
                      <tr key={r.paymentId} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3.5 font-mono font-bold text-blue-600">
                          {r.receiptNumber}
                        </td>
                        <td className="px-6 py-3.5 text-slate-600 font-mono">{r.paymentDate}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">
                          <div>{r.studentName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.studentCode}</div>
                        </td>
                        <td className="px-6 py-3.5">{r.className}</td>
                        <td className="px-6 py-3.5">
                          <Badge variant="default" size="sm">
                            {r.paymentMethod}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-500">
                          {r.transactionId || '—'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-emerald-600 text-sm">
                          {formatCurrency(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

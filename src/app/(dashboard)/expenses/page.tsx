'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { ExpenseModal, ExpenseFormData } from '@/components/modals/ExpenseModal';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/validations/expense';
import { ExpenseCategory } from '@prisma/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  WalletCards,
  PlusCircle,
  Download,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  CreditCard,
  Building2,
  TrendingDown,
  TrendingUp,
  DollarSign,
  PieChart as PieChartIcon,
  Tag,
  AlertTriangle,
  Loader2,
  ReceiptText,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [stats, setStats] = useState({
    todayExpense: 0,
    thisMonthExpense: 0,
    lastMonthExpense: 0,
    totalExpense: 0,
    thisMonthIncome: 0,
    netSurplusThisMonth: 0,
    topCategory: null as any,
    categoryBreakdown: [] as any[],
  });

  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseFormData | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/expenses/stats');
      const json = await res.json();
      if (json.success && json.data) {
        setStats(json.data);
      }
    } catch (err) {
      console.error('Failed to load expense stats:', err);
    }
  }, []);

  const fetchExpenses = useCallback(
    async (pageNumber = 1) => {
      try {
        setIsLoading(true);
        const query = new URLSearchParams();
        query.set('page', String(pageNumber));
        query.set('limit', '20');

        if (search.trim()) query.set('search', search.trim());
        if (category) query.set('category', category);
        if (paymentMethod) query.set('paymentMethod', paymentMethod);
        if (startDate) query.set('startDate', startDate);
        if (endDate) query.set('endDate', endDate);

        const res = await fetch(`/api/expenses?${query.toString()}`);
        const json = await res.json();

        if (json.success && json.data) {
          const list = json.data.expenses || (Array.isArray(json.data) ? json.data : []);
          const pag = json.data.pagination || { total: list.length, page: 1, limit: 20, totalPages: 1 };
          setExpenses(list);
          setPagination(pag);
        }
      } catch (err) {
        console.error('Failed to fetch expenses list:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [search, category, paymentMethod, startDate, endDate]
  );

  useEffect(() => {
    fetchExpenses(1);
    fetchStats();
  }, [fetchExpenses, fetchStats]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchExpenses(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setPaymentMethod('');
    setStartDate('');
    setEndDate('');
  };

  const handleExportCsv = () => {
    const query = new URLSearchParams();
    query.set('format', 'csv');
    if (search.trim()) query.set('search', search.trim());
    if (category) query.set('category', category);
    if (paymentMethod) query.set('paymentMethod', paymentMethod);
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);

    window.open(`/api/expenses?${query.toString()}`, '_blank');
  };

  const handleEdit = (exp: any) => {
    setEditingExpense({
      id: exp.id,
      title: exp.title,
      category: exp.category,
      amount: exp.amount,
      expenseDate: exp.expenseDate,
      paymentMethod: exp.paymentMethod,
      referenceNumber: exp.referenceNumber || '',
      payeeName: exp.payeeName || '',
      notes: exp.notes || '',
    });
    setIsExpenseModalOpen(true);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/expenses/${expenseToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setExpenseToDelete(null);
        fetchExpenses(pagination.page);
        fetchStats();
      } else {
        alert(json.error || 'Failed to delete expense');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting expense');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Expenditure & Expense Tracker
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor institutional payouts, faculty salaries, facility maintenance, and net cashflow surplus
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingExpense(null);
              setIsExpenseModalOpen(true);
            }}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Record New Expense
          </Button>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* This Month's Expense */}
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                This Month's Outflow
              </span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600">
                {formatCurrency(stats.thisMonthExpense)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Last month: {formatCurrency(stats.lastMonthExpense)}
            </p>
          </CardContent>
        </Card>

        {/* Today's Expense */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Today's Expenditure
              </span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <WalletCards className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(stats.todayExpense)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Recorded today</p>
          </CardContent>
        </Card>

        {/* Top Expense Bucket */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Major Cost Driver
              </span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Tag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-base font-extrabold text-slate-900 truncate block">
                {stats.topCategory ? stats.topCategory.label : 'No Expenses Yet'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.topCategory ? `${formatCurrency(stats.topCategory.amount)} (${stats.topCategory.percentage}% of month)` : '0% of monthly budget'}
            </p>
          </CardContent>
        </Card>

        {/* Net Cashflow / Profit */}
        <Card className={`border-l-4 ${stats.netSurplusThisMonth >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Net Monthly Cashflow
              </span>
              <div className={`p-2 rounded-xl ${stats.netSurplusThisMonth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stats.netSurplusThisMonth >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-2xl font-black ${stats.netSurplusThisMonth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stats.netSurplusThisMonth >= 0 ? `+ ${formatCurrency(stats.netSurplusThisMonth)}` : `- ${formatCurrency(Math.abs(stats.netSurplusThisMonth))}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Fee Collections ({formatCurrency(stats.thisMonthIncome)}) − Expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics & Category Breakdown */}
      {stats.categoryBreakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Donut Chart */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <PieChartIcon className="w-4 h-4 text-blue-600" />
                <span>Monthly Category Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown}
                      dataKey="amount"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {stats.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), 'Expense']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Category Details Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Cost Allocation Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.categoryBreakdown.map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900">{formatCurrency(item.amount)}</span>
                        <span className="text-slate-400 font-mono text-[11px] w-10 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search expenses by purpose, vendor name, or bill ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="w-44">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All Categories</option>
                {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-36">
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="">All Payment Modes</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CARD">Card</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>

            <Button variant="primary" size="sm" type="submit">
              Filter
            </Button>

            {(search || category || paymentMethod || startDate || endDate) && (
              <Button variant="ghost" size="sm" type="button" onClick={handleClearFilters}>
                Clear
              </Button>
            )}
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Total Entries: <strong className="text-slate-800">{pagination.total}</strong>
          </span>
          <span>
            Cumulative All-Time Expenses: <strong className="text-rose-600 font-bold">{formatCurrency(stats.totalExpense)}</strong>
          </span>
        </div>
      </div>

      {/* Expenses Data Table */}
      <Card>
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="p-12 text-center flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading expenditure ledgers...</span>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <WalletCards className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-medium">No expenses recorded yet</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingExpense(null);
                  setIsExpenseModalOpen(true);
                }}
                leftIcon={<PlusCircle className="w-4 h-4" />}
              >
                Record First Expense
              </Button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Purpose / Title</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Payee / Vendor</th>
                  <th className="px-5 py-3.5">Payment Mode</th>
                  <th className="px-5 py-3.5">Ref / Bill No</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {expenses.map((e) => {
                  const catMeta = EXPENSE_CATEGORY_LABELS[e.category as ExpenseCategory] || {
                    label: e.category,
                    color: '#64748B',
                  };

                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                        {formatDate(e.expenseDate)}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{e.title}</div>
                        {e.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{e.notes}</div>}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold text-white shadow-2xs"
                          style={{ backgroundColor: catMeta.color }}
                        >
                          {catMeta.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-slate-800 font-medium">
                        {e.payeeName || <span className="text-slate-400 italic">N/A</span>}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[11px]">
                          {e.paymentMethod}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">
                        {e.referenceNumber || '—'}
                      </td>

                      <td className="px-5 py-3.5 text-right font-black text-rose-600 text-sm whitespace-nowrap">
                        - {formatCurrency(e.amount)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(e)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Expense"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setExpenseToDelete(e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={(p) => fetchExpenses(p)}
        />
      </Card>

      {/* Add / Edit Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={() => {
          fetchExpenses(pagination.page);
          fetchStats();
        }}
        initialData={editingExpense}
      />

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <Modal
          isOpen={true}
          onClose={() => !isDeleting && setExpenseToDelete(null)}
          title="Delete Expense Entry"
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpenseToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDeleteExpense}
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
                <strong className="block text-rose-900 font-semibold mb-0.5">Confirm Deletion</strong>
                Are you sure you want to delete <strong className="text-slate-900 font-bold">{expenseToDelete.title}</strong> of amount <strong className="text-rose-600 font-bold">{formatCurrency(expenseToDelete.amount)}</strong>? This will recalculate monthly expense totals.
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

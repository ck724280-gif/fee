'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { EXPENSE_CATEGORY_LABELS, ExpenseCategoryEnum } from '@/lib/validations/expense';
import { formatYMD } from '@/lib/billing-engine';
import {
  DollarSign,
  Calendar,
  CreditCard,
  User,
  FileText,
  Save,
  Tag,
  ReceiptText,
} from 'lucide-react';

export interface ExpenseFormData {
  id?: string;
  title: string;
  category: string;
  amount: number | string;
  expenseDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  payeeName?: string;
  notes?: string;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ExpenseFormData | null;
}

export function ExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ExpenseModalProps) {
  const isEdit = Boolean(initialData?.id);

  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    category: 'TEACHER_SALARY',
    amount: '',
    expenseDate: formatYMD(new Date()),
    paymentMethod: 'CASH',
    referenceNumber: '',
    payeeName: '',
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        title: initialData.title || '',
        category: initialData.category || 'TEACHER_SALARY',
        amount: initialData.amount ?? '',
        expenseDate: initialData.expenseDate ? formatYMD(new Date(initialData.expenseDate)) : formatYMD(new Date()),
        paymentMethod: initialData.paymentMethod || 'CASH',
        referenceNumber: initialData.referenceNumber || '',
        payeeName: initialData.payeeName || '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        title: '',
        category: 'TEACHER_SALARY',
        amount: '',
        expenseDate: formatYMD(new Date()),
        paymentMethod: 'CASH',
        referenceNumber: '',
        payeeName: '',
        notes: '',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(String(formData.amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid expense amount greater than ₹0');
      return;
    }

    if (!formData.title.trim()) {
      setError('Please enter an expense title / purpose');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = isEdit ? `/api/expenses/${formData.id}` : '/api/expenses';
      const method = isEdit ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        amount: numAmount,
        referenceNumber: formData.referenceNumber?.trim() || null,
        payeeName: formData.payeeName?.trim() || null,
        notes: formData.notes?.trim() || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save expense');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Expense Record' : 'Record New Institute Expense'}
      description="Track institutional operational costs, salaries, utilities, and vendor payouts"
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            form="expense-form"
            isLoading={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {isEdit ? 'Save Changes' : 'Record Expense'}
          </Button>
        </div>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Purpose / Title */}
        <Input
          label="Expense Title / Purpose"
          placeholder="e.g. Physics Faculty Salary - July, Classroom AC Repair, Xerox Notes"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        {/* Category & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Expense Category *</span>
            </label>
            <Select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
            >
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Amount (₹)"
            type="number"
            min="1"
            step="any"
            placeholder="e.g. 5000"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
            leftIcon={<span className="text-slate-400 font-bold">₹</span>}
          />
        </div>

        {/* Date & Payment Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Expense Date"
            type="date"
            value={formData.expenseDate}
            onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
            required
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
              <span>Payment Mode *</span>
            </label>
            <Select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              required
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT / IMPS)</option>
              <option value="CARD">Debit / Credit Card</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
        </div>

        {/* Payee & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Paid To / Payee Name (Optional)"
            placeholder="e.g. Amit Sir, WBSEDCL, City Books"
            value={formData.payeeName || ''}
            onChange={(e) => setFormData({ ...formData, payeeName: e.target.value })}
            leftIcon={<User className="w-4 h-4 text-slate-400" />}
          />

          <Input
            label="Receipt / UTR / Bill No. (Optional)"
            placeholder="e.g. UTR-982347293, Bill #402"
            value={formData.referenceNumber || ''}
            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
            leftIcon={<ReceiptText className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Additional Remarks / Notes (Optional)</span>
          </label>
          <textarea
            rows={2}
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Add any specific comments or remarks regarding this expense..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </form>
    </Modal>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatYMD } from '@/lib/billing-engine';
import { buildWhatsAppUrl, generatePaymentReceiptMessage } from '@/lib/whatsapp';
import { CheckCircle2, Download, MessageSquare } from 'lucide-react';

export interface FeeRecordSummary {
  id: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  mobile: string;
  whatsappNumber?: string | null;
  className: string;
  billingPeriodStr?: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

export interface CollectFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  feeRecord?: FeeRecordSummary | null;
}

export function CollectFeeModal({
  isOpen,
  onClose,
  onSuccess,
  feeRecord,
}: CollectFeeModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'>('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState(formatYMD(new Date()));
  const [notes, setNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success state after payment is recorded
  const [paymentResult, setPaymentResult] = useState<{
    receiptNumber: string;
    documentToken: string;
    documentUrl: string;
    paidAmount: number;
    remainingOutstanding: number;
  } | null>(null);

  useEffect(() => {
    if (feeRecord) {
      setAmount(feeRecord.outstandingAmount || 0);
      setPaymentMethod('CASH');
      setTransactionId('');
      setPaymentDate(formatYMD(new Date()));
      setNotes('');
      setError(null);
      setPaymentResult(null);
    }
  }, [feeRecord, isOpen]);

  if (!feeRecord) return null;

  const maxPayable = feeRecord.outstandingAmount;
  const isOverpaid = amount > maxPayable;

  const handlePayFull = () => {
    setAmount(maxPayable);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Payment amount must be greater than ₹0');
      return;
    }
    if (amount > maxPayable) {
      setError(`Payment cannot exceed remaining outstanding balance of ${formatCurrency(maxPayable)}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeRecordId: feeRecord.id,
          amount,
          paymentMethod,
          transactionId: transactionId.trim() || null,
          paymentDate,
          notes: notes.trim() || null,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record payment');
      }

      setPaymentResult({
        receiptNumber: json.receiptNumber || json.payment?.receiptNumber,
        documentToken: json.documentToken,
        documentUrl: json.documentUrl || `/api/documents/${json.documentToken}`,
        paidAmount: amount,
        remainingOutstanding: json.feeRecord?.outstandingAmount ?? Math.max(0, maxPayable - amount),
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Payment capture failed');
    } finally {
      setIsLoading(false);
    }
  };

  const [instituteSettings, setInstituteSettings] = useState<{
    instituteName?: string;
    phone?: string;
    whatsapp?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/settings')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setInstituteSettings(json.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleWhatsAppReceipt = () => {
    if (!paymentResult || !feeRecord) return;
    const phone = feeRecord.whatsappNumber || feeRecord.mobile;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const msg = generatePaymentReceiptMessage({
      studentName: feeRecord.studentName,
      className: feeRecord.className,
      paidAmount: paymentResult.paidAmount,
      receiptNumber: paymentResult.receiptNumber,
      paymentMethod,
      outstandingAmount: paymentResult.remainingOutstanding,
      documentUrl: `${origin}${paymentResult.documentUrl}`,
      instituteName: instituteSettings?.instituteName || 'DPR Private Tuition',
      contactPhone: instituteSettings?.phone || instituteSettings?.whatsapp || '+91 98765 43210',
    });

    const url = buildWhatsAppUrl(phone, msg);
    window.open(url, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={paymentResult ? 'Payment Recorded Successfully' : 'Collect Student Tuition Fee'}
      description={
        paymentResult
          ? `Receipt ${paymentResult.receiptNumber} issued for ${feeRecord.studentName}`
          : `Record payment for ${feeRecord.studentName} (${feeRecord.studentCode})`
      }
      maxWidth="md"
    >
      {paymentResult ? (
        <div className="space-y-5 text-center py-2">
          <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Receipt Generated</span>
            <h3 className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {paymentResult.receiptNumber}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Amount Paid: <span className="font-bold text-emerald-600">{formatCurrency(paymentResult.paidAmount)}</span> | Remaining Balance: <span className="font-bold">{formatCurrency(paymentResult.remainingOutstanding)}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={paymentResult.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                leftIcon={<Download className="w-4 h-4" />}
              >
                View PDF Receipt
              </Button>
            </a>

            <Button
              variant="success"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleWhatsAppReceipt}
              leftIcon={<MessageSquare className="w-4 h-4" />}
            >
              Share via WhatsApp
            </Button>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}

          {/* Student & Fee Snapshot */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{feeRecord.studentName}</span>
              <span className="font-mono text-slate-500">{feeRecord.studentCode}</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>{feeRecord.className} {feeRecord.billingPeriodStr && `(${feeRecord.billingPeriodStr})`}</span>
              <span>Total: {formatCurrency(feeRecord.totalAmount)}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between font-bold">
              <span className="text-slate-700">Outstanding Balance:</span>
              <span className="text-rose-600 text-sm">{formatCurrency(maxPayable)}</span>
            </div>
          </div>

          {/* Amount input & Quick Full Pay */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
              >
                Pay Full ({formatCurrency(maxPayable)})
              </button>
            </div>
            <Input
              type="number"
              min="1"
              max={maxPayable}
              step="1"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              error={isOverpaid ? `Cannot exceed ${formatCurrency(maxPayable)}` : undefined}
              required
            />
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              required
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
              <option value="CARD">Debit / Credit Card</option>
              <option value="OTHER">Other</option>
            </Select>

            <Input
              label="Payment Date"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          {/* Transaction ID if non-cash */}
          {paymentMethod !== 'CASH' && (
            <Input
              label="Transaction / Reference ID"
              placeholder="e.g. UPI/2026/051289"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          )}

          <Input
            label="Notes / Remarks"
            placeholder="e.g. Paid in cash by Father"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="success"
              type="submit"
              isLoading={isLoading}
              disabled={isOverpaid || amount <= 0}
            >
              Record Payment ({formatCurrency(amount || 0)})
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

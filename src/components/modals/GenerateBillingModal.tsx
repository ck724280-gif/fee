'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { formatYMD } from '@/lib/billing-engine';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import { ClassOption } from './StudentModal';

export interface GenerateBillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classes: ClassOption[];
  studentId?: string;
  studentName?: string;
}

export function GenerateBillingModal({
  isOpen,
  onClose,
  onSuccess,
  classes = [],
  studentId,
  studentName,
}: GenerateBillingModalProps) {
  const isSingle = !!studentId;

  const [classId, setClassId] = useState<string>('');
  const [throughDate, setThroughDate] = useState<string>(formatYMD(new Date()));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{
    created: number;
    skipped: number;
    totalProcessed?: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: any = {
        throughDate,
        currentDate: formatYMD(new Date()),
      };

      if (isSingle) {
        payload.studentId = studentId;
      } else if (classId) {
        payload.classId = classId;
      }

      const res = await fetch('/api/fees/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate billing records');
      }

      setResult({
        created: json.data?.created ?? 0,
        skipped: json.data?.skipped ?? 0,
        totalProcessed: json.data?.totalProcessed ?? (json.data?.totalCyclesEvaluated || 1),
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Billing cycle generation failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSingle ? `Generate Billing Cycles: ${studentName}` : 'Batch Generate Billing Cycles'}
      description={
        isSingle
          ? 'Evaluates admission date anchor and generates all missing cycles'
          : 'Scans active students and generates missing billing cycles up to target date'
      }
      maxWidth="md"
    >
      {result ? (
        <div className="space-y-4 text-center py-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div>
            <h4 className="font-bold text-slate-900 text-base">Generation Complete</h4>
            <p className="text-xs text-slate-500 mt-1">
              Successfully generated <span className="font-bold text-emerald-600">{result.created}</span> new billing record(s).
              {result.skipped > 0 && (
                <span className="block text-slate-400 mt-0.5">
                  ({result.skipped} existing records preserved via idempotency)
                </span>
              )}
            </p>
          </div>

          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert variant="danger">{error}</Alert>}

          {!isSingle && (
            <Select
              label="Cohort Scope"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">All Active Students (Whole Institute)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}

          <Input
            label="Generate Cycles Through Date"
            type="date"
            value={throughDate}
            onChange={(e) => setThroughDate(e.target.value)}
            helperText="Cycles with start dates on or before this date will be generated"
            required
          />

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
            ⚡ <strong>Idempotency Guaranteed</strong>: Running generation multiple times produces zero duplicates. Individual admission date anchors (e.g. 3rd, 15th, 31st) are strictly preserved.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={isLoading}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Start Generation
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

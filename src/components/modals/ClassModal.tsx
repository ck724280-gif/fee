'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export interface ClassData {
  id?: string;
  name: string;
  defaultMonthlyFee: number;
  defaultAdmissionFee: number;
  lateFeeEnabled: boolean;
  lateFeeType: 'FIXED' | 'PER_DAY';
  lateFeeAmount: number;
  graceDays: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: ClassData | null;
}

export function ClassModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: ClassModalProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<ClassData>({
    name: '',
    defaultMonthlyFee: 0,
    defaultAdmissionFee: 0,
    lateFeeEnabled: false,
    lateFeeType: 'FIXED',
    lateFeeAmount: 0,
    graceDays: 0,
    status: 'ACTIVE',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        defaultMonthlyFee: initialData.defaultMonthlyFee ?? 0,
        defaultAdmissionFee: initialData.defaultAdmissionFee ?? 0,
        lateFeeEnabled: !!initialData.lateFeeEnabled,
        lateFeeType: initialData.lateFeeType || 'FIXED',
        lateFeeAmount: initialData.lateFeeAmount ?? 0,
        graceDays: initialData.graceDays ?? 0,
        status: initialData.status || 'ACTIVE',
      });
    } else {
      setFormData({
        name: '',
        defaultMonthlyFee: 0,
        defaultAdmissionFee: 0,
        lateFeeEnabled: false,
        lateFeeType: 'FIXED',
        lateFeeAmount: 0,
        graceDays: 0,
        status: 'ACTIVE',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = isEditing ? `/api/classes/${initialData!.id}` : '/api/classes';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save class');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Class Configuration' : 'Add New Class'}
      description={
        isEditing
          ? 'Update class default fee structure and late fee policy'
          : 'Define a new class cohort with default fees'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <Input
          label="Class Name"
          placeholder="e.g. Class 9, Class 10"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Default Monthly Fee (₹)"
            type="number"
            min="0"
            step="1"
            value={formData.defaultMonthlyFee}
            onChange={(e) =>
              setFormData({ ...formData, defaultMonthlyFee: parseFloat(e.target.value) || 0 })
            }
            required
          />

          <Input
            label="Default Admission Fee (₹)"
            type="number"
            min="0"
            step="1"
            value={formData.defaultAdmissionFee}
            onChange={(e) =>
              setFormData({ ...formData, defaultAdmissionFee: parseFloat(e.target.value) || 0 })
            }
          />
        </div>

        {/* Late Fee Toggle & Config */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800">Late Fee Policy</span>
              <p className="text-[11px] text-slate-500">Apply surcharge after grace days</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.lateFeeEnabled}
                onChange={(e) => setFormData({ ...formData, lateFeeEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {formData.lateFeeEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <Select
                label="Type"
                value={formData.lateFeeType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lateFeeType: e.target.value as 'FIXED' | 'PER_DAY',
                  })
                }
              >
                <option value="FIXED">Fixed (₹)</option>
                <option value="PER_DAY">Per Day (₹/day)</option>
              </Select>

              <Input
                label="Amount (₹)"
                type="number"
                min="0"
                value={formData.lateFeeAmount}
                onChange={(e) =>
                  setFormData({ ...formData, lateFeeAmount: parseFloat(e.target.value) || 0 })
                }
              />

              <Input
                label="Grace Days"
                type="number"
                min="0"
                value={formData.graceDays}
                onChange={(e) =>
                  setFormData({ ...formData, graceDays: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
          )}
        </div>

        <Select
          label="Class Status"
          value={formData.status}
          onChange={(e) =>
            setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })
          }
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </Select>

        {isEditing && (
          <p className="text-[11px] text-slate-500 italic bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
            ℹ️ Note: Changing the class fee applies to future billing cycles for students on DEFAULT fee mode. Historical records and students with CUSTOM fee mode remain unchanged.
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create Class'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

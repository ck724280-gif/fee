'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatYMD } from '@/lib/billing-engine';

export interface ClassOption {
  id: string;
  name: string;
  defaultMonthlyFee: number;
  defaultAdmissionFee: number;
}

export interface StudentFormData {
  id?: string;
  name: string;
  fatherName: string;
  motherName?: string | null;
  guardianName?: string | null;
  mobile: string;
  whatsappNumber?: string | null;
  address?: string | null;
  dob?: string | null;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  school?: string | null;
  classId: string;
  admissionDate: string;
  joiningDate?: string | null;
  feeMode: 'DEFAULT' | 'CUSTOM';
  customMonthlyFee?: number | null;
  admissionFee: number;
  discountType: 'NONE' | 'FIXED' | 'PERCENTAGE';
  discountValue: number;
  status: 'ACTIVE' | 'INACTIVE' | 'LEFT' | 'COMPLETED';
  autoGenerateFees?: boolean;
}

export interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classes: ClassOption[];
  initialData?: StudentFormData | null;
}

export function StudentModal({
  isOpen,
  onClose,
  onSuccess,
  classes = [],
  initialData,
}: StudentModalProps) {
  const isEditing = !!initialData?.id;

  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    fatherName: '',
    motherName: '',
    guardianName: '',
    mobile: '',
    whatsappNumber: '',
    address: '',
    dob: '',
    gender: 'MALE',
    school: '',
    classId: classes[0]?.id || '',
    admissionDate: formatYMD(new Date()),
    joiningDate: formatYMD(new Date()),
    feeMode: 'DEFAULT',
    customMonthlyFee: null,
    admissionFee: 0,
    discountType: 'NONE',
    discountValue: 0,
    status: 'ACTIVE',
    autoGenerateFees: true,
  });

  const [syncWhatsApp, setSyncWhatsApp] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClass = classes.find((c) => c.id === formData.classId);

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name || '',
        fatherName: initialData.fatherName || '',
        motherName: initialData.motherName || '',
        guardianName: initialData.guardianName || '',
        mobile: initialData.mobile || '',
        whatsappNumber: initialData.whatsappNumber || '',
        address: initialData.address || '',
        dob: initialData.dob ? String(initialData.dob).slice(0, 10) : '',
        gender: initialData.gender || 'MALE',
        school: initialData.school || '',
        classId: initialData.classId || classes[0]?.id || '',
        admissionDate: initialData.admissionDate
          ? String(initialData.admissionDate).slice(0, 10)
          : formatYMD(new Date()),
        joiningDate: initialData.joiningDate
          ? String(initialData.joiningDate).slice(0, 10)
          : formatYMD(new Date()),
        feeMode: initialData.feeMode || 'DEFAULT',
        customMonthlyFee: initialData.customMonthlyFee ?? null,
        admissionFee: initialData.admissionFee ?? 0,
        discountType: initialData.discountType || 'NONE',
        discountValue: initialData.discountValue ?? 0,
        status: initialData.status || 'ACTIVE',
        autoGenerateFees: false,
      });
      setSyncWhatsApp(initialData.whatsappNumber === initialData.mobile);
    } else {
      const defaultCls = classes[0];
      setFormData({
        name: '',
        fatherName: '',
        motherName: '',
        guardianName: '',
        mobile: '',
        whatsappNumber: '',
        address: '',
        dob: '',
        gender: 'MALE',
        school: '',
        classId: defaultCls?.id || '',
        admissionDate: formatYMD(new Date()),
        joiningDate: formatYMD(new Date()),
        feeMode: 'DEFAULT',
        customMonthlyFee: null,
        admissionFee: defaultCls?.defaultAdmissionFee || 0,
        discountType: 'NONE',
        discountValue: 0,
        status: 'ACTIVE',
        autoGenerateFees: true,
      });
      setSyncWhatsApp(true);
    }
    setError(null);
  }, [initialData, isOpen, classes]);

  const handleClassChange = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    setFormData((prev) => ({
      ...prev,
      classId,
      admissionFee: !isEditing && cls ? cls.defaultAdmissionFee : prev.admissionFee,
    }));
  };

  const handleMobileChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      mobile: val,
      whatsappNumber: syncWhatsApp ? val : prev.whatsappNumber,
    }));
  };

  // Compute live price preview
  const baseMonthlyRate =
    formData.feeMode === 'CUSTOM' && formData.customMonthlyFee !== null
      ? Number(formData.customMonthlyFee) || 0
      : selectedClass?.defaultMonthlyFee || 0;

  let liveDiscountAmount = 0;
  if (formData.discountType === 'FIXED') {
    liveDiscountAmount = Math.min(Number(formData.discountValue) || 0, baseMonthlyRate);
  } else if (formData.discountType === 'PERCENTAGE') {
    liveDiscountAmount = Math.round(
      (baseMonthlyRate * Math.min(Number(formData.discountValue) || 0, 100)) / 100
    );
  }

  const liveNetMonthly = Math.max(0, baseMonthlyRate - liveDiscountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (formData.feeMode === 'CUSTOM' && (formData.customMonthlyFee === null || formData.customMonthlyFee === undefined || formData.customMonthlyFee < 0)) {
        throw new Error('Please specify a valid custom monthly fee >= 0 for CUSTOM fee mode');
      }

      const payload = {
        ...formData,
        whatsappNumber: syncWhatsApp ? formData.mobile : formData.whatsappNumber || null,
        dob: formData.dob || null,
        joiningDate: formData.joiningDate || formData.admissionDate,
        customMonthlyFee: formData.feeMode === 'CUSTOM' ? Number(formData.customMonthlyFee) : null,
        admissionFee: Number(formData.admissionFee) || 0,
        discountValue: Number(formData.discountValue) || 0,
      };

      const url = isEditing ? `/api/students/${initialData!.id}` : '/api/students';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save student');
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
      title={isEditing ? 'Edit Student Details' : 'Register New Student'}
      description={
        isEditing
          ? 'Update student personal profile, class, or fee configuration'
          : 'Enroll a new student and configure their billing cycle anchor'
      }
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert variant="danger">{error}</Alert>}

        {/* Section 1: Academic & Admission Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
            1. Academic & Admission Setup
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Enrolled Class"
              value={formData.classId}
              onChange={(e) => handleClassChange(e.target.value)}
              required
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({formatCurrency(c.defaultMonthlyFee)}/mo)
                </option>
              ))}
            </Select>

            <Input
              label="Admission Date"
              type="date"
              value={formData.admissionDate}
              onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
              helperText="Anchors monthly cycle day"
              required
            />

            <Select
              label="Student Status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as any })
              }
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="LEFT">LEFT</option>
              <option value="COMPLETED">COMPLETED</option>
            </Select>
          </div>
        </div>

        {/* Section 2: Fee Mode & Discount Engine */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            2. Fee Mode & Live Pricing Engine
          </h4>

          {/* Radio toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-3.5 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                formData.feeMode === 'DEFAULT'
                  ? 'bg-blue-50 border-blue-500 shadow-xs text-blue-900'
                  : 'bg-white border-slate-200 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Class Default Fee</span>
                <input
                  type="radio"
                  name="feeMode"
                  checked={formData.feeMode === 'DEFAULT'}
                  onChange={() => setFormData({ ...formData, feeMode: 'DEFAULT' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
              </div>
              <span className="text-[11px] text-slate-500">
                Rate: {formatCurrency(selectedClass?.defaultMonthlyFee || 0)}/mo (Inherited)
              </span>
            </label>

            <label
              className={`p-3.5 rounded-xl border cursor-pointer flex flex-col gap-1 transition-all ${
                formData.feeMode === 'CUSTOM'
                  ? 'bg-purple-50 border-purple-500 shadow-xs text-purple-900'
                  : 'bg-white border-slate-200 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Custom Student Fee</span>
                <input
                  type="radio"
                  name="feeMode"
                  checked={formData.feeMode === 'CUSTOM'}
                  onChange={() => setFormData({ ...formData, feeMode: 'CUSTOM' })}
                  className="text-purple-600 focus:ring-purple-500"
                />
              </div>
              <span className="text-[11px] text-slate-500">
                Locked personalized rate for this student
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {formData.feeMode === 'CUSTOM' ? (
              <Input
                label="Custom Monthly Fee (₹)"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 650"
                value={formData.customMonthlyFee ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customMonthlyFee: e.target.value === '' ? null : parseFloat(e.target.value),
                  })
                }
                required
              />
            ) : (
              <Input
                label="Class Default Monthly Rate (₹)"
                value={formatCurrency(selectedClass?.defaultMonthlyFee || 0)}
                disabled
              />
            )}

            <Input
              label="Admission Fee (₹)"
              type="number"
              min="0"
              step="1"
              value={formData.admissionFee}
              onChange={(e) =>
                setFormData({ ...formData, admissionFee: parseFloat(e.target.value) || 0 })
              }
              helperText="Assessed on 1st cycle only"
            />

            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Discount"
                value={formData.discountType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountType: e.target.value as any,
                    discountValue: e.target.value === 'NONE' ? 0 : formData.discountValue,
                  })
                }
              >
                <option value="NONE">None</option>
                <option value="FIXED">₹ Fixed</option>
                <option value="PERCENTAGE">% Pct</option>
              </Select>

              <Input
                label="Value"
                type="number"
                min="0"
                max={formData.discountType === 'PERCENTAGE' ? 100 : undefined}
                disabled={formData.discountType === 'NONE'}
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          {/* Live Pricing Breakdown Card */}
          <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500">Base Monthly Fee: </span>
              <span className="font-bold text-slate-800">{formatCurrency(baseMonthlyRate)}</span>
              {liveDiscountAmount > 0 && (
                <>
                  <span className="text-slate-400 mx-1.5">-</span>
                  <span className="text-rose-600 font-semibold">
                    Discount: {formatCurrency(liveDiscountAmount)}
                  </span>
                </>
              )}
            </div>
            <div className="text-emerald-700 font-bold text-sm">
              Net Monthly Charge: {formatCurrency(liveNetMonthly)} / month
            </div>
          </div>
        </div>

        {/* Section 3: Personal & Contact Information */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
            3. Personal & Contact Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Student Full Name"
              placeholder="e.g. Rahul Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Input
              label="Father's / Primary Guardian Name"
              placeholder="e.g. Rajesh Sharma"
              value={formData.fatherName}
              onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Primary Mobile (10 digits)"
              placeholder="9876543210"
              maxLength={10}
              value={formData.mobile}
              onChange={(e) => handleMobileChange(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="WhatsApp Number"
                placeholder="9876543210"
                maxLength={10}
                disabled={syncWhatsApp}
                value={syncWhatsApp ? formData.mobile : formData.whatsappNumber || ''}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              />
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncWhatsApp}
                  onChange={(e) => setSyncWhatsApp(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span>Same as Primary Mobile</span>
              </label>
            </div>

            <Select
              label="Gender"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="School Name"
              placeholder="e.g. St. Xavier's School"
              value={formData.school || ''}
              onChange={(e) => setFormData({ ...formData, school: e.target.value })}
            />

            <Input
              label="Residential Address"
              placeholder="e.g. 12 Park Street, Kolkata"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </div>

        {/* Auto-generate fees on registration */}
        {!isEditing && (
          <label className="flex items-center gap-2 p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.autoGenerateFees}
              onChange={(e) => setFormData({ ...formData, autoGenerateFees: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">
              Automatically generate billing cycles from admission date through current date
            </span>
          </label>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Register Student'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

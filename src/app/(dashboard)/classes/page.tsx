'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ClassModal, ClassData } from '@/components/modals/ClassModal';
import { formatCurrency } from '@/lib/utils';
import {
  GraduationCap,
  Plus,
  Edit2,
  Users,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/classes');
      const json = await res.json();
      if (json.success) {
        setClasses(json.data);
      } else {
        throw new Error(json.error || 'Failed to load classes');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading classes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleEdit = (cls: any) => {
    setEditingClass({
      id: cls.id,
      name: cls.name,
      defaultMonthlyFee: cls.defaultMonthlyFee,
      defaultAdmissionFee: cls.defaultAdmissionFee,
      lateFeeEnabled: cls.lateFeeEnabled,
      lateFeeType: cls.lateFeeType,
      lateFeeAmount: cls.lateFeeAmount,
      graceDays: cls.graceDays,
      status: cls.status,
    });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/classes/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Failed to delete class');
        return;
      }
      fetchClasses();
    } catch (err: any) {
      alert(err.message || 'Failed to delete class');
    }
  };

  const totalStudents = classes.reduce((sum, c) => sum + (c.activeStudentsCount || 0), 0);
  const activeClasses = classes.filter((c) => c.status === 'ACTIVE').length;
  const avgMonthlyFee =
    classes.length > 0
      ? Math.round(
          classes.reduce((sum, c) => sum + c.defaultMonthlyFee, 0) / classes.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Class Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure class cohorts, monthly fee defaults, and late fee surcharge rules
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleAddNew}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add New Class
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Classes</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {classes.length} <span className="text-xs font-normal text-slate-400">({activeClasses} active)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Enrolled Students</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{totalStudents} Active</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            ₹
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Avg Monthly Rate</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">{formatCurrency(avgMonthlyFee)}</div>
          </div>
        </div>
      </div>

      {/* Classes Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Classes</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="p-8 text-center flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading classes...</span>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 text-sm flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          ) : classes.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-medium">No classes configured yet</p>
              <Button variant="primary" size="sm" onClick={handleAddNew}>
                Create Your First Class
              </Button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Class Name</th>
                  <th className="px-6 py-3.5">Default Monthly Fee</th>
                  <th className="px-6 py-3.5">Admission Fee</th>
                  <th className="px-6 py-3.5">Late Fee Policy</th>
                  <th className="px-6 py-3.5">Enrolled Students</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {classes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 text-sm">
                      {c.name}
                    </td>
                    <td className="px-6 py-4 font-semibold text-emerald-600">
                      {formatCurrency(c.defaultMonthlyFee)} / mo
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatCurrency(c.defaultAdmissionFee)}
                    </td>
                    <td className="px-6 py-4">
                      {c.lateFeeEnabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {c.lateFeeType === 'FIXED' ? `₹${c.lateFeeAmount} Fixed` : `₹${c.lateFeeAmount}/day`} (Grace: {c.graceDays}d)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Disabled</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/students?classId=${c.id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{c.activeStudentsCount} students</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={c.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'} size="sm">
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Class"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Class"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Modal */}
      <ClassModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchClasses}
        initialData={editingClass}
      />
    </div>
  );
}

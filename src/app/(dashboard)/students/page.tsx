'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Pagination } from '@/components/ui/Pagination';
import { StudentModal, ClassOption, StudentFormData } from '@/components/modals/StudentModal';
import { CollectFeeModal, FeeRecordSummary } from '@/components/modals/CollectFeeModal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatYMD } from '@/lib/billing-engine';
import { buildWhatsAppUrl, generateFeeReminderMessage } from '@/lib/whatsapp';
import { Modal } from '@/components/ui/Modal';
import {
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  CreditCard,
  MessageSquare,
  Phone,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [summary, setSummary] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalOutstanding: 0,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [feeMode, setFeeMode] = useState('');

  // Modals state
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentFormData | null>(null);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [collectingFeeRecord, setCollectingFeeRecord] = useState<FeeRecordSummary | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<{ id: string; name: string; studentCode: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [instituteSettings, setInstituteSettings] = useState<{
    instituteName?: string;
    phone?: string;
    whatsapp?: string;
  } | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      const [clsRes, setRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/settings'),
      ]);
      const clsJson = await clsRes.json();
      const setJson = await setRes.json();
      if (clsJson.success) {
        setClasses(clsJson.data);
      }
      if (setJson.success && setJson.data) {
        setInstituteSettings(setJson.data);
      }
    } catch (err) {
      console.error('Failed to load classes or settings:', err);
    }
  }, []);

  const fetchStudents = useCallback(
    async (pageNumber = 1) => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.set('page', pageNumber.toString());
        params.set('limit', '20');
        if (search.trim()) params.set('search', search.trim());
        if (classId) params.set('classId', classId);
        if (status) params.set('status', status);
        if (feeMode) params.set('feeMode', feeMode);

        const res = await fetch(`/api/students?${params.toString()}`);
        const json = await res.json();

        if (json.success || json.data || Array.isArray(json.students)) {
          const list = json.data?.students || (Array.isArray(json.data) ? json.data : json.students || []);
          const pag = json.data?.pagination || json.pagination || {
            total: list.length,
            page: pageNumber,
            limit: 20,
            totalPages: Math.ceil(list.length / 20) || 1,
          };
          const sum = json.data?.summary || json.summary || {
            totalStudents: pag.total || list.length,
            activeStudents: list.filter((s: any) => s.status === 'ACTIVE').length,
            totalOutstanding: 0,
          };

          setStudents(list);
          setPagination(pag);
          setSummary(sum);
        }
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [search, classId, status, feeMode]
  );

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setClassId('');
    setStatus('');
    setFeeMode('');
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setIsStudentModalOpen(true);
  };

  const handleEditStudent = (s: any) => {
    setEditingStudent({
      id: s.id,
      name: s.name,
      fatherName: s.fatherName,
      motherName: s.motherName,
      guardianName: s.guardianName,
      mobile: s.mobile,
      whatsappNumber: s.whatsappNumber,
      address: s.address,
      dob: s.dob,
      gender: s.gender,
      school: s.school,
      classId: s.classId,
      admissionDate: s.admissionDate,
      joiningDate: s.joiningDate,
      feeMode: s.feeMode,
      customMonthlyFee: s.customMonthlyFee,
      admissionFee: s.admissionFee,
      discountType: s.discountType,
      discountValue: s.discountValue,
      status: s.status,
    });
    setIsStudentModalOpen(true);
  };

  const handleCollectFee = (s: any) => {
    setCollectingFeeRecord({
      id: s.id, // placeholder, modal will record or student has pending
      studentId: s.id,
      studentName: s.name,
      studentCode: s.studentCode,
      mobile: s.mobile,
      whatsappNumber: s.whatsappNumber,
      className: s.className,
      totalAmount: s.actualMonthlyFee,
      paidAmount: 0,
      outstandingAmount: s.totalOutstanding > 0 ? s.totalOutstanding : s.actualMonthlyFee,
    });
    setIsCollectModalOpen(true);
  };

  const handleWhatsAppChat = (s: any) => {
    const phone = s.whatsappNumber || s.mobile;
    const institute = instituteSettings?.instituteName || 'DPR Private Tuition';
    const msg = `Hello ${s.name}, Greetings from ${institute}!`;
    const url = buildWhatsAppUrl(phone, msg);
    window.open(url, '_blank');
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/students/${studentToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setStudentToDelete(null);
        fetchStudents(pagination.page);
      } else {
        alert(json.error || 'Failed to delete student');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting student');
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
            Student Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage student registrations, fee configurations, and admission anchors
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleAddStudent}
          leftIcon={<UserPlus className="w-4 h-4" />}
        >
          Add New Student
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <Input
              placeholder="Search by student name, code (DPR-2026-001), mobile, or father's name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="w-36">
              <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-32">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="LEFT">LEFT</option>
                <option value="COMPLETED">COMPLETED</option>
              </Select>
            </div>

            <div className="w-32">
              <Select value={feeMode} onChange={(e) => setFeeMode(e.target.value)}>
                <option value="">All Modes</option>
                <option value="DEFAULT">DEFAULT</option>
                <option value="CUSTOM">CUSTOM</option>
              </Select>
            </div>

            <Button variant="primary" size="sm" type="submit">
              Filter
            </Button>

            {(search || classId || status || feeMode) && (
              <Button variant="ghost" size="sm" type="button" onClick={handleClearFilters}>
                Clear
              </Button>
            )}
          </div>
        </form>

        {/* Directory Summary Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Total Enrolled: <strong className="text-slate-800">{summary.totalStudents}</strong> ({summary.activeStudents} Active)
          </span>
          <span>
            Cumulative Outstanding: <strong className="text-rose-600 font-bold">{formatCurrency(summary.totalOutstanding)}</strong>
          </span>
        </div>
      </div>

      {/* Student Data Table */}
      <Card>
        <div className="overflow-x-auto w-full">
          {isLoading ? (
            <div className="p-12 text-center flex items-center justify-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading students directory...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <p className="text-sm font-medium">No students match your filter criteria</p>
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Reset Filters
              </Button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Student Details</th>
                  <th className="px-5 py-3.5">Class</th>
                  <th className="px-5 py-3.5">Contact</th>
                  <th className="px-5 py-3.5">Admission Anchor</th>
                  <th className="px-5 py-3.5">Fee Rate / Mode</th>
                  <th className="px-5 py-3.5">Outstanding</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-600">
                      <Link href={`/students/${s.id}`} className="hover:underline">
                        {s.studentCode}
                      </Link>
                    </td>

                    <td className="px-5 py-3.5">
                      <Link href={`/students/${s.id}`} className="hover:underline">
                        <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                      </Link>
                      <div className="text-[11px] text-slate-400">Father: {s.fatherName}</div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-[11px]">
                        {s.className}
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <a href={`tel:${s.mobile}`} className="hover:underline">
                          {s.mobile}
                        </a>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">
                      <div>{formatDate(s.admissionDate)}</div>
                      <span className="text-[10px] text-blue-600 font-semibold">
                        (Anchor: Day {new Date(s.admissionDate).getDate()})
                      </span>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={s.feeMode} size="sm">
                          {s.feeMode}
                        </Badge>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(s.actualMonthlyFee)}/mo
                        </span>
                      </div>
                      {s.discountType !== 'NONE' && (
                        <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">
                          {s.discountType === 'FIXED' ? `₹${s.discountValue} Off` : `${s.discountValue}% Off`}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-bold">
                      {s.totalOutstanding > 0 ? (
                        <span className="text-rose-600">{formatCurrency(s.totalOutstanding)}</span>
                      ) : (
                        <span className="text-emerald-600">₹0.00</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      <Badge variant={s.status} size="sm">
                        {s.status}
                      </Badge>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/students/${s.id}`}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View 360° Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleEditStudent(s)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Student"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleWhatsAppChat(s)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="WhatsApp Click-to-Chat"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setStudentToDelete({ id: s.id, name: s.name, studentCode: s.studentCode })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Student"
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

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.limit}
          onPageChange={(p) => fetchStudents(p)}
        />
      </Card>

      {/* Modals */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSuccess={() => fetchStudents(1)}
        classes={classes}
        initialData={editingStudent}
      />

      {collectingFeeRecord && (
        <CollectFeeModal
          isOpen={isCollectModalOpen}
          onClose={() => {
            setIsCollectModalOpen(false);
            setCollectingFeeRecord(null);
          }}
          onSuccess={() => fetchStudents(pagination.page)}
          feeRecord={collectingFeeRecord}
        />
      )}

      {/* Delete Confirmation Modal */}
      {studentToDelete && (
        <Modal
          isOpen={true}
          onClose={() => !isDeleting && setStudentToDelete(null)}
          title="Delete Student Record"
          maxWidth="md"
          footer={
            <div className="flex items-center justify-end gap-2.5 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStudentToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDeleteStudent}
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
                Are you sure you want to delete <strong className="text-slate-900 font-bold">{studentToDelete.name}</strong> ({studentToDelete.studentCode})? All associated billing cycles, receipts, and records will be permanently removed.
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Tip: If the student simply left the tuition, you can edit their status to <span className="font-semibold text-slate-700">LEFT</span> or <span className="font-semibold text-slate-700">INACTIVE</span> instead of deleting.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  CreditCard,
  Settings,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  ShieldCheck,
  GraduationCap,
  Clock,
  Edit2,
  Trash2,
  X,
  Plus,
  Power,
  Sparkles,
  ArrowRight,
  User,
  Mail,
  Phone,
  Lock,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

const ORG_TYPES = [
  { id: 'PRIVATE_TUITION', label: 'Private Tuition' },
  { id: 'COACHING', label: 'Coaching Institute' },
  { id: 'SCHOOL', label: 'School' },
  { id: 'TUTORIAL', label: 'Tutorial Centre' },
  { id: 'EDUCATIONAL_INSTITUTE', label: 'Educational Institute' },
];

export default function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit Form Data (Includes full credentials)
  const [editFormData, setEditFormData] = useState({
    name: '',
    organizationType: 'PRIVATE_TUITION',
    status: 'ACTIVE',
    plan: 'BASIC',
    pricePerCycle: 0,
    billingCycle: 'MONTHLY',
    ownerName: '',
    ownerEmail: '',
    ownerMobile: '',
    ownerPassword: '',
  });

  const fetchOrgDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/super-admin/organizations/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch organization details');
      setOrg(json.organization);

      const sub = json.organization?.subscriptions?.[0];
      const owner = json.organization?.members?.[0]?.user;

      setEditFormData({
        name: json.organization?.name || '',
        organizationType: json.organization?.organizationType || 'PRIVATE_TUITION',
        status: json.organization?.status || 'ACTIVE',
        plan: sub?.plan || 'BASIC',
        pricePerCycle: sub?.pricePerCycle || 0,
        billingCycle: sub?.billingCycle || 'MONTHLY',
        ownerName: owner?.name || '',
        ownerEmail: owner?.email || '',
        ownerMobile: owner?.mobile || '',
        ownerPassword: '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgDetails();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!org) return;
    const newStatus = org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/super-admin/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update organization status');
      setSuccessMsg(`Organization status successfully updated to ${newStatus}`);
      fetchOrgDetails();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditFormData((prev) => ({ ...prev, ownerPassword: pass }));
    setShowPassword(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/super-admin/organizations/${org.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update organization');

      setSuccessMsg(`Organization "${editFormData.name}" and credentials updated successfully!`);
      setEditModalOpen(false);
      fetchOrgDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!org) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/super-admin/organizations/${org.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete organization');

      router.push('/super-admin/organizations');
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-xs text-slate-400 font-medium">Loading organization workspace details...</p>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="space-y-4">
        <Link
          href="/super-admin/organizations"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Organizations</span>
        </Link>
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
          <div className="font-bold mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Organization Not Found</span>
          </div>
          <p className="text-xs text-rose-300/80">{error || 'This organization does not exist.'}</p>
        </div>
      </div>
    );
  }

  const isSuspended = org.status === 'SUSPENDED';
  const currentSub = org.subscriptions?.[0];
  const owner = org.members?.[0]?.user;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/super-admin/organizations"
        className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Organizations List</span>
      </Link>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner with Full Action Controls */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-2xl shadow-lg shadow-indigo-500/10">
            {org.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-white">{org.name}</h1>
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wider">
                {org.organizationType.replace(/_/g, ' ')}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isSuspended
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {org.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 font-mono flex-wrap">
              <span>Slug: {org.slug}</span>
              <span>•</span>
              <span className="text-slate-500">Org ID: {org.id}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Edit, Suspend, Delete */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Edit Button */}
          <button
            onClick={() => {
              setShowPassword(false);
              setEditModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Organization &amp; Credentials</span>
          </button>

          {/* Suspend / Reactivate */}
          <button
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              isSuspended
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isSuspended ? 'Reactivate Tenant' : 'Suspend Tenant'}</span>
          </button>

          {/* Delete Button */}
          <button
            onClick={() => setDeleteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Permanently Delete Tenant"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Enrolled Students</span>
          <div className="text-2xl font-bold text-white mt-1">{org._count?.students || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Batches / Classes</span>
          <div className="text-2xl font-bold text-white mt-1">{org.classes?.length || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fee Invoices Generated</span>
          <div className="text-2xl font-bold text-white mt-1">{org._count?.feeRecords || 0}</div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Payments Recorded</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{org._count?.payments || 0}</div>
        </div>
      </div>

      {/* Two-Column Grid: Members & Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members & Staff */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Users className="w-4 h-4 text-rose-500" />
              <span>Organization Members &amp; Staff</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">{org.members?.length || 0} member(s)</span>
          </div>

          <div className="space-y-3">
            {org.members?.map((m: any) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <div className="font-bold text-white text-xs">{m.user?.name}</div>
                  <div className="text-[11px] text-rose-300 font-mono flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{m.user?.email}</span>
                  </div>
                  {m.user?.mobile && (
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{m.user?.mobile}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-700/50 px-2 py-0.5 rounded-md border border-slate-600/50">
                    {m.role}
                  </span>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Joined {new Date(m.createdAt).toLocaleDateString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Subscription Plan */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CreditCard className="w-4 h-4 text-rose-500" />
                <span>Active Subscription Plan</span>
              </div>
              <button
                onClick={() => setEditModalOpen(true)}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Edit Plan</span>
              </button>
            </div>

            {currentSub ? (
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-extrabold text-white">
                      {currentSub.plan} Plan
                    </div>
                    <div className="text-xs text-slate-400">
                      ₹{currentSub.pricePerCycle.toLocaleString('en-IN')} per {currentSub.billingCycle?.toLowerCase()}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      currentSub.status === 'ACTIVE'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {currentSub.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-slate-700/60 pt-3">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Start Date:</span>
                    <span className="font-semibold text-slate-200">
                      {new Date(currentSub.startDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Expiry Date:</span>
                    <span className="font-semibold text-rose-400">
                      {new Date(currentSub.expiryDate).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No active subscription record found.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>SaaS Payments Recorded: {currentSub?.payments?.length || 0}</span>
            <Link
              href="/super-admin/subscriptions"
              className="text-rose-400 hover:text-rose-300 font-semibold inline-flex items-center gap-1"
            >
              <span>Manage Billing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Organization Modal with Full Credentials */}
      <AnimatePresence>
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 text-white font-bold text-base">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Edit2 className="w-4 h-4" />
                  </div>
                  <span>Edit Organization &amp; Credentials: {org.name}</span>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-5 space-y-4">
                {/* Organization Details */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Organization Type
                    </label>
                    <select
                      value={editFormData.organizationType}
                      onChange={(e) => setEditFormData({ ...editFormData, organizationType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      {ORG_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Account Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="DEACTIVATED">Deactivated</option>
                    </select>
                  </div>
                </div>

                {/* SaaS Plan & Pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Plan Tier
                    </label>
                    <select
                      value={editFormData.plan}
                      onChange={(e) => setEditFormData({ ...editFormData, plan: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="BASIC">Basic</option>
                      <option value="STARTER">Starter</option>
                      <option value="PROFESSIONAL">Professional</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Custom Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editFormData.pricePerCycle}
                      onChange={(e) => setEditFormData({ ...editFormData, pricePerCycle: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Billing Cycle
                    </label>
                    <select
                      value={editFormData.billingCycle}
                      onChange={(e) => setEditFormData({ ...editFormData, billingCycle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>

                {/* Administrator Credentials & Login Details */}
                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">
                    Administrator Login Credentials (User ID &amp; Password)
                  </span>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Admin Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={editFormData.ownerName}
                        onChange={(e) => setEditFormData({ ...editFormData, ownerName: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Login Email / User ID
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="email"
                          required
                          value={editFormData.ownerEmail}
                          onChange={(e) => setEditFormData({ ...editFormData, ownerEmail: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Admin Mobile
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="tel"
                          value={editFormData.ownerMobile}
                          onChange={(e) => setEditFormData({ ...editFormData, ownerMobile: e.target.value })}
                          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reset Password */}
                  <div className="p-3.5 bg-slate-800/70 border border-slate-700 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Set New Password (Optional)</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomPassword}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Generate</span>
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={editFormData.ownerPassword}
                        onChange={(e) => setEditFormData({ ...editFormData, ownerPassword: e.target.value })}
                        placeholder="Leave blank to keep existing password"
                        className="w-full pr-10 pl-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      If changed, the administrator can log in immediately with the new password.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <span>Save All Changes</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center gap-3 text-rose-400 font-bold text-base pb-3 border-b border-slate-800">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <span>Confirm Organization Deletion</span>
              </div>

              <div className="py-4 text-xs text-slate-300 space-y-2">
                <p>
                  Are you sure you want to permanently delete <strong className="text-white">"{org.name}"</strong>?
                </p>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-[11px]">
                  ⚠️ <strong>Warning:</strong> This will delete all student records, fee structures, classes, and subscription history associated with this organization.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Yes, Delete Organization</span>}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

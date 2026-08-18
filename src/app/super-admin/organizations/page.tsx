'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Search,
  Filter,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldAlert,
  GraduationCap,
  Sparkles,
  School,
  BookOpen,
  Edit2,
  Trash2,
  Power,
  IndianRupee,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

const ORG_TYPES = [
  { id: 'PRIVATE_TUITION', label: 'Private Tuition' },
  { id: 'COACHING', label: 'Coaching Institute' },
  { id: 'SCHOOL', label: 'School' },
  { id: 'TUTORIAL', label: 'Tutorial Centre' },
  { id: 'EDUCATIONAL_INSTITUTE', label: 'Educational Institute' },
];

export default function OrganizationsManagementPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // New Org Form Data
  const [formData, setFormData] = useState({
    name: '',
    organizationType: 'PRIVATE_TUITION',
    ownerName: '',
    ownerEmail: '',
    ownerMobile: '',
    ownerPassword: '',
    plan: 'BASIC',
    pricePerCycle: 0,
    billingCycle: 'MONTHLY',
  });

  // Edit Org Form Data
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    organizationType: 'PRIVATE_TUITION',
    status: 'ACTIVE',
    plan: 'BASIC',
    pricePerCycle: 0,
    billingCycle: 'MONTHLY',
  });

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/organizations');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch organizations');
      setOrganizations(json.organizations || []);
    } catch (err: any) {
      setError(err.message || 'Error loading organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleToggleStatus = async (orgId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/super-admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update organization status');
      setSuccessMsg(`Organization status updated to ${newStatus}`);
      fetchOrganizations();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleOpenEdit = (org: any) => {
    const sub = org.subscriptions?.[0];
    setSelectedOrg(org);
    setEditFormData({
      id: org.id,
      name: org.name,
      organizationType: org.organizationType,
      status: org.status,
      plan: sub?.plan || 'BASIC',
      pricePerCycle: sub?.pricePerCycle || 0,
      billingCycle: sub?.billingCycle || 'MONTHLY',
    });
    setError('');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/super-admin/organizations/${editFormData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update organization');

      setSuccessMsg(`Organization "${editFormData.name}" updated successfully!`);
      setEditModalOpen(false);
      fetchOrganizations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDelete = (org: any) => {
    setSelectedOrg(org);
    setError('');
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedOrg) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/super-admin/organizations/${selectedOrg.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete organization');

      setSuccessMsg(json.message || 'Organization deleted successfully');
      setDeleteModalOpen(false);
      fetchOrganizations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create organization');

      setSuccessMsg(`Organization "${formData.name}" created successfully!`);
      setModalOpen(false);
      setFormData({
        name: '',
        organizationType: 'PRIVATE_TUITION',
        ownerName: '',
        ownerEmail: '',
        ownerMobile: '',
        ownerPassword: '',
        plan: 'BASIC',
        pricePerCycle: 0,
        billingCycle: 'MONTHLY',
      });
      fetchOrganizations();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrgs = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase()) ||
      org.members?.some((m: any) => m.user?.email.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || org.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>TENANT DIRECTORY &amp; GOVERNANCE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Organization Tenants
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Edit institute profiles, configure custom subscription fees, manage active statuses, or delete tenant partitions.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-xl shadow-rose-600/25 transition duration-200 flex items-center gap-2 cursor-pointer w-fit active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Tenant</span>
        </button>
      </div>

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

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, or admin email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-2xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
            <span className="text-xs font-semibold">Loading tenant organizations...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-5">Organization</th>
                  <th className="py-4 px-4">Type</th>
                  <th className="py-4 px-4">Admin Owner</th>
                  <th className="py-4 px-4 text-center">Classes</th>
                  <th className="py-4 px-4 text-center">Students</th>
                  <th className="py-4 px-4">Plan &amp; Rate</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-5 text-right">Management Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredOrgs.map((org) => {
                  const owner = org.members?.[0]?.user;
                  const currentSub = org.subscriptions?.[0];
                  const isSuspended = org.status === 'SUSPENDED';

                  return (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition duration-150">
                      <td className="py-4 px-5">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-rose-400 shrink-0" />
                          <span>{org.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>slug: {org.slug}</span>
                          <span>•</span>
                          <span className="text-slate-600">UUID: {org.id.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 font-bold">
                          {org.organizationType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-200">{owner?.name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{owner?.email || 'N/A'}</div>
                        {owner?.mobile && (
                          <div className="text-[10px] text-slate-500">{owner.mobile}</div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-slate-200">
                        {org._count?.classes || org.classes?.length || 0}
                      </td>
                      <td className="py-4 px-4 text-center font-bold text-slate-200">
                        {org._count?.students || 0}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-rose-300 text-xs">
                          {currentSub?.plan || 'BASIC'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          ₹{currentSub?.pricePerCycle || 0} / {currentSub?.billingCycle?.toLowerCase() || 'month'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                            isSuspended
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-1.5">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(org)}
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 transition cursor-pointer"
                          title="Edit Organization Details & Plan"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Suspend / Activate Toggle */}
                        <button
                          onClick={() => handleToggleStatus(org.id, org.status)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            isSuspended
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                          }`}
                          title={isSuspended ? 'Reactivate Organization' : 'Suspend Organization'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleOpenDelete(org)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                          title="Delete Organization"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Details View */}
                        <Link
                          href={`/super-admin/organizations/${org.id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition inline-block align-middle"
                          title="View Complete Analytics & Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrgs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-500">
                      No organizations matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Organization Modal */}
      <AnimatePresence>
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <Edit2 className="w-4 h-4 text-blue-400" />
                  <span>Edit Organization: {selectedOrg?.name}</span>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Institute Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Organization Type
                    </label>
                    <select
                      value={editFormData.organizationType}
                      onChange={(e) => setEditFormData({ ...editFormData, organizationType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      {ORG_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      Account Status
                    </label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="DEACTIVATED">Deactivated</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                      SaaS Plan Tier
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
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
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
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Changes</span>}
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
                  Are you sure you want to permanently delete <strong className="text-white">"{selectedOrg?.name}"</strong>?
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

      {/* Create Organization Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <Building2 className="w-5 h-5 text-rose-500" />
                  <span>Provision New Tenant Organization</span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrg} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Apex Science Coaching Hub"
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Organization Type
                    </label>
                    <select
                      value={formData.organizationType}
                      onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      {ORG_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Plan Tier
                    </label>
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="BASIC">Basic (Standard)</option>
                      <option value="STARTER">Starter</option>
                      <option value="PROFESSIONAL">Professional</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Custom Pricing (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.pricePerCycle}
                      onChange={(e) => setFormData({ ...formData, pricePerCycle: Number(e.target.value) })}
                      placeholder="e.g. 499"
                      className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={formData.billingCycle}
                      onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Initial Administrator Credentials
                  </span>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Admin Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        placeholder="e.g. Prof. Rajesh Sharma"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Admin Email</label>
                        <input
                          type="email"
                          required
                          value={formData.ownerEmail}
                          onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                          placeholder="admin@apexcoaching.com"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-300 mb-1">Admin Mobile</label>
                        <input
                          type="tel"
                          value={formData.ownerMobile}
                          onChange={(e) => setFormData({ ...formData, ownerMobile: e.target.value })}
                          placeholder="9876543210"
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Admin Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={formData.ownerPassword}
                        onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Workspace...</span>
                      </>
                    ) : (
                      <>
                        <span>Provision Tenant</span>
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
    </div>
  );
}

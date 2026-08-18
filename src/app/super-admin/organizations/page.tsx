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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Organization Tenants
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage all educational institutions, subscriptions, data partitions, and access statuses.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Tenant</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, slug, or admin email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
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
          </select>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs">Loading organizations...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Organization / Tenant</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Primary Admin</th>
                  <th className="py-3.5 px-4 text-center">Classes</th>
                  <th className="py-3.5 px-4 text-center">Students</th>
                  <th className="py-3.5 px-4">Current Plan</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredOrgs.map((org) => {
                  const owner = org.members?.[0]?.user;
                  const currentSub = org.subscriptions?.[0];
                  const isSuspended = org.status === 'SUSPENDED';

                  return (
                    <tr key={org.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{org.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{org.slug}</span>
                          <span>•</span>
                          <span className="text-slate-600">ID: {org.id.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20 font-medium">
                          {org.organizationType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{owner?.name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-500">{owner?.email || 'N/A'}</div>
                        {owner?.mobile && (
                          <div className="text-[10px] text-slate-500">{owner.mobile}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-200">
                        {org._count?.classes || 0}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-slate-200">
                        {org._count?.students || 0}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-rose-300">
                          {currentSub?.plan || 'BASIC'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          ₹{currentSub?.pricePerCycle || 0} / {currentSub?.billingCycle?.toLowerCase() || 'month'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            isSuspended
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(org.id, org.status)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                              isSuspended
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                            }`}
                          >
                            {isSuspended ? 'Activate' : 'Suspend'}
                          </button>
                          <Link
                            href={`/super-admin/organizations/${org.id}`}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrgs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No organizations matching search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                    placeholder="e.g. Zenith Tutorials"
                    className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
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
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
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
                      Subscription Plan
                    </label>
                    <select
                      value={formData.plan}
                      onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="BASIC">Basic (₹0 trial)</option>
                      <option value="STANDARD">Standard</option>
                      <option value="PREMIUM">Premium</option>
                      <option value="CUSTOM">Custom Pricing</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Price Per Cycle (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.pricePerCycle}
                      onChange={(e) => setFormData({ ...formData, pricePerCycle: Number(e.target.value) })}
                      placeholder="e.g. 499"
                      className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Billing Cycle
                    </label>
                    <select
                      value={formData.billingCycle}
                      onChange={(e) => setFormData({ ...formData, billingCycle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="text-xs font-bold text-slate-200 mb-3">Owner & Admin Credentials</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Admin Full Name</label>
                      <input
                        type="text"
                        required
                        value={formData.ownerName}
                        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                        placeholder="e.g. Anand Kumar"
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Admin Mobile</label>
                      <input
                        type="tel"
                        value={formData.ownerMobile}
                        onChange={(e) => setFormData({ ...formData, ownerMobile: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Admin Email</label>
                      <input
                        type="email"
                        required
                        value={formData.ownerEmail}
                        onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                        placeholder="admin@zenith.com"
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Initial Password</label>
                      <input
                        type="password"
                        required
                        value={formData.ownerPassword}
                        onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                        placeholder="Min 6 chars"
                        className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Provisioning...</span>
                      </>
                    ) : (
                      <span>Provision Tenant</span>
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

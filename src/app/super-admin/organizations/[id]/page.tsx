'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
} from 'lucide-react';

export default function OrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchOrgDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/super-admin/organizations/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch organization details');
      setOrg(json.organization);
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

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-2xl shadow-lg shadow-indigo-500/10">
            {org.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-extrabold text-white">{org.name}</h1>
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {org.organizationType.replace(/_/g, ' ')}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  isSuspended
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}
              >
                {org.status}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 font-mono">
              <span>Slug: {org.slug}</span>
              <span>•</span>
              <span>Org ID: {org.id}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleStatus}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isSuspended
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
            }`}
          >
            {isSuspended ? 'Reactivate Tenant' : 'Suspend Tenant Access'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Stats & Subscriptions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Total Enrolled Students</div>
          <div className="text-2xl font-extrabold text-white mt-1">{org._count?.students || 0}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Active Batches / Classes</div>
          <div className="text-2xl font-extrabold text-white mt-1">{org._count?.classes || 0}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Fee Invoices Generated</div>
          <div className="text-2xl font-extrabold text-white mt-1">{org._count?.feeRecords || 0}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="text-xs text-slate-400">Payments Recorded</div>
          <div className="text-2xl font-extrabold text-white mt-1">{org._count?.payments || 0}</div>
        </div>
      </div>

      {/* Two Column Layout: Members vs Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members List */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Organization Members & Staff</span>
          </h2>

          <div className="divide-y divide-slate-800">
            {org.members?.map((m: any) => (
              <div key={m.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200 text-xs">{m.user?.name}</div>
                  <div className="text-[11px] text-slate-400">{m.user?.email}</div>
                  {m.user?.mobile && (
                    <div className="text-[10px] text-slate-500">{m.user?.mobile}</div>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
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

        {/* Subscription & Billing Details */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-rose-400" />
            <span>Active Subscription Plan</span>
          </h2>

          {currentSub ? (
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-extrabold text-white">{currentSub.plan} Plan</div>
                  <div className="text-xs text-slate-400">
                    ₹{currentSub.pricePerCycle} per {currentSub.billingCycle?.toLowerCase()}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {currentSub.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                <div>
                  <span className="text-slate-500">Start Date:</span>{' '}
                  <span className="text-slate-300 font-medium">
                    {new Date(currentSub.startDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Expiry Date:</span>{' '}
                  <span className="text-slate-300 font-medium">
                    {new Date(currentSub.expiryDate).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>

              {currentSub.payments && currentSub.payments.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-[11px] font-bold text-slate-400 mb-1.5">Payment History</div>
                  <div className="space-y-1">
                    {currentSub.payments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-[10px] text-slate-300">
                        <span>
                          ₹{p.amount} via {p.paymentMethod} (Ref: {p.referenceNumber || 'N/A'})
                        </span>
                        <span className="text-slate-500">
                          {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-4">No active subscription plan configured.</div>
          )}
        </div>
      </div>
    </div>
  );
}

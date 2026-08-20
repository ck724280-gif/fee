'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  GraduationCap,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/stats');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch platform stats');
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to platform API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-xs text-slate-400 font-medium">Aggregating platform metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
        <div className="font-bold mb-1 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Access Denied or Error</span>
        </div>
        <p className="text-xs text-rose-300/80">{error}</p>
      </div>
    );
  }

  const { stats, recentOrganizations, recentLogs } = data || {};

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Platform Master Console
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global multi-tenant overview, tenant isolation verification, and revenue management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/super-admin/organizations"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Organization</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Organizations */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {stats?.activeOrganizations || 0} Active
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-white">{stats?.totalOrganizations || 0}</div>
            <div className="text-xs text-slate-400 mt-0.5">Total Organizations</div>
          </div>
          {stats?.suspendedOrganizations > 0 && (
            <div className="mt-2 text-[10px] text-amber-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>{stats?.suspendedOrganizations} suspended tenant(s)</span>
            </div>
          )}
        </motion.div>

        {/* Card 2: Platform Users */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
              All Tenants
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-white">{stats?.totalUsers || 0}</div>
            <div className="text-xs text-slate-400 mt-0.5">Platform Staff & Admins</div>
          </div>
        </motion.div>

        {/* Card 3: Platform Students */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
              Across Classes
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-white">{stats?.totalStudents || 0}</div>
            <div className="text-xs text-slate-400 mt-0.5">Enrolled Students</div>
          </div>
        </motion.div>

        {/* Card 4: Platform Revenue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              Collected
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-white">
              ₹{(stats?.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Subscription Revenue</div>
          </div>
        </motion.div>
      </div>

      {/* Grid: Recent Organizations + Security Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Organizations List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Recently Registered Organizations</span>
            </h2>
            <Link
              href="/super-admin/organizations"
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Admin</th>
                    <th className="py-3 px-4 text-center">Students</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {recentOrganizations?.map((org: any) => {
                    const owner = org.members?.[0]?.user;
                    const isSuspended = org.status === 'SUSPENDED';
                    return (
                      <tr key={org.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{org.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{org.slug}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-medium">
                            {org.organizationType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-200">{owner?.name || 'Admin'}</div>
                          <div className="text-[10px] text-slate-500">{owner?.email || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-200">
                          {org._count?.students || 0}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              isSuspended
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            {org.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/super-admin/organizations/${org.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition"
                          >
                            <span>Manage</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {(!recentOrganizations || recentOrganizations.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No organizations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Security Audit Log Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>Platform Security Trail</span>
            </h2>
            <Link
              href="/super-admin/audit-logs"
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
            >
              View Log
            </Link>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3 backdrop-blur-xl">
            {recentLogs?.map((log: any) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-rose-300 font-mono">{log.action}</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {log.organization?.name ? (
                    <span className="text-indigo-400 font-medium">[{log.organization.name}] </span>
                  ) : null}
                  <span>by {log.user?.email || 'System'}</span>
                </div>
              </div>
            ))}
            {(!recentLogs || recentLogs.length === 0) && (
              <div className="py-6 text-center text-slate-500 text-xs">No recent audit events.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Building2,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/users');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch platform users');
      setUsers(json.users || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Platform Users & Access
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global directory of organization administrators, staff members, and multi-tenant credentials.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs">Loading platform users...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Platform Level</th>
                  <th className="py-3.5 px-4">Organization Memberships</th>
                  <th className="py-3.5 px-4">Two-Factor Auth (2FA)</th>
                  <th className="py-3.5 px-4 text-right">Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredUsers.map((u) => {
                  const has2FA = !!u.totpSecret?.isVerified;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                        {u.mobile && <div className="text-[10px] text-slate-500">{u.mobile}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        {u.isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            SUPER ADMIN
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                            Member
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {u.memberships?.map((m: any) => (
                            <div
                              key={m.id}
                              className="text-[11px] flex items-center gap-1.5 text-slate-300"
                            >
                              <span className="font-semibold text-white">{m.organization?.name}</span>
                              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                {m.role}
                              </span>
                            </div>
                          ))}
                          {(!u.memberships || u.memberships.length === 0) && (
                            <span className="text-slate-500 italic text-[11px]">No active memberships</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            has2FA
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {has2FA ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>2FA Active</span>
                            </>
                          ) : (
                            <span>Disabled</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

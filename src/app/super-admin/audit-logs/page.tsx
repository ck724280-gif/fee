'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ScrollText,
  Search,
  Loader2,
  AlertTriangle,
  Clock,
  Building2,
  User,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function PlatformAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/super-admin/audit-logs');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch audit logs');
      setLogs(json.logs || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.organization?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.entity?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Security & Platform Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable audit record of all tenant modifications, payment approvals, logins, and administrative actions.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, org, user, or entity..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Audit Logs List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs">Loading platform audit logs...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Tenant / Org</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-rose-300">
                          {log.action}
                        </td>
                        <td className="py-3.5 px-4">
                          {log.organization ? (
                            <div>
                              <div className="font-semibold text-white">{log.organization.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {log.organization.slug}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Platform Level</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-200">{log.user?.email || 'System'}</div>
                          {log.user?.name && (
                            <div className="text-[10px] text-slate-500">{log.user.name}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                            {log.entity || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="p-4">
                            <div className="text-[11px] font-mono text-slate-400 mb-1">Payload / Details JSON:</div>
                            <pre className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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

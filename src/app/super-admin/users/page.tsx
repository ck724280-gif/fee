'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Edit2,
  Lock,
  Mail,
  User,
  Phone,
  X,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit User Form State
  const [editFormData, setEditFormData] = useState({
    userId: '',
    name: '',
    email: '',
    mobile: '',
    newPassword: '',
    isSuperAdmin: false,
    reset2FA: false,
  });

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

  const handleOpenEditModal = (u: any) => {
    setEditFormData({
      userId: u.id,
      name: u.name || '',
      email: u.email || '',
      mobile: u.mobile || '',
      newPassword: '',
      isSuperAdmin: !!u.isSuperAdmin,
      reset2FA: false,
    });
    setShowPassword(false);
    setError('');
    setEditModalOpen(true);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEditFormData((prev) => ({ ...prev, newPassword: pass }));
    setShowPassword(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.email.trim()) {
      setError('Email address / User ID cannot be empty.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update user credentials');

      setSuccessMsg(json.message || 'User credentials updated successfully!');
      setEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.memberships?.some((m: any) => m.organization?.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GLOBAL IDENTITY &amp; CREDENTIALS MANAGER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Platform Users &amp; Credentials
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Change user emails (User IDs), reset passwords, manage multi-tenant permissions, and reset two-factor keys.
          </p>
        </div>
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

      {/* Search Bar */}
      <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email/User ID, or institute..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-2xl">
        {loading ? (
          <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
            <span className="text-xs font-semibold">Loading platform users...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-4 px-5">User &amp; Email ID</th>
                  <th className="py-4 px-4">Platform Level</th>
                  <th className="py-4 px-4">Organization Memberships</th>
                  <th className="py-4 px-4">Two-Factor Auth (2FA)</th>
                  <th className="py-4 px-4">Registered</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredUsers.map((u) => {
                  const has2FA = !!u.totpSecret?.isEnabled;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition duration-150">
                      <td className="py-4 px-5">
                        <div className="font-bold text-white text-sm">{u.name}</div>
                        <div className="text-[11px] text-rose-300 font-mono flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span>{u.email}</span>
                        </div>
                        {u.mobile && (
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{u.mobile}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {u.isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                            <ShieldAlert className="w-3 h-3" />
                            SUPER ADMIN
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                            MEMBER
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {u.memberships?.map((m: any) => (
                            <div
                              key={m.id}
                              className="text-[11px] flex items-center gap-1.5 text-slate-300"
                            >
                              <span className="font-bold text-white">{m.organization?.name}</span>
                              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                {m.role}
                              </span>
                            </div>
                          ))}
                          {(!u.memberships || u.memberships.length === 0) && (
                            <span className="text-slate-500 italic text-[11px]">No active memberships</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                            has2FA
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {has2FA ? (
                            <>
                              <ShieldCheck className="w-3 h-3" />
                              ENABLED
                            </>
                          ) : (
                            'DISABLED'
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5 shadow-md active:scale-95"
                          title="Change User ID / Reset Password"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>Change ID / Password</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-500">
                      No platform users found matching search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User & Credentials Modal */}
      <AnimatePresence>
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-blue-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 text-white font-bold text-base">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <span>Change User ID &amp; Password</span>
                </div>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4 mt-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    User Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Email / User ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Login Email / User ID
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">This is the email ID used to log in.</p>
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="tel"
                      value={editFormData.mobile}
                      onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Reset Password */}
                <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-2xl space-y-2.5">
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
                      value={editFormData.newPassword}
                      onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
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
                    If entered, the user's password will be instantly hashed with bcrypt and updated.
                  </p>
                </div>

                {/* Reset 2FA Checkbox */}
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    id="reset2FA"
                    checked={editFormData.reset2FA}
                    onChange={(e) => setEditFormData({ ...editFormData, reset2FA: e.target.checked })}
                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="reset2FA" className="text-xs text-slate-300 cursor-pointer select-none">
                    Reset Two-Factor Authentication (2FA) if user is locked out
                  </label>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
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
                        <span>Updating Credentials...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Save &amp; Update Credentials</span>
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

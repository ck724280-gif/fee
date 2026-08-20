'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Loader2,
  CheckCircle2,
  Sparkles,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { ResetPasswordWith2faModal } from '@/components/modals/ResetPasswordWith2faModal';

function SuperAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/super-admin';

  const [email, setEmail] = useState('admin@dprtuition.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // 2FA state
  const [requires2fa, setRequires2fa] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePrimaryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your master super admin email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid credentials. Please verify and try again.');
        setLoading(false);
        return;
      }

      const isSuperAdmin = Boolean(data.user?.isSuperAdmin ?? data.isSuperAdmin);

      if (data.requires2fa) {
        if (!isSuperAdmin) {
          setErrorMessage('Access Denied: This terminal is strictly reserved for Master Platform Super Administrators. Please sign in via the Institute Portal.');
          setLoading(false);
          return;
        }
        setRequires2fa(true);
        setLoading(false);
        return;
      }

      if (!isSuperAdmin) {
        setErrorMessage('Access Denied: This terminal is strictly reserved for Master Platform Super Administrators. Please sign in via the Institute Portal.');
        setLoading(false);
        return;
      }

      setSuccessMessage('Master Super Admin verified! Launching platform control console...');
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 700);
    } catch (err: any) {
      console.error('Super admin login failed:', err);
      setErrorMessage('Network error. Please check your connection and try again.');
      setLoading(false);
    }
  };

  const handle2faVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!useRecoveryCode && (!totpCode.trim() || totpCode.trim().length !== 6)) {
      setErrorMessage('Please enter the 6-digit verification code from Google Authenticator.');
      return;
    }

    if (useRecoveryCode && !recoveryCode.trim()) {
      setErrorMessage('Please enter a valid backup recovery code.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: useRecoveryCode ? undefined : totpCode.trim(),
          recoveryCode: useRecoveryCode ? recoveryCode.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Verification code failed. Please check and re-enter.');
        setLoading(false);
        return;
      }

      setSuccessMessage('2FA Verified! Launching platform control console...');
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 700);
    } catch (err: any) {
      console.error('2FA verification failed:', err);
      setErrorMessage('Network error during 2FA check.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Brand Header */}
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white shadow-2xl shadow-rose-600/30 mb-4 ring-4 ring-rose-500/20">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MASTER PLATFORM OWNER</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Master Super Admin
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Global SaaS Governance, Tenant Directory &amp; Audit Engine
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-black/80 border border-rose-500/30 p-6 sm:p-8 relative overflow-hidden">
        {/* Top ambient glow inside card */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
            <ShieldCheck className="w-4 h-4 text-rose-400" />
            <span>{requires2fa ? 'Step 2: 2FA Authentication' : 'Master Admin Credentials'}</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300 bg-rose-500/20 px-2.5 py-1 rounded-full border border-rose-500/30">
            ROOT LEVEL
          </span>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Alert */}
        <AnimatePresence>
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!requires2fa ? (
          <form onSubmit={handlePrimaryLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Master Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dprtuition.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 text-sm transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Master Password
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition cursor-pointer hover:underline"
                >
                  Forgot Password? (2FA Reset)
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Master Access...</span>
                </>
              ) : (
                <>
                  <span>Enter Super Admin Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handle2faVerify} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 text-xs text-slate-300">
              Enter the 6-digit security code generated by your Authenticator App.
            </div>

            {!useRecoveryCode ? (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  6-Digit Authenticator Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-rose-400 pointer-events-none" />
                  <input
                    type="text"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500 text-center font-mono text-xl tracking-[0.4em] font-bold"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Backup Recovery Code
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCD-1234-EFGH"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm uppercase"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying 2FA...</span>
                </>
              ) : (
                <>
                  <span>Authenticate &amp; Enter</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setUseRecoveryCode(!useRecoveryCode)}
                className="text-rose-400 hover:underline cursor-pointer"
              >
                {useRecoveryCode ? 'Use 6-digit Authenticator' : 'Use Backup Recovery Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRequires2fa(false);
                  setTotpCode('');
                }}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ← Back
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Master Admin 2FA Password Reset Modal */}
      <ResetPasswordWith2faModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        defaultEmail={email}
        isSuperAdminContext={true}
        onSuccessRedirect={() => {
          setIsResetModalOpen(false);
          setSuccessMessage('Master Admin password reset successfully! Please log in with your new credentials.');
        }}
      />
    </div>
  );
}

export default function SuperAdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#050811] flex flex-col items-center justify-center p-4 selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-rose-600/15 via-amber-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-rose-700/10 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          </div>
        }
      >
        <SuperAdminLoginForm />
      </Suspense>
    </div>
  );
}

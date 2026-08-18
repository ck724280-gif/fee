'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Mail,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Loader2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  // Step 1 State: Email & Password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 State: 2FA TOTP Code
  const [requires2fa, setRequires2fa] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Step 1: Submit email & password
  const handlePrimaryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
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
        setErrorMessage(data.error || 'Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      // Check if 2FA is required
      if (data.requires2fa) {
        setRequires2fa(true);
        setLoading(false);
        return;
      }

      // Successful direct login
      setSuccessMessage('Authentication successful! Loading workspace...');
      setTimeout(() => {
        if (data.user?.isSuperAdmin) {
          window.location.href = redirectUrl === '/' ? '/super-admin' : redirectUrl;
        } else {
          window.location.href = redirectUrl;
        }
      }, 700);
    } catch (err: any) {
      console.error('Login request failed:', err);
      setErrorMessage('Network error occurred. Please check your connection and try again.');
      setLoading(false);
    }
  };

  // Step 2: Submit 2FA TOTP code
  const handle2faVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!useRecoveryCode && (!totpCode.trim() || totpCode.trim().length !== 6)) {
      setErrorMessage('Please enter the 6-digit code from Google Authenticator.');
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

      setSuccessMessage('2FA Verified! Loading your workspace...');
      setTimeout(() => {
        if (data.user?.isSuperAdmin) {
          window.location.href = redirectUrl === '/' ? '/super-admin' : redirectUrl;
        } else {
          window.location.href = redirectUrl;
        }
      }, 700);
    } catch (err: any) {
      console.error('2FA verification failed:', err);
      setErrorMessage('Network error occurred during 2FA check. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-2xl shadow-indigo-500/25 mb-4 ring-4 ring-indigo-500/20">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Education SaaS Platform
        </h1>
        <p className="text-sm text-slate-400 mt-1.5 font-medium">
          Multi-Tenant Management & Administration Portal
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/60 border border-slate-800/80 p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>{requires2fa ? 'Two-Factor Authentication' : 'Account Sign In'}</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            {requires2fa ? 'Step 2 of 2' : 'Tenant Isolated'}
          </span>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5"
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
              className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 1: Email & Password Form */}
        {!requires2fa ? (
          <form onSubmit={handlePrimaryLogin} className="space-y-4">
            {/* Quick Preset Selector */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setEmail('');
                  setPassword('');
                }}
                className="flex-1 py-1.5 px-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition cursor-pointer text-center truncate"
              >
                🏫 Institute Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@dprtuition.com');
                  setPassword('Admin@12345');
                }}
                className="flex-1 py-1.5 px-2 rounded-lg bg-gradient-to-r from-rose-500/20 to-pink-500/20 border border-rose-500/40 text-rose-300 hover:text-white hover:bg-rose-500/30 transition cursor-pointer flex items-center justify-center gap-1 truncate"
              >
                <span>👑 Master Admin</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourinstitute.com"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition"
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
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: 2FA TOTP Form */
          <form onSubmit={handle2faVerify} className="space-y-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Two-Factor Authentication is active for {email}.</span>
            </div>

            {!useRecoveryCode ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  6-Digit Authenticator Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  required
                  autoFocus
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 bg-slate-800/80 border border-indigo-500/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                  Open Google Authenticator or Microsoft Authenticator app.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Emergency Recovery Code
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  placeholder="XXXX-XXXX"
                  required
                  autoFocus
                  className="w-full text-center font-mono py-2.5 bg-slate-800/80 border border-indigo-500/50 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify & Proceed</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setUseRecoveryCode(!useRecoveryCode)}
                className="text-slate-400 hover:text-indigo-400 transition underline underline-offset-2"
              >
                {useRecoveryCode ? 'Use 6-Digit TOTP Code' : 'Use Backup Recovery Code'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRequires2fa(false);
                  setTotpCode('');
                  setRecoveryCode('');
                }}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                Back
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-slate-400">
          Need a new workspace?{' '}
          <Link
            href="/register"
            className="font-semibold text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4"
          >
            Register Your Institute
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <span>Loading...</span>
          </div>
        }
      >
        <div className="flex justify-center">
          <LoginForm />
        </div>
      </Suspense>
    </div>
  );
}

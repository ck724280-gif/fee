'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Building2,
  CreditCard,
  Users,
  ScrollText,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
  KeyRound,
  QrCode,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/super-admin', label: 'Platform Overview', icon: LayoutDashboard },
  { href: '/super-admin/organizations', label: 'Organizations', icon: Building2 },
  { href: '/super-admin/subscriptions', label: 'Subscriptions & Billing', icon: CreditCard },
  { href: '/super-admin/users', label: 'Platform Users', icon: Users },
  { href: '/super-admin/audit-logs', label: 'Security & Audit Logs', icon: ScrollText },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  // 2FA Modal States
  const [twoFaModalOpen, setTwoFaModalOpen] = useState(false);
  const [twoFaStatus, setTwoFaStatus] = useState<boolean>(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [totpCode, setTotpCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalStep, setModalStep] = useState<'STATUS' | 'SETUP' | 'RECOVERY'>('STATUS');
  const [twoFaError, setTwoFaError] = useState('');
  const [twoFaSuccess, setTwoFaSuccess] = useState('');
  const [copiedCodes, setCopiedCodes] = useState(false);

  // If on the login page itself, render ONLY the login page with no Super Admin sidebar or headers
  if (pathname === '/super-admin/login') {
    return <>{children}</>;
  }

  const loadAdminProfile = () => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          if (!data.user.isSuperAdmin) {
            router.push('/super-admin/login');
          } else {
            setAdminUser(data.user);
            setTwoFaStatus(!!data.user.twoFactorEnabled);
          }
        } else {
          router.push('/super-admin/login');
        }
      })
      .catch(() => {
        router.push('/super-admin/login');
      });
  };

  useEffect(() => {
    loadAdminProfile();
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/super-admin/login';
  };

  // 2FA Handlers
  const handleOpen2FaModal = () => {
    setTwoFaError('');
    setTwoFaSuccess('');
    setTotpCode('');
    setConfirmPassword('');
    setModalStep('STATUS');
    setTwoFaModalOpen(true);
  };

  const handleStart2FaSetup = async () => {
    setTwoFaLoading(true);
    setTwoFaError('');
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize 2FA setup');

      setQrCodeUrl(data.qrCodeDataUrl);
      setSecretKey(data.secret);
      setRecoveryCodes(data.recoveryCodes || []);
      setModalStep('SETUP');
    } catch (err: any) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleConfirm2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.trim().length !== 6) {
      setTwoFaError('Please enter the 6-digit code from Google Authenticator.');
      return;
    }

    setTwoFaLoading(true);
    setTwoFaError('');

    try {
      const res = await fetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totpCode: totpCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid verification code. Please try again.');

      setTwoFaStatus(true);
      setModalStep('RECOVERY');
      setTwoFaSuccess('Two-Factor Authentication (2FA) is now active on your Master Super Admin account!');
      loadAdminProfile();
    } catch (err: any) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisable2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPassword) {
      setTwoFaError('Please enter your current password to disable 2FA.');
      return;
    }

    setTwoFaLoading(true);
    setTwoFaError('');

    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');

      setTwoFaStatus(false);
      setTwoFaSuccess('Two-Factor Authentication has been disabled.');
      setTwoFaModalOpen(false);
      loadAdminProfile();
    } catch (err: any) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col md:flex-row selection:bg-rose-500 selection:text-white">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white tracking-wide">SUPER ADMIN</div>
            <div className="text-[10px] text-rose-400">Platform Control</div>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`${
          mobileOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-slate-900/80 backdrop-blur-2xl border-r border-slate-800/80 flex flex-col shrink-0 z-40 md:sticky md:top-0 md:h-screen`}
      >
        {/* Brand Banner */}
        <div className="p-6 border-b border-slate-800/60 hidden md:block">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-xl shadow-rose-500/20 ring-2 ring-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-white tracking-wider flex items-center gap-1.5">
                <span>SUPER ADMIN</span>
                <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-mono font-bold">
                  MASTER
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">SaaS Platform Control</div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Management Consoles
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-lg shadow-rose-500/10'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-rose-400" />}
              </Link>
            );
          })}

          {/* Quick 2FA Security Setup in Sidebar */}
          <div className="pt-4 border-t border-slate-800/60 mt-4">
            <button
              onClick={handleOpen2FaModal}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                twoFaStatus
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>2-Step Verification</span>
              </div>
              <span className="text-[10px] font-mono uppercase font-black">
                {twoFaStatus ? 'ACTIVE' : 'SETUP'}
              </span>
            </button>
          </div>
        </nav>

        {/* Admin User Profile & Sign Out */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {adminUser?.name?.charAt(0) || 'A'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{adminUser?.name || 'Super Administrator'}</div>
                <div className="text-[10px] text-slate-400 truncate">{adminUser?.email || ''}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page Content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Top bar */}
        <div className="hidden md:flex items-center justify-between px-8 py-4 bg-slate-900/40 border-b border-slate-800/60 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Multi-Tenant Architecture Active</span>
            <span className="text-slate-600">•</span>
            <span>IDOR Protection Enforced</span>
            <span className="text-slate-600">•</span>
            <span>AES-256 TOTP 2FA Engine</span>
          </div>

          <div className="flex items-center gap-3">
            {/* 2FA Status Button in Top Bar */}
            <button
              onClick={handleOpen2FaModal}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                twoFaStatus
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{twoFaStatus ? '2FA Active' : 'Set Up 2-Step Verification'}</span>
            </button>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Super Admin Mode
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 flex-1">{children}</div>
      </main>

      {/* 2-Step Verification (2FA) Modal */}
      <AnimatePresence>
        {twoFaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 text-white font-bold text-base">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <span>Master Admin 2-Step Verification (2FA)</span>
                </div>
                <button
                  onClick={() => setTwoFaModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {twoFaError && (
                <div className="mt-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{twoFaError}</span>
                </div>
              )}

              {twoFaSuccess && (
                <div className="mt-4 p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{twoFaSuccess}</span>
                </div>
              )}

              {/* Step: STATUS */}
              {modalStep === 'STATUS' && (
                <div className="mt-5 space-y-4">
                  {twoFaStatus ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-white">Two-Factor Authentication is ENABLED</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Your Master Admin account requires a 6-digit TOTP code on every login.
                          </div>
                        </div>
                      </div>

                      <form onSubmit={handleDisable2Fa} className="p-4 bg-slate-800/60 border border-slate-700 rounded-2xl space-y-3">
                        <label className="block text-xs font-bold text-rose-300 uppercase">
                          Disable 2FA Protection (Enter Password)
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Your current master admin password"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                        />
                        <button
                          type="submit"
                          disabled={twoFaLoading}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                        >
                          {twoFaLoading ? 'Disabling 2FA...' : 'Disable 2-Step Verification'}
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                        <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-white">2FA is Not Yet Enabled</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            Protect your SaaS platform from unauthorized access by requiring Google Authenticator.
                          </div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                        <p>1. Scan the QR code using <strong>Google Authenticator, Microsoft Authenticator, or Authy</strong>.</p>
                        <p>2. Enter the 6-digit code to activate.</p>
                        <p>3. Save the 8 emergency backup recovery codes.</p>
                      </div>

                      <button
                        onClick={handleStart2FaSetup}
                        disabled={twoFaLoading}
                        className="w-full py-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-2xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        {twoFaLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <QrCode className="w-4 h-4" />
                            <span>Begin 2-Step Verification Setup</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step: SETUP (Scan QR & Verify) */}
              {modalStep === 'SETUP' && (
                <div className="mt-5 space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-slate-300">
                      Scan this QR code with <strong>Google Authenticator</strong> or enter the secret key manually:
                    </p>
                  </div>

                  {qrCodeUrl && (
                    <div className="flex justify-center p-3 bg-white rounded-2xl w-fit mx-auto shadow-xl">
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44" />
                    </div>
                  )}

                  {secretKey && (
                    <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-center">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold">Manual Entry Secret Key:</span>
                      <code className="text-xs font-mono font-bold text-rose-300 tracking-widest selection:bg-rose-500 selection:text-white">
                        {secretKey}
                      </code>
                    </div>
                  )}

                  <form onSubmit={handleConfirm2Fa} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                        Enter 6-Digit Code from App
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 123456"
                        className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setModalStep('STATUS')}
                        className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={twoFaLoading}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {twoFaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Verify &amp; Activate 2FA</span>}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Step: RECOVERY CODES */}
              {modalStep === 'RECOVERY' && (
                <div className="mt-5 space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-white">2FA Activated Successfully!</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Please save these emergency backup recovery codes in a secure place.
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Emergency Backup Codes</span>
                      <button
                        onClick={handleCopyRecoveryCodes}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedCodes ? 'Copied!' : 'Copy All'}</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {recoveryCodes.map((code, idx) => (
                        <div key={idx} className="p-1.5 bg-slate-900 rounded-lg text-center font-mono text-xs font-bold text-white border border-slate-800">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setTwoFaModalOpen(false)}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Done &amp; Close
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

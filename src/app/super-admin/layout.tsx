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
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Menu,
  X,
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

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          if (!data.user.isSuperAdmin) {
            router.push('/');
          } else {
            setAdminUser(data.user);
          }
        } else {
          router.push('/super-admin/login');
        }
      })
      .catch(() => {
        router.push('/super-admin/login');
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
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
          className="p-2 rounded-lg bg-slate-800 text-slate-300"
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

          <div className="pt-4 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Actions
          </div>
          <Link
            href="/"
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 transition duration-200"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="w-4 h-4 text-indigo-400" />
              <span>Enter Org Dashboard</span>
            </div>
          </Link>
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
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Super Admin Mode
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}

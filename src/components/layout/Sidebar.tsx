'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CreditCard,
  Receipt,
  WalletCards,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Camera,
} from 'lucide-react';

export const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, accentColor: 'text-blue-400', badgeColor: 'bg-blue-500' },
  { name: 'Students', href: '/students', icon: Users, accentColor: 'text-cyan-400', badgeColor: 'bg-cyan-500' },
  { name: 'Classes', href: '/classes', icon: GraduationCap, accentColor: 'text-violet-400', badgeColor: 'bg-violet-500' },
  { name: 'Fee Records', href: '/fees', icon: CreditCard, accentColor: 'text-amber-400', badgeColor: 'bg-amber-500' },
  { name: 'Payments', href: '/payments', icon: Receipt, accentColor: 'text-emerald-400', badgeColor: 'bg-emerald-500' },
  { name: 'Expenditure', href: '/expenses', icon: WalletCards, accentColor: 'text-rose-400', badgeColor: 'bg-rose-500' },
  { name: 'Reports', href: '/reports', icon: BarChart3, accentColor: 'text-indigo-400', badgeColor: 'bg-indigo-500' },
  { name: 'Settings', href: '/settings', icon: Settings, accentColor: 'text-slate-400', badgeColor: 'bg-slate-500' },
];

export function Sidebar() {
  const pathname = usePathname();
  const [instituteName, setInstituteName] = useState('DPR Tuition');
  const [tagline, setTagline] = useState('Enterprise Financial Hub');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.instituteName) setInstituteName(json.data.instituteName);
          if (json.data.tagline) setTagline(json.data.tagline);
          setLogoUrl(json.data.logoUrl || null);
        }
      } catch (e) {
        // Fallback to defaults
      }
    };

    fetchSettings();

    const handleSettingsUpdate = (e: any) => {
      const data = e.detail;
      if (data) {
        if (data.instituteName) setInstituteName(data.instituteName);
        if (data.tagline) setTagline(data.tagline);
        setLogoUrl(data.logoUrl || null);
      } else {
        fetchSettings();
      }
    };

    window.addEventListener('institute-settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('institute-settings-updated', handleSettingsUpdate);
    };
  }, []);

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-950/95 backdrop-blur-2xl border-r border-slate-800/80 text-slate-300 min-h-screen shrink-0 select-none relative overflow-hidden sidebar-dot-pattern">
      {/* 3D Multi-Layer Ambient Glow Orbs in Sidebar */}
      <div className="absolute top-0 -left-16 w-52 h-52 bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-16 -right-16 w-52 h-52 bg-gradient-to-tl from-emerald-600/20 via-cyan-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header with Animated Multi-Tone Gradient Logo / Custom Uploaded Logo */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between relative z-10">
        <Link
          href="/settings"
          title="Click to customize Logo & Institute Branding"
          className="flex items-center gap-3 min-w-0 group/brand"
        >
          <motion.div
            whileHover={{ scale: 1.08, rotate: 3 }}
            whileTap={{ scale: 0.94 }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/30 flex items-center justify-center cursor-pointer shrink-0 relative overflow-hidden ring-1 ring-white/20"
          >
            {logoUrl && logoUrl.trim().length > 0 ? (
              <img
                src={logoUrl}
                alt="Institute Logo"
                className="w-full h-full object-cover rounded-[14px]"
              />
            ) : (
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-300 font-black">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
            )}
            {/* Quick hover indicator to change logo */}
            <div className="absolute inset-0 bg-black/60 rounded-[14px] opacity-0 group-hover/brand:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </motion.div>

          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-base text-white tracking-tight flex items-center gap-1.5 truncate group-hover/brand:text-blue-300 transition-colors">
              <span className="truncate">{instituteName}</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse shrink-0" />
            </span>
            <span className="text-[11px] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 font-semibold tracking-wide truncate">
              {tagline}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links with Stagger & Spring Physics */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto relative z-10">
        {navigationItems.map((item, idx) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.035, duration: 0.3 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group min-h-[44px]',
                  isActive
                    ? 'text-white font-bold shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70'
                )}
              >
                {/* Active Indicator Background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-xl -z-10 shadow-lg shadow-indigo-500/30"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                    isActive ? 'text-white' : item.accentColor
                  )}
                />
                <span className="truncate">{item.name}</span>

                {/* Status Dot / Active Pill */}
                {isActive ? (
                  <span className="ml-auto w-2 h-2 rounded-full bg-white shadow-md shadow-white/80" />
                ) : (
                  <span className={cn('ml-auto w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity', item.badgeColor)} />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Admin User Footer with Glassmorphic Card */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/80 relative z-10">
        <div className="p-2.5 rounded-2xl bg-gradient-to-r from-slate-900/90 to-slate-950/90 border border-slate-800/80 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md shadow-cyan-500/20 ring-2 ring-cyan-400/30">
              AD
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">DPR Admin</span>
              <span className="text-[10px] text-slate-400 truncate">admin@dprtuition.com</span>
            </div>
          </div>
          <button
            onClick={() => {
              window.location.href = '/api/auth/logout';
            }}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

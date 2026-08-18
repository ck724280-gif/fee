'use client';

import React from 'react';
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
} from 'lucide-react';

export const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Classes', href: '/classes', icon: GraduationCap },
  { name: 'Fee Records', href: '/fees', icon: CreditCard },
  { name: 'Payments', href: '/payments', icon: Receipt },
  { name: 'Expenditure', href: '/expenses', icon: WalletCards },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-950/95 backdrop-blur-2xl border-r border-slate-800/80 text-slate-300 min-h-screen shrink-0 select-none relative overflow-hidden sidebar-dot-pattern">
      {/* Subtle Sidebar Ambient Glow */}
      <div className="absolute top-0 -left-20 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-20 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header with Animated Gradient */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3 relative z-10">
        <motion.div
          whileHover={{ scale: 1.08, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 font-bold text-lg shrink-0 cursor-pointer"
        >
          <Sparkles className="w-5 h-5" />
        </motion.div>
        <div className="flex flex-col min-w-0">
          <span className="font-extrabold text-base text-white tracking-tight flex items-center gap-1.5">
            DPR Tuition
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="text-[11px] text-blue-400 font-medium tracking-wide">
            Enterprise Financial Hub
          </span>
        </div>
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
              transition={{ delay: idx * 0.04, duration: 0.3 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group min-h-[44px]',
                  isActive
                    ? 'text-white font-semibold shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                )}
              >
                {/* Active Indicator Background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebarActivePill"
                    className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl -z-10 shadow-md shadow-blue-600/30"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}

                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110',
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                  )}
                />
                <span className="truncate">{item.name}</span>

                {/* Subtle right active dot */}
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Admin User Footer with Glassmorphic Card */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/60 relative z-10">
        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/60 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/20">
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

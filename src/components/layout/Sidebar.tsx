'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  BookOpen,
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
    <aside className="hidden lg:flex lg:flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/30 font-bold text-lg shrink-0">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-base text-white truncate tracking-tight">
            DPR Tuition
          </span>
          <span className="text-[11px] text-blue-400 font-medium truncate">
            Fee Management System
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group min-h-[44px]',
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              )}
            >
              <Icon
                className={cn(
                  'w-5 h-5 shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Admin User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
            AD
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-white truncate">DPR Admin</span>
            <span className="text-[11px] text-slate-400 truncate">admin@dprtuition.com</span>
          </div>
        </div>
        <button
          onClick={() => {
            window.location.href = '/api/auth/logout';
          }}
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

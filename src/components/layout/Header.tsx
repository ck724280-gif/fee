'use client';

import React, { useState, useEffect } from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import { Menu, Clock, Calendar, ShieldCheck } from 'lucide-react';

export interface HeaderProps {
  onOpenMobileNav: () => void;
}

export function Header({ onOpenMobileNav }: HeaderProps) {
  const [time, setTime] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between no-print shadow-xs transition-all">
      {/* Left section: mobile hamburger & breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobileNav}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <Breadcrumbs />
        </div>
      </div>

      {/* Right section: Real-time Live Clock & Financial System Health Badge */}
      <div className="flex items-center gap-3">
        {/* System Online Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ledger Active</span>
        </div>

        {/* Real-time Date & Clock */}
        {time && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-700 font-medium">
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-500 border-r border-slate-200 pr-2">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              {dateStr}
            </span>
            <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-900">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              {time}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

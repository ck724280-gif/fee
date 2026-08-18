'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navigationItems } from './Sidebar';
import { BookOpen, X, LogOut, Sparkles } from 'lucide-react';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const [instituteName, setInstituteName] = useState('DPR Tuition');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.instituteName) setInstituteName(json.data.instituteName);
          setLogoUrl(json.data.logoUrl || null);
        }
      } catch (e) {}
    };

    fetchSettings();

    const handleSettingsUpdate = (e: any) => {
      const data = e.detail;
      if (data) {
        if (data.instituteName) setInstituteName(data.instituteName);
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

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname]);

  // Handle Escape key & body overflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-300">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/settings" onClick={onClose} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-pink-500 p-0.5 flex items-center justify-center text-white font-bold text-base shadow-md shadow-blue-600/30 overflow-hidden shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover rounded-[10px]" />
              ) : (
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-300">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-white truncate">{instituteName}</span>
              <span className="text-[10px] text-blue-400 font-medium">Fee Management</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links */}
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
                  'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all min-h-[44px]',
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )}
              >
                <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-slate-400')} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center font-bold text-xs">
              AD
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">DPR Admin</span>
              <span className="text-[10px] text-slate-400 truncate">admin@dprtuition.com</span>
            </div>
          </div>
          <button
            onClick={() => {
              window.location.href = '/api/auth/logout';
            }}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

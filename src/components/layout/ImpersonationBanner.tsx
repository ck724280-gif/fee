'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowRight, Loader2, LogOut } from 'lucide-react';

export function ImpersonationBanner() {
  const router = useRouter();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user?.isImpersonating) {
          setIsImpersonating(true);
          setOrgName(data.currentOrganization?.name || 'Institution');
        } else {
          setIsImpersonating(false);
        }
      })
      .catch(() => {});
  }, []);

  const handleExitSupportMode = async () => {
    setExiting(true);
    try {
      const res = await fetch('/api/super-admin/impersonate', { method: 'DELETE' });
      const json = await res.json();
      window.location.href = json.redirectUrl || '/super-admin/organizations';
    } catch {
      window.location.href = '/super-admin/organizations';
    }
  };

  if (!isImpersonating) return null;

  return (
    <div className="bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 text-white px-4 py-2 text-xs font-bold shadow-xl flex items-center justify-between z-50 sticky top-0 border-b border-rose-400/30 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-200 animate-pulse" />
        <span>
          <strong>MASTER ADMIN SUPPORT SESSION:</strong> You are actively accessing{' '}
          <span className="underline underline-offset-2 decoration-white font-extrabold">"{orgName}"</span>.
        </span>
      </div>

      <button
        onClick={handleExitSupportMode}
        disabled={exiting}
        className="px-3 py-1 bg-slate-950/80 hover:bg-slate-950 text-white text-[11px] font-black rounded-lg border border-white/20 transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
      >
        {exiting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            <LogOut className="w-3.5 h-3.5 text-amber-300" />
            <span>Exit Support Mode &amp; Return to Master Admin</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </div>
  );
}

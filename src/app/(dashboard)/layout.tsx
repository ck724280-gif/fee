'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Header } from '@/components/layout/Header';
import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col relative overflow-x-hidden w-full max-w-full">
      {/* Impersonation Banner for Master Admin */}
      <ImpersonationBanner />

      <div className="flex-1 flex flex-row relative overflow-x-hidden w-full max-w-full">
        {/* 3D Multi-Tone Ambient Light Spheres */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 select-none">
          <div className="aurora-glow-1 -top-24 left-[15%]" />
          <div className="aurora-glow-2 top-[32%] right-[-10%]" />
          <div className="aurora-glow-3 top-[65%] left-[25%]" />
          <div className="aurora-glow-4 -bottom-20 right-[15%]" />
        </div>

        {/* Desktop Navigation Sidebar */}
        <Sidebar />

        {/* Mobile Collapsible Navigation Drawer */}
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

        {/* Main App Container */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10 w-full overflow-x-hidden">
          <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

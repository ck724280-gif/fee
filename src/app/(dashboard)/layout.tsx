'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50/90 flex flex-row relative overflow-x-hidden">
      {/* Subtle Aurora Ambient Light Spheres (CSS Only) */}
      <div className="aurora-glow-1 top-[-100px] left-[200px]" />
      <div className="aurora-glow-2 top-[300px] right-[-100px]" />

      {/* Desktop Navigation Sidebar */}
      <Sidebar />

      {/* Mobile Collapsible Navigation Drawer */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative z-10">
        <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

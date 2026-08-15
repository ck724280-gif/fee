'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeNameMap: Record<string, string> = {
  students: 'Students',
  classes: 'Classes',
  fees: 'Fee Records',
  payments: 'Payments',
  reports: 'Reports & Analytics',
  settings: 'Institute Settings',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium select-none">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>Dashboard</span>
      </div>
    );
  }

  let accumulatedPath = '';

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium select-none overflow-x-auto py-1">
      <Link
        href="/"
        className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>

      {segments.map((seg, idx) => {
        accumulatedPath += `/${seg}`;
        const isLast = idx === segments.length - 1;
        const displayName = routeNameMap[seg] || (seg.length > 20 ? `${seg.substring(0, 8)}...` : seg);

        return (
          <React.Fragment key={accumulatedPath}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 truncate max-w-[150px] sm:max-w-[200px]">
                {displayName}
              </span>
            ) : (
              <Link
                href={accumulatedPath}
                className="text-slate-500 hover:text-slate-800 transition-colors truncate max-w-[120px]"
              >
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'danger'
    | 'purple'
    | 'gray'
    | 'PAID'
    | 'PARTIALLY_PAID'
    | 'DUE'
    | 'OVERDUE'
    | 'UPCOMING'
    | 'ACTIVE'
    | 'INACTIVE'
    | 'LEFT'
    | 'COMPLETED'
    | 'DEFAULT'
    | 'CUSTOM';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full select-none';

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variants: Record<string, string> = {
    default: 'bg-slate-100 text-slate-800 border border-slate-200',
    primary: 'bg-blue-50 text-blue-700 border border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    gray: 'bg-gray-100 text-gray-700 border border-gray-200',

    // Specific Fee Statuses
    PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border border-amber-200',
    DUE: 'bg-blue-50 text-blue-700 border border-blue-200',
    OVERDUE: 'bg-rose-50 text-rose-700 border border-rose-200',
    UPCOMING: 'bg-violet-50 text-violet-700 border border-violet-200',

    // Student / Class Statuses
    ACTIVE: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    INACTIVE: 'bg-gray-100 text-gray-600 border border-gray-200',
    LEFT: 'bg-amber-50 text-amber-700 border border-amber-200',
    COMPLETED: 'bg-blue-50 text-blue-700 border border-blue-200',

    // Fee Modes
    DEFAULT: 'bg-sky-50 text-sky-700 border border-sky-200',
    CUSTOM: 'bg-purple-50 text-purple-700 border border-purple-200',
  };

  return (
    <span className={cn(baseStyles, sizes[size], variants[variant] || variants.default, className)} {...props}>
      {children}
    </span>
  );
}

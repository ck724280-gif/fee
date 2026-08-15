import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: React.ReactNode;
}

export function Alert({ variant = 'info', title, children, className, ...props }: AlertProps) {
  const configs = {
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />,
      titleColor: 'text-blue-900',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />,
      titleColor: 'text-amber-900',
    },
    danger: {
      container: 'bg-red-50 border-red-200 text-red-900',
      icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />,
      titleColor: 'text-red-900',
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />,
      titleColor: 'text-emerald-900',
    },
  };

  const current = configs[variant];

  return (
    <div
      className={cn('rounded-xl border p-4 flex items-start gap-3 shadow-xs', current.container, className)}
      role="alert"
      {...props}
    >
      {current.icon}
      <div className="flex-1 text-sm">
        {title && <h4 className={cn('font-semibold mb-0.5', current.titleColor)}>{title}</h4>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
    </div>
  );
}

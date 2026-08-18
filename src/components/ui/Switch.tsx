'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'emerald' | 'blue' | 'indigo';
  label?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  id?: string;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  color = 'emerald',
  label,
  description,
  className,
  id,
}: SwitchProps) {
  const toggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const sizeClasses = {
    sm: {
      track: 'w-8 h-4.5',
      knob: 'w-3.5 h-3.5',
      translateX: 14,
    },
    md: {
      track: 'w-11 h-6',
      knob: 'w-5 h-5',
      translateX: 20,
    },
    lg: {
      track: 'w-14 h-7.5',
      knob: 'w-6 h-6',
      translateX: 26,
    },
  };

  const colorClasses = {
    emerald: 'bg-emerald-600 focus:ring-emerald-500/30',
    blue: 'bg-blue-600 focus:ring-blue-500/30',
    indigo: 'bg-indigo-600 focus:ring-indigo-500/30',
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggle();
          }
        }}
        className={cn(
          'relative inline-flex items-center shrink-0 p-0.5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-4 cursor-pointer',
          currentSize.track,
          checked ? colorClasses[color] : 'bg-slate-300',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          animate={{ x: checked ? currentSize.translateX : 0 }}
          className={cn(
            'inline-block rounded-full bg-white shadow-md pointer-events-none ring-0',
            currentSize.knob
          )}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col cursor-pointer" onClick={toggle}>
          {label && <span className="text-xs font-bold text-slate-800">{label}</span>}
          {description && <span className="text-[11px] text-slate-500">{description}</span>}
        </div>
      )}
    </div>
  );
}

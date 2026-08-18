'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/utils';
import {
  Users,
  UserCheck,
  Coins,
  TrendingUp,
  Clock,
  AlertTriangle,
  Receipt,
  UserPlus,
  ArrowUpRight,
} from 'lucide-react';

export interface KPICardsProps {
  data: {
    totalStudents: number;
    activeStudents: number;
    todayCollection: number;
    monthlyCollection: number;
    pendingFees: number;
    overdueFees: number;
    partialCount: number;
    newAdmissions: number;
  };
}

// 3D Tilt Card with Framer Motion and Mouse Coordinate Physics
function TiltKPICard({
  card,
  index,
}: {
  card: {
    title: string;
    numericValue: number;
    isCurrency: boolean;
    subtitle: string;
    icon: any;
    gradient: string;
    borderGlow: string;
    iconBg: string;
    iconColor: string;
    sparklinePoints: string;
    trendLabel: string;
    trendColor: string;
  };
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [count, setCount] = useState(0);

  // Smooth Counter Animation on Mount
  useEffect(() => {
    let start = 0;
    const end = card.numericValue;
    if (end === 0) {
      setCount(0);
      return;
    }

    const duration = 1200; // ms
    const startTime = performance.now();

    const animateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(start + (end - start) * easeOut);
      setCount(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animateCount);
      } else {
        setCount(end);
      }
    };

    const animFrame = requestAnimationFrame(animateCount);
    return () => cancelAnimationFrame(animFrame);
  }, [card.numericValue]);

  // 3D Perspective Tilt calculations
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 9;
    const rotY = ((x - centerX) / centerX) * 9;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  const Icon = card.icon;
  const displayValue = card.isCurrency ? formatCurrency(count) : count.toLocaleString('en-IN');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
      className="perspective-1000"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
        }}
        className={`relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl border p-5 shadow-xs hover:shadow-xl transition-all group ${card.borderGlow}`}
      >
        {/* Top Accent Gradient Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`} />

        {/* Ambient Card Radial Glow on Hover */}
        <div
          className={`absolute -right-10 -top-10 w-32 h-32 rounded-full opacity-0 group-hover:opacity-20 blur-2xl transition-opacity pointer-events-none bg-gradient-to-br ${card.gradient}`}
        />

        {/* Card Header: Title & Icon */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              {card.title}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 tracking-tight truncate font-mono">
              {displayValue}
            </div>
          </div>

          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${card.iconBg} ${card.iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {/* Mini Sparkline + Subtitle Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100/90 flex items-center justify-between gap-2 relative z-10">
          <span className="text-xs text-slate-500 font-medium truncate">
            {card.subtitle}
          </span>

          {/* Sparkline Visual */}
          <div className="flex items-center gap-1 shrink-0">
            <svg className="w-16 h-5 overflow-visible" viewBox="0 0 60 20">
              <path
                d={card.sparklinePoints}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={card.iconColor}
              />
            </svg>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${card.trendColor}`}>
              {card.trendLabel}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function KPICards({ data }: KPICardsProps) {
  const cards = [
    {
      title: 'Total Students',
      numericValue: data.totalStudents,
      isCurrency: false,
      subtitle: `${data.activeStudents} active enrolled`,
      icon: Users,
      gradient: 'from-blue-600 to-cyan-500',
      borderGlow: 'border-slate-200/80 hover:border-blue-300 hover:shadow-blue-500/10',
      iconBg: 'bg-blue-500/10 border border-blue-200/60',
      iconColor: 'text-blue-600',
      sparklinePoints: 'M0,15 L15,10 L30,12 L45,5 L60,8',
      trendLabel: 'Active',
      trendColor: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Active Ratio',
      numericValue: data.totalStudents > 0 ? Math.round((data.activeStudents / data.totalStudents) * 100) : 100,
      isCurrency: false,
      subtitle: `${data.activeStudents} of ${data.totalStudents} enrolled`,
      icon: UserCheck,
      gradient: 'from-emerald-600 to-teal-400',
      borderGlow: 'border-slate-200/80 hover:border-emerald-300 hover:shadow-emerald-500/10',
      iconBg: 'bg-emerald-500/10 border border-emerald-200/60',
      iconColor: 'text-emerald-600',
      sparklinePoints: 'M0,18 L15,14 L30,8 L45,6 L60,3',
      trendLabel: '% Rate',
      trendColor: 'bg-emerald-50 text-emerald-700',
    },
    {
      title: "Today's Collection",
      numericValue: data.todayCollection,
      isCurrency: true,
      subtitle: 'Cash & Digital receipts',
      icon: Coins,
      gradient: 'from-green-600 to-emerald-400',
      borderGlow: 'border-slate-200/80 hover:border-green-300 hover:shadow-green-500/10',
      iconBg: 'bg-green-500/10 border border-green-200/60',
      iconColor: 'text-green-600',
      sparklinePoints: 'M0,12 L15,16 L30,10 L45,4 L60,2',
      trendLabel: 'Today',
      trendColor: 'bg-green-50 text-green-700',
    },
    {
      title: 'Monthly Collection',
      numericValue: data.monthlyCollection,
      isCurrency: true,
      subtitle: 'Current calendar month',
      icon: TrendingUp,
      gradient: 'from-indigo-600 to-blue-500',
      borderGlow: 'border-slate-200/80 hover:border-indigo-300 hover:shadow-indigo-500/10',
      iconBg: 'bg-indigo-500/10 border border-indigo-200/60',
      iconColor: 'text-indigo-600',
      sparklinePoints: 'M0,16 L15,12 L30,14 L45,7 L60,3',
      trendLabel: 'Month',
      trendColor: 'bg-indigo-50 text-indigo-700',
    },
    {
      title: 'Pending Due Fees',
      numericValue: data.pendingFees,
      isCurrency: true,
      subtitle: 'Due in current cycle',
      icon: Clock,
      gradient: 'from-amber-500 to-orange-400',
      borderGlow: 'border-slate-200/80 hover:border-amber-300 hover:shadow-amber-500/10',
      iconBg: 'bg-amber-500/10 border border-amber-200/60',
      iconColor: 'text-amber-600',
      sparklinePoints: 'M0,8 L15,11 L30,9 L45,15 L60,14',
      trendLabel: 'Due',
      trendColor: 'bg-amber-50 text-amber-700',
    },
    {
      title: 'Overdue Arrears',
      numericValue: data.overdueFees,
      isCurrency: true,
      subtitle: 'Past due date balances',
      icon: AlertTriangle,
      gradient: 'from-rose-600 to-red-400',
      borderGlow: 'border-slate-200/80 hover:border-rose-300 hover:shadow-rose-500/10',
      iconBg: 'bg-rose-500/10 border border-rose-200/60',
      iconColor: 'text-rose-600',
      sparklinePoints: 'M0,5 L15,8 L30,6 L45,14 L60,18',
      trendLabel: 'Arrears',
      trendColor: 'bg-rose-50 text-rose-700',
    },
    {
      title: 'Partial Accounts',
      numericValue: data.partialCount,
      isCurrency: false,
      subtitle: 'Paying in installments',
      icon: Receipt,
      gradient: 'from-violet-600 to-purple-400',
      borderGlow: 'border-slate-200/80 hover:border-violet-300 hover:shadow-violet-500/10',
      iconBg: 'bg-violet-500/10 border border-violet-200/60',
      iconColor: 'text-violet-600',
      sparklinePoints: 'M0,14 L15,10 L30,13 L45,8 L60,11',
      trendLabel: 'Installment',
      trendColor: 'bg-violet-50 text-violet-700',
    },
    {
      title: 'New Admissions',
      numericValue: data.newAdmissions,
      isCurrency: false,
      subtitle: 'Admitted this month',
      icon: UserPlus,
      gradient: 'from-teal-600 to-cyan-400',
      borderGlow: 'border-slate-200/80 hover:border-teal-300 hover:shadow-teal-500/10',
      iconBg: 'bg-teal-500/10 border border-teal-200/60',
      iconColor: 'text-teal-600',
      sparklinePoints: 'M0,18 L15,12 L30,15 L45,6 L60,2',
      trendLabel: 'Growth',
      trendColor: 'bg-teal-50 text-teal-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <TiltKPICard key={card.title} card={card} index={idx} />
      ))}
    </div>
  );
}

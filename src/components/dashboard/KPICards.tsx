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
    cardBorderHover: string;
    iconGradientBg: string;
    iconTextColor: string;
    trendLabel: string;
    trendBadge: string;
    glowLight: string;
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

    const rotX = -((y - centerY) / centerY) * 10;
    const rotY = ((x - centerX) / centerX) * 10;

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
      initial={{ opacity: 0, y: 22, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.045, duration: 0.45, type: 'spring', stiffness: 220, damping: 20 }}
      className="perspective-1000"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
          transition: 'transform 0.15s ease-out, box-shadow 0.3s ease, border-color 0.3s ease',
        }}
        className={`relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-2xl border border-white/90 p-5 shadow-xs hover:shadow-2xl transition-all group ${card.cardBorderHover}`}
      >
        {/* Top Accent Gradient Ribbon */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${card.gradient}`} />

        {/* Dynamic 3D Radial Glow Halo */}
        <div
          className={`absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-0 group-hover:opacity-30 blur-2xl transition-opacity duration-500 pointer-events-none ${card.glowLight}`}
        />

        {/* Card Header: Title & Colorful Icon */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-extrabold text-slate-500 tracking-wider uppercase">
              {card.title}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5 tracking-tight truncate font-mono">
              {displayValue}
            </div>
          </div>

          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${card.iconGradientBg} ${card.iconTextColor} transition-all duration-300 group-hover:scale-115 group-hover:rotate-6 ring-2 ring-white/80`}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>

        {/* Subtitle & Badge Footer (Without Sparkline Chart Line) */}
        <div className="mt-4 pt-3.5 border-t border-slate-100/90 flex items-center justify-between gap-2 relative z-10">
          <span className="text-xs text-slate-500 font-medium truncate">
            {card.subtitle}
          </span>

          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs shrink-0 ${card.trendBadge}`}>
            {card.trendLabel}
          </span>
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
      subtitle: `${data.activeStudents} actively enrolled`,
      icon: Users,
      gradient: 'from-blue-600 via-indigo-500 to-cyan-400',
      cardBorderHover: 'hover:border-blue-400 hover:shadow-blue-500/15',
      iconGradientBg: 'bg-gradient-to-tr from-blue-500 to-cyan-400 shadow-blue-500/30 text-white',
      iconTextColor: 'text-white',
      trendLabel: 'Enrollment',
      trendBadge: 'bg-blue-50 text-blue-700 border border-blue-200/80',
      glowLight: 'bg-blue-500',
    },
    {
      title: 'Active Ratio',
      numericValue: data.totalStudents > 0 ? Math.round((data.activeStudents / data.totalStudents) * 100) : 100,
      isCurrency: false,
      subtitle: `${data.activeStudents} of ${data.totalStudents} active`,
      icon: UserCheck,
      gradient: 'from-emerald-500 via-teal-500 to-green-400',
      cardBorderHover: 'hover:border-emerald-400 hover:shadow-emerald-500/15',
      iconGradientBg: 'bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/30 text-white',
      iconTextColor: 'text-white',
      trendLabel: '% Active',
      trendBadge: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
      glowLight: 'bg-emerald-500',
    },
    {
      title: "Today's Collection",
      numericValue: data.todayCollection,
      isCurrency: true,
      subtitle: 'Cash & Digital receipts',
      icon: Coins,
      gradient: 'from-green-600 via-emerald-500 to-lime-400',
      cardBorderHover: 'hover:border-green-400 hover:shadow-green-500/15',
      iconGradientBg: 'bg-gradient-to-tr from-green-500 to-emerald-400 shadow-green-500/30 text-white',
      iconTextColor: 'text-white',
      trendLabel: 'Today Inflow',
      trendBadge: 'bg-green-50 text-green-700 border border-green-200/80',
      glowLight: 'bg-green-500',
    },
    {
      title: 'Monthly Collection',
      numericValue: data.monthlyCollection,
      isCurrency: true,
      subtitle: 'Current calendar month',
      icon: TrendingUp,
      gradient: 'from-indigo-600 via-purple-600 to-pink-500',
      cardBorderHover: 'hover:border-indigo-400 hover:shadow-indigo-500/15',
      iconGradientBg: 'bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-indigo-500/30 text-white',
      iconTextColor: 'text-white',
      trendLabel: 'Month Trend',
      trendBadge: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80',
      glowLight: 'bg-indigo-500',
    },
    {
      title: 'Pending Due Fees',
      numericValue: data.pendingFees,
      isCurrency: true,
      subtitle: 'Due in current cycle',
      icon: Clock,
      gradient: 'from-amber-500 via-orange-500 to-yellow-400',
      cardBorderHover: 'hover:border-amber-400 hover:shadow-amber-500/15',
      iconGradientBg: 'bg-gradient-to-tr from-amber-500 to-orange-400 shadow-amber-500/30 text-white',
      iconTextColor: 'text-white',
      trendLabel: 'Pending Due',
      trendBadge: 'bg-amber-50 text-amber-700 border border-amber-200/80',
      glowLight: 'bg-amber-500',
    },
    {
      title: 'Overdue Arrears',
      numericValue: data.overdueFees,
      isCurrency: true,
      subtitle: 'Past due date balances',
      icon: AlertTriangle,
      gradient: 'from-rose-600 via-red-500 to-pink-600',
      cardBorderHover: 'hover:border-rose-400 hover:shadow-rose-500/15',
      iconGradientBg: 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/30 text-white',
      iconTextColor: 'text-white',
      trendLabel: 'Arrears Alert',
      trendBadge: 'bg-rose-50 text-rose-700 border border-rose-200/80',
      glowLight: 'bg-rose-500',
    },
    {
      title: 'Partial Accounts',
      numericValue: data.partialCount,
      isCurrency: false,
      subtitle: 'Paying in installments',
      icon: Receipt,
      gradient: 'from-purple-600 via-fuchsia-500 to-pink-500',
      cardBorderHover: 'hover:border-purple-400 hover:shadow-purple-500/15',
      iconGradientBg: 'bg-gradient-to-tr from-purple-600 to-fuchsia-500 shadow-purple-500/30 text-white',
      iconTextColor: 'text-white',
      trendLabel: 'Installments',
      trendBadge: 'bg-purple-50 text-purple-700 border border-purple-200/80',
      glowLight: 'bg-purple-500',
    },
    {
      title: 'New Admissions',
      numericValue: data.newAdmissions,
      isCurrency: false,
      subtitle: 'Admitted this month',
      icon: UserPlus,
      gradient: 'from-cyan-500 via-teal-500 to-blue-500',
      cardBorderHover: 'hover:border-cyan-400 hover:shadow-cyan-500/15',
      iconGradientBg: 'bg-gradient-to-tr from-cyan-500 to-teal-400 shadow-cyan-500/30 text-white',
      iconTextColor: 'text-white',
      trendLabel: 'New Intake',
      trendBadge: 'bg-cyan-50 text-cyan-700 border border-cyan-200/80',
      glowLight: 'bg-cyan-500',
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

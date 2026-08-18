'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { ClassDistributionItem } from '@/lib/dashboard-service';
import { GraduationCap } from 'lucide-react';

export interface ClassDistributionChartProps {
  data: ClassDistributionItem[];
}

const BAR_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
];

export function ClassDistributionChart({ data }: ClassDistributionChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeBarIndex, setActiveBarIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[280px] w-full bg-slate-50/50 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400">
        Loading Class Cohort Analytics...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] w-full flex flex-col items-center justify-center text-xs text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
          <GraduationCap className="w-6 h-6" />
        </div>
        <span>No class cohort distribution records found</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const students = payload.find((p: any) => p.dataKey === 'studentCount')?.value || 0;
      const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value || 0;

      return (
        <div className="bg-slate-950/95 backdrop-blur-2xl text-white text-xs p-4 rounded-2xl shadow-2xl border border-slate-700/80 ring-1 ring-white/10">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-cyan-300 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold text-slate-100 text-sm">{label} Cohort</span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <p className="flex justify-between gap-6">
              <span>Active Students:</span>
              <span className="font-mono font-black text-cyan-300">{students} Enrolled</span>
            </p>
            <p className="flex justify-between gap-6">
              <span>Class Revenue:</span>
              <span className="font-mono font-black text-emerald-300">
                {formatCurrency(revenue)}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <div className="w-full h-[265px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.8} />
            <XAxis
              dataKey="className"
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              name="Active Enrolled"
              dataKey="studentCount"
              radius={[8, 8, 0, 0]}
              maxBarSize={38}
              isAnimationActive={true}
              animationDuration={1000}
              onMouseEnter={(_, idx) => setActiveBarIndex(idx)}
              onMouseLeave={() => setActiveBarIndex(null)}
            >
              {data.map((_, index) => {
                const color = BAR_COLORS[index % BAR_COLORS.length];
                const isHovered = activeBarIndex === index;
                return (
                  <Cell
                    key={`cohort-cell-${index}`}
                    fill={color}
                    className="transition-all duration-300 cursor-pointer"
                    style={{
                      filter: isHovered ? `drop-shadow(0 0 10px ${color})` : 'none',
                      opacity: activeBarIndex !== null && !isHovered ? 0.6 : 1,
                    }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

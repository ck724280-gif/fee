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

const BAR_COLORS = ['#3b82f6', '#10b981', '#6366f1', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function ClassDistributionChart({ data }: ClassDistributionChartProps) {
  const [isMounted, setIsMounted] = useState(false);

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
        <div className="bg-slate-950/95 backdrop-blur-xl text-white text-xs p-3.5 rounded-xl shadow-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <span className="font-bold text-slate-100">{label}</span>
          </div>
          <div className="space-y-1 text-slate-300">
            <p className="flex justify-between gap-4">
              <span>Active Students:</span>
              <span className="font-mono font-bold text-cyan-400">{students} Enrolled</span>
            </p>
            <p className="flex justify-between gap-4">
              <span>Class Revenue:</span>
              <span className="font-mono font-bold text-emerald-400">
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
      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.7} />
            <XAxis
              dataKey="className"
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              name="Active Enrolled"
              dataKey="studentCount"
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
              isAnimationActive={true}
              animationDuration={1000}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cohort-cell-${index}`}
                  fill={BAR_COLORS[index % BAR_COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

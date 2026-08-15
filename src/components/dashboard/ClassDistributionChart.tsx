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
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { ClassDistributionItem } from '@/lib/dashboard-service';

export interface ClassDistributionChartProps {
  data: ClassDistributionItem[];
}

export function ClassDistributionChart({ data }: ClassDistributionChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[280px] w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
        Loading Class Distribution Chart...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] w-full flex items-center justify-center text-xs text-slate-400">
        No class distribution data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const students = payload.find((p: any) => p.dataKey === 'studentCount')?.value || 0;
      const revenue = payload.find((p: any) => p.dataKey === 'revenue')?.value || 0;

      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-800">
          <p className="font-semibold text-slate-300 mb-1">{label}</p>
          <p className="text-sky-400 flex justify-between gap-4">
            <span>Enrolled Students:</span>
            <span className="font-bold">{students}</span>
          </p>
          <p className="text-emerald-400 flex justify-between gap-4">
            <span>Total Revenue:</span>
            <span className="font-bold">{formatCurrency(revenue)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="className"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
          />
          <Bar
            name="Enrolled Students"
            dataKey="studentCount"
            fill="#0ea5e9"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

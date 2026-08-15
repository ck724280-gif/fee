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
import { MonthlyTrendItem } from '@/lib/dashboard-service';

export interface MonthlyTrendChartProps {
  data: MonthlyTrendItem[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[280px] w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
        Loading Monthly Collection Chart...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[280px] w-full flex items-center justify-center text-xs text-slate-400">
        No monthly collection data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const collection = payload.find((p: any) => p.dataKey === 'collection')?.value || 0;
      const billed = payload.find((p: any) => p.dataKey === 'billed')?.value || 0;

      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-800">
          <p className="font-semibold text-slate-300 mb-1">{label}</p>
          <p className="text-emerald-400 flex justify-between gap-4">
            <span>Collected:</span>
            <span className="font-bold">{formatCurrency(collection)}</span>
          </p>
          <p className="text-blue-400 flex justify-between gap-4">
            <span>Invoiced:</span>
            <span className="font-bold">{formatCurrency(billed)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
          />
          <Bar
            name="Collected"
            dataKey="collection"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
          <Bar
            name="Billed"
            dataKey="billed"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            maxBarSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

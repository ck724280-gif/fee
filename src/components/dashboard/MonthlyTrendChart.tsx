'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { MonthlyTrendItem } from '@/lib/dashboard-service';
import { TrendingUp, Sparkles } from 'lucide-react';

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
      <div className="h-[300px] w-full bg-slate-50/50 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400">
        Loading Financial Collection Chart...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-xs text-slate-400">
        No monthly collection trend records found
      </div>
    );
  }

  // Calculate Collection Efficiency percentage for the most recent month
  const lastMonth = data[data.length - 1];
  const efficiency =
    lastMonth && lastMonth.billed > 0
      ? Math.min(100, Math.round((lastMonth.collection / lastMonth.billed) * 100))
      : 100;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const collection = payload.find((p: any) => p.dataKey === 'collection')?.value || 0;
      const billed = payload.find((p: any) => p.dataKey === 'billed')?.value || 0;
      const monthEff = billed > 0 ? Math.round((collection / billed) * 100) : 100;

      return (
        <div className="bg-slate-950/95 backdrop-blur-xl text-white text-xs p-3.5 rounded-xl shadow-2xl border border-slate-800">
          <p className="font-bold text-slate-200 mb-2 flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
              {monthEff}% Settle Rate
            </span>
          </p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-6 text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Collected:
              </span>
              <span className="font-mono font-bold">{formatCurrency(collection)}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-blue-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Invoiced:
              </span>
              <span className="font-mono font-bold">{formatCurrency(billed)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Chart Sub-Header KPI Indicator */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-600">
            12-Month Inflow &amp; Invoiced Velocity
          </span>
        </div>
        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold shadow-xs">
          <Sparkles className="w-3 h-3 text-emerald-600" />
          <span>Latest Month Efficiency: {efficiency}%</span>
        </div>
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.7} />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', fontWeight: 600 }}
            />

            <Area
              type="monotone"
              name="Collected Revenue"
              dataKey="collection"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCollected)"
              activeDot={{ r: 6, stroke: '#065f46', strokeWidth: 2, fill: '#10b981' }}
              isAnimationActive={true}
              animationDuration={1200}
            />

            <Area
              type="monotone"
              name="Total Billed"
              dataKey="billed"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorBilled)"
              activeDot={{ r: 5, stroke: '#1e40af', strokeWidth: 2, fill: '#3b82f6' }}
              isAnimationActive={true}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

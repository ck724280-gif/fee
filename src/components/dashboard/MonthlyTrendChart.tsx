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
import { TrendingUp, Sparkles, ArrowUpRight } from 'lucide-react';

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
      <div className="h-[300px] w-full flex items-center justify-center text-xs text-slate-400 font-medium">
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
        <div className="bg-slate-950/95 backdrop-blur-2xl text-white text-xs p-4 rounded-2xl shadow-2xl border border-slate-700/80 ring-1 ring-white/10">
          <p className="font-extrabold text-slate-100 mb-2.5 flex items-center justify-between gap-4 border-b border-slate-800 pb-2">
            <span>{label}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600/30 to-indigo-600/30 text-cyan-300 font-mono font-bold border border-cyan-400/30">
              {monthEff}% Settle Rate
            </span>
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-6 text-emerald-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
                Collected Revenue:
              </span>
              <span className="font-mono font-black text-sm text-emerald-300">{formatCurrency(collection)}</span>
            </div>
            <div className="flex items-center justify-between gap-6 text-cyan-400 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80" />
                Total Billed:
              </span>
              <span className="font-mono font-black text-sm text-cyan-300">{formatCurrency(billed)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Chart Sub-Header KPI Indicator with Multi-Color Badges */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800 block">
              12-Month Inflow &amp; Invoiced Trajectory
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Multi-variant collection ledger breakdown
            </span>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border border-emerald-300/80 text-xs font-black shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
          <span>Active Efficiency: {efficiency}%</span>
        </div>
      </div>

      <div className="w-full h-[285px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="60%" stopColor="#059669" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="60%" stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.8} />

            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
              axisLine={{ stroke: '#cbd5e1' }}
              tickLine={false}
            />

            <YAxis
              tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '14px', fontSize: '12px', fontWeight: 700 }}
            />

            <Area
              type="monotone"
              name="Collected Revenue"
              dataKey="collection"
              stroke="#10b981"
              strokeWidth={3.5}
              fillOpacity={1}
              fill="url(#colorCollected)"
              activeDot={{ r: 6.5, stroke: '#065f46', strokeWidth: 2.5, fill: '#34d399' }}
              isAnimationActive={true}
              animationDuration={1200}
            />

            <Area
              type="monotone"
              name="Total Invoiced"
              dataKey="billed"
              stroke="#3b82f6"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#colorBilled)"
              activeDot={{ r: 5.5, stroke: '#1e40af', strokeWidth: 2, fill: '#60a5fa' }}
              isAnimationActive={true}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

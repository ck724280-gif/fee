'use client';

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { FeeStatusDonutItem } from '@/lib/dashboard-service';
import { PieChart as PieIcon, Layers } from 'lucide-react';

export interface FeeStatusDonutChartProps {
  data: FeeStatusDonutItem[];
}

const STATUS_COLOR_MAP: Record<string, string> = {
  Paid: '#10b981',
  Partial: '#f59e0b',
  Due: '#3b82f6',
  Overdue: '#f43f5e',
  Upcoming: '#8b5cf6',
};

export function FeeStatusDonutChart({ data }: FeeStatusDonutChartProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[300px] w-full bg-slate-50/50 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400">
        Loading Fee Distribution...
      </div>
    );
  }

  const activeData = data
    .filter((d) => d.value > 0)
    .map((d) => ({
      ...d,
      color: STATUS_COLOR_MAP[d.name] || d.color,
    }));
  const totalCount = activeData.reduce((sum, item) => sum + item.value, 0);

  if (totalCount === 0) {
    return (
      <div className="h-[300px] w-full flex flex-col items-center justify-center text-xs text-slate-400">
        <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 mb-2 flex items-center justify-center text-slate-300">
          <PieIcon className="w-8 h-8 text-slate-300" />
        </div>
        <span>No active fee status distribution</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as FeeStatusDonutItem;
      const pct = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : '0';

      return (
        <div className="bg-slate-950/95 backdrop-blur-2xl text-white text-xs p-4 rounded-2xl shadow-2xl border border-slate-700/80 ring-1 ring-white/10">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
            <span
              className="w-3 h-3 rounded-full shadow-sm"
              style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }}
            />
            <span className="font-extrabold text-slate-100 text-sm">{item.name} Status</span>
          </div>
          <div className="space-y-1.5 text-slate-300">
            <p className="flex justify-between gap-6">
              <span>Record Count:</span>
              <span className="font-mono font-black text-white">
                {item.value} ({pct}%)
              </span>
            </p>
            {item.amount > 0 && (
              <p className="flex justify-between gap-6">
                <span>Total Value:</span>
                <span className="font-mono font-black text-emerald-300">
                  {formatCurrency(item.amount)}
                </span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full h-[230px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={activeData}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={94}
              paddingAngle={4}
              dataKey="value"
              isAnimationActive={true}
              animationDuration={1000}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {activeData.map((entry, index) => (
                <Cell
                  key={`donut-cell-${index}`}
                  fill={entry.color}
                  stroke={activeIndex === index ? '#ffffff' : 'transparent'}
                  strokeWidth={activeIndex === index ? 3.5 : 0}
                  className="transition-all duration-300 cursor-pointer"
                  style={{
                    filter: activeIndex === index ? `drop-shadow(0 0 8px ${entry.color})` : 'none',
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Ring Hub Metric */}
        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none p-3 rounded-full bg-white/70 backdrop-blur-md border border-white/90 shadow-sm">
          <span className="text-2xl font-black text-slate-900 tracking-tight font-mono block leading-none">
            {totalCount}
          </span>
          <span className="block text-[9px] uppercase font-extrabold tracking-wider text-slate-400 mt-1">
            Accounts
          </span>
        </div>
      </div>

      {/* Vibrant Color Category Pills */}
      <div className="grid grid-cols-2 gap-2 w-full mt-2 pt-3.5 border-t border-slate-100/90">
        {data.map((item) => {
          const color = STATUS_COLOR_MAP[item.name] || item.color;
          const pct = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(0) : '0';
          return (
            <div
              key={item.name}
              className="flex items-center justify-between p-2 rounded-xl bg-white/80 border border-slate-100 hover:border-slate-200 shadow-2xs hover:shadow-xs transition-all text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: color }}
                />
                <span className="font-bold text-slate-700 truncate text-[11px]">
                  {item.name}
                </span>
              </div>
              <span className="font-mono font-black text-slate-900 text-[11px] shrink-0">
                {item.value} <span className="text-slate-400 font-normal">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

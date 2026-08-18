'use client';

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { FeeStatusDonutItem } from '@/lib/dashboard-service';
import { PieChart as PieIcon } from 'lucide-react';

export interface FeeStatusDonutChartProps {
  data: FeeStatusDonutItem[];
}

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

  const activeData = data.filter((d) => d.value > 0);
  const totalCount = activeData.reduce((sum, item) => sum + item.value, 0);
  const totalAmount = activeData.reduce((sum, item) => sum + (item.amount || 0), 0);

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
        <div className="bg-slate-950/95 backdrop-blur-xl text-white text-xs p-3.5 rounded-xl shadow-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-bold text-slate-100">{item.name}</span>
          </div>
          <div className="space-y-1 text-slate-300">
            <p className="flex justify-between gap-4">
              <span>Count:</span>
              <span className="font-mono font-bold text-white">
                {item.value} ({pct}%)
              </span>
            </p>
            {item.amount > 0 && (
              <p className="flex justify-between gap-4">
                <span>Value:</span>
                <span className="font-mono font-bold text-emerald-400">
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
              outerRadius={92}
              paddingAngle={4}
              dataKey="value"
              isAnimationActive={true}
              animationDuration={1000}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {activeData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={activeIndex === index ? '#ffffff' : 'transparent'}
                  strokeWidth={activeIndex === index ? 3 : 0}
                  className="transition-all duration-300 cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Hub Metric */}
        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className="text-2xl font-black text-slate-900 tracking-tight font-mono">
            {totalCount}
          </span>
          <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Total Records
          </span>
        </div>
      </div>

      {/* Modern Custom Mini Legend Pills */}
      <div className="grid grid-cols-2 gap-2 w-full mt-2 pt-3 border-t border-slate-100">
        {data.map((item) => {
          const pct = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(0) : '0';
          return (
            <div
              key={item.name}
              className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100/80 transition-colors text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-700 truncate text-[11px]">
                  {item.name}
                </span>
              </div>
              <span className="font-bold text-slate-900 text-[11px] shrink-0 font-mono">
                {item.value} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

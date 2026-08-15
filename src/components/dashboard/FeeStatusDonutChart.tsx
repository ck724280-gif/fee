'use client';

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';
import { FeeStatusDonutItem } from '@/lib/dashboard-service';

export interface FeeStatusDonutChartProps {
  data: FeeStatusDonutItem[];
}

export function FeeStatusDonutChart({ data }: FeeStatusDonutChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[280px] w-full bg-slate-50 animate-pulse rounded-xl flex items-center justify-center text-xs text-slate-400">
        Loading Fee Status Chart...
      </div>
    );
  }

  const totalCount = data.reduce((sum, item) => sum + item.value, 0);

  if (totalCount === 0) {
    return (
      <div className="h-[280px] w-full flex flex-col items-center justify-center text-xs text-slate-400">
        <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-200 mb-2 flex items-center justify-center text-slate-300 font-bold">
          0
        </div>
        <span>No fee records found</span>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as FeeStatusDonutItem;
      const pct = totalCount > 0 ? ((item.value / totalCount) * 100).toFixed(1) : '0';

      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-lg shadow-xl border border-slate-800">
          <p className="font-semibold" style={{ color: item.color }}>
            {item.name}
          </p>
          <p className="text-slate-300 mt-0.5">
            Count: <span className="font-bold text-white">{item.value}</span> ({pct}%)
          </p>
          {item.amount > 0 && (
            <p className="text-slate-300">
              Amount: <span className="font-bold text-white">{formatCurrency(item.amount)}</span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[280px] relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data.filter((d) => d.value > 0)}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {data
              .filter((d) => d.value > 0)
              .map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <span className="text-xl font-bold text-slate-800">{totalCount}</span>
        <span className="block text-[10px] uppercase font-semibold text-slate-400">Records</span>
      </div>
    </div>
  );
}

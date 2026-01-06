"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCompactCurrency } from "@/lib/utils";

// Mock data for 13 weeks
const generateMockData = () => {
  const data = [];
  const baseDate = new Date();
  const baseBalance = 245000;
  
  for (let i = 0; i < 13; i++) {
    const weekDate = new Date(baseDate);
    weekDate.setDate(weekDate.getDate() + i * 7);
    
    // Simulate some variation
    const variation = Math.sin(i * 0.5) * 30000 + Math.random() * 20000 - 10000;
    const balance = Math.max(0, baseBalance + variation - i * 5000);
    
    data.push({
      week: `W${i + 1}`,
      date: weekDate.toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
      balance: Math.round(balance),
      receipts: Math.round(20000 + Math.random() * 15000),
      payments: Math.round(18000 + Math.random() * 12000),
    });
  }
  
  return data;
};

const data = generateMockData();

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-neutral-900 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCompactCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function CashFlowChart() {
  const minBalance = Math.min(...data.map((d) => d.balance));
  const lowCashThreshold = 50000; // Example threshold

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00c2b7" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00c2b7" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatCompactCurrency(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          {minBalance < lowCashThreshold && (
            <ReferenceLine
              y={lowCashThreshold}
              stroke="#f43f5e"
              strokeDasharray="5 5"
              label={{
                value: "Min threshold",
                position: "right",
                fill: "#f43f5e",
                fontSize: 11,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            name="Cash Balance"
            stroke="#00c2b7"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorBalance)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import React from "react";
import { formatCurrency, formatPercentage, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface VarianceItem {
  account: string;
  accountCode: string;
  forecast: number;
  actual: number;
  variance: number;
  variancePct: number;
  isFavorable: boolean;
}

// Mock data
const variances: VarianceItem[] = [
  {
    account: "Software & Subscriptions",
    accountCode: "6100",
    forecast: 5000,
    actual: 7200,
    variance: -2200,
    variancePct: -44,
    isFavorable: false,
  },
  {
    account: "Revenue - Services",
    accountCode: "4000",
    forecast: 75000,
    actual: 82500,
    variance: 7500,
    variancePct: 10,
    isFavorable: true,
  },
  {
    account: "Marketing & Advertising",
    accountCode: "6200",
    forecast: 8000,
    actual: 6500,
    variance: 1500,
    variancePct: 18.75,
    isFavorable: true,
  },
  {
    account: "Contractors",
    accountCode: "6050",
    forecast: 12000,
    actual: 14500,
    variance: -2500,
    variancePct: -20.83,
    isFavorable: false,
  },
  {
    account: "Office Supplies",
    accountCode: "6300",
    forecast: 1500,
    actual: 900,
    variance: 600,
    variancePct: 40,
    isFavorable: true,
  },
];

export function TopVariances() {
  return (
    <div className="space-y-3">
      {variances.map((item) => (
        <div
          key={item.accountCode}
          className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-neutral-400">{item.accountCode}</span>
              <span className="text-sm font-medium text-neutral-900">{item.account}</span>
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Forecast: {formatCurrency(item.forecast)} | Actual: {formatCurrency(item.actual)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div
                className={cn(
                  "text-sm font-semibold",
                  item.isFavorable ? "text-success-600" : "text-error-600"
                )}
              >
                {item.variance > 0 ? "+" : ""}
                {formatCurrency(item.variance)}
              </div>
              <div
                className={cn(
                  "text-xs",
                  item.isFavorable ? "text-success-500" : "text-error-500"
                )}
              >
                {formatPercentage(Math.abs(item.variancePct))}
              </div>
            </div>
            {item.isFavorable ? (
              <TrendingUp className="h-5 w-5 text-success-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-error-500" />
            )}
          </div>
        </div>
      ))}

      <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-2">
        View all variances →
      </button>
    </div>
  );
}

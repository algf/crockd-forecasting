"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { formatCompactCurrency, formatPercentage, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Receipt, BarChart3 } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  iconColor: string;
}

function StatCard({ title, value, change, changeLabel, icon: Icon, iconColor }: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-neutral-900">{value}</p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {isPositive && <TrendingUp className="h-4 w-4 text-success-600" />}
              {isNegative && <TrendingDown className="h-4 w-4 text-error-600" />}
              <span
                className={cn(
                  "text-sm font-medium",
                  isPositive && "text-success-600",
                  isNegative && "text-error-600",
                  !isPositive && !isNegative && "text-neutral-500"
                )}
              >
                {formatPercentage(Math.abs(change))}
              </span>
              {changeLabel && (
                <span className="text-sm text-neutral-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn("rounded-lg p-3", iconColor)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </Card>
  );
}

export function DashboardStats() {
  // TODO: Replace with real data from API
  const stats = [
    {
      title: "Cash Balance",
      value: formatCompactCurrency(245000),
      change: 5.2,
      changeLabel: "vs last month",
      icon: Wallet,
      iconColor: "bg-accent-500",
    },
    {
      title: "Monthly Revenue",
      value: formatCompactCurrency(82500),
      change: 12.3,
      changeLabel: "vs forecast",
      icon: DollarSign,
      iconColor: "bg-success-500",
    },
    {
      title: "Monthly Expenses",
      value: formatCompactCurrency(67200),
      change: -3.1,
      changeLabel: "vs forecast",
      icon: Receipt,
      iconColor: "bg-warning-500",
    },
    {
      title: "EBITDA",
      value: formatCompactCurrency(15300),
      change: 8.7,
      changeLabel: "margin",
      icon: BarChart3,
      iconColor: "bg-primary-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <StatCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}

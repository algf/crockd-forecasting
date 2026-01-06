"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  RefreshCw,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Clock,
  Calendar,
} from "lucide-react";

// Mock 13-week data
const generateWeeklyData = () => {
  const data = [];
  const baseDate = new Date();
  let runningBalance = 245000;

  for (let i = 0; i < 13; i++) {
    const weekStart = new Date(baseDate);
    weekStart.setDate(weekStart.getDate() + i * 7);

    const receipts = 15000 + Math.random() * 10000;
    const payments = -(8000 + Math.random() * 5000);
    const payroll = i % 2 === 0 ? -17500 : 0;
    const tax = i === 3 ? -12500 : 0;
    const netChange = receipts + payments + payroll + tax;

    const opening = runningBalance;
    runningBalance += netChange;

    data.push({
      week: `W${i + 1}`,
      weekStart,
      label: weekStart.toLocaleDateString("en-AU", { month: "short", day: "numeric" }),
      opening: Math.round(opening),
      receipts: Math.round(receipts),
      payments: Math.round(payments),
      payroll: Math.round(payroll),
      tax: Math.round(tax),
      closing: Math.round(runningBalance),
      netChange: Math.round(netChange),
    });
  }

  return data;
};

const weeklyData = generateWeeklyData();

// Find low point
const lowPoint = weeklyData.reduce(
  (min, week) => (week.closing < min.closing ? week : min),
  weeklyData[0]
);

// Stats
const openingBalance = weeklyData[0].opening;
const closingBalance = weeklyData[weeklyData.length - 1].closing;
const totalReceipts = weeklyData.reduce((sum, w) => sum + w.receipts, 0);
const totalPayments = weeklyData.reduce((sum, w) => sum + Math.abs(w.payments), 0);

export default function CashPage() {
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  const toggleWeek = (index: number) => {
    setExpandedWeek(expandedWeek === index ? null : index);
  };

  return (
    <PageContainer>
      <Header
        title="13-Week Cash Forecast"
        description="Weekly cash position based on AR/AP due dates and scheduled payments"
        actions={
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        }
      />
      <PageContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-accent-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Current Balance</p>
                  <p className="text-xl font-bold">{formatCurrency(openingBalance)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Expected Receipts</p>
                  <p className="text-xl font-bold text-success-600">
                    +{formatCurrency(totalReceipts)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-error-100 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-error-600" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Expected Payments</p>
                  <p className="text-xl font-bold text-error-600">
                    -{formatCurrency(totalPayments)}
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className={cn(
                "p-4",
                lowPoint.closing < 50000 && "border-warning-300 bg-warning-50"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "p-2 rounded-lg",
                    lowPoint.closing < 50000 ? "bg-warning-200" : "bg-neutral-100"
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "h-5 w-5",
                      lowPoint.closing < 50000 ? "text-warning-600" : "text-neutral-500"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Low Point ({lowPoint.week})</p>
                  <p
                    className={cn(
                      "text-xl font-bold",
                      lowPoint.closing < 50000 ? "text-warning-700" : "text-neutral-900"
                    )}
                  >
                    {formatCurrency(lowPoint.closing)}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Cash Flow Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Position</CardTitle>
              <CardDescription>Projected closing balance by week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00c2b7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00c2b7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(value as number)}
                      labelFormatter={(label) => `Week of ${label}`}
                    />
                    <ReferenceLine
                      y={50000}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                      label={{ value: "Min threshold", fill: "#f59e0b", fontSize: 11 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="closing"
                      name="Closing Balance"
                      stroke="#00c2b7"
                      strokeWidth={2}
                      fill="url(#cashGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Components */}
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Components</CardTitle>
              <CardDescription>Receipts and payments by week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Legend />
                    <Bar dataKey="receipts" name="Receipts" fill="#10b981" stackId="stack" />
                    <Bar dataKey="payments" name="Payments" fill="#f43f5e" stackId="stack" />
                    <Bar dataKey="payroll" name="Payroll" fill="#f59e0b" stackId="stack" />
                    <Bar dataKey="tax" name="Tax" fill="#6366f1" stackId="stack" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Detail Table */}
          <Card>
            <CardHeader>
              <CardTitle>Weekly Detail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th className="w-12"></th>
                    <th>Week</th>
                    <th className="text-right">Opening</th>
                    <th className="text-right">Receipts</th>
                    <th className="text-right">Payments</th>
                    <th className="text-right">Payroll</th>
                    <th className="text-right">Tax</th>
                    <th className="text-right">Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.map((week, index) => (
                    <React.Fragment key={week.week}>
                      <tr
                        className={cn(
                          "cursor-pointer hover:bg-neutral-50",
                          week.closing < 50000 && "bg-warning-50"
                        )}
                        onClick={() => toggleWeek(index)}
                      >
                        <td className="text-center">
                          {expandedWeek === index ? (
                            <ChevronDown className="h-4 w-4 text-neutral-400 inline" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-neutral-400 inline" />
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-neutral-400" />
                            <span className="font-medium">{week.week}</span>
                            <span className="text-neutral-500 text-sm">{week.label}</span>
                          </div>
                        </td>
                        <td className="numeric">{formatCurrency(week.opening)}</td>
                        <td className="numeric positive">+{formatCurrency(week.receipts)}</td>
                        <td className="numeric negative">{formatCurrency(week.payments)}</td>
                        <td className="numeric negative">
                          {week.payroll !== 0 ? formatCurrency(week.payroll) : "-"}
                        </td>
                        <td className="numeric negative">
                          {week.tax !== 0 ? formatCurrency(week.tax) : "-"}
                        </td>
                        <td
                          className={cn(
                            "numeric font-semibold",
                            week.closing < 50000 ? "text-warning-700" : "text-neutral-900"
                          )}
                        >
                          {formatCurrency(week.closing)}
                        </td>
                      </tr>
                      {expandedWeek === index && (
                        <tr className="bg-neutral-50">
                          <td colSpan={8} className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-success-500" />
                                  Expected Receipts
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span>Invoice #1234 - Acme Corp</span>
                                    <span className="text-success-600">
                                      +{formatCurrency(week.receipts * 0.6)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Invoice #1235 - Beta Inc</span>
                                    <span className="text-success-600">
                                      +{formatCurrency(week.receipts * 0.4)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                                  <TrendingDown className="h-4 w-4 text-error-500" />
                                  Expected Payments
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span>Bill #5001 - AWS</span>
                                    <span className="text-error-600">
                                      {formatCurrency(week.payments * 0.5)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Bill #5002 - Google Ads</span>
                                    <span className="text-error-600">
                                      {formatCurrency(week.payments * 0.5)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  );
}

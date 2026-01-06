"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatMonthYear, cn } from "@/lib/utils";
import { Download, RefreshCw, FileText, Landmark, TrendingUp } from "lucide-react";

// Generate mock months
const generateMonths = () => {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(date);
  }
  return months;
};

const months = generateMonths();

// Mock P&L data
const mockPLData = [
  {
    section: "Revenue",
    accounts: [
      { code: "4000", name: "Sales Revenue", values: Array(12).fill(0).map(() => 80000 + Math.random() * 10000) },
      { code: "4100", name: "Service Revenue", values: Array(12).fill(0).map(() => 40000 + Math.random() * 5000) },
    ],
  },
  {
    section: "Cost of Sales",
    accounts: [
      { code: "5000", name: "Cost of Goods Sold", values: Array(12).fill(0).map(() => -(35000 + Math.random() * 5000)) },
    ],
  },
  {
    section: "Operating Expenses",
    accounts: [
      { code: "6000", name: "Wages & Salaries", values: Array(12).fill(-35000) },
      { code: "6100", name: "Software & Subscriptions", values: Array(12).fill(-5000) },
      { code: "6200", name: "Marketing", values: Array(12).fill(0).map(() => -(6000 + Math.random() * 2000)) },
      { code: "6300", name: "Office Supplies", values: Array(12).fill(-900) },
      { code: "6400", name: "Professional Fees", values: Array(12).fill(-4500) },
    ],
  },
  {
    section: "Overheads",
    accounts: [
      { code: "7000", name: "Rent", values: Array(12).fill(-8000) },
      { code: "7100", name: "Utilities", values: Array(12).fill(-1200) },
    ],
  },
];

// Calculate totals
const calculateSectionTotal = (accounts: typeof mockPLData[0]["accounts"], monthIndex: number) => {
  return accounts.reduce((sum, account) => sum + account.values[monthIndex], 0);
};

export default function StatementsPage() {
  const [selectedScenario, setSelectedScenario] = useState("1");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsRefreshing(false);
  };

  // Calculate P&L summary
  const calculateGrossProfit = (monthIndex: number) => {
    const revenue = mockPLData.find((s) => s.section === "Revenue");
    const cos = mockPLData.find((s) => s.section === "Cost of Sales");
    return (
      (revenue ? calculateSectionTotal(revenue.accounts, monthIndex) : 0) +
      (cos ? calculateSectionTotal(cos.accounts, monthIndex) : 0)
    );
  };

  const calculateNetProfit = (monthIndex: number) => {
    return mockPLData.reduce(
      (sum, section) => sum + calculateSectionTotal(section.accounts, monthIndex),
      0
    );
  };

  return (
    <PageContainer>
      <Header
        title="Financial Statements"
        description="View forecast P&L, Balance Sheet, and Cashflow"
        actions={
          <div className="flex items-center gap-3">
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select scenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Base Case</SelectItem>
                <SelectItem value="2">Upside</SelectItem>
                <SelectItem value="3">Downside</SelectItem>
                <SelectItem value="compare">Compare All</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />
      <PageContent>
        <Tabs defaultValue="pl" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pl" className="gap-2">
              <FileText className="h-4 w-4" />
              Profit & Loss
            </TabsTrigger>
            <TabsTrigger value="bs" className="gap-2">
              <Landmark className="h-4 w-4" />
              Balance Sheet
            </TabsTrigger>
            <TabsTrigger value="cf" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Cashflow
            </TabsTrigger>
          </TabsList>

          {/* Profit & Loss */}
          <TabsContent value="pl">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Profit & Loss Statement</CardTitle>
                  <Badge variant="default">Rolling 12 Months</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="financial-table min-w-full">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-neutral-50 z-10 w-48">Account</th>
                      {months.map((month, i) => (
                        <th key={i} className="text-right w-28 whitespace-nowrap">
                          {formatMonthYear(month)}
                        </th>
                      ))}
                      <th className="text-right w-32 bg-primary-50">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockPLData.map((section) => (
                      <React.Fragment key={section.section}>
                        {/* Section Header */}
                        <tr className="bg-neutral-100">
                          <td
                            colSpan={months.length + 2}
                            className="font-semibold text-neutral-900 sticky left-0"
                          >
                            {section.section}
                          </td>
                        </tr>
                        {/* Section Accounts */}
                        {section.accounts.map((account) => (
                          <tr key={account.code} className="hover:bg-neutral-50">
                            <td className="sticky left-0 bg-white z-10">
                              <span className="text-neutral-400 text-xs mr-2">{account.code}</span>
                              {account.name}
                            </td>
                            {account.values.map((value, i) => (
                              <td
                                key={i}
                                className={cn(
                                  "numeric",
                                  value >= 0 ? "text-neutral-900" : "text-error-600"
                                )}
                              >
                                {formatCurrency(Math.abs(value))}
                              </td>
                            ))}
                            <td className="numeric font-medium bg-primary-50">
                              {formatCurrency(Math.abs(account.values.reduce((a, b) => a + b, 0)))}
                            </td>
                          </tr>
                        ))}
                        {/* Section Total */}
                        <tr className="border-t-2 border-neutral-200">
                          <td className="font-medium sticky left-0 bg-white z-10">
                            Total {section.section}
                          </td>
                          {months.map((_, i) => {
                            const total = calculateSectionTotal(section.accounts, i);
                            return (
                              <td
                                key={i}
                                className={cn(
                                  "numeric font-medium",
                                  total >= 0 ? "text-neutral-900" : "text-error-600"
                                )}
                              >
                                {formatCurrency(Math.abs(total))}
                              </td>
                            );
                          })}
                          <td className="numeric font-bold bg-primary-50">
                            {formatCurrency(
                              Math.abs(
                                section.accounts.reduce(
                                  (sum, acc) => sum + acc.values.reduce((a, b) => a + b, 0),
                                  0
                                )
                              )
                            )}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}

                    {/* Gross Profit */}
                    <tr className="bg-success-50 border-t-2 border-success-200">
                      <td className="font-bold text-success-800 sticky left-0 bg-success-50 z-10">
                        Gross Profit
                      </td>
                      {months.map((_, i) => (
                        <td key={i} className="numeric font-bold text-success-800">
                          {formatCurrency(calculateGrossProfit(i))}
                        </td>
                      ))}
                      <td className="numeric font-bold text-success-800 bg-success-100">
                        {formatCurrency(
                          months.reduce((sum, _, i) => sum + calculateGrossProfit(i), 0)
                        )}
                      </td>
                    </tr>

                    {/* Net Profit */}
                    <tr className="bg-primary-50 border-t-2 border-primary-200">
                      <td className="font-bold text-primary-800 sticky left-0 bg-primary-50 z-10">
                        Net Profit
                      </td>
                      {months.map((_, i) => {
                        const netProfit = calculateNetProfit(i);
                        return (
                          <td
                            key={i}
                            className={cn(
                              "numeric font-bold",
                              netProfit >= 0 ? "text-primary-800" : "text-error-600"
                            )}
                          >
                            {formatCurrency(netProfit)}
                          </td>
                        );
                      })}
                      <td className="numeric font-bold text-primary-900 bg-primary-100">
                        {formatCurrency(
                          months.reduce((sum, _, i) => sum + calculateNetProfit(i), 0)
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="bs">
            <Card>
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64 text-neutral-500">
                  <div className="text-center">
                    <Landmark className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                    <p>Balance Sheet forecast coming soon</p>
                    <p className="text-sm text-neutral-400 mt-1">
                      Configure AR/AP and asset accounts in assumptions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cashflow */}
          <TabsContent value="cf">
            <Card>
              <CardHeader>
                <CardTitle>Cashflow Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-64 text-neutral-500">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                    <p>Cashflow forecast coming soon</p>
                    <p className="text-sm text-neutral-400 mt-1">
                      Requires balance sheet and working capital setup
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageContainer>
  );
}

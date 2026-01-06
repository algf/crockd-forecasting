"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatPercentage, formatDate, cn } from "@/lib/utils";
import {
  Download,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ExternalLink,
  Filter,
} from "lucide-react";

interface VarianceItem {
  accountCode: string;
  accountName: string;
  accountType: string;
  forecast: number;
  actual: number;
  variance: number;
  variancePercent: number;
  isFavorable: boolean;
  suppliers?: SupplierItem[];
}

interface SupplierItem {
  name: string;
  actual: number;
  transactions: TransactionItem[];
}

interface TransactionItem {
  date: string;
  description: string;
  amount: number;
  reference?: string;
}

// Mock data
const mockVariances: VarianceItem[] = [
  {
    accountCode: "4000",
    accountName: "Sales Revenue",
    accountType: "REVENUE",
    forecast: 75000,
    actual: 82500,
    variance: 7500,
    variancePercent: 10,
    isFavorable: true,
    suppliers: [
      {
        name: "Acme Corp",
        actual: 45000,
        transactions: [
          { date: "2024-01-15", description: "Invoice #1234", amount: 25000, reference: "INV-1234" },
          { date: "2024-01-22", description: "Invoice #1238", amount: 20000, reference: "INV-1238" },
        ],
      },
      {
        name: "Beta Inc",
        actual: 37500,
        transactions: [
          { date: "2024-01-10", description: "Invoice #1232", amount: 37500, reference: "INV-1232" },
        ],
      },
    ],
  },
  {
    accountCode: "6100",
    accountName: "Software & Subscriptions",
    accountType: "EXPENSE",
    forecast: 5000,
    actual: 7200,
    variance: -2200,
    variancePercent: -44,
    isFavorable: false,
    suppliers: [
      {
        name: "AWS",
        actual: 3200,
        transactions: [
          { date: "2024-01-01", description: "January hosting", amount: 3200, reference: "AWS-0124" },
        ],
      },
      {
        name: "Slack",
        actual: 1500,
        transactions: [
          { date: "2024-01-05", description: "Monthly subscription", amount: 1500, reference: "SLACK-0124" },
        ],
      },
      {
        name: "HubSpot",
        actual: 2500,
        transactions: [
          { date: "2024-01-10", description: "CRM subscription", amount: 2500, reference: "HS-0124" },
        ],
      },
    ],
  },
  {
    accountCode: "6050",
    accountName: "Contractors",
    accountType: "EXPENSE",
    forecast: 12000,
    actual: 14500,
    variance: -2500,
    variancePercent: -20.83,
    isFavorable: false,
  },
  {
    accountCode: "6200",
    accountName: "Marketing & Advertising",
    accountType: "EXPENSE",
    forecast: 8000,
    actual: 6500,
    variance: 1500,
    variancePercent: 18.75,
    isFavorable: true,
  },
  {
    accountCode: "6300",
    accountName: "Office Supplies",
    accountType: "EXPENSE",
    forecast: 1500,
    actual: 900,
    variance: 600,
    variancePercent: 40,
    isFavorable: true,
  },
  {
    accountCode: "7000",
    accountName: "Rent",
    accountType: "OVERHEADS",
    forecast: 8000,
    actual: 8000,
    variance: 0,
    variancePercent: 0,
    isFavorable: true,
  },
];

const months = [
  { value: "2024-01", label: "January 2024" },
  { value: "2024-02", label: "February 2024" },
  { value: "2023-12", label: "December 2023" },
];

export default function VariancePage() {
  const [selectedMonth, setSelectedMonth] = useState("2024-01");
  const [selectedScenario, setSelectedScenario] = useState("1");
  const [drilldownItem, setDrilldownItem] = useState<VarianceItem | null>(null);
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);

  const handleDrilldown = (item: VarianceItem) => {
    setDrilldownItem(item);
    setIsDrilldownOpen(true);
  };

  // Calculate totals
  const totalForecast = mockVariances.reduce((sum, v) => sum + v.forecast, 0);
  const totalActual = mockVariances.reduce((sum, v) => sum + v.actual, 0);
  const totalVariance = totalActual - totalForecast;
  const unfavorableCount = mockVariances.filter((v) => !v.isFavorable && v.variance !== 0).length;

  return (
    <PageContainer>
      <Header
        title="Variance Analysis"
        description="Compare actuals against forecast by account and supplier"
        actions={
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />
      <PageContent>
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select scenario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Base Case</SelectItem>
                <SelectItem value="2">Upside</SelectItem>
                <SelectItem value="3">Downside</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-neutral-500">Total Forecast</p>
              <p className="text-2xl font-bold">{formatCurrency(totalForecast)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-neutral-500">Total Actual</p>
              <p className="text-2xl font-bold">{formatCurrency(totalActual)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-neutral-500">Net Variance</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  totalVariance >= 0 ? "text-success-600" : "text-error-600"
                )}
              >
                {totalVariance >= 0 ? "+" : ""}
                {formatCurrency(totalVariance)}
              </p>
            </Card>
            <Card className={cn("p-4", unfavorableCount > 0 && "border-warning-300")}>
              <p className="text-sm text-neutral-500">Unfavorable Items</p>
              <p
                className={cn(
                  "text-2xl font-bold",
                  unfavorableCount > 0 ? "text-warning-600" : "text-success-600"
                )}
              >
                {unfavorableCount}
              </p>
            </Card>
          </div>

          {/* Variance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Variance by Account</CardTitle>
              <CardDescription>
                Click on a row to see supplier breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="financial-table">
                <thead>
                  <tr>
                    <th className="w-24">Code</th>
                    <th>Account</th>
                    <th className="w-28">Type</th>
                    <th className="text-right w-32">Forecast</th>
                    <th className="text-right w-32">Actual</th>
                    <th className="text-right w-32">Variance</th>
                    <th className="text-right w-24">%</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockVariances.map((item) => (
                    <tr
                      key={item.accountCode}
                      className={cn(
                        "cursor-pointer hover:bg-neutral-50",
                        !item.isFavorable &&
                          item.variance !== 0 &&
                          "bg-error-50 hover:bg-error-100"
                      )}
                      onClick={() => handleDrilldown(item)}
                    >
                      <td className="font-mono text-neutral-500">{item.accountCode}</td>
                      <td className="font-medium">{item.accountName}</td>
                      <td>
                        <Badge variant="outline" className="text-xs">
                          {item.accountType}
                        </Badge>
                      </td>
                      <td className="numeric">{formatCurrency(item.forecast)}</td>
                      <td className="numeric">{formatCurrency(item.actual)}</td>
                      <td
                        className={cn(
                          "numeric font-semibold",
                          item.isFavorable ? "text-success-600" : "text-error-600",
                          item.variance === 0 && "text-neutral-500"
                        )}
                      >
                        {item.variance >= 0 ? "+" : ""}
                        {formatCurrency(item.variance)}
                      </td>
                      <td
                        className={cn(
                          "numeric text-sm",
                          item.isFavorable ? "text-success-600" : "text-error-600",
                          item.variance === 0 && "text-neutral-500"
                        )}
                      >
                        {item.variance !== 0 && (
                          <>
                            {item.variancePercent > 0 ? "+" : ""}
                            {formatPercentage(item.variancePercent)}
                          </>
                        )}
                        {item.variance === 0 && "-"}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          {item.isFavorable ? (
                            <TrendingUp className="h-4 w-4 text-success-500" />
                          ) : item.variance !== 0 ? (
                            <TrendingDown className="h-4 w-4 text-error-500" />
                          ) : null}
                          <ChevronRight className="h-4 w-4 text-neutral-400" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Drilldown Dialog */}
          <Dialog open={isDrilldownOpen} onOpenChange={setIsDrilldownOpen}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-neutral-500">
                    {drilldownItem?.accountCode}
                  </span>
                  {drilldownItem?.accountName}
                </DialogTitle>
              </DialogHeader>

              {drilldownItem && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500">Forecast</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(drilldownItem.forecast)}
                      </p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500">Actual</p>
                      <p className="text-lg font-semibold">
                        {formatCurrency(drilldownItem.actual)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "p-3 rounded-lg",
                        drilldownItem.isFavorable ? "bg-success-50" : "bg-error-50"
                      )}
                    >
                      <p className="text-xs text-neutral-500">Variance</p>
                      <p
                        className={cn(
                          "text-lg font-semibold",
                          drilldownItem.isFavorable ? "text-success-700" : "text-error-700"
                        )}
                      >
                        {drilldownItem.variance >= 0 ? "+" : ""}
                        {formatCurrency(drilldownItem.variance)}
                      </p>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500">Variance %</p>
                      <p
                        className={cn(
                          "text-lg font-semibold",
                          drilldownItem.isFavorable ? "text-success-700" : "text-error-700"
                        )}
                      >
                        {formatPercentage(drilldownItem.variancePercent)}
                      </p>
                    </div>
                  </div>

                  {/* Supplier Breakdown */}
                  {drilldownItem.suppliers && drilldownItem.suppliers.length > 0 ? (
                    <div className="space-y-4">
                      <h4 className="font-semibold">Breakdown by Supplier</h4>
                      {drilldownItem.suppliers.map((supplier) => (
                        <Card key={supplier.name} className="overflow-hidden">
                          <div className="p-4 bg-neutral-50 flex items-center justify-between">
                            <div>
                              <p className="font-medium">{supplier.name}</p>
                              <p className="text-sm text-neutral-500">
                                {supplier.transactions.length} transaction(s)
                              </p>
                            </div>
                            <p className="text-lg font-semibold">
                              {formatCurrency(supplier.actual)}
                            </p>
                          </div>
                          <div className="p-0">
                            <table className="financial-table text-sm">
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Description</th>
                                  <th>Reference</th>
                                  <th className="text-right">Amount</th>
                                  <th className="w-10"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {supplier.transactions.map((txn, i) => (
                                  <tr key={i}>
                                    <td className="text-neutral-500">
                                      {formatDate(new Date(txn.date))}
                                    </td>
                                    <td>{txn.description}</td>
                                    <td className="font-mono text-xs text-neutral-400">
                                      {txn.reference || "-"}
                                    </td>
                                    <td className="numeric">{formatCurrency(txn.amount)}</td>
                                    <td>
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="h-6 w-6"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-neutral-500 py-8">
                      No transaction details available
                    </p>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </PageContent>
    </PageContainer>
  );
}

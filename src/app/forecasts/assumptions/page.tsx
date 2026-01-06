"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency, cn } from "@/lib/utils";
import { Search, Filter, Save, Edit, ChevronRight, Settings } from "lucide-react";

type AssumptionMethod = "flat" | "mom_growth" | "yoy_growth" | "seasonality" | "manual";

interface AccountAssumption {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  method: AssumptionMethod;
  parameters: {
    amount?: number;
    growthRate?: number;
    seasonalityProfile?: number[];
  };
  lastActual?: number;
  isEnabled: boolean;
}

// Mock data
const mockAssumptions: AccountAssumption[] = [
  {
    accountId: "1",
    accountCode: "4000",
    accountName: "Sales Revenue",
    accountType: "REVENUE",
    method: "yoy_growth",
    parameters: { growthRate: 15 },
    lastActual: 82500,
    isEnabled: true,
  },
  {
    accountId: "2",
    accountCode: "4100",
    accountName: "Service Revenue",
    accountType: "REVENUE",
    method: "mom_growth",
    parameters: { growthRate: 5 },
    lastActual: 42000,
    isEnabled: true,
  },
  {
    accountId: "3",
    accountCode: "5000",
    accountName: "Cost of Goods Sold",
    accountType: "DIRECTCOSTS",
    method: "flat",
    parameters: { amount: 45000 },
    lastActual: 45000,
    isEnabled: true,
  },
  {
    accountId: "4",
    accountCode: "6000",
    accountName: "Wages & Salaries",
    accountType: "EXPENSE",
    method: "flat",
    parameters: { amount: 35000 },
    lastActual: 35000,
    isEnabled: true,
  },
  {
    accountId: "5",
    accountCode: "6100",
    accountName: "Software & Subscriptions",
    accountType: "EXPENSE",
    method: "flat",
    parameters: { amount: 5000 },
    lastActual: 7200,
    isEnabled: true,
  },
  {
    accountId: "6",
    accountCode: "6200",
    accountName: "Marketing & Advertising",
    accountType: "EXPENSE",
    method: "seasonality",
    parameters: { amount: 8000, seasonalityProfile: [0.8, 0.9, 1.2, 1.0, 1.0, 1.1, 0.9, 0.8, 1.0, 1.2, 1.1, 1.0] },
    lastActual: 6500,
    isEnabled: true,
  },
];

const methodLabels: Record<AssumptionMethod, string> = {
  flat: "Flat Amount",
  mom_growth: "Month-over-Month Growth",
  yoy_growth: "Year-over-Year Growth",
  seasonality: "Seasonality Profile",
  manual: "Manual Entry",
};

const methodColors: Record<AssumptionMethod, string> = {
  flat: "bg-neutral-100 text-neutral-700",
  mom_growth: "bg-accent-100 text-accent-700",
  yoy_growth: "bg-success-100 text-success-700",
  seasonality: "bg-warning-100 text-warning-700",
  manual: "bg-primary-100 text-primary-700",
};

export default function AssumptionsPage() {
  const [assumptions, setAssumptions] = useState<AccountAssumption[]>(mockAssumptions);
  const [selectedScenario, setSelectedScenario] = useState("1");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAssumption, setEditingAssumption] = useState<AccountAssumption | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const filteredAssumptions = assumptions.filter(
    (a) =>
      a.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.accountCode.includes(searchQuery)
  );

  const groupedAssumptions = filteredAssumptions.reduce<Record<string, AccountAssumption[]>>(
    (acc, assumption) => {
      const type = assumption.accountType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(assumption);
      return acc;
    },
    {}
  );

  const handleEditClick = (assumption: AccountAssumption) => {
    setEditingAssumption({ ...assumption });
    setIsEditDialogOpen(true);
  };

  const handleSaveAssumption = () => {
    if (!editingAssumption) return;

    setAssumptions(
      assumptions.map((a) =>
        a.accountId === editingAssumption.accountId ? editingAssumption : a
      )
    );
    setIsEditDialogOpen(false);
    setEditingAssumption(null);
  };

  const getAssumptionSummary = (assumption: AccountAssumption) => {
    switch (assumption.method) {
      case "flat":
        return formatCurrency(assumption.parameters.amount || 0) + "/mo";
      case "mom_growth":
        return `+${assumption.parameters.growthRate}% MoM`;
      case "yoy_growth":
        return `+${assumption.parameters.growthRate}% YoY`;
      case "seasonality":
        return "Seasonal pattern";
      case "manual":
        return "Custom values";
      default:
        return "-";
    }
  };

  return (
    <PageContainer>
      <Header
        title="Assumptions"
        description="Configure forecast assumptions for each account"
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
              </SelectContent>
            </Select>
            <Button>
              <Save className="h-4 w-4 mr-2" />
              Save All
            </Button>
          </div>
        }
      />
      <PageContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Global Settings
          </Button>
        </div>

        {/* Assumptions by Account Type */}
        <div className="space-y-6">
          {Object.entries(groupedAssumptions).map(([type, typeAssumptions]) => (
            <Card key={type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {type}
                  <Badge variant="secondary" className="text-xs">
                    {typeAssumptions.length} accounts
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="financial-table">
                  <thead>
                    <tr>
                      <th className="w-24">Code</th>
                      <th>Account Name</th>
                      <th className="w-36">Method</th>
                      <th className="w-36 text-right">Assumption</th>
                      <th className="w-36 text-right">Last Actual</th>
                      <th className="w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {typeAssumptions.map((assumption) => (
                      <tr
                        key={assumption.accountId}
                        className={cn(
                          "cursor-pointer hover:bg-neutral-50",
                          !assumption.isEnabled && "opacity-50"
                        )}
                        onClick={() => handleEditClick(assumption)}
                      >
                        <td className="font-mono text-neutral-500">
                          {assumption.accountCode}
                        </td>
                        <td className="font-medium">{assumption.accountName}</td>
                        <td>
                          <Badge
                            className={cn("text-xs", methodColors[assumption.method])}
                          >
                            {methodLabels[assumption.method]}
                          </Badge>
                        </td>
                        <td className="numeric text-neutral-700">
                          {getAssumptionSummary(assumption)}
                        </td>
                        <td className="numeric text-neutral-500">
                          {assumption.lastActual
                            ? formatCurrency(assumption.lastActual)
                            : "-"}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-neutral-400" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Assumption Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Assumption</DialogTitle>
              <DialogDescription>
                {editingAssumption && (
                  <span>
                    {editingAssumption.accountCode} - {editingAssumption.accountName}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            {editingAssumption && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Forecast Method</Label>
                  <Select
                    value={editingAssumption.method}
                    onValueChange={(value: AssumptionMethod) =>
                      setEditingAssumption({ ...editingAssumption, method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat Amount</SelectItem>
                      <SelectItem value="mom_growth">Month-over-Month Growth</SelectItem>
                      <SelectItem value="yoy_growth">Year-over-Year Growth</SelectItem>
                      <SelectItem value="seasonality">Seasonality Profile</SelectItem>
                      <SelectItem value="manual">Manual Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(editingAssumption.method === "flat" ||
                  editingAssumption.method === "seasonality") && (
                  <div className="space-y-2">
                    <Label>Monthly Amount</Label>
                    <Input
                      type="number"
                      value={editingAssumption.parameters.amount || ""}
                      onChange={(e) =>
                        setEditingAssumption({
                          ...editingAssumption,
                          parameters: {
                            ...editingAssumption.parameters,
                            amount: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                )}

                {(editingAssumption.method === "mom_growth" ||
                  editingAssumption.method === "yoy_growth") && (
                  <div className="space-y-2">
                    <Label>Growth Rate (%)</Label>
                    <Input
                      type="number"
                      value={editingAssumption.parameters.growthRate || ""}
                      onChange={(e) =>
                        setEditingAssumption({
                          ...editingAssumption,
                          parameters: {
                            ...editingAssumption.parameters,
                            growthRate: parseFloat(e.target.value) || 0,
                          },
                        })
                      }
                    />
                  </div>
                )}

                {editingAssumption.lastActual && (
                  <div className="p-3 bg-neutral-50 rounded-lg">
                    <p className="text-sm text-neutral-500">Last Actual</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(editingAssumption.lastActual)}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAssumption}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContent>
    </PageContainer>
  );
}

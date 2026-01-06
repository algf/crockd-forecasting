"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Calendar, DollarSign, Users, Clock } from "lucide-react";

interface PayrollSettings {
  cycle: "weekly" | "fortnightly" | "monthly";
  payDay: number;
  superRate: number;
}

interface TaxSettings {
  gstBasis: "cash" | "accrual";
  gstFrequency: "monthly" | "quarterly";
  payeFrequency: "monthly" | "quarterly";
  companyTaxRate: number;
}

export default function SettingsPage() {
  const [payrollSettings, setPayrollSettings] = useState<PayrollSettings>({
    cycle: "fortnightly",
    payDay: 5, // Friday
    superRate: 11.5,
  });

  const [taxSettings, setTaxSettings] = useState<TaxSettings>({
    gstBasis: "accrual",
    gstFrequency: "quarterly",
    payeFrequency: "monthly",
    companyTaxRate: 25,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: Save to database
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  const dayOfWeekOptions = [
    { value: "1", label: "Monday" },
    { value: "2", label: "Tuesday" },
    { value: "3", label: "Wednesday" },
    { value: "4", label: "Thursday" },
    { value: "5", label: "Friday" },
  ];

  return (
    <PageContainer>
      <Header
        title="Settings"
        description="Configure global settings for your forecasts"
        actions={
          <Button onClick={handleSave} isLoading={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        }
      />
      <PageContent>
        <div className="max-w-3xl">
          <Tabs defaultValue="payroll" className="space-y-6">
            <TabsList>
              <TabsTrigger value="payroll" className="gap-2">
                <Users className="h-4 w-4" />
                Payroll
              </TabsTrigger>
              <TabsTrigger value="tax" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Tax
              </TabsTrigger>
              <TabsTrigger value="general" className="gap-2">
                <Clock className="h-4 w-4" />
                General
              </TabsTrigger>
            </TabsList>

            {/* Payroll Settings */}
            <TabsContent value="payroll">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Payroll Settings
                  </CardTitle>
                  <CardDescription>
                    Configure payroll schedules for cash flow forecasting
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Pay Cycle</Label>
                      <Select
                        value={payrollSettings.cycle}
                        onValueChange={(value: "weekly" | "fortnightly" | "monthly") =>
                          setPayrollSettings({ ...payrollSettings, cycle: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="fortnightly">Fortnightly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-neutral-500">
                        How often payroll is processed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Pay Day</Label>
                      {payrollSettings.cycle === "monthly" ? (
                        <Input
                          type="number"
                          min="1"
                          max="28"
                          value={payrollSettings.payDay}
                          onChange={(e) =>
                            setPayrollSettings({
                              ...payrollSettings,
                              payDay: parseInt(e.target.value) || 1,
                            })
                          }
                        />
                      ) : (
                        <Select
                          value={String(payrollSettings.payDay)}
                          onValueChange={(value) =>
                            setPayrollSettings({
                              ...payrollSettings,
                              payDay: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {dayOfWeekOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <p className="text-xs text-neutral-500">
                        {payrollSettings.cycle === "monthly"
                          ? "Day of the month (1-28)"
                          : "Day of the week"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Superannuation Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={payrollSettings.superRate}
                      onChange={(e) =>
                        setPayrollSettings({
                          ...payrollSettings,
                          superRate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="max-w-xs"
                    />
                    <p className="text-xs text-neutral-500">
                      Current statutory rate is 11.5% (as of July 2024)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tax Settings */}
            <TabsContent value="tax">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Tax Settings
                  </CardTitle>
                  <CardDescription>
                    Configure tax schedules for liability and cash flow calculations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>GST Reporting Basis</Label>
                      <Select
                        value={taxSettings.gstBasis}
                        onValueChange={(value: "cash" | "accrual") =>
                          setTaxSettings({ ...taxSettings, gstBasis: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash Basis</SelectItem>
                          <SelectItem value="accrual">Accrual Basis</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>GST Payment Frequency</Label>
                      <Select
                        value={taxSettings.gstFrequency}
                        onValueChange={(value: "monthly" | "quarterly") =>
                          setTaxSettings({ ...taxSettings, gstFrequency: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>PAYG/PAYE Frequency</Label>
                      <Select
                        value={taxSettings.payeFrequency}
                        onValueChange={(value: "monthly" | "quarterly") =>
                          setTaxSettings({ ...taxSettings, payeFrequency: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Company Tax Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        max="50"
                        value={taxSettings.companyTaxRate}
                        onChange={(e) =>
                          setTaxSettings({
                            ...taxSettings,
                            companyTaxRate: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <p className="text-xs text-neutral-500">
                        Base rate entities: 25%, Non-base rate: 30%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    General Settings
                  </CardTitle>
                  <CardDescription>
                    Configure general forecasting preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Financial Year End</Label>
                    <Select defaultValue="june">
                      <SelectTrigger className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="june">June 30</SelectItem>
                        <SelectItem value="december">December 31</SelectItem>
                        <SelectItem value="march">March 31</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Payment Terms (Days)</Label>
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                      <div>
                        <Label className="text-xs text-neutral-500">AR (Receivables)</Label>
                        <Input type="number" defaultValue={30} />
                      </div>
                      <div>
                        <Label className="text-xs text-neutral-500">AP (Payables)</Label>
                        <Input type="number" defaultValue={30} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageContent>
    </PageContainer>
  );
}

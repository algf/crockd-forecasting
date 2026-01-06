"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Search,
  Download,
  Filter,
  ChevronRight,
  FileText,
  Users,
  Landmark,
} from "lucide-react";

// Mock data for demonstration
const mockAccounts = [
  { code: "4000", name: "Sales Revenue", type: "REVENUE", balance: 125000 },
  { code: "4100", name: "Service Revenue", type: "REVENUE", balance: 82500 },
  { code: "5000", name: "Cost of Goods Sold", type: "DIRECTCOSTS", balance: -45000 },
  { code: "6000", name: "Wages & Salaries", type: "EXPENSE", balance: -35000 },
  { code: "6100", name: "Software & Subscriptions", type: "EXPENSE", balance: -7200 },
  { code: "6200", name: "Marketing & Advertising", type: "EXPENSE", balance: -6500 },
  { code: "6300", name: "Office Supplies", type: "EXPENSE", balance: -900 },
  { code: "6400", name: "Professional Fees", type: "EXPENSE", balance: -4500 },
  { code: "7000", name: "Rent", type: "OVERHEADS", balance: -8000 },
  { code: "7100", name: "Utilities", type: "OVERHEADS", balance: -1200 },
];

const mockTransactions = [
  {
    id: "1",
    date: "2024-01-15",
    type: "SPEND",
    contact: "AWS",
    description: "Monthly hosting",
    account: "6100",
    amount: -1250,
  },
  {
    id: "2",
    date: "2024-01-14",
    type: "RECEIVE",
    contact: "Acme Corp",
    description: "Invoice #1234",
    account: "4000",
    amount: 15000,
  },
  {
    id: "3",
    date: "2024-01-13",
    type: "SPEND",
    contact: "Google Ads",
    description: "January campaign",
    account: "6200",
    amount: -2500,
  },
  {
    id: "4",
    date: "2024-01-12",
    type: "SPEND",
    contact: "Slack",
    description: "Monthly subscription",
    account: "6100",
    amount: -450,
  },
  {
    id: "5",
    date: "2024-01-11",
    type: "RECEIVE",
    contact: "Beta Inc",
    description: "Invoice #1233",
    account: "4100",
    amount: 8500,
  },
];

const mockContacts = [
  { name: "Acme Corp", type: "Customer", balance: 15000, invoices: 3 },
  { name: "Beta Inc", type: "Customer", balance: 8500, invoices: 2 },
  { name: "AWS", type: "Supplier", balance: -1250, bills: 1 },
  { name: "Google Ads", type: "Supplier", balance: 0, bills: 5 },
  { name: "Slack", type: "Supplier", balance: 0, bills: 12 },
];

export default function ActualsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <PageContainer>
      <Header
        title="Actuals"
        description="View your synced Xero data"
        actions={
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
      />
      <PageContent>
        <Tabs defaultValue="accounts" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="accounts" className="gap-2">
                <FileText className="h-4 w-4" />
                Chart of Accounts
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2">
                <Landmark className="h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-2">
                <Users className="h-4 w-4" />
                Contacts
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chart of Accounts Tab */}
          <TabsContent value="accounts">
            <Card>
              <CardHeader>
                <CardTitle>Chart of Accounts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="financial-table">
                  <thead>
                    <tr>
                      <th className="w-24">Code</th>
                      <th>Account Name</th>
                      <th className="w-32">Type</th>
                      <th className="w-40 text-right">YTD Balance</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockAccounts.map((account) => (
                      <tr key={account.code} className="cursor-pointer hover:bg-neutral-50">
                        <td className="font-mono text-neutral-500">{account.code}</td>
                        <td className="font-medium">{account.name}</td>
                        <td>
                          <Badge variant="outline" className="text-xs">
                            {account.type}
                          </Badge>
                        </td>
                        <td
                          className={`numeric ${
                            account.balance >= 0 ? "positive" : "negative"
                          }`}
                        >
                          {formatCurrency(Math.abs(account.balance))}
                        </td>
                        <td>
                          <ChevronRight className="h-4 w-4 text-neutral-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="financial-table">
                  <thead>
                    <tr>
                      <th className="w-28">Date</th>
                      <th className="w-24">Type</th>
                      <th>Contact</th>
                      <th>Description</th>
                      <th className="w-24">Account</th>
                      <th className="w-36 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTransactions.map((txn) => (
                      <tr key={txn.id} className="cursor-pointer hover:bg-neutral-50">
                        <td className="text-neutral-500">
                          {formatDate(new Date(txn.date))}
                        </td>
                        <td>
                          <Badge
                            variant={txn.type === "RECEIVE" ? "success" : "secondary"}
                            className="text-xs"
                          >
                            {txn.type}
                          </Badge>
                        </td>
                        <td className="font-medium">{txn.contact}</td>
                        <td className="text-neutral-600">{txn.description}</td>
                        <td className="font-mono text-neutral-500">{txn.account}</td>
                        <td
                          className={`numeric ${
                            txn.amount >= 0 ? "positive" : "negative"
                          }`}
                        >
                          {txn.amount >= 0 ? "+" : ""}
                          {formatCurrency(txn.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts">
            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="financial-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th className="w-28">Type</th>
                      <th className="w-36 text-right">Balance</th>
                      <th className="w-28 text-right">Documents</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockContacts.map((contact) => (
                      <tr key={contact.name} className="cursor-pointer hover:bg-neutral-50">
                        <td className="font-medium">{contact.name}</td>
                        <td>
                          <Badge
                            variant={contact.type === "Customer" ? "success" : "secondary"}
                            className="text-xs"
                          >
                            {contact.type}
                          </Badge>
                        </td>
                        <td
                          className={`numeric ${
                            contact.balance >= 0 ? "positive" : "negative"
                          }`}
                        >
                          {formatCurrency(Math.abs(contact.balance))}
                        </td>
                        <td className="text-right text-neutral-500">
                          {contact.invoices || contact.bills || 0}
                        </td>
                        <td>
                          <ChevronRight className="h-4 w-4 text-neutral-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageContainer>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  PlusCircle,
  FileText,
  MessageSquare,
  Download,
  Settings,
} from "lucide-react";

interface QuickAction {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  variant: "default" | "outline" | "secondary";
}

const actions: QuickAction[] = [
  {
    label: "Sync Xero Data",
    description: "Pull latest transactions",
    icon: RefreshCw,
    href: "/settings/xero",
    variant: "default",
  },
  {
    label: "Create Scenario",
    description: "Build a new forecast",
    icon: PlusCircle,
    href: "/forecasts/scenarios/new",
    variant: "outline",
  },
  {
    label: "View Statements",
    description: "P&L, Balance Sheet, Cashflow",
    icon: FileText,
    href: "/forecasts/statements",
    variant: "outline",
  },
  {
    label: "Ask AI",
    description: "Get insights on your data",
    icon: MessageSquare,
    href: "/assistant",
    variant: "secondary",
  },
  {
    label: "Export Reports",
    description: "Download as CSV or PDF",
    icon: Download,
    href: "/reports/export",
    variant: "outline",
  },
  {
    label: "Settings",
    description: "Configure app preferences",
    icon: Settings,
    href: "/settings",
    variant: "outline",
  },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.label} href={action.href}>
            <Button
              variant={action.variant}
              className="w-full h-auto flex-col py-4 px-3 gap-2"
            >
              <Icon className="h-6 w-6" />
              <div className="text-center">
                <div className="text-sm font-medium">{action.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{action.description}</div>
              </div>
            </Button>
          </Link>
        );
      })}
    </div>
  );
}

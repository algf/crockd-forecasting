"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Receipt,
  TrendingUp,
  Calculator,
  Wallet,
  BarChart3,
  MessageSquare,
  Settings,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  {
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Actuals",
    href: "/actuals",
    icon: Receipt,
  },
  {
    label: "Forecasts",
    href: "/forecasts",
    icon: TrendingUp,
    children: [
      { label: "Scenarios", href: "/forecasts/scenarios", icon: Calculator },
      { label: "Assumptions", href: "/forecasts/assumptions", icon: Calculator },
      { label: "Statements", href: "/forecasts/statements", icon: BarChart3 },
    ],
  },
  {
    label: "Cash",
    href: "/cash",
    icon: Wallet,
  },
  {
    label: "Variance",
    href: "/variance",
    icon: BarChart3,
  },
  {
    label: "AI Assistant",
    href: "/assistant",
    icon: MessageSquare,
  },
];

const secondaryNavigation: NavItem[] = [
  {
    label: "Xero Connection",
    href: "/settings/xero",
    icon: LinkIcon,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const NavLink = ({ item, depth = 0 }: { item: NavItem; depth?: number }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isChildActive = hasChildren && item.children?.some((child) => isActive(child.href));

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
          "hover:bg-neutral-100",
          active || isChildActive
            ? "bg-primary-50 text-primary-700"
            : "text-neutral-600 hover:text-neutral-900",
          depth > 0 && "ml-6 border-l-2 border-neutral-200 pl-4",
          isCollapsed && depth === 0 && "justify-center px-2"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0", active && "text-primary-600")} />
        {!isCollapsed && <span className="truncate">{item.label}</span>}
      </Link>
    );

    if (isCollapsed && depth === 0) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-4">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-neutral-200 bg-white transition-all duration-300",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
          {!isCollapsed && (
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-neutral-900">Crockd</span>
            </Link>
          )}
          {isCollapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 mx-auto">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {navigation.map((item) => (
              <div key={item.href}>
                <NavLink item={item} />
                {!isCollapsed && item.children && isActive(item.href) && (
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => (
                      <NavLink key={child.href} item={child} depth={1} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Divider */}
          <div className="my-4 border-t border-neutral-200" />

          {/* Secondary Navigation */}
          <nav className="space-y-1">
            {secondaryNavigation.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="border-t border-neutral-200 p-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full", isCollapsed && "px-0")}
            onClick={onToggle}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

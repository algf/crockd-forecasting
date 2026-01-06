"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <main
        className={cn(
          "flex-1 overflow-auto transition-all duration-300",
          isCollapsed ? "ml-0" : "ml-0"
        )}
      >
        {children}
      </main>
    </div>
  );
}

"use client";

import React from "react";
import { Bell, RefreshCw, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  lastSyncAt?: Date | null;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function Header({
  title,
  description,
  actions,
  lastSyncAt,
  onSync,
  isSyncing,
}: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{title}</h1>
          {description && (
            <p className="text-sm text-neutral-500">{description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Last Sync */}
        {lastSyncAt && (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Calendar className="h-4 w-4" />
            <span>Last sync: {formatDate(lastSyncAt)}</span>
          </div>
        )}

        {/* Sync Button */}
        {onSync && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync"}</span>
          </Button>
        )}

        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5 text-neutral-500" />
        </Button>

        {/* Custom Actions */}
        {actions}

        {/* Status Badge */}
        <Badge variant="success">Connected</Badge>
      </div>
    </header>
  );
}

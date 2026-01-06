"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout";
import { PageContainer, PageContent } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import {
  Link as LinkIcon,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  Unlink,
} from "lucide-react";

interface XeroStatus {
  connected: boolean;
  tenantName?: string;
  lastSyncAt?: string;
  sync?: {
    resources: Array<{
      resourceType: string;
      lastSyncAt: string | null;
      status: string;
      errorMessage: string | null;
    }>;
    overallLastSync: string | null;
  };
}

interface SyncResult {
  success: boolean;
  accounts: { created: number; updated: number };
  contacts: { created: number; updated: number };
  bankTransactions: { created: number; updated: number };
  invoices: { created: number; updated: number };
  bills: { created: number; updated: number };
  totalErrors: string[];
  duration: number;
}

function XeroSettingsContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<XeroStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Check for URL params
    if (searchParams.get("connected") === "true") {
      setMessage({ type: "success", text: "Successfully connected to Xero!" });
    } else if (searchParams.get("error")) {
      setMessage({ type: "error", text: searchParams.get("error") || "An error occurred" });
    }

    fetchStatus();
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/xero/status");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = "/api/xero/connect";
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect from Xero?")) return;

    try {
      await fetch("/api/xero/disconnect", { method: "POST" });
      setStatus({ connected: false });
      setMessage({ type: "success", text: "Disconnected from Xero" });
    } catch {
      setMessage({ type: "error", text: "Failed to disconnect" });
    }
  };

  const handleSync = async (type: "initial" | "incremental") => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/xero/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const result = await response.json();
      setSyncResult(result);
      fetchStatus(); // Refresh status
    } catch {
      setMessage({ type: "error", text: "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Messages */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === "success"
              ? "bg-success-50 text-success-800"
              : "bg-error-50 text-error-800"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-current opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </div>
      )}

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Xero Connection
              </CardTitle>
              <CardDescription>
                Connect to sync your chart of accounts, transactions, invoices, and bills
              </CardDescription>
            </div>
            <Badge variant={status?.connected ? "success" : "secondary"}>
              {status?.connected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {status?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <p className="font-medium text-neutral-900">{status.tenantName}</p>
                  {status.lastSyncAt && (
                    <p className="text-sm text-neutral-500">
                      Last sync: {formatDate(new Date(status.lastSyncAt))}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="https://go.xero.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleSync("incremental")}
                  disabled={syncing}
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
                  {syncing ? "Syncing..." : "Quick Sync"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSync("initial")}
                  disabled={syncing}
                >
                  Full Sync (24 months)
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <LinkIcon className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Connect to Xero
              </h3>
              <p className="text-neutral-500 mb-6 max-w-md mx-auto">
                Connect your Xero account to automatically sync your chart of accounts,
                bank transactions, invoices, bills, and contacts.
              </p>
              <Button onClick={handleConnect} size="lg">
                <LinkIcon className="h-5 w-5 mr-2" />
                Connect Xero Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {syncResult.success ? (
                <Check className="h-5 w-5 text-success-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning-600" />
              )}
              Sync Results
            </CardTitle>
            <CardDescription>
              Completed in {(syncResult.duration / 1000).toFixed(1)} seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              {[
                { label: "Accounts", data: syncResult.accounts },
                { label: "Contacts", data: syncResult.contacts },
                { label: "Bank Txns", data: syncResult.bankTransactions },
                { label: "Invoices", data: syncResult.invoices },
                { label: "Bills", data: syncResult.bills },
              ].map(({ label, data }) => (
                <div key={label} className="text-center p-3 bg-neutral-50 rounded-lg">
                  <p className="text-xs text-neutral-500 mb-1">{label}</p>
                  <p className="text-lg font-semibold text-neutral-900">
                    +{data.created} / ~{data.updated}
                  </p>
                </div>
              ))}
            </div>

            {syncResult.totalErrors.length > 0 && (
              <div className="mt-4 p-3 bg-error-50 rounded-lg">
                <p className="text-sm font-medium text-error-800 mb-2">
                  {syncResult.totalErrors.length} error(s) occurred:
                </p>
                <ul className="text-sm text-error-700 list-disc list-inside">
                  {syncResult.totalErrors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                  {syncResult.totalErrors.length > 5 && (
                    <li>...and {syncResult.totalErrors.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Status by Resource */}
      {status?.sync?.resources && status.sync.resources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Status by Resource</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {status.sync.resources.map((resource) => (
                <div
                  key={resource.resourceType}
                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-neutral-900 capitalize">
                      {resource.resourceType}
                    </p>
                    {resource.lastSyncAt && (
                      <p className="text-xs text-neutral-500">
                        Last: {formatDate(new Date(resource.lastSyncAt))}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      resource.status === "idle"
                        ? "success"
                        : resource.status === "syncing"
                        ? "default"
                        : "error"
                    }
                  >
                    {resource.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    </div>
  );
}

export default function XeroSettingsPage() {
  return (
    <PageContainer>
      <Header
        title="Xero Connection"
        description="Connect your Xero account to sync financial data"
      />
      <PageContent>
        <Suspense fallback={<LoadingFallback />}>
          <XeroSettingsContent />
        </Suspense>
      </PageContent>
    </PageContainer>
  );
}

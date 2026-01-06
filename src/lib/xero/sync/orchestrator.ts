import { prisma } from "@/lib/db";
import { getAuthenticatedXeroClient } from "../client";
import { syncAccounts } from "./accounts";
import { syncContacts } from "./contacts";
import { syncBankTransactions } from "./bank-transactions";
import { syncInvoicesAndBills } from "./invoices";

export interface SyncProgress {
  stage: string;
  progress: number;
  message: string;
}

export interface SyncResults {
  success: boolean;
  accounts: { created: number; updated: number; errors: string[] };
  contacts: { created: number; updated: number; errors: string[] };
  bankTransactions: { created: number; updated: number; errors: string[] };
  invoices: { created: number; updated: number; errors: string[] };
  bills: { created: number; updated: number; errors: string[] };
  totalErrors: string[];
  duration: number;
}

/**
 * Runs a full initial sync from Xero
 */
export async function runInitialSync(
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResults> {
  const startTime = Date.now();
  const results: SyncResults = {
    success: false,
    accounts: { created: 0, updated: 0, errors: [] },
    contacts: { created: 0, updated: 0, errors: [] },
    bankTransactions: { created: 0, updated: 0, errors: [] },
    invoices: { created: 0, updated: 0, errors: [] },
    bills: { created: 0, updated: 0, errors: [] },
    totalErrors: [],
    duration: 0,
  };

  try {
    // Get authenticated client
    onProgress?.({ stage: "auth", progress: 0, message: "Authenticating with Xero..." });
    
    const auth = await getAuthenticatedXeroClient();
    if (!auth) {
      results.totalErrors.push("Not connected to Xero");
      results.duration = Date.now() - startTime;
      return results;
    }

    const { client: xero, tenantId: xeroTenantId } = auth;

    // Get database tenant ID
    const tenant = await prisma.xeroTenant.findFirst({
      where: { tenantId: xeroTenantId },
    });

    if (!tenant) {
      results.totalErrors.push("Tenant not found in database");
      results.duration = Date.now() - startTime;
      return results;
    }

    const dbTenantId = tenant.id;

    // Sync Accounts
    onProgress?.({ stage: "accounts", progress: 10, message: "Syncing chart of accounts..." });
    results.accounts = await syncAccounts(xero, xeroTenantId, dbTenantId);
    if (results.accounts.errors.length > 0) {
      results.totalErrors.push(...results.accounts.errors);
    }

    // Sync Contacts
    onProgress?.({ stage: "contacts", progress: 25, message: "Syncing contacts..." });
    results.contacts = await syncContacts(xero, xeroTenantId, dbTenantId);
    if (results.contacts.errors.length > 0) {
      results.totalErrors.push(...results.contacts.errors);
    }

    // Sync Bank Transactions
    onProgress?.({ stage: "bankTransactions", progress: 40, message: "Syncing bank transactions (24 months)..." });
    results.bankTransactions = await syncBankTransactions(xero, xeroTenantId, dbTenantId, false);
    if (results.bankTransactions.errors.length > 0) {
      results.totalErrors.push(...results.bankTransactions.errors);
    }

    // Sync Invoices and Bills
    onProgress?.({ stage: "invoices", progress: 70, message: "Syncing invoices and bills (24 months)..." });
    const invoiceResults = await syncInvoicesAndBills(xero, xeroTenantId, dbTenantId, false);
    results.invoices = invoiceResults.invoices;
    results.bills = invoiceResults.bills;
    if (invoiceResults.invoices.errors.length > 0) {
      results.totalErrors.push(...invoiceResults.invoices.errors);
    }
    if (invoiceResults.bills.errors.length > 0) {
      results.totalErrors.push(...invoiceResults.bills.errors);
    }

    // Update tenant last sync time
    await prisma.xeroTenant.update({
      where: { id: dbTenantId },
      data: { lastSyncAt: new Date() },
    });

    onProgress?.({ stage: "complete", progress: 100, message: "Sync complete!" });

    results.success = results.totalErrors.length === 0;
    results.duration = Date.now() - startTime;
    return results;
  } catch (error) {
    results.totalErrors.push(
      `Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    results.duration = Date.now() - startTime;
    return results;
  }
}

/**
 * Runs an incremental sync from Xero (only changes since last sync)
 */
export async function runIncrementalSync(
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResults> {
  const startTime = Date.now();
  const results: SyncResults = {
    success: false,
    accounts: { created: 0, updated: 0, errors: [] },
    contacts: { created: 0, updated: 0, errors: [] },
    bankTransactions: { created: 0, updated: 0, errors: [] },
    invoices: { created: 0, updated: 0, errors: [] },
    bills: { created: 0, updated: 0, errors: [] },
    totalErrors: [],
    duration: 0,
  };

  try {
    onProgress?.({ stage: "auth", progress: 0, message: "Authenticating with Xero..." });

    const auth = await getAuthenticatedXeroClient();
    if (!auth) {
      results.totalErrors.push("Not connected to Xero");
      results.duration = Date.now() - startTime;
      return results;
    }

    const { client: xero, tenantId: xeroTenantId } = auth;

    const tenant = await prisma.xeroTenant.findFirst({
      where: { tenantId: xeroTenantId },
    });

    if (!tenant) {
      results.totalErrors.push("Tenant not found in database");
      results.duration = Date.now() - startTime;
      return results;
    }

    const dbTenantId = tenant.id;

    // Sync with incremental flag
    onProgress?.({ stage: "accounts", progress: 10, message: "Checking for account updates..." });
    results.accounts = await syncAccounts(xero, xeroTenantId, dbTenantId);

    onProgress?.({ stage: "contacts", progress: 30, message: "Checking for contact updates..." });
    results.contacts = await syncContacts(xero, xeroTenantId, dbTenantId);

    onProgress?.({ stage: "bankTransactions", progress: 50, message: "Checking for new transactions..." });
    results.bankTransactions = await syncBankTransactions(xero, xeroTenantId, dbTenantId, true);

    onProgress?.({ stage: "invoices", progress: 75, message: "Checking for invoice/bill updates..." });
    const invoiceResults = await syncInvoicesAndBills(xero, xeroTenantId, dbTenantId, true);
    results.invoices = invoiceResults.invoices;
    results.bills = invoiceResults.bills;

    // Collect all errors
    [results.accounts, results.contacts, results.bankTransactions, results.invoices, results.bills]
      .forEach((r) => {
        if (r.errors.length > 0) {
          results.totalErrors.push(...r.errors);
        }
      });

    // Update tenant last sync time
    await prisma.xeroTenant.update({
      where: { id: dbTenantId },
      data: { lastSyncAt: new Date() },
    });

    onProgress?.({ stage: "complete", progress: 100, message: "Incremental sync complete!" });

    results.success = results.totalErrors.length === 0;
    results.duration = Date.now() - startTime;
    return results;
  } catch (error) {
    results.totalErrors.push(
      `Incremental sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    results.duration = Date.now() - startTime;
    return results;
  }
}

/**
 * Gets the current sync status for all resources
 */
export async function getSyncStatus(): Promise<{
  resources: Array<{
    resourceType: string;
    lastSyncAt: Date | null;
    status: string;
    errorMessage: string | null;
  }>;
  overallLastSync: Date | null;
}> {
  const tenant = await prisma.xeroTenant.findFirst({
    where: { isActive: true },
    include: {
      syncCheckpoints: true,
    },
  });

  if (!tenant) {
    return {
      resources: [],
      overallLastSync: null,
    };
  }

  return {
    resources: tenant.syncCheckpoints.map((cp) => ({
      resourceType: cp.resourceType,
      lastSyncAt: cp.lastSyncAt,
      status: cp.status,
      errorMessage: cp.errorMessage,
    })),
    overallLastSync: tenant.lastSyncAt,
  };
}

import { XeroClient } from "xero-node";
import { prisma } from "@/lib/db";
import { Account } from "@prisma/client";
import crypto from "crypto";

interface SyncResult {
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Syncs chart of accounts from Xero
 */
export async function syncAccounts(
  xero: XeroClient,
  xeroTenantId: string,
  dbTenantId: string
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  try {
    // Fetch all accounts from Xero
    const response = await xero.accountingApi.getAccounts(xeroTenantId);
    const xeroAccounts = response.body.accounts || [];

    for (const xeroAccount of xeroAccounts) {
      try {
        // Store raw payload
        const payload = JSON.stringify(xeroAccount);
        const payloadHash = crypto.createHash("md5").update(payload).digest("hex");

        await prisma.rawXeroEvent.create({
          data: {
            tenantId: dbTenantId,
            resourceType: "account",
            resourceId: xeroAccount.accountID || "",
            payload: xeroAccount as object,
            payloadHash,
          },
        });

        // Upsert account
        const existingAccount = await prisma.account.findUnique({
          where: {
            tenantId_xeroAccountId: {
              tenantId: dbTenantId,
              xeroAccountId: xeroAccount.accountID || "",
            },
          },
        });

        const accountData = {
          tenantId: dbTenantId,
          xeroAccountId: xeroAccount.accountID || "",
          code: xeroAccount.code || null,
          name: xeroAccount.name || "",
          type: xeroAccount.type?.toString() || "",
          status: xeroAccount.status?.toString() || "ACTIVE",
          description: xeroAccount.description || null,
          taxType: xeroAccount.taxType || null,
          bankAccountNumber: xeroAccount.bankAccountNumber || null,
          bankAccountType: xeroAccount.bankAccountType?.toString() || null,
          currencyCode: xeroAccount.currencyCode?.toString() || null,
          systemAccount: xeroAccount.systemAccount?.toString() || null,
          enablePayments: xeroAccount.enablePaymentsToAccount || false,
          showInExpenseClaims: xeroAccount.showInExpenseClaims || false,
          class: xeroAccount._class?.toString() || null,
          reportingCode: xeroAccount.reportingCode || null,
          reportingCodeName: xeroAccount.reportingCodeName || null,
          hasAttachments: xeroAccount.hasAttachments || false,
          updatedDateUtc: xeroAccount.updatedDateUTC
            ? new Date(xeroAccount.updatedDateUTC)
            : null,
          addToWatchlist: xeroAccount.addToWatchlist || false,
        };

        if (existingAccount) {
          await prisma.account.update({
            where: { id: existingAccount.id },
            data: accountData,
          });
          result.updated++;
        } else {
          await prisma.account.create({
            data: accountData,
          });
          result.created++;
        }
      } catch (error) {
        result.errors.push(
          `Account ${xeroAccount.code}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    // Update sync checkpoint
    await prisma.syncCheckpoint.upsert({
      where: {
        tenantId_resourceType: {
          tenantId: dbTenantId,
          resourceType: "accounts",
        },
      },
      create: {
        tenantId: dbTenantId,
        resourceType: "accounts",
        lastSyncAt: new Date(),
        status: "idle",
      },
      update: {
        lastSyncAt: new Date(),
        status: "idle",
        errorMessage: null,
      },
    });

    return result;
  } catch (error) {
    result.errors.push(
      `Failed to sync accounts: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return result;
  }
}

/**
 * Gets accounts by type
 */
export async function getAccountsByType(
  tenantId: string,
  type: string
): Promise<Account[]> {
  return prisma.account.findMany({
    where: {
      tenantId,
      type,
      status: "ACTIVE",
    },
    orderBy: { code: "asc" },
  });
}

/**
 * Gets all active accounts
 */
export async function getAllAccounts(tenantId: string): Promise<Account[]> {
  return prisma.account.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    orderBy: { code: "asc" },
  });
}

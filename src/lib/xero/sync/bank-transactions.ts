import { XeroClient } from "xero-node";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { XERO_CONFIG } from "../config";
import { subMonths } from "date-fns";

interface SyncResult {
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Syncs bank transactions from Xero
 */
export async function syncBankTransactions(
  xero: XeroClient,
  xeroTenantId: string,
  dbTenantId: string,
  incremental = false
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  try {
    // Get the date range
    let fromDate: Date;
    
    if (incremental) {
      const checkpoint = await prisma.syncCheckpoint.findUnique({
        where: {
          tenantId_resourceType: {
            tenantId: dbTenantId,
            resourceType: "bankTransactions",
          },
        },
      });
      fromDate = checkpoint?.lastSyncAt || subMonths(new Date(), XERO_CONFIG.sync.historyMonths);
    } else {
      fromDate = subMonths(new Date(), XERO_CONFIG.sync.historyMonths);
    }

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await xero.accountingApi.getBankTransactions(
        xeroTenantId,
        incremental ? fromDate : undefined, // ifModifiedSince
        undefined, // where
        undefined, // order
        page,
        undefined // unitdp
      );

      const transactions = response.body.bankTransactions || [];

      if (transactions.length === 0) {
        hasMore = false;
        break;
      }

      for (const txn of transactions) {
        try {
          // Store raw payload
          const payload = JSON.stringify(txn);
          const payloadHash = crypto.createHash("md5").update(payload).digest("hex");

          await prisma.rawXeroEvent.create({
            data: {
              tenantId: dbTenantId,
              resourceType: "bankTransaction",
              resourceId: txn.bankTransactionID || "",
              payload: txn as object,
              payloadHash,
            },
          });

          // Find contact if exists
          let contactId: string | null = null;
          if (txn.contact?.contactID) {
            const contact = await prisma.contact.findUnique({
              where: {
                tenantId_xeroContactId: {
                  tenantId: dbTenantId,
                  xeroContactId: txn.contact.contactID,
                },
              },
            });
            contactId = contact?.id || null;
          }

          // Upsert bank transaction
          const existingTxn = await prisma.bankTransaction.findUnique({
            where: {
              tenantId_xeroBankTransactionId: {
                tenantId: dbTenantId,
                xeroBankTransactionId: txn.bankTransactionID || "",
              },
            },
          });

          const txnData = {
            tenantId: dbTenantId,
            xeroBankTransactionId: txn.bankTransactionID || "",
            type: txn.type?.toString() || "",
            contactId,
            bankAccountId: txn.bankAccount?.accountID || "",
            bankAccountCode: txn.bankAccount?.code || null,
            date: txn.date ? new Date(txn.date) : new Date(),
            reference: txn.reference || null,
            currencyCode: txn.currencyCode?.toString() || null,
            currencyRate: txn.currencyRate || null,
            url: txn.url || null,
            status: txn.status?.toString() || "AUTHORISED",
            lineAmountTypes: txn.lineAmountTypes?.toString() || null,
            subTotal: txn.subTotal || 0,
            totalTax: txn.totalTax || 0,
            total: txn.total || 0,
            isReconciled: txn.isReconciled || false,
            hasAttachments: txn.hasAttachments || false,
            updatedDateUtc: txn.updatedDateUTC ? new Date(txn.updatedDateUTC) : null,
          };

          let bankTransactionId: string;

          if (existingTxn) {
            await prisma.bankTransaction.update({
              where: { id: existingTxn.id },
              data: txnData,
            });
            bankTransactionId = existingTxn.id;
            result.updated++;

            // Delete existing lines to re-create
            await prisma.bankTransactionLine.deleteMany({
              where: { bankTransactionId: existingTxn.id },
            });
          } else {
            const created = await prisma.bankTransaction.create({
              data: txnData,
            });
            bankTransactionId = created.id;
            result.created++;
          }

          // Create line items
          if (txn.lineItems) {
            for (const line of txn.lineItems) {
              // Find account
              let accountId: string | null = null;
              if (line.accountCode) {
                const account = await prisma.account.findFirst({
                  where: {
                    tenantId: dbTenantId,
                    code: line.accountCode,
                  },
                });
                accountId = account?.id || null;
              }

              await prisma.bankTransactionLine.create({
                data: {
                  bankTransactionId,
                  accountId,
                  description: line.description || null,
                  quantity: line.quantity || null,
                  unitAmount: line.unitAmount || null,
                  lineAmount: line.lineAmount || 0,
                  taxType: line.taxType || null,
                  taxAmount: line.taxAmount || null,
                },
              });
            }
          }
        } catch (error) {
          result.errors.push(
            `Bank transaction ${txn.bankTransactionID}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      page++;
      
      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, XERO_CONFIG.sync.rateLimits.requestDelay));
    }

    // Update sync checkpoint
    await prisma.syncCheckpoint.upsert({
      where: {
        tenantId_resourceType: {
          tenantId: dbTenantId,
          resourceType: "bankTransactions",
        },
      },
      create: {
        tenantId: dbTenantId,
        resourceType: "bankTransactions",
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
      `Failed to sync bank transactions: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return result;
  }
}

import { XeroClient, Invoice as XeroInvoice } from "xero-node";
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
 * Syncs invoices (AR) and bills (AP) from Xero
 */
export async function syncInvoicesAndBills(
  xero: XeroClient,
  xeroTenantId: string,
  dbTenantId: string,
  incremental = false
): Promise<{ invoices: SyncResult; bills: SyncResult }> {
  const invoiceResult: SyncResult = { created: 0, updated: 0, errors: [] };
  const billResult: SyncResult = { created: 0, updated: 0, errors: [] };

  try {
    // Get the date range
    let fromDate: Date | undefined;

    if (incremental) {
      const checkpoint = await prisma.syncCheckpoint.findUnique({
        where: {
          tenantId_resourceType: {
            tenantId: dbTenantId,
            resourceType: "invoices",
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
      const response = await xero.accountingApi.getInvoices(
        xeroTenantId,
        incremental ? fromDate : undefined, // ifModifiedSince
        undefined, // where
        undefined, // order
        undefined, // iDs
        undefined, // invoiceNumbers
        undefined, // contactIDs
        undefined, // statuses
        page,
        false, // includeArchived
        false, // createdByMyApp
        undefined, // unitdp
        true // summaryOnly - set to false for full line items
      );

      const invoices = response.body.invoices || [];

      if (invoices.length === 0) {
        hasMore = false;
        break;
      }

      for (const inv of invoices) {
        try {
          const isInvoice = inv.type === XeroInvoice.TypeEnum.ACCREC;
          const result = isInvoice ? invoiceResult : billResult;

          // Store raw payload
          const payload = JSON.stringify(inv);
          const payloadHash = crypto.createHash("md5").update(payload).digest("hex");

          await prisma.rawXeroEvent.create({
            data: {
              tenantId: dbTenantId,
              resourceType: isInvoice ? "invoice" : "bill",
              resourceId: inv.invoiceID || "",
              payload: inv as object,
              payloadHash,
            },
          });

          // Find contact if exists
          let contactId: string | null = null;
          if (inv.contact?.contactID) {
            const contact = await prisma.contact.findUnique({
              where: {
                tenantId_xeroContactId: {
                  tenantId: dbTenantId,
                  xeroContactId: inv.contact.contactID,
                },
              },
            });
            contactId = contact?.id || null;
          }

          if (isInvoice) {
            // Handle as Invoice (AR)
            await syncInvoice(inv, dbTenantId, contactId, result);
          } else {
            // Handle as Bill (AP)
            await syncBill(inv, dbTenantId, contactId, result);
          }
        } catch (error) {
          const result = inv.type === XeroInvoice.TypeEnum.ACCREC ? invoiceResult : billResult;
          result.errors.push(
            `${inv.type} ${inv.invoiceNumber}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      page++;

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, XERO_CONFIG.sync.rateLimits.requestDelay));
    }

    // Update sync checkpoints
    await prisma.syncCheckpoint.upsert({
      where: {
        tenantId_resourceType: {
          tenantId: dbTenantId,
          resourceType: "invoices",
        },
      },
      create: {
        tenantId: dbTenantId,
        resourceType: "invoices",
        lastSyncAt: new Date(),
        status: "idle",
      },
      update: {
        lastSyncAt: new Date(),
        status: "idle",
        errorMessage: null,
      },
    });

    await prisma.syncCheckpoint.upsert({
      where: {
        tenantId_resourceType: {
          tenantId: dbTenantId,
          resourceType: "bills",
        },
      },
      create: {
        tenantId: dbTenantId,
        resourceType: "bills",
        lastSyncAt: new Date(),
        status: "idle",
      },
      update: {
        lastSyncAt: new Date(),
        status: "idle",
        errorMessage: null,
      },
    });

    return { invoices: invoiceResult, bills: billResult };
  } catch (error) {
    invoiceResult.errors.push(
      `Failed to sync invoices/bills: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return { invoices: invoiceResult, bills: billResult };
  }
}

async function syncInvoice(
  inv: XeroInvoice,
  dbTenantId: string,
  contactId: string | null,
  result: SyncResult
) {
  const existingInvoice = await prisma.invoice.findUnique({
    where: {
      tenantId_xeroInvoiceId: {
        tenantId: dbTenantId,
        xeroInvoiceId: inv.invoiceID || "",
      },
    },
  });

  const invoiceData = {
    tenantId: dbTenantId,
    xeroInvoiceId: inv.invoiceID || "",
    type: inv.type?.toString() || "",
    contactId,
    invoiceNumber: inv.invoiceNumber || null,
    reference: inv.reference || null,
    date: inv.date ? new Date(inv.date) : new Date(),
    dueDate: inv.dueDate ? new Date(inv.dueDate) : new Date(),
    expectedPaymentDate: inv.expectedPaymentDate ? new Date(inv.expectedPaymentDate) : null,
    plannedPaymentDate: inv.plannedPaymentDate ? new Date(inv.plannedPaymentDate) : null,
    status: inv.status?.toString() || "DRAFT",
    lineAmountTypes: inv.lineAmountTypes?.toString() || null,
    subTotal: inv.subTotal || 0,
    totalTax: inv.totalTax || 0,
    total: inv.total || 0,
    amountDue: inv.amountDue || 0,
    amountPaid: inv.amountPaid || 0,
    amountCredited: inv.amountCredited || 0,
    currencyCode: inv.currencyCode?.toString() || null,
    currencyRate: inv.currencyRate || null,
    fullyPaidOnDate: inv.fullyPaidOnDate ? new Date(inv.fullyPaidOnDate) : null,
    url: inv.url || null,
    sentToContact: inv.sentToContact || false,
    hasAttachments: inv.hasAttachments || false,
    hasErrors: inv.hasErrors || false,
    updatedDateUtc: inv.updatedDateUTC ? new Date(inv.updatedDateUTC) : null,
  };

  let invoiceId: string;

  if (existingInvoice) {
    await prisma.invoice.update({
      where: { id: existingInvoice.id },
      data: invoiceData,
    });
    invoiceId = existingInvoice.id;
    result.updated++;

    // Delete existing lines to re-create
    await prisma.invoiceLine.deleteMany({
      where: { invoiceId: existingInvoice.id },
    });
  } else {
    const created = await prisma.invoice.create({
      data: invoiceData,
    });
    invoiceId = created.id;
    result.created++;
  }

  // Create line items
  if (inv.lineItems) {
    for (const line of inv.lineItems) {
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

      await prisma.invoiceLine.create({
        data: {
          invoiceId,
          xeroLineId: line.lineItemID || null,
          accountId,
          description: line.description || null,
          quantity: line.quantity || null,
          unitAmount: line.unitAmount || null,
          lineAmount: line.lineAmount || 0,
          taxType: line.taxType || null,
          taxAmount: line.taxAmount || null,
          itemCode: line.itemCode || null,
        },
      });
    }
  }
}

async function syncBill(
  inv: XeroInvoice,
  dbTenantId: string,
  contactId: string | null,
  result: SyncResult
) {
  const existingBill = await prisma.bill.findUnique({
    where: {
      tenantId_xeroBillId: {
        tenantId: dbTenantId,
        xeroBillId: inv.invoiceID || "",
      },
    },
  });

  const billData = {
    tenantId: dbTenantId,
    xeroBillId: inv.invoiceID || "",
    contactId,
    invoiceNumber: inv.invoiceNumber || null,
    reference: inv.reference || null,
    date: inv.date ? new Date(inv.date) : new Date(),
    dueDate: inv.dueDate ? new Date(inv.dueDate) : new Date(),
    expectedPaymentDate: inv.expectedPaymentDate ? new Date(inv.expectedPaymentDate) : null,
    plannedPaymentDate: inv.plannedPaymentDate ? new Date(inv.plannedPaymentDate) : null,
    status: inv.status?.toString() || "DRAFT",
    lineAmountTypes: inv.lineAmountTypes?.toString() || null,
    subTotal: inv.subTotal || 0,
    totalTax: inv.totalTax || 0,
    total: inv.total || 0,
    amountDue: inv.amountDue || 0,
    amountPaid: inv.amountPaid || 0,
    amountCredited: inv.amountCredited || 0,
    currencyCode: inv.currencyCode?.toString() || null,
    currencyRate: inv.currencyRate || null,
    fullyPaidOnDate: inv.fullyPaidOnDate ? new Date(inv.fullyPaidOnDate) : null,
    url: inv.url || null,
    hasAttachments: inv.hasAttachments || false,
    hasErrors: inv.hasErrors || false,
    updatedDateUtc: inv.updatedDateUTC ? new Date(inv.updatedDateUTC) : null,
  };

  let billId: string;

  if (existingBill) {
    await prisma.bill.update({
      where: { id: existingBill.id },
      data: billData,
    });
    billId = existingBill.id;
    result.updated++;

    // Delete existing lines to re-create
    await prisma.billLine.deleteMany({
      where: { billId: existingBill.id },
    });
  } else {
    const created = await prisma.bill.create({
      data: billData,
    });
    billId = created.id;
    result.created++;
  }

  // Create line items
  if (inv.lineItems) {
    for (const line of inv.lineItems) {
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

      await prisma.billLine.create({
        data: {
          billId,
          xeroLineId: line.lineItemID || null,
          accountId,
          description: line.description || null,
          quantity: line.quantity || null,
          unitAmount: line.unitAmount || null,
          lineAmount: line.lineAmount || 0,
          taxType: line.taxType || null,
          taxAmount: line.taxAmount || null,
          itemCode: line.itemCode || null,
        },
      });
    }
  }
}

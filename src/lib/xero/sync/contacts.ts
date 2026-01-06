import { XeroClient } from "xero-node";
import { prisma } from "@/lib/db";
import { Contact } from "@prisma/client";
import crypto from "crypto";

interface SyncResult {
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Syncs contacts from Xero
 */
export async function syncContacts(
  xero: XeroClient,
  xeroTenantId: string,
  dbTenantId: string
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, errors: [] };

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await xero.accountingApi.getContacts(
        xeroTenantId,
        undefined, // ifModifiedSince
        undefined, // where
        undefined, // order
        undefined, // iDs
        page,
        false // includeArchived
      );

      const xeroContacts = response.body.contacts || [];

      if (xeroContacts.length === 0) {
        hasMore = false;
        break;
      }

      for (const xeroContact of xeroContacts) {
        try {
          // Store raw payload
          const payload = JSON.stringify(xeroContact);
          const payloadHash = crypto.createHash("md5").update(payload).digest("hex");

          await prisma.rawXeroEvent.create({
            data: {
              tenantId: dbTenantId,
              resourceType: "contact",
              resourceId: xeroContact.contactID || "",
              payload: xeroContact as object,
              payloadHash,
            },
          });

          // Upsert contact
          const existingContact = await prisma.contact.findUnique({
            where: {
              tenantId_xeroContactId: {
                tenantId: dbTenantId,
                xeroContactId: xeroContact.contactID || "",
              },
            },
          });

          const contactData = {
            tenantId: dbTenantId,
            xeroContactId: xeroContact.contactID || "",
            name: xeroContact.name || "",
            firstName: xeroContact.firstName || null,
            lastName: xeroContact.lastName || null,
            emailAddress: xeroContact.emailAddress || null,
            isSupplier: xeroContact.isSupplier || false,
            isCustomer: xeroContact.isCustomer || false,
            defaultCurrency: xeroContact.defaultCurrency?.toString() || null,
            taxNumber: xeroContact.taxNumber || null,
            accountsReceivableTaxType: xeroContact.accountsReceivableTaxType || null,
            accountsPayableTaxType: xeroContact.accountsPayableTaxType || null,
            paymentTermsBillsDueDay: xeroContact.paymentTerms?.bills?.day || null,
            paymentTermsBillsDueDayMonth: xeroContact.paymentTerms?.bills?.type ? 
              parseInt(xeroContact.paymentTerms.bills.type.toString()) : null,
            paymentTermsBillsType: xeroContact.paymentTerms?.bills?.type?.toString() || null,
            paymentTermsSalesDueDay: xeroContact.paymentTerms?.sales?.day || null,
            paymentTermsSalesDueDayMonth: xeroContact.paymentTerms?.sales?.type ?
              parseInt(xeroContact.paymentTerms.sales.type.toString()) : null,
            paymentTermsSalesType: xeroContact.paymentTerms?.sales?.type?.toString() || null,
            contactStatus: xeroContact.contactStatus?.toString() || "ACTIVE",
            hasAttachments: xeroContact.hasAttachments || false,
            hasValidationErrors: xeroContact.hasValidationErrors || false,
            updatedDateUtc: xeroContact.updatedDateUTC
              ? new Date(xeroContact.updatedDateUTC)
              : null,
          };

          if (existingContact) {
            await prisma.contact.update({
              where: { id: existingContact.id },
              data: contactData,
            });
            result.updated++;
          } else {
            await prisma.contact.create({
              data: contactData,
            });
            result.created++;
          }
        } catch (error) {
          result.errors.push(
            `Contact ${xeroContact.name}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      page++;
    }

    // Update sync checkpoint
    await prisma.syncCheckpoint.upsert({
      where: {
        tenantId_resourceType: {
          tenantId: dbTenantId,
          resourceType: "contacts",
        },
      },
      create: {
        tenantId: dbTenantId,
        resourceType: "contacts",
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
      `Failed to sync contacts: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return result;
  }
}

/**
 * Gets suppliers
 */
export async function getSuppliers(tenantId: string): Promise<Contact[]> {
  return prisma.contact.findMany({
    where: {
      tenantId,
      isSupplier: true,
      contactStatus: "ACTIVE",
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Gets customers
 */
export async function getCustomers(tenantId: string): Promise<Contact[]> {
  return prisma.contact.findMany({
    where: {
      tenantId,
      isCustomer: true,
      contactStatus: "ACTIVE",
    },
    orderBy: { name: "asc" },
  });
}

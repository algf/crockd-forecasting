import { prisma } from "@/lib/db";
import { format, startOfMonth, endOfMonth } from "date-fns";

export interface VarianceItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  forecast: number;
  actual: number;
  variance: number;
  variancePercent: number;
  isFavorable: boolean;
  supplierBreakdown?: SupplierBreakdown[];
}

export interface SupplierBreakdown {
  contactId: string;
  contactName: string;
  forecast: number;
  actual: number;
  variance: number;
  transactions: TransactionDetail[];
}

export interface TransactionDetail {
  id: string;
  type: "bank_transaction" | "invoice" | "bill";
  date: Date;
  description: string;
  amount: number;
  documentNumber?: string;
  xeroUrl?: string;
}

export interface MonthlyVarianceReport {
  month: Date;
  scenarioId: string;
  scenarioName: string;
  totalForecast: number;
  totalActual: number;
  totalVariance: number;
  items: VarianceItem[];
}

/**
 * Calculate variance between actual and forecast
 */
function calculateVariance(
  actual: number,
  forecast: number,
  isRevenue: boolean
): { variance: number; variancePercent: number; isFavorable: boolean } {
  const variance = actual - forecast;
  const variancePercent = forecast !== 0 ? (variance / Math.abs(forecast)) * 100 : 0;
  
  // For revenue: positive variance is favorable
  // For expenses: negative variance is favorable
  const isFavorable = isRevenue ? variance > 0 : variance < 0;
  
  return { variance, variancePercent, isFavorable };
}

/**
 * Get actuals by account for a given month
 */
async function getMonthlyActualsByAccount(
  tenantId: string,
  month: Date
): Promise<Map<string, number>> {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  // Get bank transactions
  const bankTxns = await prisma.bankTransaction.findMany({
    where: {
      tenantId,
      date: { gte: monthStart, lte: monthEnd },
      status: "AUTHORISED",
    },
    include: {
      lines: {
        include: { account: true },
      },
    },
  });

  const actualsByAccount = new Map<string, number>();

  for (const txn of bankTxns) {
    for (const line of txn.lines) {
      if (line.accountId) {
        const current = actualsByAccount.get(line.accountId) || 0;
        const amount = Number(line.lineAmount);
        
        // SPEND transactions are negative, RECEIVE are positive
        const adjustedAmount = txn.type === "SPEND" ? -Math.abs(amount) : Math.abs(amount);
        actualsByAccount.set(line.accountId, current + adjustedAmount);
      }
    }
  }

  return actualsByAccount;
}

/**
 * Get supplier breakdown for an account
 */
async function getSupplierBreakdown(
  tenantId: string,
  accountId: string,
  month: Date
): Promise<SupplierBreakdown[]> {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  // Get bank transactions for this account
  const lines = await prisma.bankTransactionLine.findMany({
    where: {
      accountId,
      bankTransaction: {
        tenantId,
        date: { gte: monthStart, lte: monthEnd },
        status: "AUTHORISED",
      },
    },
    include: {
      bankTransaction: {
        include: { contact: true },
      },
    },
  });

  // Group by contact
  const byContact = new Map<string, { contact: typeof lines[0]["bankTransaction"]["contact"]; transactions: typeof lines }>();
  
  for (const line of lines) {
    const contactId = line.bankTransaction.contactId || "unknown";
    if (!byContact.has(contactId)) {
      byContact.set(contactId, {
        contact: line.bankTransaction.contact,
        transactions: [],
      });
    }
    byContact.get(contactId)!.transactions.push(line);
  }

  // Build breakdown
  const breakdown: SupplierBreakdown[] = [];
  
  for (const [contactId, { contact, transactions }] of byContact) {
    const actual = transactions.reduce((sum, t) => {
      const amount = Number(t.lineAmount);
      return sum + (t.bankTransaction.type === "SPEND" ? -Math.abs(amount) : Math.abs(amount));
    }, 0);

    breakdown.push({
      contactId,
      contactName: contact?.name || "Unknown",
      forecast: 0, // Would need forecast by supplier
      actual,
      variance: actual, // Simplified
      transactions: transactions.map((t) => ({
        id: t.bankTransaction.id,
        type: "bank_transaction" as const,
        date: t.bankTransaction.date,
        description: t.description || "",
        amount: Number(t.lineAmount),
        documentNumber: t.bankTransaction.reference || undefined,
        xeroUrl: t.bankTransaction.url || undefined,
      })),
    });
  }

  return breakdown.sort((a, b) => Math.abs(b.actual) - Math.abs(a.actual));
}

/**
 * Generate monthly variance report
 */
export async function generateVarianceReport(
  scenarioId: string,
  month: Date
): Promise<MonthlyVarianceReport | null> {
  // Get scenario
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) {
    return null;
  }

  // Get tenant
  const tenant = await prisma.xeroTenant.findFirst({
    where: { isActive: true },
  });

  if (!tenant) {
    return null;
  }

  // Get forecast outputs for this month
  const forecastOutput = await prisma.forecastOutput.findFirst({
    where: {
      scenarioId,
      month: startOfMonth(month),
      statementType: "pl",
    },
  });

  // Get actuals
  const actualsByAccount = await getMonthlyActualsByAccount(tenant.id, month);

  // Get all accounts
  const accounts = await prisma.account.findMany({
    where: { tenantId: tenant.id, status: "ACTIVE" },
  });

  // Build variance items
  const items: VarianceItem[] = [];
  const revenueTypes = ["REVENUE", "OTHERINCOME"];

  for (const account of accounts) {
    const actual = actualsByAccount.get(account.id) || 0;
    
    // Get forecast for this account (simplified - would parse forecastOutput.data)
    const forecast = 0; // Would come from forecast output
    
    if (actual !== 0 || forecast !== 0) {
      const isRevenue = revenueTypes.includes(account.type);
      const { variance, variancePercent, isFavorable } = calculateVariance(actual, forecast, isRevenue);

      items.push({
        accountId: account.id,
        accountCode: account.code || "",
        accountName: account.name,
        accountType: account.type,
        forecast,
        actual,
        variance,
        variancePercent,
        isFavorable,
      });
    }
  }

  // Sort by absolute variance
  items.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  const totalActual = items.reduce((sum, i) => sum + i.actual, 0);
  const totalForecast = items.reduce((sum, i) => sum + i.forecast, 0);

  return {
    month,
    scenarioId,
    scenarioName: scenario.name,
    totalForecast,
    totalActual,
    totalVariance: totalActual - totalForecast,
    items,
  };
}

/**
 * Get top variances for dashboard
 */
export async function getTopVariances(
  scenarioId: string,
  month: Date,
  limit: number = 10
): Promise<VarianceItem[]> {
  const report = await generateVarianceReport(scenarioId, month);
  if (!report) return [];
  
  return report.items.slice(0, limit);
}

/**
 * Get variance with supplier drilldown
 */
export async function getVarianceWithSupplierDrilldown(
  scenarioId: string,
  accountId: string,
  month: Date
): Promise<VarianceItem | null> {
  const tenant = await prisma.xeroTenant.findFirst({
    where: { isActive: true },
  });

  if (!tenant) return null;

  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account) return null;

  const actualsByAccount = await getMonthlyActualsByAccount(tenant.id, month);
  const actual = actualsByAccount.get(accountId) || 0;
  const forecast = 0; // Would come from forecast

  const isRevenue = ["REVENUE", "OTHERINCOME"].includes(account.type);
  const { variance, variancePercent, isFavorable } = calculateVariance(actual, forecast, isRevenue);

  const supplierBreakdown = await getSupplierBreakdown(tenant.id, accountId, month);

  return {
    accountId: account.id,
    accountCode: account.code || "",
    accountName: account.name,
    accountType: account.type,
    forecast,
    actual,
    variance,
    variancePercent,
    isFavorable,
    supplierBreakdown,
  };
}

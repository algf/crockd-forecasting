import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export interface Citation {
  id: string;
  type: "transaction" | "invoice" | "bill" | "contact";
  label: string;
  xeroUrl?: string;
}

export interface ToolResult {
  data: unknown;
  citations: Citation[];
  summary: string;
}

/**
 * Get top suppliers by spend for a given month
 */
export async function topSuppliersByMonth(
  month: Date,
  accountFilters?: string[],
  topN: number = 10
): Promise<ToolResult> {
  const tenant = await prisma.xeroTenant.findFirst({ where: { isActive: true } });
  if (!tenant) {
    return { data: [], citations: [], summary: "No Xero connection found." };
  }

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  // Get bank transactions (SPEND type)
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      tenantId: tenant.id,
      date: { gte: monthStart, lte: monthEnd },
      type: "SPEND",
      status: "AUTHORISED",
      contactId: { not: null },
    },
    include: {
      contact: true,
      lines: {
        include: { account: true },
      },
    },
  });

  // Group by contact
  const spendBySupplier = new Map<
    string,
    { contact: typeof transactions[0]["contact"]; total: number; transactions: typeof transactions }
  >();

  for (const txn of transactions) {
    if (!txn.contact) continue;

    // Filter by account if specified
    if (accountFilters && accountFilters.length > 0) {
      const hasMatchingAccount = txn.lines.some(
        (line: { account?: { code?: string | null } | null }) => 
          line.account && accountFilters.includes(line.account.code || "")
      );
      if (!hasMatchingAccount) continue;
    }

    const contactId = txn.contact.id;
    if (!spendBySupplier.has(contactId)) {
      spendBySupplier.set(contactId, { contact: txn.contact, total: 0, transactions: [] });
    }
    const entry = spendBySupplier.get(contactId)!;
    entry.total += Math.abs(Number(txn.total));
    entry.transactions.push(txn);
  }

  // Sort and take top N
  const sorted = Array.from(spendBySupplier.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);

  // Build citations
  const citations: Citation[] = [];
  for (const entry of sorted) {
    citations.push({
      id: entry.contact!.id,
      type: "contact",
      label: entry.contact!.name,
    });
    for (const txn of entry.transactions.slice(0, 3)) {
      citations.push({
        id: txn.id,
        type: "transaction",
        label: `${format(txn.date, "dd MMM")} - ${txn.reference || "Transaction"}`,
        xeroUrl: txn.url || undefined,
      });
    }
  }

  const data = sorted.map((entry) => ({
    supplier: entry.contact!.name,
    total: entry.total,
    transactionCount: entry.transactions.length,
  }));

  const monthLabel = format(month, "MMMM yyyy");
  const summary =
    sorted.length > 0
      ? `Top ${sorted.length} suppliers by spend in ${monthLabel}: ${sorted
          .slice(0, 3)
          .map((e) => `${e.contact!.name} ($${e.total.toLocaleString()})`)
          .join(", ")}`
      : `No supplier spend found for ${monthLabel}`;

  return { data, citations, summary };
}

/**
 * Get top SaaS/software suppliers this month
 */
export async function topSaasSuppliersThisMonth(topN: number = 10): Promise<ToolResult> {
  // Common SaaS-related account codes (would be configured per org)
  const saasAccountCodes = ["6100", "6101", "6110", "6120"];
  return topSuppliersByMonth(new Date(), saasAccountCodes, topN);
}

/**
 * Get spend trend for a specific supplier
 */
export async function supplierTrend(
  supplierName: string,
  months: number = 6
): Promise<ToolResult> {
  const tenant = await prisma.xeroTenant.findFirst({ where: { isActive: true } });
  if (!tenant) {
    return { data: [], citations: [], summary: "No Xero connection found." };
  }

  // Find contact by name
  const contact = await prisma.contact.findFirst({
    where: {
      tenantId: tenant.id,
      name: { contains: supplierName, mode: "insensitive" },
      isSupplier: true,
    },
  });

  if (!contact) {
    return { data: [], citations: [], summary: `Supplier "${supplierName}" not found.` };
  }

  const now = new Date();
  const trend: { month: string; amount: number }[] = [];
  const citations: Citation[] = [
    { id: contact.id, type: "contact", label: contact.name },
  ];

  for (let i = months - 1; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);

    const transactions = await prisma.bankTransaction.findMany({
      where: {
        tenantId: tenant.id,
        contactId: contact.id,
        date: { gte: monthStart, lte: monthEnd },
        type: "SPEND",
        status: "AUTHORISED",
      },
    });

    let total = 0;
    for (const txn of transactions) {
      total += Math.abs(Number(txn.total));
    }
    trend.push({
      month: format(monthDate, "MMM yyyy"),
      amount: total,
    });

    // Add citations for transactions
    for (const txn of transactions.slice(0, 2)) {
      citations.push({
        id: txn.id,
        type: "transaction",
        label: `${format(txn.date, "dd MMM")} - $${Math.abs(Number(txn.total)).toLocaleString()}`,
        xeroUrl: txn.url || undefined,
      });
    }
  }

  let totalSpend = 0;
  for (const t of trend) {
    totalSpend += t.amount;
  }
  const avgMonthly = totalSpend / months;

  const summary = `${contact.name} spend over ${months} months: Total $${totalSpend.toLocaleString()}, Average $${avgMonthly.toLocaleString()}/month`;

  return { data: { supplier: contact.name, trend, totalSpend, avgMonthly }, citations, summary };
}

/**
 * Get monthly spend summary
 */
export async function monthlySpendSummary(month: Date): Promise<ToolResult> {
  const tenant = await prisma.xeroTenant.findFirst({ where: { isActive: true } });
  if (!tenant) {
    return { data: [], citations: [], summary: "No Xero connection found." };
  }

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const transactions = await prisma.bankTransaction.findMany({
    where: {
      tenantId: tenant.id,
      date: { gte: monthStart, lte: monthEnd },
      status: "AUTHORISED",
    },
    include: {
      lines: {
        include: { account: true },
      },
    },
  });

  // Group by account type
  const byType = new Map<string, number>();
  const citations: Citation[] = [];

  for (const txn of transactions) {
    for (const line of txn.lines) {
      if (line.account) {
        const type = line.account.type;
        const amount = Number(line.lineAmount);
        byType.set(type, (byType.get(type) || 0) + Math.abs(amount));
      }
    }
    if (citations.length < 10) {
      citations.push({
        id: txn.id,
        type: "transaction",
        label: `${format(txn.date, "dd MMM")} - $${Math.abs(Number(txn.total)).toLocaleString()}`,
        xeroUrl: txn.url || undefined,
      });
    }
  }

  const data = Array.from(byType.entries())
    .map(([type, amount]) => ({ type, amount }))
    .sort((a, b) => b.amount - a.amount);

  let totalSpendAmount = 0;
  for (const d of data) {
    totalSpendAmount += d.amount;
  }
  const monthLabel = format(month, "MMMM yyyy");
  const summary = `${monthLabel} spend summary: Total $${totalSpendAmount.toLocaleString()} across ${data.length} categories`;

  return { data, citations, summary };
}

// Tool definitions for OpenAI function calling
export const toolDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "topSuppliersByMonth",
      description:
        "Get the top suppliers by spend amount for a given month. Use this to answer questions like 'What are my top suppliers?' or 'Who did I spend the most with?'",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description: "The month to query in YYYY-MM format (e.g., '2024-01')",
          },
          accountFilters: {
            type: "array",
            items: { type: "string" },
            description:
              "Optional account codes to filter by (e.g., ['6100', '6200'] for specific expense categories)",
          },
          topN: {
            type: "number",
            description: "Number of top suppliers to return (default 10)",
          },
        },
        required: ["month"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "topSaasSuppliersThisMonth",
      description:
        "Get the top SaaS/software suppliers by spend for the current month. Use this for questions about software costs or SaaS expenses.",
      parameters: {
        type: "object",
        properties: {
          topN: {
            type: "number",
            description: "Number of top suppliers to return (default 10)",
          },
        },
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "supplierTrend",
      description:
        "Get the spending trend for a specific supplier over time. Use this for questions like 'How much have we spent with AWS over the past 6 months?'",
      parameters: {
        type: "object",
        properties: {
          supplierName: {
            type: "string",
            description: "Name of the supplier to look up",
          },
          months: {
            type: "number",
            description: "Number of months of history to retrieve (default 6)",
          },
        },
        required: ["supplierName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "monthlySpendSummary",
      description:
        "Get a summary of spend by category for a given month. Use this for questions about overall spending patterns.",
      parameters: {
        type: "object",
        properties: {
          month: {
            type: "string",
            description: "The month to query in YYYY-MM format",
          },
        },
        required: ["month"],
      },
    },
  },
];

// Execute a tool by name
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case "topSuppliersByMonth":
      return topSuppliersByMonth(
        new Date(args.month as string),
        args.accountFilters as string[] | undefined,
        args.topN as number | undefined
      );
    case "topSaasSuppliersThisMonth":
      return topSaasSuppliersThisMonth(args.topN as number | undefined);
    case "supplierTrend":
      return supplierTrend(
        args.supplierName as string,
        args.months as number | undefined
      );
    case "monthlySpendSummary":
      return monthlySpendSummary(new Date(args.month as string));
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

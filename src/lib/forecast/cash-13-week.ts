import { prisma } from "@/lib/db";
import { addDays, addWeeks, startOfWeek, format, isWithinInterval, isBefore } from "date-fns";

export interface WeeklyCashBucket {
  weekStart: Date;
  weekEnd: Date;
  openingCash: number;
  receipts: number;
  payments: number;
  payroll: number;
  tax: number;
  other: number;
  closingCash: number;
  details: {
    receipts: CashItem[];
    payments: CashItem[];
    payroll: CashItem[];
    tax: CashItem[];
  };
}

export interface CashItem {
  id: string;
  type: "ar" | "ap" | "payroll" | "tax" | "other";
  description: string;
  contactName?: string;
  dueDate: Date;
  amount: number;
  documentNumber?: string;
}

export interface Cash13WeekForecast {
  generatedAt: Date;
  openingCashBalance: number;
  weeks: WeeklyCashBucket[];
  lowPoint: {
    weekStart: Date;
    balance: number;
  };
  runway: number; // weeks until cash runs out (if negative trajectory)
}

/**
 * Get opening cash balance from bank accounts
 */
async function getOpeningCashBalance(tenantId: string): Promise<number> {
  // In a real implementation, this would query bank account balances
  // For now, return a mock value
  return 245000;
}

/**
 * Get open AR (invoices due for payment)
 */
async function getOpenReceivables(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<CashItem[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      status: "AUTHORISED",
      amountDue: { gt: 0 },
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      contact: true,
    },
  });

  return invoices.map((inv) => ({
    id: inv.id,
    type: "ar" as const,
    description: `Invoice ${inv.invoiceNumber || inv.id}`,
    contactName: inv.contact?.name || "Unknown",
    dueDate: inv.dueDate,
    amount: Number(inv.amountDue),
    documentNumber: inv.invoiceNumber || undefined,
  }));
}

/**
 * Get open AP (bills due for payment)
 */
async function getOpenPayables(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<CashItem[]> {
  const bills = await prisma.bill.findMany({
    where: {
      tenantId,
      status: "AUTHORISED",
      amountDue: { gt: 0 },
      dueDate: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      contact: true,
    },
  });

  return bills.map((bill) => ({
    id: bill.id,
    type: "ap" as const,
    description: `Bill ${bill.invoiceNumber || bill.id}`,
    contactName: bill.contact?.name || "Unknown",
    dueDate: bill.dueDate,
    amount: -Number(bill.amountDue), // Negative for outflows
    documentNumber: bill.invoiceNumber || undefined,
  }));
}

/**
 * Generate payroll cash items based on settings
 */
async function generatePayrollItems(
  startDate: Date,
  weeks: number
): Promise<CashItem[]> {
  // Get payroll settings
  const payrollSettings = await prisma.payrollSettings.findFirst();
  
  if (!payrollSettings) {
    // Return mock payroll items if no settings
    const items: CashItem[] = [];
    const weeklyPayroll = 8750; // Example weekly payroll
    
    for (let i = 0; i < weeks; i++) {
      const payDate = addWeeks(startDate, i);
      // Assume fortnightly on Fridays
      if (i % 2 === 0) {
        items.push({
          id: `payroll-${i}`,
          type: "payroll",
          description: "Payroll",
          dueDate: payDate,
          amount: -weeklyPayroll * 2,
        });
      }
    }
    return items;
  }

  const items: CashItem[] = [];
  const payrollAmount = 17500; // Would come from forecast or settings

  for (let i = 0; i < weeks; i++) {
    const weekStart = addWeeks(startDate, i);
    
    // Check if this week has a pay day based on cycle
    let hasPayroll = false;
    if (payrollSettings.cycle === "weekly") {
      hasPayroll = true;
    } else if (payrollSettings.cycle === "fortnightly") {
      hasPayroll = i % 2 === 0;
    } else if (payrollSettings.cycle === "monthly") {
      // Check if pay day falls in this week
      const payDay = payrollSettings.payDay;
      const monthStart = new Date(weekStart.getFullYear(), weekStart.getMonth(), payDay);
      hasPayroll = isWithinInterval(monthStart, {
        start: weekStart,
        end: addDays(weekStart, 6),
      });
    }

    if (hasPayroll) {
      items.push({
        id: `payroll-${format(weekStart, "yyyy-MM-dd")}`,
        type: "payroll",
        description: "Payroll",
        dueDate: weekStart,
        amount: payrollSettings.cycle === "weekly"
          ? -(payrollAmount / 4)
          : payrollSettings.cycle === "fortnightly"
          ? -(payrollAmount / 2)
          : -payrollAmount,
      });

      // Add super if applicable
      if (payrollSettings.includeSuper) {
        const superAmount = (Math.abs(payrollAmount) * Number(payrollSettings.superRate)) / 100;
        items.push({
          id: `super-${format(weekStart, "yyyy-MM-dd")}`,
          type: "payroll",
          description: "Superannuation",
          dueDate: weekStart,
          amount: -superAmount / (payrollSettings.cycle === "weekly" ? 4 : payrollSettings.cycle === "fortnightly" ? 2 : 1),
        });
      }
    }
  }

  return items;
}

/**
 * Generate tax payment items based on settings
 */
async function generateTaxItems(
  startDate: Date,
  endDate: Date
): Promise<CashItem[]> {
  // Get tax settings
  const taxSettings = await prisma.taxSettings.findFirst();
  
  const items: CashItem[] = [];
  
  // Mock GST payment
  const gstDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 21);
  if (isBefore(gstDueDate, endDate)) {
    items.push({
      id: "gst-payment",
      type: "tax",
      description: "GST Payment",
      dueDate: gstDueDate,
      amount: -12500, // Mock amount
    });
  }

  // Mock PAYG payment
  const paygDueDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 21);
  if (isBefore(paygDueDate, endDate)) {
    items.push({
      id: "payg-payment",
      type: "tax",
      description: "PAYG Withholding",
      dueDate: paygDueDate,
      amount: -8500, // Mock amount
    });
  }

  return items;
}

/**
 * Build 13-week cash forecast
 */
export async function build13WeekCashForecast(
  tenantId: string
): Promise<Cash13WeekForecast> {
  const now = new Date();
  const startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const endDate = addWeeks(startDate, 13);

  // Get opening balance
  const openingCash = await getOpeningCashBalance(tenantId);

  // Get all cash items
  const receivables = await getOpenReceivables(tenantId, startDate, endDate);
  const payables = await getOpenPayables(tenantId, startDate, endDate);
  const payrollItems = await generatePayrollItems(startDate, 13);
  const taxItems = await generateTaxItems(startDate, endDate);

  // Combine all items
  const allItems = [...receivables, ...payables, ...payrollItems, ...taxItems];

  // Build weekly buckets
  const weeks: WeeklyCashBucket[] = [];
  let runningBalance = openingCash;

  for (let i = 0; i < 13; i++) {
    const weekStart = addWeeks(startDate, i);
    const weekEnd = addDays(weekStart, 6);

    // Filter items for this week
    const weekItems = allItems.filter((item) =>
      isWithinInterval(item.dueDate, { start: weekStart, end: weekEnd })
    );

    // Categorize
    const receipts = weekItems.filter((item) => item.type === "ar");
    const payments = weekItems.filter((item) => item.type === "ap");
    const payroll = weekItems.filter((item) => item.type === "payroll");
    const tax = weekItems.filter((item) => item.type === "tax");

    // Sum amounts
    const totalReceipts = receipts.reduce((sum, item) => sum + item.amount, 0);
    const totalPayments = payments.reduce((sum, item) => sum + item.amount, 0);
    const totalPayroll = payroll.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = tax.reduce((sum, item) => sum + item.amount, 0);

    const openingCashForWeek = runningBalance;
    const netChange = totalReceipts + totalPayments + totalPayroll + totalTax;
    runningBalance += netChange;

    weeks.push({
      weekStart,
      weekEnd,
      openingCash: openingCashForWeek,
      receipts: totalReceipts,
      payments: totalPayments,
      payroll: totalPayroll,
      tax: totalTax,
      other: 0,
      closingCash: runningBalance,
      details: {
        receipts,
        payments,
        payroll,
        tax,
      },
    });
  }

  // Find low point
  const lowPoint = weeks.reduce(
    (min, week) =>
      week.closingCash < min.balance
        ? { weekStart: week.weekStart, balance: week.closingCash }
        : min,
    { weekStart: weeks[0].weekStart, balance: weeks[0].closingCash }
  );

  // Calculate runway (simple linear projection)
  const firstWeek = weeks[0];
  const lastWeek = weeks[weeks.length - 1];
  const weeklyBurn = (lastWeek.closingCash - firstWeek.closingCash) / 13;
  const runway = weeklyBurn < 0 ? Math.ceil(lastWeek.closingCash / Math.abs(weeklyBurn)) : 999;

  return {
    generatedAt: new Date(),
    openingCashBalance: openingCash,
    weeks,
    lowPoint,
    runway,
  };
}

/**
 * Cache 13-week forecast to database
 */
export async function cache13WeekForecast(
  scenarioId: string | null,
  forecast: Cash13WeekForecast
): Promise<void> {
  // Delete existing forecasts
  await prisma.weeklyCashForecast.deleteMany({
    where: { scenarioId },
  });

  // Insert new forecasts
  await prisma.weeklyCashForecast.createMany({
    data: forecast.weeks.map((week) => ({
      scenarioId,
      weekStartDate: week.weekStart,
      openingCash: week.openingCash,
      receipts: week.receipts,
      payments: week.payments,
      payroll: week.payroll,
      tax: week.tax,
      other: week.other,
      closingCash: week.closingCash,
      details: week.details as object,
    })),
  });
}

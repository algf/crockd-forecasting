import { prisma } from "@/lib/db";
import { addMonths, startOfMonth, format } from "date-fns";

export type ForecastMethod =
  | "flat"
  | "mom_growth"
  | "yoy_growth"
  | "seasonality"
  | "step_change"
  | "driver"
  | "manual";

export interface AccountAssumptionParams {
  amount?: number;
  growthRate?: number;
  seasonalityProfile?: number[]; // 12 month weights (Jan-Dec)
  stepChangeDate?: Date;
  stepChangeAmount?: number;
  driverType?: string;
  driverValue?: number;
}

export interface ForecastLineItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  accountClass: string;
  month: Date;
  amount: number;
  source: "assumption" | "override" | "calculated";
}

export interface MonthlyStatement {
  month: Date;
  lines: ForecastLineItem[];
}

export interface ThreeWayOutput {
  profitAndLoss: MonthlyStatement[];
  balanceSheet: MonthlyStatement[];
  cashflow: MonthlyStatement[];
  balanceCheck: number; // Should be 0 if balanced
}

/**
 * Calculate forecast value for a single month based on assumption method
 */
export function calculateForecastValue(
  method: ForecastMethod,
  params: AccountAssumptionParams,
  month: Date,
  baseAmount: number,
  monthIndex: number
): number {
  switch (method) {
    case "flat":
      return params.amount ?? baseAmount;

    case "mom_growth": {
      const growthRate = (params.growthRate ?? 0) / 100;
      return baseAmount * Math.pow(1 + growthRate, monthIndex);
    }

    case "yoy_growth": {
      const annualGrowthRate = (params.growthRate ?? 0) / 100;
      const monthlyGrowthRate = Math.pow(1 + annualGrowthRate, 1 / 12) - 1;
      return baseAmount * Math.pow(1 + monthlyGrowthRate, monthIndex);
    }

    case "seasonality": {
      const baseMonthlyAmount = params.amount ?? baseAmount;
      const profile = params.seasonalityProfile ?? Array(12).fill(1);
      const monthNumber = month.getMonth(); // 0-11
      return baseMonthlyAmount * (profile[monthNumber] ?? 1);
    }

    case "step_change": {
      const stepDate = params.stepChangeDate;
      const stepAmount = params.stepChangeAmount ?? 0;
      if (stepDate && month >= stepDate) {
        return baseAmount + stepAmount;
      }
      return baseAmount;
    }

    case "driver": {
      const driverValue = params.driverValue ?? 0;
      // Simple headcount * cost per head example
      return driverValue * (params.amount ?? 0);
    }

    case "manual":
      // Manual entries come from overrides table
      return params.amount ?? baseAmount;

    default:
      return baseAmount;
  }
}

/**
 * Generate forecast lines for a scenario
 */
export async function generateForecastLines(
  scenarioId: string,
  startDate: Date,
  months: number = 12
): Promise<ForecastLineItem[]> {
  // Get scenario with assumptions
  const scenario = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: {
      accountAssumptions: {
        where: { isEnabled: true },
        include: {
          account: true,
          overrides: true,
        },
      },
    },
  });

  if (!scenario) {
    throw new Error("Scenario not found");
  }

  const forecastLines: ForecastLineItem[] = [];
  const startMonth = startOfMonth(startDate);

  for (const assumption of scenario.accountAssumptions) {
    const account = assumption.account;
    const method = assumption.method as ForecastMethod;
    const params = assumption.parameters as AccountAssumptionParams;

    // Get base amount from last actual (simplified - would need to query actuals)
    const baseAmount = params.amount ?? 0;

    for (let i = 0; i < months; i++) {
      const forecastMonth = addMonths(startMonth, i);

      // Check for override
      const override = assumption.overrides.find(
        (o) => format(o.month, "yyyy-MM") === format(forecastMonth, "yyyy-MM")
      );

      let amount: number;
      let source: "assumption" | "override" | "calculated";

      if (override) {
        amount = Number(override.value);
        source = "override";
      } else {
        amount = calculateForecastValue(method, params, forecastMonth, baseAmount, i);
        source = "assumption";
      }

      forecastLines.push({
        accountId: account.id,
        accountCode: account.code ?? "",
        accountName: account.name,
        accountType: account.type,
        accountClass: account.class ?? "",
        month: forecastMonth,
        amount,
        source,
      });
    }
  }

  return forecastLines;
}

/**
 * Generate P&L statement from forecast lines
 */
export function generateProfitAndLoss(
  forecastLines: ForecastLineItem[]
): MonthlyStatement[] {
  const plAccountTypes = [
    "REVENUE",
    "OTHERINCOME",
    "DIRECTCOSTS",
    "EXPENSE",
    "OVERHEADS",
    "DEPRECIATN",
  ];

  const plLines = forecastLines.filter((line) =>
    plAccountTypes.includes(line.accountType)
  );

  // Group by month
  const byMonth = new Map<string, ForecastLineItem[]>();
  for (const line of plLines) {
    const key = format(line.month, "yyyy-MM");
    if (!byMonth.has(key)) {
      byMonth.set(key, []);
    }
    byMonth.get(key)!.push(line);
  }

  const statements: MonthlyStatement[] = [];
  for (const [_, lines] of byMonth) {
    if (lines.length > 0) {
      statements.push({
        month: lines[0].month,
        lines,
      });
    }
  }

  return statements.sort((a, b) => a.month.getTime() - b.month.getTime());
}

/**
 * Generate Balance Sheet from forecast lines
 */
export function generateBalanceSheet(
  forecastLines: ForecastLineItem[],
  openingBalances: Map<string, number>
): MonthlyStatement[] {
  const bsAccountClasses = ["ASSET", "LIABILITY", "EQUITY"];

  const bsLines = forecastLines.filter(
    (line) => line.accountClass && bsAccountClasses.includes(line.accountClass)
  );

  // Group by month
  const byMonth = new Map<string, ForecastLineItem[]>();
  for (const line of bsLines) {
    const key = format(line.month, "yyyy-MM");
    if (!byMonth.has(key)) {
      byMonth.set(key, []);
    }
    byMonth.get(key)!.push(line);
  }

  const statements: MonthlyStatement[] = [];
  for (const [_, lines] of byMonth) {
    if (lines.length > 0) {
      statements.push({
        month: lines[0].month,
        lines,
      });
    }
  }

  return statements.sort((a, b) => a.month.getTime() - b.month.getTime());
}

/**
 * Generate Cashflow statement
 */
export function generateCashflow(
  profitAndLoss: MonthlyStatement[],
  balanceSheet: MonthlyStatement[]
): MonthlyStatement[] {
  // Simplified direct method
  // Operating: Net Income + Depreciation + Working Capital Changes
  // Investing: Fixed Asset Changes
  // Financing: Debt + Equity Changes

  const cashflowStatements: MonthlyStatement[] = [];

  for (const plMonth of profitAndLoss) {
    // Calculate net income for the month
    let netIncome = 0;
    for (const line of plMonth.lines) {
      if (["REVENUE", "OTHERINCOME"].includes(line.accountType)) {
        netIncome += line.amount;
      } else {
        netIncome -= Math.abs(line.amount);
      }
    }

    // Simplified cashflow line
    const cashflowLine: ForecastLineItem = {
      accountId: "cf-operating",
      accountCode: "CF001",
      accountName: "Cash from Operations",
      accountType: "CASHFLOW",
      accountClass: "OPERATING",
      month: plMonth.month,
      amount: netIncome, // Simplified - would need AR/AP adjustments
      source: "calculated",
    };

    cashflowStatements.push({
      month: plMonth.month,
      lines: [cashflowLine],
    });
  }

  return cashflowStatements;
}

/**
 * Run a full 3-way forecast for a scenario
 */
export async function runThreeWayForecast(
  scenarioId: string,
  startDate: Date = new Date(),
  months: number = 12
): Promise<ThreeWayOutput> {
  // Generate all forecast lines
  const forecastLines = await generateForecastLines(scenarioId, startDate, months);

  // Generate statements
  const profitAndLoss = generateProfitAndLoss(forecastLines);
  const balanceSheet = generateBalanceSheet(forecastLines, new Map());
  const cashflow = generateCashflow(profitAndLoss, balanceSheet);

  // Balance check: Assets = Liabilities + Equity
  let balanceCheck = 0;
  if (balanceSheet.length > 0) {
    const lastMonth = balanceSheet[balanceSheet.length - 1];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const line of lastMonth.lines) {
      if (line.accountClass === "ASSET") {
        totalAssets += line.amount;
      } else if (line.accountClass === "LIABILITY") {
        totalLiabilities += line.amount;
      } else if (line.accountClass === "EQUITY") {
        totalEquity += line.amount;
      }
    }

    balanceCheck = totalAssets - totalLiabilities - totalEquity;
  }

  return {
    profitAndLoss,
    balanceSheet,
    cashflow,
    balanceCheck,
  };
}

/**
 * Cache forecast outputs to database
 */
export async function cacheForecastOutputs(
  scenarioId: string,
  output: ThreeWayOutput
): Promise<void> {
  // Delete existing outputs for this scenario
  await prisma.forecastOutput.deleteMany({
    where: { scenarioId },
  });

  // Insert new outputs
  const outputs = [
    ...output.profitAndLoss.map((stmt) => ({
      scenarioId,
      month: stmt.month,
      statementType: "pl",
      data: stmt.lines as unknown as object,
      isValid: true,
    })),
    ...output.balanceSheet.map((stmt) => ({
      scenarioId,
      month: stmt.month,
      statementType: "bs",
      data: stmt.lines as unknown as object,
      balanceCheck: output.balanceCheck,
      isValid: Math.abs(output.balanceCheck) < 0.01,
    })),
    ...output.cashflow.map((stmt) => ({
      scenarioId,
      month: stmt.month,
      statementType: "cf",
      data: stmt.lines as unknown as object,
      isValid: true,
    })),
  ];

  await prisma.forecastOutput.createMany({
    data: outputs,
  });
}

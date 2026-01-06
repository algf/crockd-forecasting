import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names with Tailwind CSS conflict resolution
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currency = "AUD",
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}

/**
 * Format a number as a compact currency (e.g., $1.2M)
 */
export function formatCompactCurrency(
  amount: number,
  currency = "AUD"
): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

/**
 * Format a number as percentage
 */
export function formatPercentage(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat("en-AU", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    ...options,
  }).format(value / 100);
}

/**
 * Format a date for display
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  }).format(d);
}

/**
 * Format a date as month/year (e.g., "Jan 2024")
 */
export function formatMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-AU", {
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Calculate variance between actual and forecast
 */
export function calculateVariance(
  actual: number,
  forecast: number
): { absolute: number; percentage: number } {
  const absolute = actual - forecast;
  const percentage = forecast !== 0 ? (absolute / forecast) * 100 : 0;
  return { absolute, percentage };
}

/**
 * Determine if a variance is favorable or unfavorable
 * For revenue: positive variance is favorable
 * For expenses: negative variance is favorable
 */
export function isVarianceFavorable(
  variance: number,
  isRevenue: boolean
): boolean {
  return isRevenue ? variance > 0 : variance < 0;
}

/**
 * Generate an array of months for a rolling period
 */
export function generateMonthRange(
  startDate: Date,
  months: number
): Date[] {
  const result: Date[] = [];
  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    date.setDate(1); // First of month
    result.push(date);
  }
  return result;
}

/**
 * Generate an array of weeks for a given number of weeks
 */
export function generateWeekRange(
  startDate: Date,
  weeks: number
): Date[] {
  const result: Date[] = [];
  const start = new Date(startDate);
  // Adjust to Monday
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);

  for (let i = 0; i < weeks; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i * 7);
    result.push(date);
  }
  return result;
}

/**
 * Delay execution (useful for loading states)
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Group an array by a key
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce(
    (result, item) => {
      const key = keyFn(item);
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(item);
      return result;
    },
    {} as Record<K, T[]>
  );
}

/**
 * Sum an array of numbers or objects with a numeric property
 */
export function sum(numbers: number[]): number;
export function sum<T>(items: T[], keyFn: (item: T) => number): number;
export function sum<T>(
  items: number[] | T[],
  keyFn?: (item: T) => number
): number {
  if (keyFn) {
    return (items as T[]).reduce((acc, item) => acc + keyFn(item), 0);
  }
  return (items as number[]).reduce((acc, num) => acc + num, 0);
}

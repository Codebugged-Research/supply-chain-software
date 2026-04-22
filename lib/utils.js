import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Legacy demo list prices were USD-sized; scale to INR for Indian-market display */
export const DEMO_INR_PER_USD = 83

/** Order cashflow bands (same relative cutoffs as former USD thresholds, in INR) */
export const CASHFLOW_ORDER_LOW_INR = 25_000 * DEMO_INR_PER_USD
export const CASHFLOW_ORDER_HIGH_INR = 75_000 * DEMO_INR_PER_USD
export const ORDER_CASHFLOW_METER_MAX_INR = 100_000 * DEMO_INR_PER_USD

/**
 * Compact INR for dashboards (Cr / L / K), Indian English conventions.
 */
export function fmtInrMoney(n, digits = 1) {
  const v = Number(n) || 0
  const sign = v < 0 ? "-" : ""
  const abs = Math.abs(v)
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(digits)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(digits)} L`
  if (abs >= 1e3) return `${sign}₹${(abs / 1e3).toFixed(digits)} K`
  return `${sign}₹${abs.toFixed(2)}`
}

/** Whole rupees with Indian grouping, for sentences and alerts */
export function fmtInrInteger(n) {
  return `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`
}

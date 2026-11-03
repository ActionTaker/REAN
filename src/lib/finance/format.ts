import type { D } from "./decimal";

type Num = D | number | null | undefined;

const toNumber = (v: Num): number | null => {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : v.toNumber();
  return Number.isFinite(n) ? n : null;
};

const usd0 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

export const EMPTY = "—";

/**
 * Currency. Decimal values are rounded half-up to cents (or whole dollars)
 * *before* conversion to a JS number, so formatting never introduces drift.
 */
export function formatCurrency(value: Num, opts: { cents?: boolean; compact?: boolean } = {}): string {
  if (value === null || value === undefined) return EMPTY;
  const rounded = typeof value === "number" ? value : value.toDecimalPlaces(opts.cents ? 2 : 0).toNumber();
  if (!Number.isFinite(rounded)) return EMPTY;
  if (opts.compact) return compact.format(rounded);
  return (opts.cents ? usd2 : usd0).format(rounded);
}

/** Ratio → percent. 0.0725 → "7.25%" */
export function formatPercent(value: Num, digits = 2): string {
  if (value === null || value === undefined) return EMPTY;
  const n = typeof value === "number" ? value : value.times(100).toDecimalPlaces(digits).toNumber();
  if (!Number.isFinite(n)) return EMPTY;
  return `${n.toFixed(digits)}%`;
}

export function formatRatio(value: Num, digits = 2, suffix = ""): string {
  const n = toNumber(value);
  return n === null ? EMPTY : `${n.toFixed(digits)}${suffix}`;
}

export function formatNumber(value: Num, digits = 0): string {
  const n = toNumber(value);
  return n === null ? EMPTY : n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

/** Convert for charting only — never feed this back into calculations. */
export function chartNumber(value: Num, digits = 2): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : value.toDecimalPlaces(digits).toNumber();
}

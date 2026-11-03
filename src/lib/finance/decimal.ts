import Decimal from "decimal.js";

/**
 * Isolated Decimal constructor for all financial math. High internal precision;
 * rounding to cents happens only at presentation time (see `format.ts`).
 */
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type D = InstanceType<typeof D>;

/** Anything that can be turned into a Decimal: plain numbers, numeric strings, Prisma.Decimal, decimal.js. */
export type DecimalLike = number | string | { toString(): string };

export const ZERO = new D(0);
export const ONE = new D(1);
export const TWELVE = new D(12);
export const HUNDRED = new D(100);

export function dec(value: DecimalLike | null | undefined): D {
  if (value === null || value === undefined || value === "") return ZERO;
  const s = typeof value === "number" ? value.toString() : value.toString().trim();
  if (s === "" || s === "-") return ZERO;
  const d = new D(s);
  return d.isFinite() ? d : ZERO;
}

/** 7.25 → 0.0725 */
export function pct(value: DecimalLike | null | undefined): D {
  return dec(value).div(HUNDRED);
}

/** Division that returns null instead of Infinity/NaN, so the UI can show "—". */
export function safeDiv(numerator: D, denominator: D): D | null {
  return denominator.isZero() ? null : numerator.div(denominator);
}

export function sum(values: D[]): D {
  return values.reduce((acc, v) => acc.plus(v), ZERO);
}

export function roundCents(value: D): D {
  return value.toDecimalPlaces(2, D.ROUND_HALF_UP);
}

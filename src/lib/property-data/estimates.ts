import { D, dec, type DecimalLike } from "@/lib/finance/decimal";

/** Linear-interpolated percentile (0–1) of a non-empty list. */
export function percentile(values: D[], p: number): D {
  const sorted = [...values].sort((a, b) => a.comparedTo(b));
  if (sorted.length === 1) return sorted[0];
  const rank = new D(p).times(sorted.length - 1);
  const lo = rank.floor().toNumber();
  const hi = rank.ceil().toNumber();
  const frac = rank.minus(lo);
  return sorted[lo].plus(sorted[hi].minus(sorted[lo]).times(frac));
}

/** Total rent across units from a single-unit estimate. */
export function totalRent(perUnit: DecimalLike, units: number): D {
  return dec(perUnit).times(Math.max(1, units));
}

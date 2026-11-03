import { D, ZERO, dec, safeDiv, type DecimalLike } from "./decimal";

/** Average of outside estimates and how a figure the user entered compares to it. */
export function compareToEstimates(amounts: DecimalLike[], current: DecimalLike | null): { count: number; average: D | null; low: D | null; high: D | null; gap: D | null } {
  const vals = amounts.map((a) => dec(a)).filter((v) => v.gt(0));
  if (vals.length === 0) return { count: 0, average: null, low: null, high: null, gap: null };
  const average = vals.reduce((t, v) => t.plus(v), ZERO).div(vals.length);
  const cur = current === null ? null : dec(current);
  return {
    count: vals.length,
    average,
    low: D.min(...vals),
    high: D.max(...vals),
    // (current − average) ÷ average: +0.05 = 5% above the outside estimates.
    gap: cur && cur.gt(0) ? safeDiv(cur.minus(average), average) : null,
  };
}

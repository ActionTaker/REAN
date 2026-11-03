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

export interface ArvInput {
  valueEstimate: DecimalLike;
  valueHigh?: DecimalLike | null;
  subjectSquareFeet?: number | null;
  comparables: { price: DecimalLike; squareFeet: number | null }[];
}

export interface ArvEstimate {
  estimate: D;
  method: string;
  pricePerSqft: D | null;
  compsUsed: number;
}

const MIN_COMPS = 3;

/**
 * After-repair value from comparable sales.
 *
 * Renovated homes tend to sell at the top of their comp set, so ARV is taken as
 * the 75th-percentile comparable price per square foot × the subject's square
 * footage — never below the as-is automated value, and never above the highest
 * comparable price. (Price per sq ft falls as homes get larger, so $/sq ft × a
 * larger-than-average house overstates value; the cap keeps ARV inside what the
 * market has actually shown.) Without enough comps or square footage, falls
 * back to the top of the AVM range.
 */
export function estimateArv(input: ArvInput): ArvEstimate {
  const asIs = dec(input.valueEstimate);
  const ppsf = input.comparables
    .filter((c) => c.squareFeet && c.squareFeet > 0 && dec(c.price).gt(0))
    .map((c) => dec(c.price).div(c.squareFeet!));

  if (input.subjectSquareFeet && input.subjectSquareFeet > 0 && ppsf.length >= MIN_COMPS) {
    const p75 = percentile(ppsf, 0.75);
    const fromComps = p75.times(input.subjectSquareFeet);
    const maxComp = D.max(...input.comparables.map((c) => dec(c.price)).filter((p) => p.gt(0)));
    const capped = D.min(fromComps, D.max(maxComp, asIs));
    const estimate = D.max(capped, asIs);
    const basis = `75th percentile of ${ppsf.length} comparable sales ($${p75.toDecimalPlaces(0).toString()}/sq ft) × ${input.subjectSquareFeet.toLocaleString("en-US")} sq ft`;
    let method: string;
    if (fromComps.lt(asIs)) method = `As-is value estimate (comparable-sales ARV of ${formatK(fromComps)} came in lower)`;
    else if (fromComps.gt(capped)) method = `Highest comparable price (${formatK(maxComp)}); ${basis} = ${formatK(fromComps)} exceeds every comp`;
    else method = basis;
    return { estimate: roundTo(estimate, 1000), pricePerSqft: p75, compsUsed: ppsf.length, method };
  }

  const high = input.valueHigh ? dec(input.valueHigh) : null;
  if (high && high.gt(asIs)) {
    return {
      estimate: roundTo(high, 1000),
      pricePerSqft: null,
      compsUsed: ppsf.length,
      method: "Upper end of the automated value range (not enough comparable sales with square footage)",
    };
  }
  return { estimate: roundTo(asIs, 1000), pricePerSqft: null, compsUsed: ppsf.length, method: "As-is automated value estimate" };
}

function roundTo(v: D, step: number): D {
  return v.div(step).toDecimalPlaces(0, D.ROUND_HALF_UP).times(step);
}

function formatK(v: D) {
  return `$${v.div(1000).toDecimalPlaces(0).toString()}K`;
}

/** Total rent across units from a single-unit estimate. */
export function totalRent(perUnit: DecimalLike, units: number): D {
  return dec(perUnit).times(Math.max(1, units));
}

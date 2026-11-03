import { D, ZERO, dec, sum, type DecimalLike } from "@/lib/finance/decimal";
import { percentile } from "./estimates";
import type { Comparable } from "./types";

/**
 * Appraiser-style ARV from sales comps.
 *
 * 1. Each comp's price is ADJUSTED toward the subject for differences in size,
 *    bedrooms, bathrooms and age (what an appraiser's grid does), so a larger
 *    or smaller comp no longer skews the answer.
 * 2. Comps are weighted by similarity and closeness.
 * 3. The user can include/exclude any comp and tag its condition; ARV is the
 *    weighted average of comps tagged "renovated", or — with no tags — the
 *    upper quartile of adjusted prices (a finished rehab should sell with the
 *    better homes nearby). Never below the as-is value.
 *
 * Pure: no I/O, decimal math only.
 */

export type CompCondition = "renovated" | "average" | "dated";

export interface CompChoice {
  included: boolean;
  condition: CompCondition | null;
}

export interface ArvSettings {
  /** Size adjustment as % of the median comp $/sq ft (land doesn't scale with size, so < 100%). */
  sizeAdjPct: string;
  /** Per-bedroom difference, % of median comp price. */
  bedAdjPct: string;
  /** Per-bathroom difference, % of median comp price. */
  bathAdjPct: string;
  /** Per year of age difference, % of median comp price… */
  agePctPerYear: string;
  /** …capped at this % of the comp's price. */
  ageCapPct: string;
  /** Drop comps still listed for sale (asking prices, not sales). */
  excludeActive: boolean;
}

export const DEFAULT_ARV_SETTINGS: ArvSettings = {
  sizeAdjPct: "50",
  bedAdjPct: "2",
  bathAdjPct: "1.5",
  agePctPerYear: "0.2",
  ageCapPct: "5",
  excludeActive: false,
};

export interface Subject {
  squareFeet: number | null;
  bedrooms: number | null;
  bathrooms: DecimalLike | null;
  yearBuilt: number | null;
}

export interface CompRow {
  id: string;
  comp: Comparable;
  included: boolean;
  /** Excluded automatically (e.g. active listing when excludeActive is on). */
  autoExcluded: string | null;
  condition: CompCondition | null;
  ppsf: D | null;
  adjustments: { size: D; bedrooms: D; bathrooms: D; age: D };
  adjustedPrice: D;
  weight: D;
}

export type ArvMethodKey = "recommended" | "adjustedAverage" | "ppsf" | "avm";

export interface ArvMethod {
  key: ArvMethodKey;
  label: string;
  value: D | null;
  formula: string;
}

export interface CompsArvResult {
  rows: CompRow[];
  used: number;
  medianPrice: D | null;
  medianPpsf: D | null;
  range: { low: D; high: D } | null;
  methods: ArvMethod[];
  recommended: { value: D; basis: string } | null;
  confidence: { level: "high" | "medium" | "low"; reasons: string[] };
  notes: string[];
}

export const compId = (c: Comparable, i: number) => c.id ?? `${c.address}#${i}`;

const median = (xs: D[]) => (xs.length ? percentile(xs, 0.5) : null);
const roundK = (v: D) => v.div(1000).toDecimalPlaces(0, D.ROUND_HALF_UP).times(1000);

export function isActiveListing(c: Comparable) {
  return (c.status ?? "").toLowerCase() === "active";
}

export function analyzeComps(
  subject: Subject,
  comps: Comparable[],
  choices: Record<string, CompChoice>,
  settings: ArvSettings,
  asIsValue: DecimalLike | null,
): CompsArvResult {
  const notes: string[] = [];
  const priced = comps.filter((c) => dec(c.price).gt(0));
  const basePrices = priced.map((c) => dec(c.price));
  const basePpsf = priced.filter((c) => c.squareFeet).map((c) => dec(c.price).div(c.squareFeet!));
  const medianPrice = median(basePrices);
  const medianPpsf = median(basePpsf);

  const subjBaths = subject.bathrooms !== null && subject.bathrooms !== "" ? dec(subject.bathrooms) : null;
  if (!subject.squareFeet) notes.push("Subject square footage is missing — size adjustments are skipped. Enter it to sharpen the ARV.");
  if (subject.bedrooms === null) notes.push("Subject bedrooms unknown — bedroom adjustments skipped.");
  if (subjBaths === null) notes.push("Subject bathrooms unknown — bathroom adjustments skipped.");

  const pct = (s: string) => dec(s).div(100);
  const rows: CompRow[] = comps.map((c, i) => {
    const id = compId(c, i);
    const choice = choices[id];
    const price = dec(c.price);
    const autoExcluded = !price.gt(0) ? "No price" : settings.excludeActive && isActiveListing(c) ? "Active listing (asking price)" : null;
    const included = autoExcluded ? false : choice?.included ?? true;

    const size = subject.squareFeet && c.squareFeet && medianPpsf
      ? dec(subject.squareFeet - c.squareFeet).times(medianPpsf).times(pct(settings.sizeAdjPct))
      : ZERO;
    const bedrooms = subject.bedrooms !== null && c.bedrooms !== null && medianPrice
      ? dec(subject.bedrooms - c.bedrooms).times(medianPrice).times(pct(settings.bedAdjPct))
      : ZERO;
    const bathrooms = subjBaths !== null && c.bathrooms !== null && medianPrice
      ? subjBaths.minus(c.bathrooms).times(medianPrice).times(pct(settings.bathAdjPct))
      : ZERO;
    let age = ZERO;
    if (subject.yearBuilt && c.yearBuilt && medianPrice) {
      const raw = dec(subject.yearBuilt - c.yearBuilt).times(medianPrice).times(pct(settings.agePctPerYear));
      const cap = price.times(pct(settings.ageCapPct));
      age = D.max(D.min(raw, cap), cap.negated());
    }
    const adjustedPrice = price.plus(size).plus(bedrooms).plus(bathrooms).plus(age);
    // Similarity (0–1, default 0.9) discounted by distance: a comp 1 mile away counts half as much as one next door.
    const weight = dec(c.correlation ?? 0.9).div(dec(1).plus(c.distanceMiles ?? 1));
    return {
      id,
      comp: c,
      included,
      autoExcluded,
      condition: choice?.condition ?? null,
      ppsf: c.squareFeet ? price.div(c.squareFeet) : null,
      adjustments: { size, bedrooms, bathrooms, age },
      adjustedPrice,
      weight,
    };
  });

  const used = rows.filter((r) => r.included);
  const wavg = (rs: CompRow[]) => {
    const w = sum(rs.map((r) => r.weight));
    return w.gt(0) ? sum(rs.map((r) => r.adjustedPrice.times(r.weight))).div(w) : null;
  };
  const adjusted = used.map((r) => r.adjustedPrice);
  const range = adjusted.length >= 2 ? { low: percentile(adjusted, 0.25), high: percentile(adjusted, 0.75) } : null;
  const usedPpsf = used.filter((r) => r.ppsf).map((r) => r.ppsf!);
  const ppsfValue = subject.squareFeet && usedPpsf.length ? median(usedPpsf)!.times(subject.squareFeet) : null;
  const asIs = asIsValue ? dec(asIsValue) : null;

  const renovated = used.filter((r) => r.condition === "renovated");
  let recommended: CompsArvResult["recommended"] = null;
  if (renovated.length > 0) {
    recommended = {
      value: wavg(renovated)!,
      basis: `Weighted average of ${renovated.length} comp${renovated.length > 1 ? "s" : ""} you marked renovated, adjusted to the subject`,
    };
  } else if (adjusted.length >= 3) {
    recommended = {
      value: percentile(adjusted, 0.75),
      basis: `Upper quartile of ${adjusted.length} adjusted comps — assumes the finished rehab sells with the better homes nearby. Mark renovated comps to tighten this.`,
    };
  } else if (adjusted.length > 0) {
    recommended = { value: D.max(...adjusted), basis: "Highest adjusted comp (fewer than 3 comps in use)" };
  }
  if (recommended && asIs && recommended.value.lt(asIs)) {
    recommended = { value: asIs, basis: `${recommended.basis}. Raised to the as-is value, since repairs shouldn't lower value.` };
  }
  if (recommended) recommended = { ...recommended, value: roundK(recommended.value) };

  // Confidence: how many comps, how tightly they agree, how close and similar they are.
  const reasons: string[] = [];
  const spread = range && medianPrice ? range.high.minus(range.low).div(percentile(adjusted, 0.5)) : null;
  const avgDist = used.length ? sum(used.map((r) => dec(r.comp.distanceMiles ?? 1))).div(used.length) : null;
  const avgSim = used.length ? sum(used.map((r) => dec(r.comp.correlation ?? 0.9))).div(used.length) : null;
  let score = 0;
  if (used.length >= 5) score += 2;
  else if (used.length >= 3) score += 1;
  reasons.push(`${used.length} comp${used.length === 1 ? "" : "s"} in use`);
  if (spread) {
    if (spread.lte(0.15)) score += 2;
    else if (spread.lte(0.3)) score += 1;
    reasons.push(`middle half of adjusted prices within ${spread.times(100).toDecimalPlaces(0).toString()}% of each other`);
  }
  if (avgDist) {
    if (avgDist.lte(1)) score += 1;
    reasons.push(`average ${avgDist.toDecimalPlaces(2).toString()} mi away`);
  }
  if (avgSim && avgSim.gte(0.9)) score += 1;
  if (renovated.length > 0) {
    score += 1;
    reasons.push(`${renovated.length} marked renovated`);
  }
  if (!subject.squareFeet) score -= 2;
  const level = score >= 5 ? "high" : score >= 3 ? "medium" : "low";

  const methods: ArvMethod[] = [
    {
      key: "recommended",
      label: "Recommended",
      value: recommended?.value ?? null,
      formula: recommended?.basis ?? "Need at least one comp in use",
    },
    {
      key: "adjustedAverage",
      label: "Adjusted comps average",
      value: (() => {
        const v = wavg(used);
        return v ? roundK(v) : null;
      })(),
      formula: "Average of adjusted comp prices, weighted by similarity ÷ (1 + miles away) — typical condition, not post-rehab",
    },
    {
      key: "ppsf",
      label: "Median $/sq ft × size",
      value: ppsfValue ? roundK(ppsfValue) : null,
      formula: subject.squareFeet ? `Median comp $/sq ft × ${subject.squareFeet.toLocaleString("en-US")} sq ft (no other adjustments)` : "Needs the subject's square footage",
    },
    { key: "avm", label: "Automated as-is value", value: asIs, formula: "RentCast valuation of the property in current condition" },
  ];

  return { rows, used: used.length, medianPrice, medianPpsf, range, methods, recommended, confidence: { level, reasons }, notes };
}

/** Default ARV for a lookup (all comps in, no condition tags) — what "Apply to this deal" fills in. */
export function lookupArv(
  facts: { squareFeet: number | null; bedrooms: number | null; bathrooms: number | null; yearBuilt: number | null },
  value: { estimate: string; comparables: Comparable[] },
): { estimate: string; method: string; pricePerSqft: string | null; compsUsed: number } | null {
  const r = analyzeComps(
    { squareFeet: facts.squareFeet, bedrooms: facts.bedrooms, bathrooms: facts.bathrooms === null ? null : String(facts.bathrooms), yearBuilt: facts.yearBuilt },
    value.comparables,
    {},
    DEFAULT_ARV_SETTINGS,
    value.estimate,
  );
  if (!r.recommended) return null;
  return { estimate: r.recommended.value.toString(), method: r.recommended.basis, pricePerSqft: r.medianPpsf?.toFixed(2) ?? null, compsUsed: r.used };
}

import { D, ZERO, dec, sum, type DecimalLike } from "@/lib/finance/decimal";
import { benchmarkFor } from "./state-data";

export const REHAB_SCOPES = [
  { value: "COSMETIC", label: "Cosmetic", description: "Paint, some flooring, fixtures, hardware, light kitchen/bath refresh" },
  { value: "MODERATE", label: "Moderate", description: "New kitchen & bath finishes, appliances, most flooring, minor systems work" },
  { value: "HEAVY", label: "Heavy", description: "Roof, HVAC, windows, electrical/plumbing updates, full kitchen & baths" },
] as const;

export type RehabScope = (typeof REHAB_SCOPES)[number]["value"];

export interface RehabItem {
  key: string;
  label: string;
  /** Dollar amount as a string (form-friendly, decimal-safe). */
  amount: string;
  /** How the template amount was derived. */
  basis?: string;
}

export interface RehabPlan {
  scope: RehabScope;
  contingencyPct: string;
  items: RehabItem[];
  /** True once the user has edited any line item; the plan then stops auto-updating. */
  customized: boolean;
}

export interface RehabContext {
  squareFeet?: number | null;
  bedrooms?: number | null;
  bathrooms?: DecimalLike | null;
  units?: number | null;
  state?: string | null;
}

/**
 * Line-item templates at U.S.-average 2026 contractor pricing (before the
 * regional factor). `perSqft` scales with living area, `perUnit` with the
 * number of kitchens/units, `perBath` with bathrooms, `flat` is a lump sum.
 */
type Rule = { perSqft?: number; perUnit?: number; perBath?: number; perWindow?: number; flat?: number };
const TEMPLATE: { key: string; label: string; rules: Record<RehabScope, Rule | null> }[] = [
  { key: "paint", label: "Interior paint", rules: { COSMETIC: { perSqft: 2.5 }, MODERATE: { perSqft: 3 }, HEAVY: { perSqft: 3.5 } } },
  { key: "flooring", label: "Flooring", rules: { COSMETIC: { perSqft: 3.3 }, MODERATE: { perSqft: 5.4 }, HEAVY: { perSqft: 7 } } },
  { key: "kitchen", label: "Kitchen", rules: { COSMETIC: { perUnit: 4000 }, MODERATE: { perUnit: 18000 }, HEAVY: { perUnit: 25000 } } },
  { key: "bathrooms", label: "Bathrooms", rules: { COSMETIC: { perBath: 2000 }, MODERATE: { perBath: 8000 }, HEAVY: { perBath: 12000 } } },
  { key: "appliances", label: "Appliances", rules: { COSMETIC: null, MODERATE: { perUnit: 4000 }, HEAVY: { perUnit: 5000 } } },
  { key: "roof", label: "Roof", rules: { COSMETIC: null, MODERATE: null, HEAVY: { perSqft: 6.9 } } },
  { key: "hvac", label: "HVAC", rules: { COSMETIC: null, MODERATE: null, HEAVY: { perUnit: 10000 } } },
  { key: "electrical", label: "Electrical", rules: { COSMETIC: null, MODERATE: { flat: 2000 }, HEAVY: { perSqft: 5 } } },
  { key: "plumbing", label: "Plumbing", rules: { COSMETIC: null, MODERATE: { flat: 2000 }, HEAVY: { perSqft: 4 } } },
  { key: "windows", label: "Windows", rules: { COSMETIC: null, MODERATE: null, HEAVY: { perWindow: 600 } } },
  { key: "exterior", label: "Exterior & landscaping", rules: { COSMETIC: { flat: 2000 }, MODERATE: { flat: 4000 }, HEAVY: { flat: 8000 } } },
  { key: "permits", label: "Permits, dumpster & cleanup", rules: { COSMETIC: { flat: 500 }, MODERATE: { flat: 1500 }, HEAVY: { flat: 4000 } } },
];

export const DEFAULT_CONTINGENCY: Record<RehabScope, string> = { COSMETIC: "10", MODERATE: "15", HEAVY: "15" };
const ASSUMED_SQFT = 1500;

export function buildRehabPlan(scope: RehabScope, ctx: RehabContext): RehabPlan & { assumptions: string[] } {
  const assumptions: string[] = [];
  const { code, data } = benchmarkFor(ctx.state);
  const factor = dec(data.costIndex);
  const sqft = ctx.squareFeet && ctx.squareFeet > 0 ? ctx.squareFeet : (assumptions.push(`${ASSUMED_SQFT.toLocaleString("en-US")} sq ft assumed`), ASSUMED_SQFT);
  const units = Math.max(1, ctx.units ?? 1);
  const bathsRaw = dec(ctx.bathrooms);
  const baths = bathsRaw.gt(0) ? bathsRaw : (assumptions.push(`${units} bath${units > 1 ? "s" : ""} assumed`), dec(units));
  const windows = Math.max(8, Math.round(sqft / 100));
  if (!code) assumptions.push("U.S. average costs (no state)");

  const items: RehabItem[] = [];
  for (const t of TEMPLATE) {
    const r = t.rules[scope];
    if (!r) continue;
    let base = ZERO;
    let basis = "";
    if (r.perSqft) [base, basis] = [dec(r.perSqft).times(sqft), `$${r.perSqft}/sq ft × ${sqft.toLocaleString("en-US")}`];
    else if (r.perUnit) [base, basis] = [dec(r.perUnit).times(units), units > 1 ? `$${r.perUnit.toLocaleString("en-US")} × ${units} units` : `$${r.perUnit.toLocaleString("en-US")}`];
    else if (r.perBath) [base, basis] = [dec(r.perBath).times(baths), `$${r.perBath.toLocaleString("en-US")} × ${baths.toString()} baths`];
    else if (r.perWindow) [base, basis] = [dec(r.perWindow).times(windows), `$${r.perWindow} × ~${windows} windows`];
    else if (r.flat) [base, basis] = [dec(r.flat), "Allowance"];
    const amount = base.times(factor).div(50).toDecimalPlaces(0).times(50);
    items.push({ key: t.key, label: t.label, amount: amount.toString(), basis });
  }
  return { scope, contingencyPct: DEFAULT_CONTINGENCY[scope], items, customized: false, assumptions };
}

export interface RehabTotals {
  subtotal: D;
  contingency: D;
  total: D;
}

export function rehabTotals(plan: Pick<RehabPlan, "items" | "contingencyPct">): RehabTotals {
  const subtotal = sum(plan.items.map((i) => dec(i.amount)));
  const contingency = subtotal.times(dec(plan.contingencyPct)).div(100);
  const total = subtotal.plus(contingency).div(50).toDecimalPlaces(0, D.ROUND_HALF_UP).times(50);
  return { subtotal, contingency, total };
}

export function regionalFactor(state: string | null | undefined): { code: string | null; factor: D } {
  const { code, data } = benchmarkFor(state);
  return { code, factor: dec(data.costIndex) };
}

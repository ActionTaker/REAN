import {
  dec,
  formatCurrency,
  pct,
  rateDeal,
  type CriteriaCheck,
  type DealAnalysis,
  type DealRating,
  type InvestmentCriteria,
  type PriceGoal,
} from "@/lib/finance";

/** Goals the max-offer calculator can solve for. The user picks which apply to each deal. */
type GoalUnit = { prefix?: string; suffix?: string };

export const OFFER_GOALS: readonly { key: OfferGoalKey; label: string; unit: GoalUnit; needsArv: boolean }[] = [
  { key: "breakEven", label: "Cash flow", unit: { prefix: "$", suffix: "/mo" }, needsArv: false },
  { key: "cashFlowPerUnit", label: "Cash flow per unit", unit: { prefix: "$", suffix: "/mo" }, needsArv: false },
  { key: "cashOnCash", label: "Cash-on-cash", unit: { suffix: "%" }, needsArv: false },
  { key: "capRate", label: "Cap rate", unit: { suffix: "%" }, needsArv: false },
  { key: "dscr", label: "DSCR", unit: { suffix: "×" }, needsArv: false },
  { key: "equity", label: "Equity created", unit: { prefix: "$" }, needsArv: true },
  { key: "seventy", label: "70% rule", unit: {}, needsArv: true },
];

export type OfferGoalKey = "breakEven" | "cashFlowPerUnit" | "cashOnCash" | "capRate" | "dscr" | "equity" | "seventy";
export type OfferGoals = Record<OfferGoalKey, { enabled: boolean; target: string }>;

export const STRATEGIES = [
  {
    value: "cashflow",
    label: "Cash flow",
    description: "Buy & hold for monthly income — cash flow, returns and lender coverage",
    enabled: ["breakEven", "cashFlowPerUnit", "cashOnCash", "capRate", "dscr"],
  },
  {
    value: "equity",
    label: "Equity / value-add",
    description: "Buy below value and force appreciation — equity created and the 70% rule, while still breaking even",
    enabled: ["breakEven", "dscr", "equity", "seventy"],
  },
  {
    value: "all",
    label: "Both",
    description: "Every goal must hold",
    enabled: ["breakEven", "cashFlowPerUnit", "cashOnCash", "capRate", "dscr", "equity", "seventy"],
  },
] as const satisfies readonly { value: string; label: string; description: string; enabled: readonly OfferGoalKey[] }[];

export type Strategy = (typeof STRATEGIES)[number]["value"];

/** Targets come from Settings; the cash-flow strategy is on by default. */
export function defaultOfferGoals(c: InvestmentCriteria): OfferGoals {
  const on = new Set<string>(STRATEGIES[0].enabled);
  const g = (key: OfferGoalKey, target: string) => ({ enabled: on.has(key), target });
  return {
    breakEven: g("breakEven", "0"),
    cashFlowPerUnit: g("cashFlowPerUnit", String(c.minMonthlyCashFlowPerUnit)),
    cashOnCash: g("cashOnCash", String(c.targetCashOnCash)),
    capRate: g("capRate", String(c.targetCapRate)),
    dscr: g("dscr", String(c.minDscr)),
    equity: g("equity", "50000"),
    seventy: g("seventy", ""),
  };
}

/** Saved goals merged over defaults, so goals added later still appear for older deals. */
export function resolveOfferGoals(saved: Partial<OfferGoals> | null | undefined, c: InvestmentCriteria): OfferGoals {
  const d = defaultOfferGoals(c);
  if (!saved) return d;
  return Object.fromEntries(OFFER_GOALS.map(({ key }) => [key, { ...d[key], ...saved[key] }])) as OfferGoals;
}

export function applyStrategy(goals: OfferGoals, s: Strategy): OfferGoals {
  const on = new Set<string>(STRATEGIES.find((x) => x.value === s)!.enabled);
  return Object.fromEntries(OFFER_GOALS.map(({ key }) => [key, { ...goals[key], enabled: on.has(key) }])) as OfferGoals;
}

export function currentStrategy(goals: OfferGoals): Strategy | "custom" {
  for (const s of STRATEGIES) {
    const on = new Set<string>(s.enabled);
    if (OFFER_GOALS.every(({ key }) => goals[key].enabled === on.has(key))) return s.value;
  }
  return "custom";
}

/** Parses a typed target; null means "not a number" (shown as an input error, never as "not reachable"). */
export function parseTarget(s: string) {
  const t = s.replace(/[,$%×\s]/g, "");
  return /^-?\d*\.?\d+$/.test(t) ? dec(t) : null;
}

export function toPriceGoal(key: Exclude<OfferGoalKey, "seventy">, target: ReturnType<typeof dec>): PriceGoal {
  switch (key) {
    case "breakEven":
      return { kind: "cashFlow", minMonthly: target };
    case "cashFlowPerUnit":
      return { kind: "cashFlowPerUnit", minMonthly: target };
    case "cashOnCash":
      return { kind: "cashOnCash", minPercent: target };
    case "capRate":
      return { kind: "capRate", minPercent: target };
    case "dscr":
      return { kind: "dscr", min: target };
    case "equity":
      return { kind: "equityCreated", minAmount: target };
  }
}

/**
 * Checks a deal against the goals switched on for it. Goals that can't be
 * evaluated (no ARV, all-cash DSCR, a target that isn't a number) are shown as
 * "not applicable" rather than failed.
 */
export function evaluateGoals(a: DealAnalysis, goals: OfferGoals): CriteriaCheck[] {
  const checks: CriteriaCheck[] = [];
  for (const g of OFFER_GOALS) {
    if (!goals[g.key].enabled) continue;
    const t = parseTarget(goals[g.key].target);
    const money = (v: ReturnType<typeof dec>) => formatCurrency(v);
    switch (g.key) {
      case "breakEven":
        checks.push({ key: g.key, label: "Cash flow / mo", target: t ? `≥ ${money(t)}` : "invalid target", passed: t ? a.monthlyCashFlow.gte(t) : null });
        break;
      case "cashFlowPerUnit":
        checks.push({ key: g.key, label: "Cash flow / unit / mo", target: t ? `≥ ${money(t)}` : "invalid target", passed: t ? a.monthlyCashFlowPerUnit.gte(t) : null });
        break;
      case "cashOnCash":
        checks.push({ key: g.key, label: "Cash-on-cash", target: t ? `≥ ${t.toString()}%` : "invalid target", passed: t && a.cashOnCash ? a.cashOnCash.gte(pct(t)) : null });
        break;
      case "capRate":
        checks.push({ key: g.key, label: "Cap rate", target: t ? `≥ ${t.toString()}%` : "invalid target", passed: t && a.capRate ? a.capRate.gte(pct(t)) : null });
        break;
      case "dscr":
        checks.push({ key: g.key, label: "DSCR", target: t ? `≥ ${t.toString()}` : "invalid target", passed: t && a.dscr ? a.dscr.gte(t) : null });
        break;
      case "equity":
        checks.push({
          key: g.key,
          label: "Equity created",
          target: !a.equityCreated ? "needs an ARV" : t ? `≥ ${money(t)}` : "invalid target",
          passed: t && a.equityCreated ? a.equityCreated.gte(t) : null,
        });
        break;
      case "seventy":
        checks.push({
          key: g.key,
          label: "70% rule",
          target: a.maxOffer70 ? `price ≤ ${money(a.maxOffer70)}` : "needs an ARV",
          passed: a.maxOffer70 ? a.purchasePrice.lte(a.maxOffer70) : null,
        });
        break;
    }
  }
  return checks;
}

/** True when the deal's goals include positive cash flow. */
export function cashFlowRequired(goals: OfferGoals): boolean {
  return goals.breakEven.enabled || goals.cashFlowPerUnit.enabled;
}

export function rateAgainstGoals(a: DealAnalysis, goals: OfferGoals): { checks: CriteriaCheck[]; rating: DealRating } {
  const checks = evaluateGoals(a, goals);
  return { checks, rating: rateDeal(a, checks, { cashFlowRequired: cashFlowRequired(goals) }) };
}

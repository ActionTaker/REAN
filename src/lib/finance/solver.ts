import { D, ZERO, dec, pct } from "./decimal";
import { analyzeDeal } from "./analysis";
import type { DealAnalysis, DealInputs } from "./types";

/**
 * Re-prices a deal, holding every other assumption constant except closing
 * costs, which keep their current share of the price (they're mostly
 * price-driven: transfer taxes, title, lender fees).
 */
export function withPrice(input: DealInputs, price: D): DealInputs {
  const base = dec(input.purchasePrice);
  const closing = dec(input.closingCosts);
  const closingRatio = base.gt(0) ? closing.div(base) : ZERO;
  return { ...input, purchasePrice: price.toString(), closingCosts: price.times(closingRatio).toString() };
}

export type PriceGoal =
  | { kind: "cashFlow"; minMonthly: D }
  | { kind: "cashFlowPerUnit"; minMonthly: D }
  | { kind: "cashOnCash"; minPercent: D }
  | { kind: "capRate"; minPercent: D }
  | { kind: "dscr"; min: D }
  | { kind: "equityCreated"; minAmount: D };

function meets(a: DealAnalysis, goal: PriceGoal): boolean {
  switch (goal.kind) {
    case "cashFlow":
      return a.monthlyCashFlow.gte(goal.minMonthly);
    case "cashFlowPerUnit":
      return a.monthlyCashFlowPerUnit.gte(goal.minMonthly);
    case "cashOnCash":
      // No cash in (price → 0 with nothing else to pay) — positive cash flow counts as meeting it.
      return a.cashOnCash ? a.cashOnCash.gte(pct(goal.minPercent)) : a.annualCashFlow.gt(0);
    case "capRate":
      return a.capRate ? a.capRate.gte(pct(goal.minPercent)) : a.annualNOI.gt(0);
    case "dscr":
      return a.dscr ? a.dscr.gte(goal.min) : a.annualNOI.gt(0);
    case "equityCreated":
      // Needs an ARV; without one there is no equity estimate to meet.
      return a.equityCreated ? a.equityCreated.gte(goal.minAmount) : false;
  }
}

export interface MaxPriceResult {
  /** Highest price meeting the goal, rounded down to $500; null if no positive price works. */
  price: D | null;
  /** True when even the search ceiling meets the goal (so the real answer is higher). */
  unbounded: boolean;
}

/**
 * Highest purchase price at which the deal still meets `goal`.
 * Every supported metric worsens as price rises (more debt service, more cash
 * in, same NOI), so a bisection on price is exact to the $500 rounding.
 */
export function maxPriceFor(input: DealInputs, goal: PriceGoal): MaxPriceResult {
  const check = (p: D) => meets(analyzeDeal(withPrice(input, p), { yearOneOnly: true }), goal);
  const current = dec(input.purchasePrice);
  let hi = D.max(current.times(4), new D(2_000_000));
  if (check(hi)) return { price: hi, unbounded: true };
  let lo = new D(1_000);
  if (!check(lo)) return { price: null, unbounded: false };
  for (let i = 0; i < 60 && hi.minus(lo).gt(1); i++) {
    const mid = lo.plus(hi).div(2);
    if (check(mid)) lo = mid;
    else hi = mid;
  }
  return { price: lo.div(500).floor().times(500), unbounded: false };
}

/** 70% rule ceiling: ARV × 70% − rehab. Null without an ARV. */
export function seventyPercentMax(input: DealInputs): D | null {
  const arv = dec(input.afterRepairValue);
  return arv.gt(0) ? arv.times("0.7").minus(dec(input.rehabCosts)) : null;
}

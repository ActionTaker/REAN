import {
  dec,
  formatCurrency,
  seventyPercentMax,
  type BrrrrAnalysis,
  type CriteriaCheck,
  type D,
  type DealInputs,
  type DealRating,
  type FlipAnalysis,
} from "@/lib/finance";
import type { StrategyGoals, StrategyValue } from "@/lib/strategy";

/** BRRRR / Flip goal checks and rating — shared by client panels and server lists. */

const money = (v: D | null | undefined) => (v ? formatCurrency(v) : "—");
const parse = (s: string) => {
  const t = s.replace(/[,$%\s]/g, "");
  return /^-?\d*\.?\d+$/.test(t) ? dec(t) : null;
};


export function strategyChecks(strategy: Exclude<StrategyValue, "BUY_HOLD">, goals: StrategyGoals, r: { brrrr?: BrrrrAnalysis; flip?: FlipAnalysis }, input: DealInputs) {
  const checks: CriteriaCheck[] = [];
  const seventy = seventyPercentMax(input);
  const price = dec(input.purchasePrice);
  if (strategy === "BRRRR" && r.brrrr) {
    const b = r.brrrr, g = goals.brrrr;
    const t = (s: string) => parse(s);
    if (g.cashLeft.enabled) {
      const v = t(g.cashLeft.target);
      checks.push({ key: "cashLeft", label: "Cash left in deal", target: v ? `≤ ${money(v)}` : "invalid target", passed: v ? b.cashLeftInDeal.lte(v) : null });
    }
    if (g.cashFlow.enabled) {
      const v = t(g.cashFlow.target);
      checks.push({ key: "cashFlow", label: "Cash flow after refi", target: v ? `≥ ${money(v)}/mo` : "invalid target", passed: v ? b.rental.monthlyCashFlow.gte(v) : null });
    }
    if (g.dscr.enabled) {
      const v = t(g.dscr.target);
      checks.push({ key: "dscr", label: "DSCR after refi", target: v ? `≥ ${v.toString()}` : "invalid target", passed: v && b.rental.dscr ? b.rental.dscr.gte(v) : null });
    }
    if (g.seventy.enabled) checks.push({ key: "seventy", label: "70% rule", target: seventy ? `price ≤ ${money(seventy)}` : "needs an ARV", passed: seventy ? price.lte(seventy) : null });
  }
  if (strategy === "FLIP" && r.flip) {
    const f = r.flip, g = goals.flip;
    if (g.profit.enabled) {
      const v = parse(g.profit.target);
      checks.push({ key: "profit", label: "Net profit", target: v ? `≥ ${money(v)}` : "invalid target", passed: v ? f.profit.gte(v) : null });
    }
    if (g.roi.enabled) {
      const v = parse(g.roi.target);
      checks.push({ key: "roi", label: "ROI on cash", target: v ? `≥ ${v.toString()}%` : "invalid target", passed: v && f.roi ? f.roi.gte(v.div(100)) : null });
    }
    if (g.seventy.enabled) checks.push({ key: "seventy", label: "70% rule", target: seventy ? `price ≤ ${money(seventy)}` : "needs an ARV", passed: seventy ? price.lte(seventy) : null });
  }
  return checks;
}

/** Losing money on the core outcome (negative post-refi cash flow, negative flip profit) dominates the rating. */
export function rateStrategy(strategy: Exclude<StrategyValue, "BUY_HOLD">, checks: CriteriaCheck[], r: { brrrr?: BrrrrAnalysis; flip?: FlipAnalysis }): DealRating {
  if (strategy === "FLIP" && r.flip?.profit.isNegative()) return "negative";
  if (strategy === "BRRRR" && r.brrrr?.rental.monthlyCashFlow.isNegative()) return "negative";
  const applicable = checks.filter((c) => c.passed !== null);
  const passed = applicable.filter((c) => c.passed).length;
  if (applicable.length === 0) return "moderate";
  if (passed === applicable.length) return "strong";
  if (passed >= Math.ceil(applicable.length / 2)) return "moderate";
  return "weak";
}


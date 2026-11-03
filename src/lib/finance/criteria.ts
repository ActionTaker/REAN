import { dec, pct, type DecimalLike } from "./decimal";
import type { DealAnalysis } from "./types";

export interface InvestmentCriteria {
  targetCapRate: DecimalLike;
  targetCashOnCash: DecimalLike;
  minMonthlyCashFlowPerUnit: DecimalLike;
  minDscr: DecimalLike;
}

export const DEFAULT_CRITERIA: InvestmentCriteria = {
  targetCapRate: 6,
  targetCashOnCash: 6,
  minMonthlyCashFlowPerUnit: 100,
  minDscr: 1.25,
};

export interface CriteriaCheck {
  key: string;
  label: string;
  target: string;
  passed: boolean | null;
}

/** Compares a deal against the user's own thresholds. Purely informational. */
export function evaluateCriteria(a: DealAnalysis, c: InvestmentCriteria): CriteriaCheck[] {
  const capTarget = pct(c.targetCapRate);
  const cocTarget = pct(c.targetCashOnCash);
  const cfTarget = dec(c.minMonthlyCashFlowPerUnit);
  const dscrTarget = dec(c.minDscr);
  return [
    {
      key: "capRate",
      label: "Cap rate",
      target: `≥ ${dec(c.targetCapRate).toString()}%`,
      passed: a.capRate ? a.capRate.gte(capTarget) : null,
    },
    {
      key: "cashOnCash",
      label: "Cash-on-cash",
      target: `≥ ${dec(c.targetCashOnCash).toString()}%`,
      passed: a.cashOnCash ? a.cashOnCash.gte(cocTarget) : null,
    },
    {
      key: "cashFlow",
      label: "Cash flow / unit / mo",
      target: `≥ $${cfTarget.toString()}`,
      passed: a.monthlyCashFlowPerUnit.gte(cfTarget),
    },
    {
      key: "dscr",
      label: "DSCR",
      target: `≥ ${dscrTarget.toString()}`,
      // An all-cash deal has no debt service, so the DSCR test doesn't apply.
      passed: a.dscr ? a.dscr.gte(dscrTarget) : null,
    },
  ];
}

export type DealRating = "strong" | "moderate" | "weak" | "negative";

/**
 * Summary label from criteria checks. Negative cash flow dominates when cash
 * flow is one of the deal's goals; for equity-focused deals it's left to the checks.
 */
export function rateDeal(a: DealAnalysis, checks: CriteriaCheck[], opts: { cashFlowRequired?: boolean } = {}): DealRating {
  if ((opts.cashFlowRequired ?? true) && a.monthlyCashFlow.isNegative()) return "negative";
  const applicable = checks.filter((c) => c.passed !== null);
  const passed = applicable.filter((c) => c.passed).length;
  if (applicable.length === 0) return "moderate";
  if (passed === applicable.length) return "strong";
  if (passed >= Math.ceil(applicable.length / 2)) return "moderate";
  return "weak";
}

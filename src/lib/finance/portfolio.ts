import { ZERO, sum, safeDiv, type D } from "./decimal";
import type { DealAnalysis } from "./types";

export interface PortfolioSummary {
  count: number;
  totalPurchasePrice: D;
  totalCashInvested: D;
  totalMonthlyIncome: D;
  totalMonthlyCashFlow: D;
  averageCapRate: D | null;
  averageCashOnCash: D | null;
  /** Total NOI ÷ total price — weights larger properties more heavily. */
  weightedCapRate: D | null;
}

/** Aggregates saved deals. Averages are simple (unweighted) means across properties. */
export function summarizePortfolio(analyses: DealAnalysis[]): PortfolioSummary {
  const capRates = analyses.map((a) => a.capRate).filter((v): v is D => v !== null);
  const cocs = analyses.map((a) => a.cashOnCash).filter((v): v is D => v !== null);
  const totalPurchasePrice = sum(analyses.map((a) => a.purchasePrice));
  return {
    count: analyses.length,
    totalPurchasePrice,
    totalCashInvested: sum(analyses.map((a) => a.totalCashInvested)),
    totalMonthlyIncome: sum(analyses.map((a) => a.grossMonthlyIncome)),
    totalMonthlyCashFlow: sum(analyses.map((a) => a.monthlyCashFlow)),
    averageCapRate: capRates.length ? sum(capRates).div(capRates.length) : null,
    averageCashOnCash: cocs.length ? sum(cocs).div(cocs.length) : null,
    weightedCapRate: analyses.length ? safeDiv(sum(analyses.map((a) => a.annualNOI)), totalPurchasePrice) : null,
  };
}

export const EMPTY_PORTFOLIO: PortfolioSummary = {
  count: 0,
  totalPurchasePrice: ZERO,
  totalCashInvested: ZERO,
  totalMonthlyIncome: ZERO,
  totalMonthlyCashFlow: ZERO,
  averageCapRate: null,
  averageCashOnCash: null,
  weightedCapRate: null,
};

import { test } from "node:test";
import assert from "node:assert/strict";
import { dec } from "./decimal";
import { DEFAULT_STRATEGY_INPUTS, analyzeBrrrr, analyzeFlip, holdPhase, type StrategyInputs } from "./strategies";
import type { DealInputs } from "./types";

const deal: DealInputs = {
  purchasePrice: 150_000, closingCosts: 4_500, rehabCosts: 40_000, afterRepairValue: 260_000,
  isCashPurchase: false, downPaymentPercent: 25, interestRate: 7, loanTermYears: 30,
  monthlyRent: 2_100, otherMonthlyIncome: 0, vacancyRate: 5,
  propertyTaxAnnual: 2_400, insuranceAnnual: 1_200, hoaMonthly: 0, utilitiesMonthly: 0, otherMonthlyExpenses: 0,
  maintenancePercent: 5, capexPercent: 5, managementPercent: 8,
  appreciationRate: 3, rentGrowthRate: 3, expenseGrowthRate: 2.5, sellingCostPercent: 6, holdingPeriodYears: 30, units: 1,
};
const s = DEFAULT_STRATEGY_INPUTS; // hard money 90% LTC + 100% rehab, 11% IO, 2 pts, 6 months, $250 utilities
const c = (v: { toFixed(n: number): string }) => v.toFixed(2);

test("hold phase with hard money (hand-calculated)", () => {
  const h = holdPhase(deal, s);
  assert.equal(c(h.loanAmount), "175000.00"); // 135,000 + 40,000 rehab
  assert.equal(c(h.points), "3500.00");
  assert.equal(c(h.interestPaid), "9625.00"); // 175,000 × 11% ÷ 12 × 6
  assert.equal(c(h.holdingCosts), "3300.00"); // (300 tax+ins + 250 utilities) × 6
  assert.equal(c(h.cashAtPurchase), "23000.00"); // 15,000 down + 4,500 closing + 3,500 points
  assert.equal(c(h.totalCashIn), "35925.00");
  assert.equal(c(h.allInCost), "210925.00");
  assert.equal(c(h.payoff), "175000.00"); // interest-only
});

test("BRRRR refinance (hand-calculated)", () => {
  const b = analyzeBrrrr(deal, s);
  assert.equal(c(b.refiLoan), "195000.00"); // 75% of 260,000
  assert.equal(c(b.refiClosingCosts), "3900.00");
  assert.equal(c(b.cashOut), "16100.00"); // 195,000 − 175,000 − 3,900
  assert.equal(c(b.cashLeftInDeal), "19825.00"); // 35,925 − 16,100
  assert.equal(c(b.equityAfterRefi), "65000.00");
  // Post-refi rental uses the new 195,000 loan at 7.25% / 30 yrs, returns measured on cash left in.
  assert.equal(c(b.rental.loanAmount), "195000.00");
  assert.equal(c(b.rental.totalCashInvested), "19825.00");
  assert.equal(b.rental.cashOnCash!.toFixed(6), b.rental.annualCashFlow.div(19_825).toFixed(6));
  assert.equal(b.infiniteReturn, false);
});

test("BRRRR: pulling out everything gives an infinite return, not a divide-by-zero", () => {
  const rich = analyzeBrrrr({ ...deal, afterRepairValue: 320_000, monthlyRent: 3_200 }, s);
  assert.ok(!rich.cashLeftInDeal.gt(0));
  assert.equal(rich.rental.cashOnCash, null);
  assert.equal(rich.infiniteReturn, true);
});

test("Flip P&L (hand-calculated)", () => {
  const f = analyzeFlip(deal, s);
  assert.equal(c(f.sellingCosts), "20800.00"); // 8% of 260,000
  assert.equal(c(f.profit), "28275.00"); // 260,000 − 20,800 − 210,925
  assert.equal(f.roi!.toFixed(4), dec(28_275).div(35_925).toFixed(4));
  assert.equal(f.annualizedRoi!.toFixed(4), dec(1).plus(f.roi!).pow(2).minus(1).toFixed(4)); // 6 months → squared
  assert.equal(c(f.breakEvenSalePrice), "229266.30"); // 210,925 ÷ 0.92
  assert.equal(c(f.netSaleProceeds), "64200.00"); // 260,000 − 20,800 − 175,000 payoff
  // Explicit sale price overrides ARV.
  assert.equal(c(analyzeFlip(deal, { ...s, flip: { ...s.flip, salePrice: "250000" } }).salePrice), "250000.00");
});

test("cash and conventional acquisition", () => {
  const cash: StrategyInputs = { ...s, acquisition: { ...s.acquisition, type: "cash" } };
  const h = holdPhase(deal, cash);
  assert.equal(c(h.loanAmount), "0.00");
  assert.equal(c(h.cashAtPurchase), "194500.00"); // everything in cash
  assert.equal(c(h.financingCosts), "0.00");
  const conv: StrategyInputs = { ...s, acquisition: { ...s.acquisition, type: "conventional" } };
  const k = holdPhase(deal, conv);
  assert.equal(c(k.loanAmount), "112500.00"); // 75% of price; rehab paid in cash
  assert.ok(k.principalPaid.gt(0) && k.payoff.lt(k.loanAmount));
  assert.equal(c(k.cashAtPurchase), "82000.00"); // 37,500 down + 4,500 + 40,000 rehab
});

test("missing ARV falls back to price + rehab and is flagged", () => {
  const h = holdPhase({ ...deal, afterRepairValue: "" }, s);
  assert.equal(h.arvMissing, true);
  assert.equal(c(h.arv), "190000.00");
});

test("strategy max prices sit exactly at their thresholds", async () => {
  const { brrrrMaxPrice, flipMaxPriceForProfit, flipMaxPriceForRoi } = await import("./strategy-tools");
  const { withPrice } = await import("./solver");
  const b = brrrrMaxPrice(deal, s, 0); // full cash-out
  assert.ok(b.price && analyzeBrrrr(withPrice(deal, b.price), s).cashLeftInDeal.lte(0));
  assert.ok(analyzeBrrrr(withPrice(deal, b.price.plus(600)), s).cashLeftInDeal.gt(0));
  const f = flipMaxPriceForProfit(deal, s, 30_000);
  assert.ok(f.price && analyzeFlip(withPrice(deal, f.price), s).profit.gte(30_000));
  assert.ok(analyzeFlip(withPrice(deal, f.price.plus(600)), s).profit.lt(30_000));
  const r = flipMaxPriceForRoi(deal, s, 25);
  assert.ok(r.price && analyzeFlip(withPrice(deal, r.price), s).roi!.gte(0.25));
});

test("strategy stress tests: each shock hurts; combined is worst", async () => {
  const { brrrrStress, flipStress } = await import("./strategy-tools");
  const b = brrrrStress(deal, s);
  for (const r of b.rows) assert.ok(r.cashLeftInDeal.gte(b.base.cashLeftInDeal) || r.monthlyCashFlow.lt(b.base.monthlyCashFlow), r.key);
  assert.ok(b.combined.cashLeftInDeal.gt(b.base.cashLeftInDeal));
  const f = flipStress(deal, s);
  for (const r of f.rows) assert.ok(r.profit.lt(f.base.profit), r.key);
  assert.ok(f.combined.profit.lt(f.rows.at(-1)!.profit));
  assert.ok(f.breakEvenPrice.price && f.breakEvenPrice.price.lt(150_000));
});

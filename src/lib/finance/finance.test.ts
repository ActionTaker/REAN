import { test } from "node:test";
import assert from "node:assert/strict";
import { D, dec } from "./decimal";
import { amortizationByYear, monthlyPayment, remainingBalance } from "./mortgage";
import { irr } from "./irr";
import { analyzeDeal } from "./analysis";
import { evaluateCriteria, rateDeal, DEFAULT_CRITERIA } from "./criteria";
import { summarizePortfolio } from "./portfolio";
import { formatCurrency, formatPercent } from "./format";
import type { DealInputs } from "./types";

const cents = (d: D) => d.toFixed(2);

test("monthly payment matches standard amortization tables", () => {
  assert.equal(cents(monthlyPayment(dec(200_000), 6.5, 30)), "1264.14");
  assert.equal(cents(monthlyPayment(dec(300_000), 7, 30)), "1995.91");
  assert.equal(cents(monthlyPayment(dec(150_000), 5, 15)), "1186.19");
});

test("zero-interest and zero-loan edge cases", () => {
  assert.equal(cents(monthlyPayment(dec(120_000), 0, 30)), "333.33");
  assert.equal(cents(monthlyPayment(dec(0), 7, 30)), "0.00");
  assert.equal(cents(monthlyPayment(dec(100_000), 7, 0)), "0.00");
});

test("amortization pays the loan off exactly and agrees with the closed-form balance", () => {
  const loan = dec(250_000);
  const rows = amortizationByYear(loan, 6.75, 30);
  assert.equal(rows.length, 30);
  const totalPrincipal = rows.reduce((acc, r) => acc.plus(r.principal), new D(0));
  assert.equal(cents(totalPrincipal), "250000.00");
  assert.equal(cents(rows[29].endingBalance), "0.00");
  assert.equal(cents(rows[4].endingBalance), cents(remainingBalance(loan, 6.75, 30, 60)));
});

test("irr solves textbook cases", () => {
  assert.equal(irr([dec(-100), dec(110)])!.toFixed(6), "0.100000");
  assert.equal(irr([dec(-1000), dec(100), dec(100), dec(1100)])!.toFixed(6), "0.100000");
  assert.equal(irr([dec(100), dec(100)]), null); // no sign change
});

const baseDeal: DealInputs = {
  purchasePrice: 200_000,
  closingCosts: 6_000,
  rehabCosts: 4_000,
  isCashPurchase: false,
  downPaymentPercent: 25,
  interestRate: 7,
  loanTermYears: 30,
  monthlyRent: 2_000,
  otherMonthlyIncome: 0,
  vacancyRate: 5,
  propertyTaxAnnual: 2_400,
  insuranceAnnual: 1_200,
  hoaMonthly: 0,
  utilitiesMonthly: 0,
  otherMonthlyExpenses: 0,
  maintenancePercent: 5,
  capexPercent: 5,
  managementPercent: 8,
  appreciationRate: 3,
  rentGrowthRate: 3,
  expenseGrowthRate: 2.5,
  sellingCostPercent: 6,
  holdingPeriodYears: 10,
  units: 1,
  squareFeet: 1_600,
};

test("hand-calculated buy & hold deal", () => {
  const a = analyzeDeal(baseDeal);
  assert.equal(cents(a.downPayment), "50000.00");
  assert.equal(cents(a.loanAmount), "150000.00");
  assert.equal(cents(a.totalCashInvested), "60000.00");
  assert.equal(cents(a.monthlyMortgagePayment), "997.95");

  // Income: 2,000 gross − 100 vacancy = 1,900 collected
  assert.equal(cents(a.effectiveMonthlyIncome), "1900.00");
  // Expenses: tax 200 + ins 100 + maint 100 + capex 100 + mgmt 152 (8% of 1,900)
  assert.equal(cents(a.monthlyOperatingExpenses), "652.00");
  assert.equal(cents(a.annualNOI), "14976.00");
  assert.equal(a.capRate!.toFixed(5), "0.07488");

  const annualDebt = monthlyPayment(dec(150_000), 7, 30).times(12);
  assert.equal(cents(a.annualDebtService), cents(annualDebt));
  assert.equal(cents(a.annualCashFlow), cents(dec(14_976).minus(annualDebt)));
  assert.equal(a.cashOnCash!.toFixed(4), dec(14_976).minus(annualDebt).div(60_000).toFixed(4));
  assert.equal(a.dscr!.toFixed(4), dec(14_976).div(annualDebt).toFixed(4));
  assert.equal(a.onePercentRule!.toFixed(4), "0.0100");
  assert.equal(a.grossRentMultiplier!.toFixed(4), "8.3333");
  assert.equal(cents(a.pricePerSquareFoot!), "125.00");
});

test("projections compound rent, expenses and value", () => {
  const a = analyzeDeal(baseDeal);
  assert.equal(a.projections.length, 10);
  assert.equal(cents(a.projections[0].noi), cents(a.annualNOI));
  assert.equal(cents(a.projections[1].grossIncome), "24720.00"); // 24,000 × 1.03
  assert.equal(cents(a.projections[0].propertyValue), "206000.00");
  // Sale: value × (1 − 6%) − balance
  const last = a.projections[9];
  assert.equal(
    cents(a.sale.netSaleProceeds),
    cents(last.propertyValue.times(0.94).minus(last.loanBalance)),
  );
  assert.ok(a.sale.irr && a.sale.irr.gt(0.05) && a.sale.irr.lt(0.25));
});

test("all-cash purchase has no debt service", () => {
  const a = analyzeDeal({ ...baseDeal, isCashPurchase: true });
  assert.equal(cents(a.loanAmount), "0.00");
  assert.equal(cents(a.monthlyMortgagePayment), "0.00");
  assert.equal(a.dscr, null);
  assert.equal(cents(a.totalCashInvested), "210000.00");
  assert.equal(cents(a.annualCashFlow), cents(a.annualNOI));
});

test("decimal math avoids floating-point drift", () => {
  const a = analyzeDeal({ ...baseDeal, monthlyRent: "0.1", otherMonthlyIncome: "0.2", vacancyRate: 0,
    propertyTaxAnnual: 0, insuranceAnnual: 0, maintenancePercent: 0, capexPercent: 0, managementPercent: 0 });
  assert.equal(a.grossMonthlyIncome.toString(), "0.3"); // 0.1 + 0.2 !== 0.3 in IEEE-754
});

test("zero price does not produce Infinity", () => {
  const a = analyzeDeal({ ...baseDeal, purchasePrice: 0, closingCosts: 0, rehabCosts: 0 });
  assert.equal(a.capRate, null);
  assert.equal(a.cashOnCash, null);
  assert.equal(formatPercent(a.capRate), "—");
});

test("criteria and rating", () => {
  const a = analyzeDeal(baseDeal);
  const checks = evaluateCriteria(a, DEFAULT_CRITERIA);
  const byKey = Object.fromEntries(checks.map((c) => [c.key, c.passed]));
  assert.equal(byKey.capRate, true); // 7.49% ≥ 6%
  assert.equal(byKey.cashOnCash, false); // ~5.0% < 6%
  assert.equal(byKey.cashFlow, true); // ~$250 ≥ $100
  assert.equal(byKey.dscr, true); // 1.25 ≥ 1.25
  assert.equal(rateDeal(a, checks), "moderate");
  const losing = analyzeDeal({ ...baseDeal, monthlyRent: 1_200 });
  assert.equal(rateDeal(losing, evaluateCriteria(losing, DEFAULT_CRITERIA)), "negative");
});

test("portfolio summary", () => {
  const a = analyzeDeal(baseDeal);
  const b = analyzeDeal({ ...baseDeal, purchasePrice: 300_000, monthlyRent: 2_600 });
  const s = summarizePortfolio([a, b]);
  assert.equal(s.count, 2);
  assert.equal(cents(s.totalPurchasePrice), "500000.00");
  assert.equal(cents(s.totalMonthlyIncome), "4600.00");
  assert.equal(s.averageCapRate!.toFixed(8), a.capRate!.plus(b.capRate!).div(2).toFixed(8));
});

test("formatting rounds half-up on the decimal before display", () => {
  assert.equal(formatCurrency(dec("1234.565"), { cents: true }), "$1,234.57");
  assert.equal(formatCurrency(dec("-250.5")), "-$251");
  assert.equal(formatPercent(dec("0.074885")), "7.49%");
});

test("deal schema reports empty / malformed numbers instead of throwing", async () => {
  const { dealSchema } = await import("../validation/deal");
  const base = {
    name: "x", propertyType: "SINGLE_FAMILY", status: "ANALYZING", units: "1", purchasePrice: "", closingCosts: "abc",
    rehabCosts: "0", isCashPurchase: false, downPaymentPercent: "25", interestRate: "7", loanTermYears: "30",
    monthlyRent: "1,500", otherMonthlyIncome: "0", vacancyRate: "5", propertyTaxAnnual: "0", insuranceAnnual: "0",
    hoaMonthly: "0", utilitiesMonthly: "0", otherMonthlyExpenses: "0", maintenancePercent: "5", capexPercent: "5",
    managementPercent: "8", appreciationRate: "3", rentGrowthRate: "3", expenseGrowthRate: "2.5",
    sellingCostPercent: "6", holdingPeriodYears: "10",
  };
  const bad = dealSchema.safeParse(base);
  assert.equal(bad.success, false);
  const fields = Object.keys(bad.error!.flatten().fieldErrors);
  assert.ok(fields.includes("purchasePrice") && fields.includes("closingCosts"));
  const good = dealSchema.safeParse({ ...base, purchasePrice: "$250,000", closingCosts: "5000" });
  assert.equal(good.success, true);
  assert.equal(good.data!.purchasePrice, "250000");
  assert.equal(good.data!.monthlyRent, "1500");
});

test("ARV becomes the projection base and drives equity / 70% rule", () => {
  const noArv = analyzeDeal(baseDeal);
  assert.equal(noArv.afterRepairValue, null);
  assert.equal(noArv.equityCreated, null);
  const a = analyzeDeal({ ...baseDeal, afterRepairValue: "240000" });
  assert.equal(cents(a.startingValue), "240000.00");
  assert.equal(cents(a.projections[0].propertyValue), "247200.00"); // 240,000 × 1.03
  assert.equal(cents(a.equityCreated!), "30000.00"); // 240,000 − 210,000
  assert.equal(cents(a.maxOffer70!), "164000.00"); // 168,000 − 4,000
  assert.equal(cents(a.yearOneAppreciation), "7200.00");
  // Cash-flow metrics are unaffected by ARV.
  assert.equal(cents(a.annualCashFlow), cents(noArv.annualCashFlow));
  assert.equal(cents(analyzeDeal({ ...baseDeal, afterRepairValue: "" }).startingValue), "200000.00");
});

test("max price solver finds the exact threshold for each goal", async () => {
  const { maxPriceFor, withPrice, seventyPercentMax } = await import("./solver");
  const check = (price: D) => analyzeDeal(withPrice(baseDeal, price));

  // Cap rate has a closed form: NOI ÷ target. NOI = 14,976 → 6% ⇒ 249,600.
  const cap = maxPriceFor(baseDeal, { kind: "capRate", minPercent: dec(6) });
  assert.equal(cap.price!.toString(), "249500"); // rounded down to $500

  for (const goal of [
    { kind: "cashFlow" as const, minMonthly: dec(0) },
    { kind: "cashOnCash" as const, minPercent: dec(8) },
    { kind: "dscr" as const, min: dec("1.25") },
  ]) {
    const r = maxPriceFor(baseDeal, goal);
    assert.ok(r.price && !r.unbounded);
    const at = check(r.price!);
    const above = check(r.price!.plus(600));
    if (goal.kind === "cashFlow") assert.ok(at.monthlyCashFlow.gte(0) && above.monthlyCashFlow.lt(0));
    if (goal.kind === "cashOnCash") assert.ok(at.cashOnCash!.gte(0.08) && above.cashOnCash!.lt(0.08));
    if (goal.kind === "dscr") assert.ok(at.dscr!.gte(1.25) && above.dscr!.lt(1.25));
  }

  // Closing costs scale with price (3% here).
  assert.equal(dec(withPrice(baseDeal, dec(100_000)).closingCosts as string).toString(), "3000");
  // Impossible goal → null.
  assert.equal(maxPriceFor({ ...baseDeal, monthlyRent: 100 }, { kind: "cashFlow", minMonthly: dec(0) }).price, null);
  assert.equal(seventyPercentMax({ ...baseDeal, afterRepairValue: 300_000 })!.toString(), "206000");
  assert.equal(seventyPercentMax(baseDeal), null);
});

test("yearOneOnly gives identical year-1 metrics", () => {
  const full = analyzeDeal(baseDeal);
  const fast = analyzeDeal(baseDeal, { yearOneOnly: true });
  for (const k of ["monthlyCashFlow", "annualNOI", "annualDebtService", "totalCashInvested", "yearOnePrincipalPaydown"] as const) {
    assert.equal(fast[k].toString(), full[k].toString(), k);
  }
  assert.equal(fast.cashOnCash!.toString(), full.cashOnCash!.toString());
  assert.equal(fast.dscr!.toString(), full.dscr!.toString());
  assert.equal(fast.sale.irr, null);
});

test("equity goal: max price = (ARV − rehab − target) ÷ (1 + closing ratio)", async () => {
  const { maxPriceFor, withPrice } = await import("./solver");
  const deal = { ...baseDeal, afterRepairValue: "300000" }; // closing 3% of price, rehab 4,000
  const r = maxPriceFor(deal, { kind: "equityCreated", minAmount: dec(50_000) });
  // (300,000 − 4,000 − 50,000) ÷ 1.03 = 238,834.95 → 238,500
  assert.equal(r.price!.toString(), "238500");
  assert.ok(analyzeDeal(withPrice(deal, r.price!)).equityCreated!.gte(50_000));
  // No ARV → not reachable.
  assert.equal(maxPriceFor(baseDeal, { kind: "equityCreated", minAmount: dec(1) }).price, null);
});

test("stress test: every scenario is worse than base; combined is worst", async () => {
  const { stressTest } = await import("./stress");
  const s = stressTest(baseDeal);
  assert.equal(s.rows.length, 5);
  for (const r of s.rows) assert.ok(r.monthlyCashFlow.lt(s.base.monthlyCashFlow), r.key);
  for (const r of s.rows) assert.ok(s.combined.monthlyCashFlow.lte(r.monthlyCashFlow));
  // Combined break-even price is below today's price for this thin deal.
  assert.ok(s.combinedBreakEvenPrice.price!.lt(200_000));
  // All-cash deals skip the rate shock.
  assert.equal(stressTest({ ...baseDeal, isCashPurchase: true }).rows.some((r) => r.key === "rate"), false);
});

test("deal is rated against its own goals", async () => {
  const { defaultOfferGoals, applyStrategy, rateAgainstGoals } = await import("../offer-goals");
  const criteria = { targetCapRate: 6, targetCashOnCash: 6, minMonthlyCashFlowPerUnit: 100, minDscr: 1.25 };
  // Negative cash flow, but lots of equity.
  const a = analyzeDeal({ ...baseDeal, monthlyRent: 1_400, afterRepairValue: 320_000 });
  assert.ok(a.monthlyCashFlow.isNegative());

  const cashFlow = rateAgainstGoals(a, defaultOfferGoals(criteria));
  assert.equal(cashFlow.rating, "negative");
  assert.deepEqual(cashFlow.checks.map((c) => c.key), ["breakEven", "cashFlowPerUnit", "cashOnCash", "capRate", "dscr"]);

  // Equity-only goals: negative cash flow no longer dominates the rating.
  const equityOnly = applyStrategy(defaultOfferGoals(criteria), "equity");
  equityOnly.breakEven.enabled = false;
  equityOnly.dscr.enabled = false;
  const eq = rateAgainstGoals(a, equityOnly);
  assert.deepEqual(eq.checks.map((c) => [c.key, c.passed]), [["equity", true], ["seventy", true]]);
  assert.equal(eq.rating, "strong");

  // Invalid target → not applicable, never a failure.
  const bad = { ...equityOnly, equity: { enabled: true, target: "abc" } };
  assert.equal(rateAgainstGoals(a, bad).checks[0].passed, null);
});

test("withPrice: fixed-dollar down payment and reassessed property tax", async () => {
  const { withPrice, maxPriceFor } = await import("./solver");
  const deal = {
    purchasePrice: "200000", closingCosts: "6000", rehabCosts: "0", afterRepairValue: null,
    isCashPurchase: false, downPaymentPercent: "25", interestRate: "7", loanTermYears: 30,
    units: 1, squareFeet: null, monthlyRent: "1900", otherMonthlyIncome: "0", vacancyRate: "5",
    propertyTaxAnnual: "2400", insuranceAnnual: "1200", hoaMonthly: "0", utilitiesMonthly: "0", otherMonthlyExpenses: "0",
    maintenancePercent: "5", capexPercent: "5", managementPercent: "8",
    appreciationRate: "3", rentGrowthRate: "3", expenseGrowthRate: "2.5", sellingCostPercent: "6", holdingPeriodYears: 30,
  };
  const { dec: d } = await import("./decimal");
  // Default: 25% of the new price, tax unchanged.
  const a = withPrice(deal as never, d(160000));
  assert.equal(a.downPaymentPercent, "25");
  assert.equal(a.propertyTaxAnnual, "2400");
  assert.equal(a.closingCosts, "4800");
  // Same $50,000 down → 31.25% of $160,000; tax 1.2% of price → $1,920.
  const b = withPrice(deal as never, d(160000), { downPayment: "amount", propertyTax: "reassess" });
  assert.equal(b.downPaymentPercent, "31.25");
  assert.equal(b.propertyTaxAnnual, "1920");
  // Below $50,000 it's all cash: capped at 100%.
  assert.equal(withPrice(deal as never, d(40000), { downPayment: "amount" }).downPaymentPercent, "100");
  // Bigger down payment at lower prices and lower taxes both help cash flow → a higher max price than the default.
  const goal = { kind: "cashFlow" as const, minMonthly: d(200) };
  const base = maxPriceFor(deal as never, goal).price!;
  assert.ok(maxPriceFor(deal as never, goal, { propertyTax: "reassess" }).price!.gt(base));
  assert.ok(maxPriceFor(deal as never, goal, { downPayment: "amount" }).price!.gt(base));
});

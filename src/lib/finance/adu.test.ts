import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeAdu, defaultAduCostPerSqft, suggestAduRent, type AduContext, type AduInputs } from "./adu";

const adu: AduInputs = {
  type: "detached", squareFeet: 600, costPerSqft: 300, softCosts: 30_000, monthlyRent: 2_000,
  financing: { type: "cash", financedPct: 80, rate: 8, termYears: 30 }, buildMonths: 6,
};
const ctx: AduContext = {
  vacancyRate: 5, maintenancePercent: 5, capexPercent: 5, managementPercent: 8,
  capRate: "0.06", propertyTaxPct: 1, baseMonthlyCashFlow: 250,
};
const c = (v: { toFixed(n: number): string }) => v.toFixed(2);

test("ADU paid in cash (hand-calculated)", () => {
  const r = analyzeAdu(adu, ctx);
  assert.equal(c(r.totalCost), "210000.00"); // 600 × 300 + 30,000
  assert.equal(c(r.cashInvested), "210000.00");
  // Rent 2,000 − 100 vacancy − (100 maint + 100 capex + 152 mgmt) = 1,548 before tax & insurance
  assert.equal(c(r.operatingExpenses), "352.00");
  assert.equal(c(r.addedInsurance), "52.50"); // 180,000 × 0.35% ÷ 12
  // value = 12 × (1,548 − 52.50) ÷ (6% cap + 1% tax)
  assert.equal(c(r.valueAdded), "256371.43");
  assert.equal(c(r.addedPropertyTax), "213.64");
  // Consistency: value is exactly NOI capitalized at the cap rate.
  assert.equal(c(r.monthlyNOI.times(12).div("0.06")), c(r.valueAdded));
  assert.equal(c(r.equityCreated), "46371.43");
  assert.equal(r.cashOnCash!.toFixed(4), r.annualCashFlow.div(210_000).toFixed(4));
  assert.equal(c(r.combinedMonthlyCashFlow), c(r.monthlyCashFlow.plus(250)));
});

test("ADU financed: loan, construction interest and payment", () => {
  const r = analyzeAdu({ ...adu, financing: { type: "loan", financedPct: 80, rate: 8, termYears: 30 } }, ctx);
  assert.equal(c(r.loanAmount), "168000.00");
  assert.equal(c(r.cashInvested), "48720.00"); // 42,000 down + 6 months of 8% interest-only on 168,000
  assert.equal(c(r.monthlyPayment), "1232.72");
  assert.ok(r.monthlyCashFlow.lt(analyzeAdu(adu, ctx).monthlyCashFlow));
});

test("ADU helpers", () => {
  assert.equal(suggestAduRent(2_400, 1_600, 600)!.toString(), "1000"); // 1.50/sq ft × 600 × 1.1 = 990 → 1,000
  assert.equal(suggestAduRent(2_400, null, 600), null);
  assert.equal(defaultAduCostPerSqft("detached", "1.22").toString(), "365"); // 300 × 1.22 = 366 → nearest $5
  assert.equal(defaultAduCostPerSqft("garage", "0.93").toString(), "165"); // 175 × 0.93 = 162.75 → 165
});

test("break-even cost per sq ft zeroes equity created", () => {
  const base = { type: "detached" as const, squareFeet: "600", costPerSqft: "300", softCosts: "30000", monthlyRent: "2000", buildMonths: "6", financing: { type: "cash" as const, financedPct: "0", rate: "0", termYears: 30 } };
  const ctx = { vacancyRate: "5", maintenancePercent: "5", capexPercent: "5", managementPercent: "8", capRate: "0.06", propertyTaxPct: "1", baseMonthlyCashFlow: "0" };
  const be = analyzeAdu(base, ctx).breakEvenCostPerSqft!;
  const r = analyzeAdu({ ...base, costPerSqft: be.toString() }, ctx);
  assert.ok(r.equityCreated.abs().lt("0.01"), r.equityCreated.toString());
});

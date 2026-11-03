import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeDeal } from "./analysis";
import { analyzeAfterTax } from "./tax";

const deal = {
  purchasePrice: "250000", closingCosts: "5000", rehabCosts: "20000", afterRepairValue: null,
  isCashPurchase: false, downPaymentPercent: "25", interestRate: "7", loanTermYears: 30,
  units: 1, squareFeet: null, monthlyRent: "2200", otherMonthlyIncome: "0", vacancyRate: "5",
  propertyTaxAnnual: "3000", insuranceAnnual: "1500", hoaMonthly: "0", utilitiesMonthly: "0", otherMonthlyExpenses: "0",
  maintenancePercent: "5", capexPercent: "5", managementPercent: "8",
  appreciationRate: "3", rentGrowthRate: "3", expenseGrowthRate: "2.5", sellingCostPercent: "6", holdingPeriodYears: 30,
};

test("depreciation basis and year-1 after-tax cash flow", () => {
  const a = analyzeDeal(deal as never);
  const t = analyzeAfterTax(a, { taxRatePct: "24", buildingValuePct: "80" });
  // (250,000 + 5,000) × 80% + 20,000 = 224,000; ÷ 27.5 = 8,145.45
  assert.equal(t.depreciableBasis.toString(), "224000");
  assert.equal(t.annualDepreciation.toFixed(2), "8145.45");
  const y = t.yearOne;
  assert.equal(y.taxableIncome.toFixed(2), y.noi.minus(y.interest).minus(y.depreciation).toFixed(2));
  assert.equal(y.afterTaxCashFlow.toFixed(2), y.cashFlow.minus(y.taxableIncome.times("0.24")).toFixed(2));
  // Year 28 gets the last half year, year 29 none.
  assert.equal(t.years[27].depreciation.toFixed(2), t.annualDepreciation.times("0.5").toFixed(2));
  assert.equal(t.years[28].depreciation.toString(), "0");
});

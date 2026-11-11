import { test } from "node:test";
import assert from "node:assert/strict";
import { quickRentalAnalysis } from "./quick";

test("quick rental calculator: year-one cash flow and ratios", () => {
  const a = quickRentalAnalysis({
    price: 200_000,
    monthlyRent: 1_800,
    downPaymentPercent: 25,
    interestRate: 7,
    propertyTaxAnnual: 2_400,
    insuranceAnnual: 1_200,
  });
  // Loan 150,000 @ 7% / 30y → 997.95/mo.
  assert.equal(a.monthlyMortgagePayment.toFixed(2), "997.95");
  // EGI 1,710; expenses: tax 200 + ins 100 + maint 90 + capex 90 + mgmt (8% of EGI) 136.80 = 616.80.
  assert.equal(a.monthlyOperatingExpenses.toFixed(2), "616.80");
  assert.equal(a.monthlyNOI.toFixed(2), "1093.20");
  assert.equal(a.monthlyCashFlow.toFixed(2), "95.25");
  // Cash invested = 50,000 down + 6,000 closing.
  assert.equal(a.totalCashInvested.toFixed(2), "56000.00");
  assert.equal(a.capRate!.times(100).toFixed(2), "6.56");
});

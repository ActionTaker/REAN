import { test } from "node:test";
import assert from "node:assert/strict";
import { estimateClosingCosts, estimateInsurance } from "./costs";
import { buildRehabPlan, rehabTotals } from "./rehab";

test("closing costs use the state's share of price", () => {
  assert.equal(estimateClosingCosts({ state: "IN", price: 200_000 })!.amount.toString(), "1400"); // 0.70%
  assert.equal(estimateClosingCosts({ state: "DE", price: 200_000 })!.amount.toString(), "5980"); // 2.99%
  assert.equal(estimateClosingCosts({ state: null, price: 200_000 })!.amount.toString(), "2000"); // U.S. 1%
  assert.equal(estimateClosingCosts({ state: "IN", price: 0 }), null);
});

test("insurance scales the state premium by rebuild cost, plus landlord loading", () => {
  // 1,500 sq ft × $175 × 0.93 (IN) = $244,125 coverage → 2,869 × 0.81375 × 1.15 = 2,684.8 → $2,680
  const i = estimateInsurance({ state: "IN", squareFeet: 1500, price: 200_000 })!;
  assert.equal(i.amount.toString(), "2680");
  // No sq ft: 70% of price as coverage. FL $300k → $210k coverage → 8,471 × 0.7 × 1.15 = 6,819.2 → $6,820
  assert.equal(estimateInsurance({ state: "FL", price: 300_000 })!.amount.toString(), "6820");
  assert.equal(estimateInsurance({ state: "FL" }), null);
});

test("rehab scopes escalate and respect size, baths, units and region", () => {
  const ctx = { squareFeet: 1500, bathrooms: 2, units: 1, state: null };
  const totals = (["COSMETIC", "MODERATE", "HEAVY"] as const).map((s) => rehabTotals(buildRehabPlan(s, ctx)).total.toNumber());
  assert.ok(totals[0] < totals[1] && totals[1] < totals[2], `${totals}`);
  // $/sq ft land in typical industry ranges.
  const perSqft = totals.map((t) => t / 1500);
  assert.ok(perSqft[0] >= 10 && perSqft[0] <= 25, `cosmetic ${perSqft[0]}`);
  assert.ok(perSqft[1] >= 35 && perSqft[1] <= 60, `moderate ${perSqft[1]}`);
  assert.ok(perSqft[2] >= 75 && perSqft[2] <= 110, `heavy ${perSqft[2]}`);

  const ca = rehabTotals(buildRehabPlan("MODERATE", { ...ctx, state: "CA" })).total;
  const tx = rehabTotals(buildRehabPlan("MODERATE", { ...ctx, state: "TX" })).total;
  assert.ok(ca.gt(tx));

  const duplex = buildRehabPlan("MODERATE", { squareFeet: 2000, bathrooms: 2, units: 2, state: "OH" });
  assert.equal(duplex.items.find((i) => i.key === "kitchen")!.basis, "$18,000 × 2 units");

  const noSize = buildRehabPlan("COSMETIC", { state: "IN" });
  assert.ok(noSize.assumptions.some((a) => a.includes("sq ft assumed")));
});

test("rehab totals apply contingency and round to $50", () => {
  const t = rehabTotals({ items: [{ key: "a", label: "A", amount: "10000" }, { key: "b", label: "B", amount: "2330" }], contingencyPct: "15" });
  assert.equal(t.subtotal.toString(), "12330");
  assert.equal(t.contingency.toString(), "1849.5");
  assert.equal(t.total.toString(), "14200"); // 14,179.5 → 14,200
});

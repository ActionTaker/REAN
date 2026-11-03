import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeComps, compId, DEFAULT_ARV_SETTINGS } from "./comps-arv";
import type { Comparable } from "./types";

const comp = (price: number, sqft: number, extra: Partial<Comparable> = {}): Comparable => ({
  address: `${price} Test St`, price: String(price), bedrooms: 3, bathrooms: 2, squareFeet: sqft,
  distanceMiles: 0.5, status: "Inactive", date: null, correlation: 0.95, ...extra,
});

const subject = { squareFeet: 1500, bedrooms: 3, bathrooms: "2", yearBuilt: null };

test("size adjustment moves a smaller comp up and a larger comp down", () => {
  const comps = [comp(300_000, 1500), comp(270_000, 1300), comp(330_000, 1700)];
  const r = analyzeComps(subject, comps, {}, DEFAULT_ARV_SETTINGS, null);
  // median $/sq ft = 200 (300k/1500); 50% of it = $100 per sq ft of difference
  assert.equal(r.rows[1].adjustments.size.toFixed(0), "20000"); // +200 sq ft × $100
  assert.equal(r.rows[2].adjustments.size.toFixed(0), "-20000");
  assert.equal(r.rows[1].adjustedPrice.toFixed(0), "290000");
});

test("a house larger than every comp can't run past the market (the $983K problem)", () => {
  // Same shape as the San Diego case: subject 2,006 sq ft, comps mostly ~1,700 at high $/sq ft.
  const comps = [
    comp(865_000, 1614), comp(650_000, 1520), comp(547_500, 1985), comp(899_900, 1778),
    comp(849_900, 1704), comp(774_000, 1699), comp(730_000, 1750), comp(784_900, 1753),
  ];
  const r = analyzeComps({ squareFeet: 2006, bedrooms: 3, bathrooms: "2", yearBuilt: null }, comps, {}, DEFAULT_ARV_SETTINGS, "800000");
  const naive = 490 * 2006; // old method ≈ $983K
  assert.ok(r.recommended!.value.lt(naive), r.recommended!.value.toString());
  assert.ok(r.recommended!.value.lte(1_000_000));
});

test("excluding and tagging comps drives the recommended ARV", () => {
  const comps = [comp(300_000, 1500), comp(320_000, 1500), comp(400_000, 1500), comp(310_000, 1500)];
  const ids = comps.map(compId);
  const all = analyzeComps(subject, comps, {}, DEFAULT_ARV_SETTINGS, null);
  assert.equal(all.used, 4);
  const without = analyzeComps(subject, comps, { [ids[2]]: { included: false, condition: null } }, DEFAULT_ARV_SETTINGS, null);
  assert.equal(without.used, 3);
  assert.ok(without.recommended!.value.lt(all.recommended!.value));
  const tagged = analyzeComps(subject, comps, { [ids[2]]: { included: true, condition: "renovated" } }, DEFAULT_ARV_SETTINGS, null);
  assert.equal(tagged.recommended!.value.toString(), "400000");
  assert.match(tagged.recommended!.basis, /marked renovated/);
});

test("active listings can be excluded; never below as-is; missing sqft is flagged", () => {
  const comps = [comp(300_000, 1500), comp(900_000, 1500, { status: "Active" }), comp(310_000, 1500)];
  const r = analyzeComps(subject, comps, {}, { ...DEFAULT_ARV_SETTINGS, excludeActive: true }, "350000");
  assert.equal(r.rows[1].included, false);
  assert.equal(r.rows[1].autoExcluded, "Active listing (asking price)");
  assert.equal(r.recommended!.value.toString(), "350000"); // floored at as-is
  const noSize = analyzeComps({ ...subject, squareFeet: null }, comps, {}, DEFAULT_ARV_SETTINGS, null);
  assert.ok(noSize.notes.some((n) => n.includes("square footage")));
  assert.equal(noSize.methods.find((m) => m.key === "ppsf")!.value, null);
  assert.equal(noSize.confidence.level, "low");
});

test("bed/bath/age adjustments use % of median price, age is capped", () => {
  const comps = [comp(400_000, 1500, { bedrooms: 2, bathrooms: 1, yearBuilt: 1950 }), comp(400_000, 1500), comp(400_000, 1500)];
  const r = analyzeComps({ ...subject, yearBuilt: 2000 }, comps, {}, DEFAULT_ARV_SETTINGS, null);
  const a = r.rows[0].adjustments;
  assert.equal(a.bedrooms.toFixed(0), "8000"); // +1 bed × 2% × 400k
  assert.equal(a.bathrooms.toFixed(0), "6000"); // +1 bath × 1.5% × 400k
  assert.equal(a.age.toFixed(0), "20000"); // 50 yrs × 0.2% × 400k = 40k, capped at 5% = 20k
});

test("rent mode: typical (weighted average) rent, $25 rounding, conservative quartile, no as-is floor", async () => {
  const { DEFAULT_RENT_SETTINGS, perUnitSubject } = await import("./comps-arv");
  const comps = [comp(2_000, 1500), comp(2_100, 1500), comp(1_900, 1500), comp(2_600, 1500)];
  const r = analyzeComps(subject, comps, {}, DEFAULT_RENT_SETTINGS, "3000", "rent");
  // Equal weights → plain average 2,150; not the upper quartile, and not raised to the 3,000 AVM.
  assert.equal(r.recommended!.value.toString(), "2150");
  assert.equal(r.methods.find((m) => m.key === "conservative")!.value!.toString(), "1975"); // p25 1,975
  // Bedrooms matter more for rent: +1 bed = 5% of median rent (2,050) = 102.5
  const twoBed = analyzeComps(subject, [comp(2_000, 1500, { bedrooms: 2 }), comp(2_100, 1500)], {}, DEFAULT_RENT_SETTINGS, null, "rent");
  assert.equal(twoBed.rows[0].adjustments.bedrooms.toString(), "102.5");
  // A fourplex is compared per unit.
  assert.deepEqual(perUnitSubject({ squareFeet: 3600, bedrooms: 8, bathrooms: 4, yearBuilt: 1962, units: 4 }), {
    squareFeet: 900, bedrooms: 2, bathrooms: "1", yearBuilt: 1962,
  });
});

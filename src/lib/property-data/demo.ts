import "server-only";
import { D, dec } from "@/lib/finance/decimal";
import { totalRent } from "./estimates";
import { lookupArv } from "./comps-arv";
import { normalizeAddressKey, type Comparable, type PropertyLookup } from "./types";
import { batchGeocode } from "./geocode";

/**
 * Synthetic data for trying the feature without an API key
 * (PROPERTY_DATA_PROVIDER=demo). Deterministic per address, and always
 * labelled as demo data in the UI. Never use for real decisions.
 */
function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function demoLookup(address: string): PropertyLookup {
  const r = rng(normalizeAddressKey(address));
  const between = (a: number, b: number) => a + r() * (b - a);
  const sqft = Math.round(between(1100, 2400) / 10) * 10;
  const ppsf = dec(Math.round(between(120, 240)));
  const value = ppsf.times(sqft).div(1000).toDecimalPlaces(0).times(1000);
  const rentPerUnit = value.times(between(0.0075, 0.0095).toFixed(5)).div(25).toDecimalPlaces(0).times(25);

  const comps = (scale: D, kind: "sale" | "rent"): Comparable[] =>
    Array.from({ length: 8 }, (_, i) => {
      const s = Math.round((sqft * between(0.85, 1.15)) / 10) * 10;
      const price = scale.times(s).times(between(0.88, 1.18).toFixed(4));
      return {
        address: `${100 + i * 37} Demo ${["Oak", "Elm", "Pine", "Cedar"][i % 4]} St (synthetic)`,
        price: (kind === "sale" ? price.div(1000).toDecimalPlaces(0).times(1000) : price.div(5).toDecimalPlaces(0).times(5)).toString(),
        bedrooms: 2 + Math.floor(r() * 3),
        bathrooms: 1 + Math.floor(r() * 2),
        squareFeet: s,
        distanceMiles: Number(between(0.1, 1.5).toFixed(2)),
        status: "Inactive",
        date: null,
        correlation: Number(between(0.9, 0.99).toFixed(3)),
      };
    });

  const valueComps = comps(ppsf, "sale");
  const rentComps = comps(rentPerUnit.div(sqft), "rent");
  const arv = lookupArv({ squareFeet: sqft, bedrooms: 3, bathrooms: 2, yearBuilt: null }, { estimate: value.toString(), comparables: valueComps });
  const parts = address.split(",").map((s) => s.trim());
  const stateZip = parts[2]?.split(/\s+/) ?? [];

  return {
    provider: "demo",
    addressKey: normalizeAddressKey(address),
    fetchedAt: new Date().toISOString(),
    cached: false,
    address: { formatted: address, line1: parts[0] ?? null, city: parts[1] ?? null, state: stateZip[0]?.toUpperCase().slice(0, 2) ?? null, zip: stateZip[1] ?? null },
    facts: {
      propertyType: "SINGLE_FAMILY",
      providerPropertyType: "Single Family",
      units: 1,
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: sqft,
      yearBuilt: 1950 + Math.floor(r() * 70),
      lastSalePrice: null,
      lastSaleDate: null,
    },
    propertyTaxAnnual: { amount: value.times("0.012").toDecimalPlaces(0).toString(), year: 2025 },
    hoaMonthly: null,
    value: { estimate: value.toString(), low: value.times(0.92).toDecimalPlaces(0).toString(), high: value.times(1.1).toDecimalPlaces(0).toString(), comparables: valueComps },
    arv,
    rent: {
      perUnit: rentPerUnit.toString(),
      low: rentPerUnit.times(0.9).toDecimalPlaces(0).toString(),
      high: rentPerUnit.times(1.1).toDecimalPlaces(0).toString(),
      units: 1,
      total: totalRent(rentPerUnit, 1).toString(),
      comparables: rentComps,
    },
    warnings: ["DEMO MODE — these numbers are synthetic, not real market data. Add a RentCast API key for real estimates."],
  };
}

/** Downtown Indianapolis — where demo comps go when the typed address can't be located. */
const DEMO_FALLBACK_CENTER = { lat: 39.7684, lng: -86.1581 };

/**
 * Puts a demo lookup on the map: the typed address via the free Census geocoder (falling back to a fixed
 * city center), and each synthetic comp at its stated distance in a deterministic direction around it.
 */
export async function placeDemoOnMap(d: PropertyLookup): Promise<PropertyLookup> {
  let center = DEMO_FALLBACK_CENTER;
  try {
    const hit = (await batchGeocode([d.address.formatted])).get(d.address.formatted);
    if (hit) center = hit;
  } catch {
    // Geocoder unavailable — the fallback center keeps the map working.
  }
  const r = rng(`${d.addressKey}:map`);
  const place = (c: Comparable): Comparable => {
    const miles = c.distanceMiles ?? 0.5;
    const bearing = r() * 2 * Math.PI;
    const dLat = (miles / 69) * Math.cos(bearing);
    const dLng = (miles / (69 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(bearing);
    return { ...c, latitude: Number((center.lat + dLat).toFixed(6)), longitude: Number((center.lng + dLng).toFixed(6)) };
  };
  return {
    ...d,
    facts: { ...d.facts, latitude: center.lat, longitude: center.lng },
    value: d.value ? { ...d.value, comparables: d.value.comparables.map(place) } : d.value,
    rent: d.rent ? { ...d.rent, comparables: d.rent.comparables.map(place) } : d.rent,
  };
}

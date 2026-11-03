import "server-only";
import type { PropertyTypeValue } from "@/lib/constants";
import { dec } from "@/lib/finance/decimal";
import { totalRent } from "./estimates";
import { lookupArv } from "./comps-arv";
import { LookupError, normalizeAddressKey, type Comparable, type PropertyLookup } from "./types";

const BASE = "https://api.rentcast.io/v1";

/* Shapes of the RentCast fields we use (https://developers.rentcast.io). */
interface RcProperty {
  formattedAddress?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  yearBuilt?: number;
  latitude?: number;
  longitude?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  hoa?: { fee?: number };
  propertyTaxes?: Record<string, { year?: number; total?: number }>;
  features?: { unitCount?: number };
}
interface RcComp {
  id?: string;
  formattedAddress?: string;
  yearBuilt?: number;
  latitude?: number;
  longitude?: number;
  daysOnMarket?: number;
  listingType?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  distance?: number;
  status?: string;
  listedDate?: string;
  removedDate?: string;
  correlation?: number;
}
interface RcValue { price?: number; priceRangeLow?: number; priceRangeHigh?: number; subjectProperty?: RcProperty; comparables?: RcComp[] }
interface RcRent { rent?: number; rentRangeLow?: number; rentRangeHigh?: number; subjectProperty?: RcProperty; comparables?: RcComp[] }

async function get<T>(path: string, params: Record<string, string>, apiKey: string): Promise<T | null> {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new LookupError("Couldn't reach the property data service. Try again in a moment.", "upstream");
  }
  if (res.status === 401 || res.status === 403) throw new LookupError("The RentCast API key was rejected. Check RENTCAST_API_KEY.", "auth");
  if (res.status === 429) throw new LookupError("Property data quota reached for this billing period.", "quota");
  if (res.status === 404) return null;
  if (!res.ok) throw new LookupError(`Property data service error (${res.status}).`, "upstream");
  return (await res.json()) as T;
}

export function mapPropertyType(t: string | undefined, units: number): PropertyTypeValue | null {
  switch (t) {
    case "Single Family":
    case "Manufactured":
      return "SINGLE_FAMILY";
    case "Condo":
      return "CONDO";
    case "Townhouse":
      return "TOWNHOUSE";
    case "Multi-Family":
      return units >= 5 ? "MULTIFAMILY" : units === 4 ? "FOURPLEX" : units === 3 ? "TRIPLEX" : "DUPLEX";
    case "Apartment":
      return "MULTIFAMILY";
    default:
      return null;
  }
}

const toComp = (c: RcComp): Comparable => ({
  id: c.id ?? c.formattedAddress,
  address: c.formattedAddress ?? "Unknown address",
  price: dec(c.price ?? 0).toString(),
  bedrooms: c.bedrooms ?? null,
  bathrooms: c.bathrooms ?? null,
  squareFeet: c.squareFootage ?? null,
  distanceMiles: c.distance ?? null,
  status: c.status ?? null,
  date: c.removedDate ?? c.listedDate ?? null,
  correlation: c.correlation ?? null,
  yearBuilt: c.yearBuilt ?? null,
  latitude: c.latitude ?? null,
  longitude: c.longitude ?? null,
  listedDate: c.listedDate ?? null,
  removedDate: c.removedDate ?? null,
  daysOnMarket: c.daysOnMarket ?? null,
  listingType: c.listingType ?? null,
});

export async function rentcastLookup(address: string, apiKey: string): Promise<PropertyLookup> {
  const params = { address };
  // Three independent calls; a failure in one still lets the others through.
  const settle = <T,>(p: Promise<T>) => p.then((v) => ({ ok: true as const, v }), (e: unknown) => ({ ok: false as const, e }));
  const [propsR, valueR, rentR] = await Promise.all([
    settle(get<RcProperty[]>("/properties", { ...params, limit: "1" }, apiKey)),
    settle(get<RcValue>("/avm/value", { ...params, compCount: "15" }, apiKey)),
    settle(get<RcRent>("/avm/rent/long-term", { ...params, compCount: "15" }, apiKey)),
  ]);

  // Auth / quota problems apply to every call — surface them directly.
  for (const r of [propsR, valueR, rentR]) {
    if (!r.ok && r.e instanceof LookupError && (r.e.code === "auth" || r.e.code === "quota")) throw r.e;
  }

  const warnings: string[] = [];
  const record = propsR.ok ? propsR.v?.[0] ?? null : null;
  const value = valueR.ok ? valueR.v : null;
  const rent = rentR.ok ? rentR.v : null;
  if (!record) warnings.push("No public property record found — details and taxes could not be filled.");
  if (!value?.price) warnings.push("No automated value estimate available for this address.");
  if (!rent?.rent) warnings.push("No rent estimate available for this address.");
  if (!record && !value?.price && !rent?.rent) {
    throw new LookupError("No data found for that address. Check the street, city, state and ZIP.", "not_found");
  }

  const subject = record ?? value?.subjectProperty ?? rent?.subjectProperty ?? {};
  const units = Math.max(1, record?.features?.unitCount ?? 1);
  const latestTax = Object.values(record?.propertyTaxes ?? {})
    .filter((t) => t.total && t.year)
    .sort((a, b) => b.year! - a.year!)[0];

  const valueComps = (value?.comparables ?? []).map(toComp);
  const rentComps = (rent?.comparables ?? []).map(toComp);
  if (units > 1 && rent?.rent) {
    warnings.push(`Rent estimate is per unit and was multiplied by ${units} units — confirm the actual unit mix and leases.`);
  }

  return {
    provider: "rentcast",
    addressKey: normalizeAddressKey(address),
    fetchedAt: new Date().toISOString(),
    cached: false,
    address: {
      formatted: subject.formattedAddress ?? address,
      line1: subject.addressLine1 ?? null,
      city: subject.city ?? null,
      state: subject.state ?? null,
      zip: subject.zipCode ?? null,
    },
    facts: {
      propertyType: mapPropertyType(subject.propertyType, units),
      providerPropertyType: subject.propertyType ?? null,
      units,
      bedrooms: subject.bedrooms ?? null,
      bathrooms: subject.bathrooms ?? null,
      squareFeet: subject.squareFootage ?? null,
      yearBuilt: subject.yearBuilt ?? null,
      lastSalePrice: subject.lastSalePrice ? dec(subject.lastSalePrice).toString() : null,
      lastSaleDate: subject.lastSaleDate ?? null,
      latitude: subject.latitude ?? null,
      longitude: subject.longitude ?? null,
    },
    propertyTaxAnnual: latestTax ? { amount: dec(latestTax.total!).toString(), year: latestTax.year! } : null,
    hoaMonthly: record?.hoa?.fee ? dec(record.hoa.fee).toString() : null,
    value: value?.price
      ? {
          estimate: dec(value.price).toString(),
          low: value.priceRangeLow ? dec(value.priceRangeLow).toString() : null,
          high: value.priceRangeHigh ? dec(value.priceRangeHigh).toString() : null,
          comparables: valueComps,
        }
      : null,
    arv: value?.price
      ? lookupArv(
          { squareFeet: subject.squareFootage ?? null, bedrooms: subject.bedrooms ?? null, bathrooms: subject.bathrooms ?? null, yearBuilt: subject.yearBuilt ?? null },
          { estimate: dec(value.price).toString(), comparables: valueComps },
        )
      : null,
    rent: rent?.rent
      ? {
          perUnit: dec(rent.rent).toString(),
          low: rent.rentRangeLow ? dec(rent.rentRangeLow).toString() : null,
          high: rent.rentRangeHigh ? dec(rent.rentRangeHigh).toString() : null,
          units,
          total: totalRent(rent.rent, units).toString(),
          comparables: rentComps,
        }
      : null,
    warnings,
  };
}

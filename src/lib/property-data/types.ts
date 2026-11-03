import type { PropertyTypeValue } from "@/lib/constants";

/** Serializable (money as strings) result of an address lookup. */
export interface Comparable {
  address: string;
  price: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  distanceMiles: number | null;
  status: string | null;
  date: string | null;
  /** Provider's similarity score, 0–1. */
  correlation: number | null;
}

export interface PropertyLookup {
  provider: "rentcast" | "demo";
  addressKey: string;
  fetchedAt: string;
  cached: boolean;
  address: { formatted: string; line1: string | null; city: string | null; state: string | null; zip: string | null };
  facts: {
    propertyType: PropertyTypeValue | null;
    providerPropertyType: string | null;
    units: number;
    bedrooms: number | null;
    bathrooms: number | null;
    squareFeet: number | null;
    yearBuilt: number | null;
    lastSalePrice: string | null;
    lastSaleDate: string | null;
  };
  propertyTaxAnnual: { amount: string; year: number } | null;
  hoaMonthly: string | null;
  value: { estimate: string; low: string | null; high: string | null; comparables: Comparable[] } | null;
  arv: { estimate: string; method: string; pricePerSqft: string | null; compsUsed: number } | null;
  rent: {
    perUnit: string;
    low: string | null;
    high: string | null;
    units: number;
    total: string;
    comparables: Comparable[];
  } | null;
  warnings: string[];
}

export class LookupError extends Error {
  constructor(message: string, readonly code: "not_configured" | "not_found" | "quota" | "auth" | "upstream" | "invalid") {
    super(message);
  }
}

export function normalizeAddressKey(address: string): string {
  return address
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

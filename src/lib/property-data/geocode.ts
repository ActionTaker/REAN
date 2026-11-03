import "server-only";
import type { Comparable, PropertyLookup } from "./types";

/**
 * Free coordinates from the U.S. Census Bureau batch geocoder (no key, no
 * quota). Used to fill in lat/lng that a lookup is missing — older cached
 * lookups were saved without comp coordinates — so the comps map works
 * without spending RentCast calls.
 */
const BATCH_URL = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch";

/** "450 Broadview St, Spring Valley, CA 91977" → CSV fields street, city, state, zip. */
function splitAddress(a: string): [string, string, string, string] | null {
  const parts = a.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) return null;
  const [state = "", zip = ""] = parts.at(-1)!.split(/\s+/);
  return [parts.slice(0, -2).join(" "), parts.at(-2)!, state, zip];
}

const csvCell = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** Minimal CSV line parser for the Census response (quoted fields, commas inside quotes). */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export async function batchGeocode(addresses: string[]): Promise<Map<string, { lat: number; lng: number }>> {
  const unique = [...new Set(addresses)].slice(0, 1000);
  const rows = unique.flatMap((a, i) => {
    const s = splitAddress(a);
    return s ? [[String(i), ...s].map(csvCell).join(",")] : [];
  });
  const found = new Map<string, { lat: number; lng: number }>();
  if (rows.length === 0) return found;

  const form = new FormData();
  form.append("addressFile", new Blob([rows.join("\n") + "\n"], { type: "text/csv" }), "addresses.csv");
  form.append("benchmark", "Public_AR_Current");
  const res = await fetch(BATCH_URL, { method: "POST", body: form, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) return found;
  for (const line of (await res.text()).split(/\r?\n/)) {
    const f = parseCsvLine(line);
    // id, input address, Match|No_Match|Tie, Exact|Non_Exact, matched address, "lng,lat", …
    if (f[2] !== "Match" || !f[5]) continue;
    const [lng, lat] = f[5].split(",").map(Number);
    const addr = unique[Number(f[0])];
    if (addr && Number.isFinite(lat) && Number.isFinite(lng)) found.set(addr, { lat, lng });
  }
  return found;
}

export function needsCoordinates(d: PropertyLookup | null | undefined): boolean {
  if (!d) return false;
  const comps = [...(d.value?.comparables ?? []), ...(d.rent?.comparables ?? [])];
  return d.facts.latitude == null || comps.some((c) => c.latitude == null);
}

/** Returns the lookup with any missing coordinates filled in (unchanged on failure). */
export async function withCoordinates(d: PropertyLookup): Promise<PropertyLookup> {
  if (!needsCoordinates(d)) return d;
  const comps = [...(d.value?.comparables ?? []), ...(d.rent?.comparables ?? [])];
  const wanted = [
    ...(d.facts.latitude == null ? [d.address.formatted] : []),
    ...comps.filter((c) => c.latitude == null).map((c) => c.address),
  ];
  let found: Map<string, { lat: number; lng: number }>;
  try {
    found = await batchGeocode(wanted);
  } catch {
    return d;
  }
  if (found.size === 0) return d;
  const fill = (c: Comparable): Comparable => {
    const g = c.latitude == null ? found.get(c.address) : undefined;
    return g ? { ...c, latitude: g.lat, longitude: g.lng } : c;
  };
  const subject = d.facts.latitude == null ? found.get(d.address.formatted) : undefined;
  return {
    ...d,
    facts: subject ? { ...d.facts, latitude: subject.lat, longitude: subject.lng } : d.facts,
    value: d.value ? { ...d.value, comparables: d.value.comparables.map(fill) } : d.value,
    rent: d.rent ? { ...d.rent, comparables: d.rent.comparables.map(fill) } : d.rent,
  };
}

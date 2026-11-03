import "server-only";
import { US_STATES } from "@/lib/constants";

/** One address suggestion, normalized across providers. */
export interface AddressSuggestion {
  label: string;
  line1: string;
  city: string | null;
  state: string | null;
  zip: string | null;
}

const STATE_CODES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
  "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
  vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

export function toStateCode(s: string | undefined | null): string | null {
  if (!s) return null;
  const up = s.trim().toUpperCase();
  if ((US_STATES as readonly string[]).includes(up)) return up;
  return STATE_CODES[s.trim().toLowerCase()] ?? null;
}

function build(houseNumber: string | undefined, street: string | undefined, city?: string, state?: string, zip?: string): AddressSuggestion | null {
  if (!houseNumber || !street) return null; // only full street addresses are useful for underwriting
  const st = toStateCode(state);
  const line1 = `${houseNumber} ${street}`;
  const tail = [city, [st, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return { label: tail ? `${line1}, ${tail}` : line1, line1, city: city ?? null, state: st, zip: zip ?? null };
}

/* Photon (OpenStreetMap) — free, no key; house-number coverage is incomplete in places. */
interface PhotonFeature {
  properties: { housenumber?: string; street?: string; city?: string; state?: string; postcode?: string; countrycode?: string };
}
async function photon(q: string): Promise<AddressSuggestion[]> {
  const url = `https://photon.komoot.io/api/?${new URLSearchParams({ q, limit: "10", lang: "en", bbox: "-171,18,-66,72" })}`;
  const res = await fetch(url, { headers: { "User-Agent": "DEALAN/1.0 (address autocomplete)" }, signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: PhotonFeature[] };
  return (data.features ?? [])
    .filter((f) => f.properties.countrycode === "US")
    .map((f) => build(f.properties.housenumber, f.properties.street, f.properties.city, f.properties.state, f.properties.postcode))
    .filter((s): s is AddressSuggestion => s !== null);
}

/* Geoapify — free tier (3,000 req/day) with much better U.S. address coverage. Used when GEOAPIFY_API_KEY is set. */
interface GeoapifyResult { housenumber?: string; street?: string; city?: string; state_code?: string; state?: string; postcode?: string }
async function geoapify(q: string, apiKey: string): Promise<AddressSuggestion[]> {
  const url = `https://api.geoapify.com/v1/geocode/autocomplete?${new URLSearchParams({ text: q, filter: "countrycode:us", format: "json", limit: "8", apiKey })}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: GeoapifyResult[] };
  return (data.results ?? [])
    .map((r) => build(r.housenumber, r.street, r.city, r.state_code ?? r.state, r.postcode))
    .filter((s): s is AddressSuggestion => s !== null);
}

export async function suggestAddresses(q: string): Promise<AddressSuggestion[]> {
  const key = process.env.GEOAPIFY_API_KEY;
  const results = key ? await geoapify(q, key) : await photon(q);
  const seen = new Set<string>();
  return results.filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true))).slice(0, 6);
}

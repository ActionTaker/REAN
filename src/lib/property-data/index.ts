import "server-only";
import { prisma } from "@/lib/db";
import { demoLookup } from "./demo";
import { rentcastLookup } from "./rentcast";
import { lookupArv } from "./comps-arv";
import { LookupError, normalizeAddressKey, type PropertyLookup } from "./types";

export * from "./types";

/** ARV is derived from the stored comps, so recompute it — keeps cached lookups in step with the current method. */
function withFreshArv(d: PropertyLookup): PropertyLookup {
  if (!d.value) return d;
  return { ...d, arv: lookupArv(d.facts, d.value) };
}

const CACHE_DAYS = 30;

export type Provider = "rentcast" | "demo";

export function activeProvider(): Provider | null {
  if (process.env.PROPERTY_DATA_PROVIDER === "demo") return "demo";
  if (process.env.RENTCAST_API_KEY) return "rentcast";
  return null;
}

/** Address → facts, value/ARV and rent estimates. Cached for 30 days per address to conserve API quota. */
export async function lookupProperty(address: string, opts: { refresh?: boolean } = {}): Promise<PropertyLookup> {
  const provider = activeProvider();
  if (!provider) {
    throw new LookupError("Automated estimates aren't configured. Add RENTCAST_API_KEY to .env (free key at rentcast.io).", "not_configured");
  }
  const key = `${provider}:${normalizeAddressKey(address)}`;

  if (!opts.refresh) {
    const hit = await prisma.propertyDataCache.findUnique({ where: { addressKey: key } });
    if (hit && Date.now() - hit.fetchedAt.getTime() < CACHE_DAYS * 86_400_000) {
      return withFreshArv({ ...(hit.payload as unknown as PropertyLookup), cached: true });
    }
  }

  const data = provider === "demo" ? demoLookup(address) : await rentcastLookup(address, process.env.RENTCAST_API_KEY!);
  await prisma.propertyDataCache.upsert({
    where: { addressKey: key },
    update: { payload: data as object, fetchedAt: new Date(), provider },
    create: { addressKey: key, payload: data as object, provider },
  });
  return data;
}

/** Previously fetched lookup, used when saving a deal so the server never trusts client-supplied market data. */
export async function getCachedLookup(address: string): Promise<PropertyLookup | null> {
  const provider = activeProvider();
  if (!provider) return null;
  const hit = await prisma.propertyDataCache.findUnique({ where: { addressKey: `${provider}:${normalizeAddressKey(address)}` } });
  return hit ? (hit.payload as unknown as PropertyLookup) : null;
}

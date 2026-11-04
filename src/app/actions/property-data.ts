"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { activeProvider, isLookupCached, LookupError, lookupProperty, normalizeAddressKey, type PropertyLookup } from "@/lib/property-data";

export type LookupResult = { ok: true; data: PropertyLookup } | { ok: false; error: string; code?: LookupError["code"] };

const addressSchema = z
  .string()
  .trim()
  .min(8, "Enter the full address")
  .max(200)
  .refine((a) => /\d/.test(a) && a.includes(","), "Use the format: 123 Main St, City, ST 12345");

/** Paid lookups allowed per signed-up user in 30 days, and for the whole site per calendar month (stays under the provider plan). */
const limit = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export async function lookupPropertyData(address: string, refresh = false): Promise<LookupResult> {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: "invalid" };
  try {
    // Demo visitors get clearly labelled synthetic data, so the public demo never spends the paid quota.
    if (user.isGuest) return { ok: true, data: await lookupProperty(parsed.data, { refresh, provider: "demo" }) };

    const provider = activeProvider();
    const paid = provider === "rentcast" && (refresh || !(await isLookupCached(parsed.data, provider)));
    if (paid) {
      const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
      const [mine, all] = await Promise.all([
        prisma.propertyLookupLog.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) } } }),
        prisma.propertyLookupLog.count({ where: { createdAt: { gte: monthStart } } }),
      ]);
      if (all >= limit("LOOKUP_MONTHLY_LIMIT", 45)) {
        return { ok: false, code: "quota", error: "Address lookups are at this month's limit. Enter the numbers by hand, or try again next month." };
      }
      if (mine >= limit("LOOKUP_USER_LIMIT", 10)) {
        return { ok: false, code: "quota", error: "You've used your address lookups for the last 30 days. Addresses you looked up before still load; new ones open up as older lookups age out." };
      }
    }
    const data = await lookupProperty(parsed.data, { refresh });
    if (paid) await prisma.propertyLookupLog.create({ data: { userId: user.id, addressKey: normalizeAddressKey(parsed.data) } });
    return { ok: true, data };
  } catch (e) {
    if (e instanceof LookupError) return { ok: false, error: e.message, code: e.code };
    console.error("property lookup failed", e);
    return { ok: false, error: "Something went wrong fetching property data.", code: "upstream" };
  }
}

"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { LookupError, lookupProperty, type PropertyLookup } from "@/lib/property-data";

export type LookupResult = { ok: true; data: PropertyLookup } | { ok: false; error: string; code?: LookupError["code"] };

const addressSchema = z
  .string()
  .trim()
  .min(8, "Enter the full address")
  .max(200)
  .refine((a) => /\d/.test(a) && a.includes(","), "Use the format: 123 Main St, City, ST 12345");

export async function lookupPropertyData(address: string, refresh = false): Promise<LookupResult> {
  await requireUser();
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message, code: "invalid" };
  try {
    return { ok: true, data: await lookupProperty(parsed.data, { refresh }) };
  } catch (e) {
    if (e instanceof LookupError) return { ok: false, error: e.message, code: e.code };
    console.error("property lookup failed", e);
    return { ok: false, error: "Something went wrong fetching property data.", code: "upstream" };
  }
}

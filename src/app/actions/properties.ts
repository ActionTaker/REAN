"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCachedLookup } from "@/lib/property-data";
import { requireUser } from "@/lib/auth-helpers";
import { formOutputToData } from "@/lib/property-mapping";
import { dealSchema, offerGoalsSchema, strategyInputsSchema, type DealFormValues } from "@/lib/validation/deal";
import type { DealStatusValue } from "@/lib/constants";
import { getSettings } from "@/lib/data/settings";
import { strategyDefaultsFrom } from "@/lib/new-deal-defaults";
import { STRATEGIES, type StrategyValue } from "@/lib/strategy";

export type SaveDealResult = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

function revalidateAll() {
  for (const p of ["/dashboard", "/properties", "/compare", "/reports"]) revalidatePath(p);
}

/**
 * @param lookupAddress Address the user ran an automated lookup for. The server re-reads
 * that lookup from its own cache rather than trusting market data sent by the client.
 */
export async function saveDeal(id: string | null, values: DealFormValues, lookupAddress?: string | null): Promise<SaveDealResult> {
  const user = await requireUser();
  const parsed = dealSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const lookup = lookupAddress ? await getCachedLookup(lookupAddress) : null;
  const data = {
    ...formOutputToData(parsed.data),
    // Undefined leaves an existing snapshot untouched on update.
    ...(lookup ? { marketData: lookup as unknown as Prisma.InputJsonValue } : {}),
  };

  if (id) {
    // updateMany scoped by userId so one user can never modify another's row.
    const { count } = await prisma.property.updateMany({ where: { id, userId: user.id }, data });
    if (count === 0) return { ok: false, error: "Property not found." };
    revalidateAll();
    revalidatePath(`/properties/${id}`);
    return { ok: true, id };
  }

  const created = await prisma.property.create({ data: { ...data, userId: user.id } });
  revalidateAll();
  return { ok: true, id: created.id };
}

export async function deleteProperty(id: string) {
  const user = await requireUser();
  await prisma.property.deleteMany({ where: { id, userId: user.id } });
  revalidateAll();
}

/** Copy a deal; with `asStrategy`, the copy is re-analyzed under that strategy (e.g. a Buy & Hold deal as a BRRRR). */
export async function duplicateProperty(id: string, asStrategy?: StrategyValue): Promise<string | null> {
  const user = await requireUser();
  const src = await prisma.property.findFirst({ where: { id, userId: user.id } });
  if (!src) return null;
  const target = asStrategy && STRATEGIES.some((s) => s.value === asStrategy) ? asStrategy : null;
  const strategyInputs = src.strategyInputs ?? (target && target !== "BUY_HOLD" ? strategyDefaultsFrom(await getSettings()) : null);
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = src;
  // A copy is the user's own working deal, so it is no longer a sample.
  const copy = await prisma.property.create({
    data: {
      ...rest,
      marketData: (rest.marketData ?? undefined) as Prisma.InputJsonValue | undefined,
      rehabPlan: (rest.rehabPlan ?? undefined) as Prisma.InputJsonValue | undefined,
      offerGoals: (rest.offerGoals ?? undefined) as Prisma.InputJsonValue | undefined,
      arvAnalysis: (rest.arvAnalysis ?? undefined) as Prisma.InputJsonValue | undefined,
      rentAnalysis: (rest.rentAnalysis ?? undefined) as Prisma.InputJsonValue | undefined,
      strategyInputs: (strategyInputs ?? undefined) as Prisma.InputJsonValue | undefined,
      strategy: target ?? src.strategy,
      aduInputs: (rest.aduInputs ?? undefined) as Prisma.InputJsonValue | undefined,
      name: target ? `${src.name} (${STRATEGIES.find((s) => s.value === target)!.label})` : `${src.name} (copy)`,
      isSample: false,
      status: "ANALYZING",
    },
  });
  revalidateAll();
  return copy.id;
}

export async function updateStatus(id: string, status: DealStatusValue) {
  const user = await requireUser();
  await prisma.property.updateMany({ where: { id, userId: user.id }, data: { status } });
  revalidateAll();
  revalidatePath(`/properties/${id}`);
}

/** Save just the max-offer goals (used from the property page without re-saving the whole deal). */
export async function saveOfferGoals(id: string, goals: unknown) {
  const user = await requireUser();
  const parsed = offerGoalsSchema.safeParse(goals);
  if (!parsed.success) return { ok: false as const };
  await prisma.property.updateMany({ where: { id, userId: user.id }, data: { offerGoals: parsed.data as Prisma.InputJsonValue } });
  revalidatePath(`/properties/${id}`);
  return { ok: true as const };
}

/** Save BRRRR / Flip goals from the property page (merged into the deal's strategy inputs). */
export async function saveStrategyGoals(id: string, goals: unknown) {
  const user = await requireUser();
  const parsed = strategyInputsSchema.shape.goals.safeParse(goals);
  if (!parsed.success) return { ok: false as const };
  const row = await prisma.property.findFirst({ where: { id, userId: user.id }, select: { strategyInputs: true } });
  if (!row) return { ok: false as const };
  const current = (row.strategyInputs as Record<string, unknown> | null) ?? {};
  await prisma.property.updateMany({
    where: { id, userId: user.id },
    data: { strategyInputs: { ...current, goals: parsed.data } as Prisma.InputJsonValue },
  });
  revalidatePath(`/properties/${id}`);
  return { ok: true as const };
}

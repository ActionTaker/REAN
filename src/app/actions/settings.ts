"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import { seedSamples } from "@/lib/data/properties";
import { settingsSchema, type SettingsFormValues } from "@/lib/validation/deal";

export type SaveSettingsResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export async function saveSettings(values: SettingsFormValues): Promise<SaveSettingsResult> {
  const user = await requireUser();
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { name, defaultLoanTermYears, defaultHoldingPeriodYears, defaultHoldMonths, ...decimals } = parsed.data;
  const data = {
    ...decimals,
    defaultLoanTermYears: parseInt(defaultLoanTermYears, 10),
    defaultHoldingPeriodYears: parseInt(defaultHoldingPeriodYears, 10),
    defaultHoldMonths: parseInt(defaultHoldMonths, 10),
  };
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { name: name || null } }),
    prisma.userSettings.upsert({ where: { userId: user.id }, update: data, create: { ...data, userId: user.id } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeSampleData() {
  const user = await requireUser();
  await prisma.property.deleteMany({ where: { userId: user.id, isSample: true } });
  revalidatePath("/", "layout");
}

export async function restoreSampleData() {
  const user = await requireUser();
  await prisma.property.deleteMany({ where: { userId: user.id, isSample: true } });
  await seedSamples(user.id);
  revalidatePath("/", "layout");
}

export type DeleteAccountResult = { ok: false; error: string } | undefined;

/** Permanently delete the signed-in account and everything in it (deals, settings, lookup records cascade). */
export async function deleteAccount(confirmation: string): Promise<DeleteAccountResult> {
  const user = await requireUser();
  if (confirmation.trim() !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };
  await prisma.user.delete({ where: { id: user.id } });
  await signOut({ redirectTo: "/" });
}

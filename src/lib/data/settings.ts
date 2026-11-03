import "server-only";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { trimZeros } from "@/lib/property-mapping";
import type { SettingsFormValues } from "@/lib/validation/deal";

export type SettingsRecord = Omit<SettingsFormValues, "name">;

export async function getSettings(): Promise<SettingsRecord> {
  const user = await requireUser();
  const row = await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
  const { id: _id, userId: _userId, updatedAt: _updatedAt, ...rest } = row;
  return Object.fromEntries(
    Object.entries(rest).map(([k, v]) => [k, trimZeros(String(v))]),
  ) as SettingsRecord;
}

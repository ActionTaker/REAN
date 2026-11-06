/** Private demo accounts are deleted after this many days unless the visitor signs up. */
export const GUEST_DAYS = 3;

/** "2 days 5 hours", "5 hours", "under an hour" until a demo account created at `createdAt` is removed. */
export function demoTimeLeft(createdAt: Date, now = Date.now()): string {
  const ms = createdAt.getTime() + GUEST_DAYS * 86_400_000 - now;
  if (ms <= 3_600_000) return "under an hour";
  const hours = Math.floor(ms / 3_600_000);
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  return d > 0 ? (h > 0 ? `${part(d, "day")} ${part(h, "hour")}` : part(d, "day")) : part(h, "hour");
}

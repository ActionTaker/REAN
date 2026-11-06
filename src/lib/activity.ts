import "server-only";
import { prisma } from "@/lib/db";

const HOUR = 3_600_000;
const utcDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Notes that the user opened an app page: bumps `activeDays` on the first visit of a new UTC day and
 * refreshes `lastSeenAt` at most hourly, so most page loads write nothing. Feeds the "came back" column
 * in scripts/attribution-report.ts.
 */
export async function recordVisit(user: { id: string; lastSeenAt: Date | null }) {
  const now = new Date();
  const last = user.lastSeenAt;
  if (last && now.getTime() - last.getTime() < HOUR) return;
  const newDay = !last || utcDay(last) !== utcDay(now);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: now, ...(newDay ? { activeDays: { increment: 1 } } : {}) },
  });
}

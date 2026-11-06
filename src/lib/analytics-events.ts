import "server-only";
import { cookies } from "next/headers";

/**
 * Server-confirmed analytics events. A server action that succeeds (sign-up, first saved deal, demo start)
 * queues the event in a short-lived cookie; <Analytics /> sends it to GA4 on the next page and clears it.
 * So only real successes are counted, and each one once.
 */
export const EVENT_COOKIE = "dealan_evt";
export type AnalyticsEvent = "sign_up" | "first_deal_saved" | "demo_start";

export async function queueAnalyticsEvent(name: AnalyticsEvent) {
  const jar = await cookies();
  const existing = jar.get(EVENT_COOKIE)?.value?.split(",").filter(Boolean) ?? [];
  if (!existing.includes(name)) existing.push(name);
  jar.set(EVENT_COOKIE, existing.join(","), { path: "/", maxAge: 600, sameSite: "lax", httpOnly: false });
}

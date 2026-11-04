"use client";

import { useEffect } from "react";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_DAYS } from "@/lib/attribution";

/**
 * Remembers where a visitor first came from (UTM tags, landing page, referring site) so sign-up can record it.
 * First touch wins: an existing cookie is never overwritten. Visits from our own pages are ignored.
 */
export function AttributionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split("; ").some((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`))) return;
      const url = new URL(window.location.href);
      const q = url.searchParams;
      let referrer: string | null = null;
      try {
        const r = document.referrer ? new URL(document.referrer) : null;
        referrer = r && r.host !== url.host ? r.host : null;
      } catch {
        referrer = null;
      }
      const data = {
        source: q.get("utm_source"),
        medium: q.get("utm_medium"),
        campaign: q.get("utm_campaign"),
        content: q.get("utm_content"),
        landing: url.pathname,
        referrer,
      };
      // Only remember visits that tell us something: tagged links or another site sending them.
      if (!data.source && !data.medium && !data.campaign && !referrer) return;
      const value = encodeURIComponent(JSON.stringify(data));
      document.cookie = `${ATTRIBUTION_COOKIE}=${value}; Max-Age=${ATTRIBUTION_DAYS * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
      // Attribution is best-effort; never break the page over it.
    }
  }, []);
  return null;
}

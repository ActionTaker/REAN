"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
/** Google Ads conversion tracking (AW-…) and the conversion label for each event. */
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
const ADS_LABELS: Record<string, string | undefined> = {
  sign_up: process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL,
  first_deal_saved: process.env.NEXT_PUBLIC_GOOGLE_ADS_FIRST_DEAL_LABEL,
};
const EVENT_COOKIE = "dealan_evt";
const ALLOWED = new Set(["sign_up", "first_deal_saved", "demo_start"]);

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

/** Sends any server-confirmed events queued in the cookie, then clears it. */
function flushQueuedEvents() {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${EVENT_COOKIE}=`));
  if (!raw || !window.gtag) return;
  const names = decodeURIComponent(raw.slice(EVENT_COOKIE.length + 1)).split(",").filter((n) => ALLOWED.has(n));
  document.cookie = `${EVENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  for (const n of names) {
    window.gtag("event", n, n === "sign_up" ? { method: "email" } : {});
    // The same server-confirmed event, counted as a Google Ads conversion.
    const label = ADS_LABELS[n];
    if (ADS_ID && label) window.gtag("event", "conversion", { send_to: `${ADS_ID}/${label}` });
  }
}

/**
 * Google Analytics 4, only when NEXT_PUBLIC_GA_ID is set (production), plus Google Ads conversion
 * measurement when NEXT_PUBLIC_GOOGLE_ADS_ID is set. Google signals and ad personalization are off
 * (no remarketing audiences). Page changes are tracked by GA4's
 * enhanced measurement (browser history events).
 */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!GA_ID) return;
    // gtag loads after hydration; retry briefly so an event queued by a redirect isn't missed.
    let tries = 0;
    const id = window.setInterval(() => {
      if (window.gtag || ++tries > 20) {
        window.clearInterval(id);
        flushQueuedEvents();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [pathname]);

  if (!GA_ID) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'denied' });
gtag('set', 'allow_ad_personalization_signals', false);
gtag('js', new Date());
gtag('config', '${GA_ID}', { allow_google_signals: false, allow_ad_personalization_signals: false });${
          ADS_ID ? `\ngtag('config', '${ADS_ID}', { allow_ad_personalization_signals: false });` : ""
        }`}
      </Script>
    </>
  );
}

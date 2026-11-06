"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
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
  for (const n of names) window.gtag("event", n, n === "sign_up" ? { method: "email" } : {});
}

/**
 * Google Analytics 4, only when NEXT_PUBLIC_GA_ID is set (production). Analytics only:
 * Google signals and ad personalization are off. Page changes are tracked by GA4's
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
gtag('js', new Date());
gtag('config', '${GA_ID}', { allow_google_signals: false, allow_ad_personalization_signals: false });`}
      </Script>
    </>
  );
}

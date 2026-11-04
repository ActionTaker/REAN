/** Public base URL: NEXT_PUBLIC_SITE_URL, else Vercel's production domain, else local dev. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/** Public, indexable marketing routes (the app itself is behind sign-in). */
export const PUBLIC_ROUTES = ["/", "/lp/comps", "/lp/brrrr", "/lp/adu", "/lp/stress", "/privacy", "/terms"] as const;

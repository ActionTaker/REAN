/**
 * First-touch attribution: where a visitor came from before signing up.
 * The browser keeps it in a first-party cookie for 30 days; sign-up copies it onto the user.
 */
export const ATTRIBUTION_COOKIE = "dealan_src";
export const ATTRIBUTION_DAYS = 30;

export interface Attribution {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  landing: string | null;
  referrer: string | null;
}

const clean = (v: unknown, max = 100): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t ? t : null;
};

/** Parse the cookie value defensively; anything malformed counts as no attribution. */
export function parseAttribution(raw: string | undefined | null): Attribution | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const a: Attribution = {
      source: clean(d.source),
      medium: clean(d.medium),
      campaign: clean(d.campaign),
      content: clean(d.content),
      landing: clean(d.landing, 200),
      referrer: clean(d.referrer, 200),
    };
    return Object.values(a).some(Boolean) ? a : null;
  } catch {
    return null;
  }
}

/** User columns for an attribution (undefined when there is none, so existing values stay). */
export function attributionData(a: Attribution | null) {
  if (!a) return {};
  return {
    signupSource: a.source,
    signupMedium: a.medium,
    signupCampaign: a.campaign,
    signupContent: a.content,
    signupLanding: a.landing,
    signupReferrer: a.referrer,
  };
}

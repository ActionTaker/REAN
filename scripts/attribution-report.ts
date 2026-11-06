/**
 * Sign-ups and activation by where people came from.
 *   npx tsx scripts/attribution-report.ts [--days 30]
 * Uses DATABASE_URL (local by default). Demo accounts that never signed up are counted separately.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const daysArg = process.argv.indexOf("--days");
const days = daysArg > 0 ? Number(process.argv[daysArg + 1]) || 30 : 30;
const since = new Date(Date.now() - days * 86_400_000);

type Row = { key: string; signups: number; activated: number; hours: number[] };

function channel(u: { signupSource: string | null; signupMedium: string | null; signupCampaign: string | null; signupReferrer: string | null }) {
  if (u.signupSource) return `${u.signupSource} / ${u.signupMedium ?? "-"} / ${u.signupCampaign ?? "-"}`;
  if (u.signupReferrer) return `referral: ${u.signupReferrer}`;
  return "(direct or unknown)";
}

async function main() {
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since }, email: { not: "demo@dealan.app" } },
    select: { isGuest: true, createdAt: true, firstDealSavedAt: true, signupSource: true, signupMedium: true, signupCampaign: true, signupReferrer: true, signupLanding: true },
  });
  const real = users.filter((u) => !u.isGuest);
  const demos = users.filter((u) => u.isGuest);

  const group = (keyOf: (u: (typeof real)[number]) => string) => {
    const m = new Map<string, Row>();
    for (const u of real) {
      const k = keyOf(u);
      const r = m.get(k) ?? { key: k, signups: 0, activated: 0, hours: [] };
      r.signups++;
      if (u.firstDealSavedAt) {
        r.activated++;
        r.hours.push((u.firstDealSavedAt.getTime() - u.createdAt.getTime()) / 3_600_000);
      }
      m.set(k, r);
    }
    return [...m.values()].sort((a, b) => b.signups - a.signups);
  };
  const median = (xs: number[]) => {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };
  const print = (title: string, rows: Row[]) => {
    console.log(`\n${title}`);
    console.table(
      rows.map((r) => ({
        source: r.key,
        "sign-ups": r.signups,
        "saved a deal": r.activated,
        "activation %": r.signups ? Math.round((r.activated / r.signups) * 100) : 0,
        "median hours to first save": median(r.hours)?.toFixed(1) ?? "-",
      })),
    );
  };

  console.log(`Last ${days} days (since ${since.toISOString().slice(0, 10)}): ${real.length} sign-ups, ${demos.length} demos not converted yet`);
  print("By source / medium / campaign", group(channel));
  print("By first page", group((u) => u.signupLanding ?? "(unknown)"));

  // Demo funnel: every "Try the demo", kept even after unconverted demo accounts are deleted.
  const demosAll = await prisma.demoSession.findMany({ where: { createdAt: { gte: since } } });
  const funnel = new Map<string, { starts: number; saved: number; signedUp: number; savedThenSignedUp: number }>();
  for (const d of demosAll) {
    const k = d.source ? `${d.source} / ${d.medium ?? "-"} / ${d.campaign ?? "-"}` : d.referrer ? `referral: ${d.referrer}` : "(direct or unknown)";
    const f = funnel.get(k) ?? { starts: 0, saved: 0, signedUp: 0, savedThenSignedUp: 0 };
    f.starts++;
    if (d.firstDealSavedAt) f.saved++;
    if (d.signedUpAt) f.signedUp++;
    if (d.firstDealSavedAt && d.signedUpAt) f.savedThenSignedUp++;
    funnel.set(k, f);
  }
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  console.log(`\nDemo funnel (${demosAll.length} demo starts)`);
  console.table(
    [...funnel.entries()]
      .sort((a, b) => b[1].starts - a[1].starts)
      .map(([k, f]) => ({
        source: k,
        "demo starts": f.starts,
        "saved a deal in demo": f.saved,
        "signed up": f.signedUp,
        "demo → sign-up %": pct(f.signedUp, f.starts),
        "saved deal → sign-up %": pct(f.savedThenSignedUp, f.saved),
      })),
  );
}

main().finally(() => prisma.$disconnect());

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, CheckCircle2, Home, Map, Repeat, ShieldAlert, Sigma, Target, XCircle } from "lucide-react";
import { auth } from "@/auth";
import { startDemoAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shell/brand";
import { Disclaimer } from "@/components/common/disclaimer";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "DEALAN — Know your max offer before you call",
  description:
    "Rental property analysis for U.S. investors: comps with every adjustment shown, your max offer price from your own goals, BRRRR, flips and ADUs. Free during early access.",
};

/* Figures in the mock-ups below are the app's own sample deals, labelled as examples. */

function DemoButton({ className, children = "Try the demo — no sign-up" }: { className?: string; children?: React.ReactNode }) {
  return (
    <form action={startDemoAction} className={className}>
      <Button type="submit" size="lg" variant="outline" className="w-full sm:w-auto">
        {children}
      </Button>
    </form>
  );
}

function Frame({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm", className)} aria-label={`Example: ${title}`}>
      <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2">
        <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        <span className="size-2.5 rounded-full bg-muted-foreground/25" />
        <span className="ml-2 text-[11px] text-muted-foreground">{title} · sample deal</span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function MaxOfferMock() {
  const goals: [string, string, string, boolean][] = [
    ["Cash flow", "≥ $0 /mo", "$227,500", true],
    ["Cash-on-cash", "≥ 6%", "$170,500", false],
    ["Cap rate", "≥ 6%", "$224,000", true],
    ["DSCR", "≥ 1.25", "$182,000", false],
  ];
  return (
    <Frame title="Max offer price">
      <div className="rounded-lg border border-negative/30 bg-negative/5 px-4 py-3">
        <p className="text-sm">
          To meet your goals, offer at or below <span className="num text-xl font-semibold">$170,500</span>
        </p>
        <p className="text-xs text-muted-foreground">Asking $189,000 is $18,500 over · cash-on-cash sets the limit</p>
      </div>
      <div className="mt-3 divide-y rounded-lg border text-sm">
        {goals.map(([g, t, max, ok]) => (
          <div key={g} className="flex items-center gap-2 px-3 py-2">
            {ok ? <CheckCircle2 className="size-4 text-positive" /> : <XCircle className="size-4 text-negative" />}
            <span className="font-medium">{g}</span>
            <span className="text-xs text-muted-foreground">{t}</span>
            <span className="num ml-auto font-semibold">{max}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function HeroMock() {
  const tiles: [string, string, string][] = [
    ["Cash flow", "$191/mo", "text-positive"],
    ["Cap rate", "7.12%", ""],
    ["Cash-on-cash", "3.76%", "text-negative"],
  ];
  return (
    <Frame title="Deal analyzer">
      <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
        <Map className="size-4 text-muted-foreground" />
        <span className="truncate">4218 N Graceland Ave, Indianapolis, IN 46208</span>
        <span className="ml-auto shrink-0 rounded-md bg-foreground px-2 py-0.5 text-[11px] text-background">Get estimates</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {tiles.map(([k, v, c]) => (
          <div key={k} className="rounded-lg border p-2.5">
            <div className="text-[11px] text-muted-foreground">{k}</div>
            <div className={cn("num text-lg font-semibold", c)}>{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-negative/30 bg-negative/5 px-3 py-3">
        <div>
          <div className="text-[11px] text-muted-foreground">Max offer that meets all 5 goals</div>
          <div className="num text-2xl font-semibold">$170,500</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          Asking <span className="num">$189,000</span>
          <div className="font-medium text-negative">$18,500 over</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        {["15 sales comps", "15 rental comps", "Stress test", "Lender-ready report"].map((t) => (
          <span key={t} className="rounded-full border px-2 py-0.5 text-muted-foreground">{t}</span>
        ))}
      </div>
    </Frame>
  );
}

function CompsMock() {
  return (
    <Frame title="Comps & ARV">
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
          <div className="rounded-md bg-muted/60 px-2 py-1.5">① Sale price</div>
          <div className="rounded-md bg-muted/60 px-2 py-1.5">② Adjust to yours</div>
          <div className="rounded-md bg-muted/60 px-2 py-1.5 font-medium text-foreground">③ Adjusted</div>
        </div>
        {[
          ["3048 Renault St", "$1,695,000", "size −$275,258 · age −$22,384", "$1,386,866"],
          ["2923 Renault Pl", "$1,425,000", "beds +$27,980 · baths −$10,493", "$1,427,825"],
          ["5217 Cole St", "$1,225,000", "size −$8,630 · beds +$27,980", "$1,219,867"],
        ].map(([addr, price, adj, out]) => (
          <div key={addr} className="rounded-lg border px-3 py-2">
            <div className="flex justify-between gap-2">
              <span className="font-medium">{addr}</span>
              <span className="num font-semibold">{out}</span>
            </div>
            <div className="flex justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="num">{price}</span>
              <span className="num">{adj}</span>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-muted-foreground">Every comp on a map. Tag the renovated ones and the ARV uses only those.</p>
      </div>
    </Frame>
  );
}

function BrrrrMock() {
  const rows: [string, string, boolean?][] = [
    ["Cash you put in", "$24,500"],
    ["Cash back at the refinance", "$18,875"],
    ["Cash left in the deal", "$5,625", true],
    ["Cash flow after refi", "$138 /mo"],
  ];
  return (
    <Frame title="BRRRR">
      <div className="divide-y text-sm">
        {rows.map(([k, v, strong]) => (
          <div key={k} className={cn("flex justify-between py-2", strong && "font-semibold")}>
            <span className={cn(!strong && "text-muted-foreground")}>{k}</span>
            <span className="num">{v}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Hard money, rehab, holding costs and the cash-out refinance, step by step.</p>
    </Frame>
  );
}

function AduMock() {
  const rows: [string, string, string, string][] = [
    ["Cash flow / mo", "$191", "$382", "$572"],
    ["Cash-on-cash", "3.76%", "8.18%", "5.87%"],
    ["DSCR", "1.20×", "—", "1.61×"],
  ];
  return (
    <Frame title="ADU scenario">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] text-muted-foreground">
            <th className="py-1 text-left font-medium" />
            <th className="py-1 text-right font-medium">Without</th>
            <th className="py-1 text-right font-medium">ADU only</th>
            <th className="py-1 text-right font-medium text-foreground">With ADU</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map(([k, a, b, c]) => (
            <tr key={k}>
              <td className="py-2 text-muted-foreground">{k}</td>
              <td className="num py-2 text-right">{a}</td>
              <td className="num py-2 text-right">{b}</td>
              <td className="num py-2 text-right font-semibold">{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-muted-foreground">Build cost per sq ft, rent, value added and the build cost where it stops paying off.</p>
    </Frame>
  );
}

const FEATURES = [
  {
    id: "max-offer",
    icon: Target,
    eyebrow: "Max offer price",
    title: "Know your number before you call the agent.",
    body: "Set the goals that matter for this deal — cash flow, cash-on-cash, cap rate, DSCR, equity. DEALAN works backward to the highest price that still meets every one, and tells you which goal is holding it back.",
    points: ["Re-solves instantly as you change rent, rate or rehab", "Choose same-% or same-$ down payment", "Reassess property tax at your offer price"],
    mock: <MaxOfferMock />,
  },
  {
    id: "comps",
    icon: Map,
    eyebrow: "Comps & ARV",
    title: "An ARV you can actually defend.",
    body: "See each comparable sale on a map with the dollar adjustments for size, beds, baths and age. No black-box number — show your lender or partner exactly how you got there.",
    points: ["Sales and rental comps from public records and listings", "Pick which comps count and tag the renovated ones", "Confidence and the range they support"],
    mock: <CompsMock />,
  },
  {
    id: "brrrr",
    icon: Repeat,
    eyebrow: "BRRRR & flips",
    title: "How much cash stays stuck in the deal?",
    body: "Model the hard-money buy, the rehab, the holding months and the cash-out refinance. For flips, profit, ROI and the break-even sale price.",
    points: ["Cash left in the deal and cash-on-cash after the refi", "Max price to get all your cash back", "What-if: rehab runs long, ARV comes in low"],
    mock: <BrrrrMock />,
  },
  {
    id: "adu",
    icon: Home,
    eyebrow: "ADU",
    title: "Is that backyard unit worth building?",
    body: "Compare the property without the ADU, the ADU on its own, and both together — valued by rent or by $/sq ft, with every line of the math shown.",
    points: ["Cost per sq ft scaled to your state", "Cash or loan, build time, rent estimate", "Equity created and break-even build cost"],
    mock: <AduMock />,
  },
] as const;

const FAQ = [
  ["Where do the numbers come from?", "Address lookups pull property records, value and rent estimates and comparable sales and rentals from RentCast. Taxes, insurance and rehab start from state averages. Every figure is editable, and automated estimates can be wrong — check them against an agent, an appraisal and a property manager."],
  ["What does it cost?", "DEALAN is free while it's in early access. You don't need a credit card to sign up."],
  ["Which strategies does it handle?", "Buy & hold rentals (1–4 units and small multifamily), BRRRR, fix-and-flip, and adding an ADU to a rental."],
  ["Is this investment advice?", "No. DEALAN does the math on the assumptions you enter and shows how every number is calculated. Results are estimates, not guarantees."],
  ["Can I try it without signing up?", "Yes. The demo opens a private copy with sample deals that only you can see. Sign up from inside it and your work is kept."],
] as const;

export default async function LandingPage() {
  const session = await auth();
  const signedIn = !!session?.user;
  const primary = signedIn ? { href: "/analyzer", label: "Analyze a property" } : { href: "/register", label: "Analyze a property free" };
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Brand href="/" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Page">
            <a href="#max-offer" className="hover:text-foreground">Max offer</a>
            <a href="#comps" className="hover:text-foreground">Comps & ARV</a>
            <a href="#brrrr" className="hover:text-foreground">BRRRR & flips</a>
            <a href="#adu" className="hover:text-foreground">ADU</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild><Link href="/dashboard">Open dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link href="/login">Sign in</Link></Button>
                <Button asChild><Link href="/register">Get started</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-14 pb-16 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div>
            <p className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">For U.S. rental investors · Buy & Hold · BRRRR · Flip</p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Know your max offer before you call the agent.</h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
              Type an address. DEALAN pulls comps and rent, shows every adjustment, and works backward from your goals to the highest price that still
              works.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={primary.href}>
                  {primary.label} <ArrowRight />
                </Link>
              </Button>
              {!signedIn && <DemoButton />}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Free during early access · No credit card · Your demo is private to you</p>
          </div>
          <HeroMock />
        </section>

        {/* What's different */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Target, "Offer price from your goals", "Not just “is it good” — the highest price that works."],
              [Map, "Comps you can audit", "Every adjustment shown, every comp on a map."],
              [Sigma, "Every formula shown", "Hover any metric to see exactly how it's calculated."],
              [ShieldAlert, "Stress-tested", "Rent down, rates up, vacancy up — one at a time and all at once."],
            ].map(([Icon, t, b]) => {
              const I = Icon as typeof Target;
              return (
                <div key={t as string} className="flex gap-3">
                  <I className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-semibold">{t as string}</div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{b as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">From address to offer in three steps</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Enter the address", "Property details, taxes, value, rent and comps fill in. Check them against the comps on a map."],
              ["Check the numbers", "Purchase, financing, rehab, income and expenses — each line shows what it adds or takes away each month."],
              ["Get your offer", "Your max offer price, a stress test, and a lender-ready report you can print or share."],
            ].map(([t, b], i) => (
              <li key={t} className="rounded-xl border bg-card p-5">
                <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">{i + 1}</span>
                <h3 className="mt-3 font-semibold">{t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <div className="space-y-20 pb-20">
          {FEATURES.map((f, i) => (
            <section key={f.id} id={f.id} className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-10 px-4 lg:grid-cols-2">
              <div className={cn(i % 2 === 1 && "lg:order-2")}>
                <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  <f.icon className="size-4" /> {f.eyebrow}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">{f.title}</h2>
                <p className="mt-4 text-pretty text-muted-foreground">{f.body}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {f.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={cn(i % 2 === 1 && "lg:order-1")}>{f.mock}</div>
            </section>
          ))}
        </div>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-16">
            <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
            <div className="mt-6 divide-y rounded-xl border bg-card">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                    {q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 text-center">
          <Calculator className="mx-auto size-6 text-muted-foreground" />
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance">Run your next deal before you make the offer.</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Free during early access. Start from an address, or open the demo with sample deals.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href={primary.href}>
                {primary.label} <ArrowRight />
              </Link>
            </Button>
            {!signedIn && <DemoButton>Open the demo</DemoButton>}
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-start sm:justify-between">
          <Brand href="/" />
          <Disclaimer className="max-w-2xl" />
        </div>
      </footer>
    </div>
  );
}

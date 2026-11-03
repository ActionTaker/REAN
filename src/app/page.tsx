import Link from "next/link";
import { ArrowRight, Calculator, FileText, GitCompareArrows, Sigma } from "lucide-react";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/shell/brand";
import { Disclaimer } from "@/components/common/disclaimer";

const FEATURES = [
  { icon: Calculator, title: "Underwrite in minutes", body: "Purchase, financing, income and expenses in one form. Cash flow, cap rate, cash-on-cash and DSCR update as you type." },
  { icon: Sigma, title: "Every formula shown", body: "Hover any metric to see exactly how it was calculated. Decimal-precise math — no floating-point rounding surprises." },
  { icon: GitCompareArrows, title: "Compare side by side", body: "Line up to four deals and see which one clears your investment criteria." },
  { icon: FileText, title: "Lender-ready reports", body: "Print or save a clean, professional analysis to share with partners and lenders." },
];

export default async function LandingPage() {
  const session = await auth();
  const signedIn = !!session?.user;
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Brand href="/" />
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
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 text-center sm:pt-24">
        <p className="mb-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">Buy & hold rental analysis</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Know what a rental property will really earn — before you make an offer.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
          DEALAN gives single-family and small multifamily investors a transparent, accurate underwriting workflow.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link href={signedIn ? "/analyzer" : "/register"}>
              Analyze a property <ArrowRight />
            </Link>
          </Button>
          {!signedIn && (
            <Button size="lg" variant="outline" asChild><Link href="/login">Try the demo</Link></Button>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border bg-card p-5 shadow-xs">
            <Icon className="size-5 text-muted-foreground" />
            <h3 className="mt-3 font-medium">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <Disclaimer />
        </div>
      </footer>
    </div>
  );
}

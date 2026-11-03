import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { SampleBadge } from "@/components/common/sample-badge";
import { RatingBadge } from "@/components/common/rating-badge";
import { listProperties } from "@/lib/data/properties";
import { getSettings } from "@/lib/data/settings";
import { analyzeRecords, relativeTime } from "@/lib/analyze-record";
import { dec, formatCurrency, formatPercent } from "@/lib/finance";
import { formatAddress } from "@/lib/property-mapping";
import { cn } from "@/lib/utils";
import { StrategyBadge } from "@/components/common/strategy-badge";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const [records, settings] = await Promise.all([listProperties(), getSettings()]);
  const items = analyzeRecords(records, settings);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Professional, print-ready investment analyses to share with partners, lenders and agents."
      />
      {items.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Save an analysis to generate its report."
          action={<Button asChild><Link href="/analyzer"><Plus /> Analyze a property</Link></Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map(({ record: r, analysis: a, rating, flip, brrrr }) => (
            <Link
              key={r.id}
              href={`/reports/${r.id}`}
              className="group flex gap-4 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-foreground/20"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileText className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium group-hover:underline">{r.name} — Investment Analysis</p>
                  <StrategyBadge strategy={r.strategy} />
                  {r.isSample && <SampleBadge />}
                </div>
                <p className="truncate text-xs text-muted-foreground">{formatAddress(r) || "No address"} · Updated {relativeTime(r.updatedAt)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <span className="num">{formatCurrency(dec(r.purchasePrice))}</span>
                  {flip ? (
                    <>
                      <span className={cn("num font-medium", flip.profit.isNegative() ? "text-negative" : "text-positive")}>{formatCurrency(flip.profit)} profit</span>
                      <span className="num">ROI {formatPercent(flip.roi)}</span>
                    </>
                  ) : (
                    <>
                      <span className={cn("num font-medium", a.monthlyCashFlow.isNegative() ? "text-negative" : "text-positive")}>
                        {formatCurrency(a.monthlyCashFlow)}/mo
                      </span>
                      {brrrr ? (
                        <span className="num">Cash left {brrrr.cashLeftInDeal.gt(0) ? formatCurrency(brrrr.cashLeftInDeal) : "$0"}</span>
                      ) : (
                        <span className="num">Cap {formatPercent(a.capRate)}</span>
                      )}
                      <span className="num">CoC {brrrr?.infiniteReturn ? "∞" : formatPercent(a.cashOnCash)}</span>
                    </>
                  )}
                  <RatingBadge rating={rating} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, FlaskConical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard, toneFor } from "@/components/common/metric-card";
import { SampleBadge } from "@/components/common/sample-badge";
import { RatingBadge } from "@/components/common/rating-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/common/disclaimer";
import { PropertyCard } from "@/components/deal/property-card";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { ReturnsChart } from "@/components/charts/returns-chart";
import { listProperties } from "@/lib/data/properties";
import { getSettings } from "@/lib/data/settings";
import { analyzeRecords, relativeTime } from "@/lib/analyze-record";
import { requireUser } from "@/lib/auth-helpers";
import { METRICS, chartNumber, dec, formatCurrency, formatPercent, summarizePortfolio } from "@/lib/finance";
import { formatAddress } from "@/lib/property-mapping";
import { cn } from "@/lib/utils";
import { StrategyBadge } from "@/components/common/strategy-badge";
import type { AnalyzedProperty } from "@/lib/analyze-record";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ samples?: string }> }) {
  const { samples } = await searchParams;
  const excludeSamples = samples === "exclude";
  const [user, all, settings] = await Promise.all([requireUser(), listProperties(), getSettings()]);

  const sampleCount = all.filter((p) => p.isSample).length;
  const ownCount = all.length - sampleCount;
  const records = excludeSamples ? all.filter((p) => !p.isSample) : all;
  const items = analyzeRecords(records, settings);
  // Flips aren't rentals: keep them out of rental totals and report their profit separately.
  const rentalItems = items.filter((i) => i.strategy !== "FLIP");
  const flips = items.filter((i) => i.flip);
  const s = summarizePortfolio(rentalItems.map((i) => i.analysis));
  const flipProfit = flips.reduce((acc, i) => acc.plus(i.flip!.profit), dec(0));
  const firstName = user.name?.split(" ")[0];

  const header = (
    <PageHeader
      title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
      description="Portfolio-level view of every property you've analyzed."
      actions={
        <Button asChild>
          <Link href="/analyzer"><Plus /> Analyze new property</Link>
        </Button>
      }
    />
  );

  if (all.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={Calculator}
          title="No properties yet"
          description="Run your first analysis to see cash flow, cap rate and cash-on-cash return. You can also load sample deals from Settings."
          action={<Button asChild><Link href="/analyzer"><Plus /> Analyze a property</Link></Button>}
        />
      </div>
    );
  }

  const chartItems = [...rentalItems].sort((a, b) => b.analysis.monthlyCashFlow.comparedTo(a.analysis.monthlyCashFlow));
  const label = (name: string, isSample: boolean) => (isSample ? `${name} (sample)` : name);

  return (
    <div className="space-y-6">
      {header}

      {sampleCount > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-sample-foreground/20 bg-sample px-4 py-3 text-sm text-sample-foreground sm:flex-row sm:items-center">
          <FlaskConical className="size-4 shrink-0" />
          <p className="flex-1">
            {excludeSamples ? (
              <>Showing your {ownCount} propert{ownCount === 1 ? "y" : "ies"} only. {sampleCount} sample properties are hidden from these totals.</>
            ) : (
              <>
                These totals include <strong>{sampleCount} sample properties</strong> for demonstration
                {ownCount > 0 ? ` alongside your ${ownCount} own.` : "."} Sample deals are labelled throughout.
              </>
            )}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="bg-card" asChild>
              <Link href={excludeSamples ? "/dashboard" : "/dashboard?samples=exclude"}>
                {excludeSamples ? "Include sample data" : "Exclude sample data"}
              </Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href="/settings#sample-data">Manage</Link>
            </Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="No properties of your own yet"
          description="Sample data is excluded. Analyze a property to see your own portfolio metrics."
          action={<Button asChild><Link href="/analyzer"><Plus /> Analyze a property</Link></Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
            <MetricCard
              className="md:col-span-3"
              label="Properties analyzed"
              value={String(items.length)}
              sub={[excludeSamples ? "Your own" : sampleCount ? `${sampleCount} sample` : "All yours", flips.length ? `${flips.length} flip${flips.length > 1 ? "s" : ""}` : null].filter(Boolean).join(" · ")}
            />
            <MetricCard className="md:col-span-3" label="Total purchase price" value={formatCurrency(s.totalPurchasePrice, { compact: true })} sub={formatCurrency(s.totalPurchasePrice)} />
            <MetricCard className="md:col-span-3" label="Total initial investment" value={formatCurrency(s.totalCashInvested, { compact: true })} sub="Cash required" metric={METRICS.totalCashInvested} />
            <MetricCard className="md:col-span-3" label="Monthly rental income" value={formatCurrency(s.totalMonthlyIncome)} sub="Gross scheduled" />
            <MetricCard className="md:col-span-4" label="Monthly cash flow" value={formatCurrency(s.totalMonthlyCashFlow)} tone={toneFor(s.totalMonthlyCashFlow)} sub="After debt service" metric={METRICS.monthlyCashFlow} />
            <MetricCard className="md:col-span-4" label="Average cap rate" value={formatPercent(s.averageCapRate)} sub={`Weighted ${formatPercent(s.weightedCapRate)}`} metric={METRICS.capRate} />
            <MetricCard className="col-span-2 md:col-span-4" label="Average cash-on-cash" value={formatPercent(s.averageCashOnCash)} tone={toneFor(s.averageCashOnCash)} sub="Simple mean" metric={METRICS.cashOnCash} />
          </div>
          {flips.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border bg-card px-4 py-3 text-sm shadow-xs">
              <StrategyBadge strategy="FLIP" />
              <span>
                <span className="text-muted-foreground">Projected flip profit </span>
                <span className={cn("num font-semibold", flipProfit.isNegative() ? "text-negative" : "text-positive")}>{formatCurrency(flipProfit)}</span>
                <span className="text-muted-foreground"> across {flips.length} flip{flips.length > 1 ? "s" : ""}</span>
              </span>
              <span className="text-xs text-muted-foreground">Flips are excluded from the rental totals above. BRRRR deals count with their numbers after the refinance.</span>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monthly cash flow by property</CardTitle>
                <CardDescription className="text-xs">After operating expenses and mortgage payments</CardDescription>
              </CardHeader>
              <CardContent>
                <CashFlowChart
                  data={chartItems.map((i) => ({
                    name: label(i.record.name, i.record.isSample),
                    cashFlow: chartNumber(i.analysis.monthlyCashFlow, 0),
                  }))}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Cap rate vs. cash-on-cash</CardTitle>
                <CardDescription className="text-xs">Unlevered yield compared with your levered year-1 return</CardDescription>
              </CardHeader>
              <CardContent>
                <ReturnsChart
                  data={chartItems.map((i) => ({
                    name: label(i.record.name, i.record.isSample),
                    capRate: chartNumber(i.analysis.capRate?.times(100) ?? null),
                    cashOnCash: chartNumber(i.analysis.cashOnCash?.times(100) ?? null),
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          <Card className="gap-0 pb-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm">Recently analyzed deals</CardTitle>
              <CardAction>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/properties">View all <ArrowRight /></Link>
                </Button>
              </CardAction>
            </CardHeader>
            <div className="overflow-x-auto border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Property</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Cash flow / mo</TableHead>
                    <TableHead className="text-right">Cap rate</TableHead>
                    <TableHead className="text-right">CoC</TableHead>
                    <TableHead>Criteria</TableHead>
                    <TableHead className="pr-6 text-right">Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.slice(0, 5).map(({ record: r, analysis: a, rating, flip }) => (
                    <TableRow key={r.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2">
                          <Link href={`/properties/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                          <StrategyBadge strategy={r.strategy} />
                          {r.isSample && <SampleBadge />}
                        </div>
                        <div className="text-xs text-muted-foreground">{formatAddress({ ...r, address: null })}</div>
                      </TableCell>
                      <TableCell className="num text-right">{formatCurrency(dec(r.purchasePrice))}</TableCell>
                      {flip ? (
                        <>
                          <TableCell className={cn("num text-right font-medium", flip.profit.isNegative() ? "text-negative" : "text-positive")}>
                            {formatCurrency(flip.profit)} <span className="text-[11px] font-normal text-muted-foreground">profit</span>
                          </TableCell>
                          <TableCell className="num text-right text-muted-foreground">—</TableCell>
                          <TableCell className="num text-right">{formatPercent(flip.roi)} <span className="text-[11px] text-muted-foreground">ROI</span></TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className={cn("num text-right font-medium", a.monthlyCashFlow.isNegative() ? "text-negative" : "text-positive")}>
                            {formatCurrency(a.monthlyCashFlow)}
                          </TableCell>
                          <TableCell className="num text-right">{formatPercent(a.capRate)}</TableCell>
                          <TableCell className="num text-right">{formatPercent(a.cashOnCash)}</TableCell>
                        </>
                      )}
                      <TableCell><RatingBadge rating={rating} /></TableCell>
                      <TableCell className="pr-6 text-right text-xs text-muted-foreground">{relativeTime(r.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <section className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-sm font-semibold">Saved properties</h2>
                <p className="text-xs text-muted-foreground">Ranked by return — cash-on-cash for rentals, ROI for flips</p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/properties">Manage <ArrowRight /></Link>
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[...items]
                .sort((a, b) => rankReturn(b) - rankReturn(a))
                .slice(0, 6)
                .map((i) => (
                  <PropertyCard key={i.record.id} item={i} />
                ))}
            </div>
          </section>
        </>
      )}

      <Disclaimer />
    </div>
  );
}

/** Return used to rank saved deals: ROI for flips, cash-on-cash otherwise (an all-cash-out BRRRR ranks first). */
function rankReturn(i: AnalyzedProperty): number {
  if (i.flip) return i.flip.roi?.toNumber() ?? -Infinity;
  if (i.brrrr?.infiniteReturn) return Infinity;
  return i.analysis.cashOnCash?.toNumber() ?? -Infinity;
}

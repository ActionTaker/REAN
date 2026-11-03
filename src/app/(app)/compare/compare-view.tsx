"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GitCompareArrows, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SampleBadge } from "@/components/common/sample-badge";
import { RatingBadge } from "@/components/common/rating-badge";
import { InfoTip } from "@/components/common/info-tip";
import { EmptyState } from "@/components/common/empty-state";
import { Disclaimer } from "@/components/common/disclaimer";
import { CompareChart } from "@/components/charts/compare-chart";
import { SERIES, pctFmt, usd } from "@/components/charts/chart-tooltip";
import { MAX_COMPARE, propertyTypeLabel } from "@/lib/constants";
import {
  METRICS,
  analyzeDeal,
  chartNumber,
  formatCurrency,
  formatPercent,
  formatRatio,
  type D,
  type DealAnalysis,
  type InvestmentCriteria,
  type MetricDefinition,
} from "@/lib/finance";
import { formatAddress, recordToInputs, type PropertyRecord } from "@/lib/property-mapping";
import { rateAgainstGoals, resolveOfferGoals } from "@/lib/offer-goals";
import { cn } from "@/lib/utils";

interface Row {
  label: string;
  metric?: MetricDefinition;
  get: (a: DealAnalysis) => D | null;
  format: (v: D | null) => string;
  /** Which direction is "better"; omit for neutral rows. */
  better?: "high" | "low";
}

const money = (v: D | null) => formatCurrency(v);
const pct = (v: D | null) => formatPercent(v);

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "Acquisition",
    rows: [
      { label: "Purchase price", get: (a) => a.purchasePrice, format: money },
      { label: "After-repair value", metric: METRICS.afterRepairValue, get: (a) => a.afterRepairValue, format: money },
      { label: "Equity created", metric: METRICS.equityCreated, get: (a) => a.equityCreated, format: money, better: "high" },
      { label: "Total cash invested", metric: METRICS.totalCashInvested, get: (a) => a.totalCashInvested, format: money, better: "low" },
      { label: "Loan amount", get: (a) => a.loanAmount, format: money },
      { label: "Mortgage P&I / mo", metric: METRICS.mortgagePayment, get: (a) => a.monthlyMortgagePayment, format: money },
      { label: "Price per unit", get: (a) => a.pricePerUnit, format: money, better: "low" },
    ],
  },
  {
    title: "Income & cash flow",
    rows: [
      { label: "Gross income / mo", get: (a) => a.grossMonthlyIncome, format: money, better: "high" },
      { label: "Operating expenses / mo", get: (a) => a.monthlyOperatingExpenses, format: money },
      { label: "NOI / yr", metric: METRICS.noi, get: (a) => a.annualNOI, format: money, better: "high" },
      { label: "Cash flow / mo", metric: METRICS.monthlyCashFlow, get: (a) => a.monthlyCashFlow, format: money, better: "high" },
      { label: "Cash flow / unit / mo", get: (a) => a.monthlyCashFlowPerUnit, format: money, better: "high" },
    ],
  },
  {
    title: "Returns & ratios",
    rows: [
      { label: "Cap rate", metric: METRICS.capRate, get: (a) => a.capRate, format: pct, better: "high" },
      { label: "Cash-on-cash", metric: METRICS.cashOnCash, get: (a) => a.cashOnCash, format: pct, better: "high" },
      { label: "Year-1 total ROI", metric: METRICS.yearOneTotalROI, get: (a) => a.yearOneTotalROI, format: pct, better: "high" },
      { label: "DSCR", metric: METRICS.dscr, get: (a) => a.dscr, format: (v) => (v ? formatRatio(v, 2, "×") : "n/a"), better: "high" },
      { label: "1% rule", metric: METRICS.onePercentRule, get: (a) => a.onePercentRule, format: pct, better: "high" },
      { label: "Gross rent multiplier", metric: METRICS.grm, get: (a) => a.grossRentMultiplier, format: (v) => formatRatio(v, 2, "×"), better: "low" },
      { label: "Break-even occupancy", metric: METRICS.breakEvenOccupancy, get: (a) => a.breakEvenOccupancy, format: (v) => formatPercent(v, 1), better: "low" },
    ],
  },
  {
    title: "Long-term (projected)",
    rows: [
      { label: "IRR", metric: METRICS.irr, get: (a) => a.sale.irr, format: pct, better: "high" },
      { label: "Equity multiple", metric: METRICS.equityMultiple, get: (a) => a.sale.equityMultiple, format: (v) => formatRatio(v, 2, "×"), better: "high" },
      { label: "Total profit", get: (a) => a.sale.totalProfit, format: money, better: "high" },
    ],
  },
];

function bestIndex(values: (D | null)[], better?: "high" | "low"): number | null {
  if (!better) return null;
  let best: number | null = null;
  values.forEach((v, i) => {
    if (v === null) return;
    const cur = best === null ? null : values[best]!;
    if (cur === null || (better === "high" ? v.gt(cur) : v.lt(cur))) best = i;
  });
  // No highlight when every value ties.
  const nonNull = values.filter((v): v is D => v !== null);
  if (best !== null && nonNull.every((v) => v.eq(nonNull[0]))) return null;
  return best;
}

export function CompareView({ properties, selectedIds, criteria }: { properties: PropertyRecord[]; selectedIds: string[]; criteria: InvestmentCriteria }) {
  const router = useRouter();
  const pathname = usePathname();
  const selected = useMemo(
    () => selectedIds.map((id) => properties.find((p) => p.id === id)).filter((p): p is PropertyRecord => !!p),
    [properties, selectedIds],
  );
  const analyses = useMemo(
    () =>
      selected.map((p) => {
        const a = analyzeDeal(recordToInputs(p));
        return { p, a, rating: rateAgainstGoals(a, resolveOfferGoals(p.offerGoals, criteria)).rating };
      }),
    [selected, criteria],
  );

  const setIds = (ids: string[]) => router.replace(`${pathname}?ids=${ids.join(",")}`, { scroll: false });
  const available = properties.filter((p) => !selectedIds.includes(p.id));

  if (properties.length < 2) {
    return (
      <EmptyState
        icon={GitCompareArrows}
        title="Save at least two properties to compare"
        action={<Button asChild><Link href="/analyzer"><Plus /> Analyze a property</Link></Button>}
      />
    );
  }

  const charts = [
    { title: "Monthly cash flow", get: (a: DealAnalysis) => chartNumber(a.monthlyCashFlow, 0), format: usd, axis: usd },
    { title: "Cap rate", get: (a: DealAnalysis) => chartNumber(a.capRate?.times(100) ?? null), format: pctFmt, axis: (v: number) => `${v}%` },
    { title: "Cash-on-cash", get: (a: DealAnalysis) => chartNumber(a.cashOnCash?.times(100) ?? null), format: pctFmt, axis: (v: number) => `${v}%` },
    { title: "IRR (projected)", get: (a: DealAnalysis) => chartNumber(a.sale.irr?.times(100) ?? null), format: pctFmt, axis: (v: number) => `${v}%` },
  ];

  return (
    <div className="space-y-5">
      {/* Selection — each property keeps its color slot for every chart below. */}
      <div className="flex flex-wrap items-center gap-2">
        {analyses.map(({ p }, i) => (
          <span key={p.id} className="inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-1 pl-3 text-sm shadow-xs">
            <span className="size-2 rounded-full" style={{ background: SERIES[i] }} />
            {p.name}
            {p.isSample && <SampleBadge />}
            <button
              type="button"
              onClick={() => setIds(selectedIds.filter((id) => id !== p.id))}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Remove ${p.name}`}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        {selectedIds.length < MAX_COMPARE && available.length > 0 && (
          <Select value="" onValueChange={(id) => setIds([...selectedIds, id])}>
            <SelectTrigger size="sm" className="w-52" aria-label="Add a property">
              <SelectValue placeholder="+ Add property" />
            </SelectTrigger>
            <SelectContent>
              {available.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}{p.isSample ? " (sample)" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {analyses.length < 2 ? (
        <EmptyState icon={GitCompareArrows} title="Add another property" description="Pick at least two properties to see them side by side." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {charts.map((c) => (
              <Card key={c.title} className="gap-2">
                <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">{c.title}</CardTitle></CardHeader>
                <CardContent>
                  <CompareChart
                    data={analyses.map(({ p, a }, i) => ({ name: p.name, value: c.get(a), slot: i }))}
                    format={c.format}
                    axisFormat={c.axis}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-56 pl-4">Metric</TableHead>
                  {analyses.map(({ p, rating }, i) => (
                    <TableHead key={p.id} className="h-auto min-w-44 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: SERIES[i] }} />
                        <Link href={`/properties/${p.id}`} className="font-semibold text-foreground hover:underline">{p.name}</Link>
                      </div>
                      <div className="mt-0.5 text-xs font-normal">{[formatAddress({ ...p, address: null }), propertyTypeLabel(p.propertyType)].filter(Boolean).join(" · ")}</div>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <RatingBadge rating={rating} />
                        {p.isSample && <SampleBadge />}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {GROUPS.map((g) => (
                  <GroupRows key={g.title} group={g} analyses={analyses.map((x) => x.a)} />
                ))}
              </TableBody>
            </Table>
          </div>
          <Disclaimer />
        </>
      )}
    </div>
  );
}

function GroupRows({ group, analyses }: { group: (typeof GROUPS)[number]; analyses: DealAnalysis[] }) {
  return (
    <>
      <TableRow className="bg-muted/40 hover:bg-muted/40">
        <TableCell colSpan={analyses.length + 1} className="pl-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {group.title}
        </TableCell>
      </TableRow>
      {group.rows.map((row) => {
        const values = analyses.map(row.get);
        const best = bestIndex(values, row.better);
        return (
          <TableRow key={row.label}>
            <TableCell className="pl-4 text-sm">
              <span className="inline-flex items-center gap-1.5">{row.label}{row.metric && <InfoTip metric={row.metric} />}</span>
            </TableCell>
            {values.map((v, i) => (
              <TableCell
                key={i}
                className={cn("num", v?.isNegative() && "text-negative", best === i && "font-semibold")}
              >
                <span className={cn(best === i && "rounded bg-positive/10 px-1.5 py-0.5")}>{row.format(v)}</span>
                {best === i && <span className="sr-only"> (best)</span>}
              </TableCell>
            ))}
          </TableRow>
        );
      })}
    </>
  );
}

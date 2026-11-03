"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

import { CheckCircle2, ChevronDown, CircleMinus, TriangleAlert, XCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard, toneFor, type Tone } from "@/components/common/metric-card";
import { InfoTip } from "@/components/common/info-tip";
import { ProjectionChart } from "@/components/charts/projection-chart";
import { cn } from "@/lib/utils";
import {
  METRICS,
  chartNumber,
  formatCurrency,
  formatPercent,
  formatRatio,
  type CriteriaCheck,
  type D,
  type DealAnalysis,
  type DealRating,
  type MetricDefinition,
} from "@/lib/finance";

const money = (v: D | null) => formatCurrency(v);
const moneyC = (v: D | null) => formatCurrency(v, { cents: true });

// ─── Headline metrics ──────────────────────────────────────────────────────

export function KeyMetrics({ a, columns = 3, checks }: { a: DealAnalysis; columns?: 2 | 3 | 6; checks?: CriteriaCheck[] }) {
  const hasArv = a.equityCreated !== null;
  // When the deal has a goal for a metric, color it by pass/fail (a positive 3.8% that misses a 6% goal isn't "green").
  const goal = (key: string) => checks?.find((c) => c.key === key && c.passed !== null);
  const tone = (key: string, fallback: Tone) => {
    const g = goal(key);
    return g ? (g.passed ? "positive" : "negative") : fallback;
  };
  const sub = (key: string, fallback: string) => {
    const g = goal(key);
    return g ? `Goal ${g.target} · ${g.passed ? "met" : "missed"}` : fallback;
  };
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-3",
        // 8 cards with an ARV → 4 per row on wide screens so rows stay full.
        columns === 6 && (hasArv ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"),
      )}
    >
      <MetricCard
        label="Monthly cash flow"
        value={money(a.monthlyCashFlow)}
        tone={tone("breakEven", toneFor(a.monthlyCashFlow))}
        sub={sub("breakEven", `${money(a.annualCashFlow)} / year`)}
        metric={METRICS.monthlyCashFlow}
      />
      <MetricCard label="Cap rate" value={formatPercent(a.capRate)} metric={METRICS.capRate} tone={tone("capRate", "default")} sub={sub("capRate", "Unlevered")} />
      <MetricCard
        label="Cash-on-cash"
        value={formatPercent(a.cashOnCash)}
        tone={tone("cashOnCash", toneFor(a.cashOnCash))}
        metric={METRICS.cashOnCash}
        sub={sub("cashOnCash", "Year 1")}
      />
      <MetricCard label="Net operating income" value={money(a.annualNOI)} sub={`${money(a.monthlyNOI)} / month`} metric={METRICS.noi} />
      <MetricCard label="Total cash invested" value={money(a.totalCashInvested)} metric={METRICS.totalCashInvested} sub="Down + closing + rehab" />
      <MetricCard
        label="DSCR"
        value={a.dscr ? formatRatio(a.dscr, 2, "×") : "n/a"}
        sub={a.dscr ? sub("dscr", "NOI ÷ debt service") : "No financing"}
        tone={tone("dscr", "default")}
        metric={METRICS.dscr}
      />
      {hasArv && (
        <>
          <MetricCard
            label="Equity created"
            value={money(a.equityCreated)}
            tone={tone("equity", toneFor(a.equityCreated))}
            sub={sub("equity", "ARV − (price + closing + rehab)")}
            metric={METRICS.equityCreated}
          />
          <MetricCard
            label="70% rule max offer"
            value={money(a.maxOffer70)}
            tone={a.maxOffer70 && a.purchasePrice.lte(a.maxOffer70) ? "positive" : "negative"}
            sub={
              a.maxOffer70
                ? a.purchasePrice.lte(a.maxOffer70)
                  ? `Price is ${money(a.maxOffer70.minus(a.purchasePrice))} under`
                  : `Price is ${money(a.purchasePrice.minus(a.maxOffer70))} over`
                : undefined
            }
            metric={METRICS.maxOffer70}
          />
        </>
      )}
    </div>
  );
}

// ─── ARV math, written out with the deal's own numbers ────────────────────

/** Shows each ARV formula with values substituted, so the user can check the arithmetic. */
export function ArvBreakdown({ a, className }: { a: DealAnalysis; className?: string }) {
  if (!a.afterRepairValue || !a.equityCreated || !a.maxOffer70) return null;
  const over = a.purchasePrice.minus(a.maxOffer70);
  // Amounts never wrap mid-number; operators may wrap between them in narrow columns.
  const $ = (v: D) => <span className="whitespace-nowrap">{money(v)}</span>;
  const rows = [
    {
      label: "Equity created",
      math: (
        <>
          {$(a.afterRepairValue)} − ({$(a.purchasePrice)} + {$(a.closingCosts)} + {$(a.rehabCosts)})
        </>
      ),
      formula: "ARV − (Purchase price + Closing costs + Rehab)",
      note: `Total project cost ${money(a.totalProjectCost)}`,
      result: a.equityCreated,
    },
    {
      label: "70% rule max offer",
      math: (
        <>
          {$(a.afterRepairValue)} × 70% − {$(a.rehabCosts)}
        </>
      ),
      formula: "ARV × 70% − Rehab",
      note: over.gt(0) ? `Your price is ${money(over)} above this ceiling` : `Your price is ${money(over.negated())} below this ceiling`,
      result: a.maxOffer70,
    },
  ];
  return (
    <div className={cn("divide-y rounded-lg border bg-muted/30 text-sm", className)}>
      {rows.map((r) => (
        <div key={r.label} className="space-y-1 px-3 py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-medium">{r.label}</span>
            <span className={cn("num font-semibold whitespace-nowrap", r.result.isNegative() && "text-negative")}>= {money(r.result)}</span>
          </div>
          <div className="num font-mono text-xs">{r.math}</div>
          <div className="text-[11px] leading-snug text-muted-foreground">
            {r.formula} · {r.note}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Criteria / rating ─────────────────────────────────────────────────────

const RATING: Record<DealRating, { label: string; body: string; className: string; icon: typeof CheckCircle2 }> = {
  strong: {
    label: "Meets all goals for this deal",
    body: "Based on your inputs, this deal clears every goal you selected.",
    className: "border-positive/30 bg-positive/5 text-positive",
    icon: CheckCircle2,
  },
  moderate: {
    label: "Meets some of your goals",
    body: "Worth a closer look. Review the items below that fall short of your targets.",
    className: "border-caution/30 bg-caution/5 text-caution",
    icon: TriangleAlert,
  },
  weak: {
    label: "Falls short of most goals",
    body: "At these assumptions, the deal misses most of the goals you selected.",
    className: "border-caution/30 bg-caution/5 text-caution",
    icon: TriangleAlert,
  },
  negative: {
    label: "Negative cash flow",
    body: "Projected expenses and debt service exceed collected income at these assumptions.",
    className: "border-negative/30 bg-negative/5 text-negative",
    icon: XCircle,
  },
};

export function CriteriaPanel({
  rating,
  checks,
  stacked,
  cashFlowNote,
  footer,
}: {
  rating: DealRating;
  checks: CriteriaCheck[];
  stacked?: boolean;
  /** Show a warning that cash flow is negative even though it isn't one of the selected goals. */
  cashFlowNote?: boolean;
  footer?: string;
}) {
  const r = RATING[rating];
  return (
    <div className="rounded-xl border bg-card shadow-xs">
      <div className={cn("flex items-start gap-3 rounded-t-xl border-b px-4 py-3", r.className)}>
        <r.icon className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{r.label}</p>
          <p className="text-xs text-muted-foreground">{r.body}</p>
        </div>
      </div>
      {stacked ? (
        // Narrow side panel: one chip per goal so the key numbers stay above the fold.
        <div className="space-y-2 px-4 py-3">
          {checks.some((c) => c.passed !== null) && (
            <p className="text-xs text-muted-foreground">
              {checks.filter((c) => c.passed).length} of {checks.filter((c) => c.passed !== null).length} goals met
            </p>
          )}
          <ul className="flex flex-wrap gap-1.5">
            {checks.map((c) => {
              const Icon = c.passed === null ? CircleMinus : c.passed ? CheckCircle2 : XCircle;
              const detail = c.passed === null ? c.target : `${c.passed ? "Meets" : "Misses"} ${c.target}`;
              return (
                <li
                  key={c.key}
                  title={detail}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                    c.passed === null ? "text-muted-foreground" : c.passed ? "border-positive/30 bg-positive/5" : "border-negative/30 bg-negative/5",
                  )}
                >
                  <Icon className={cn("size-3.5 shrink-0", c.passed === null ? "" : c.passed ? "text-positive" : "text-negative")} />
                  {c.label}
                  {c.passed === false && <span className="text-muted-foreground">({c.target})</span>}
                </li>
              );
            })}
            {checks.length === 0 && <li className="text-sm text-muted-foreground">No goals selected for this deal.</li>}
          </ul>
        </div>
      ) : (
      <ul className="grid divide-y sm:grid-cols-2 sm:divide-y-0">
        {checks.map((c) => {
          const Icon = c.passed === null ? CircleMinus : c.passed ? CheckCircle2 : XCircle;
          return (
            <li key={c.key} className="flex items-center gap-2 px-4 py-2.5 text-sm">
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  c.passed === null ? "text-muted-foreground" : c.passed ? "text-positive" : "text-negative",
                )}
              />
              <span>{c.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {c.passed === null ? (c.target.startsWith("needs") || c.target.startsWith("invalid") ? c.target : "Not applicable") : `${c.passed ? "Meets" : "Misses"} ${c.target}`}
              </span>
            </li>
          );
        })}
        {checks.length === 0 && <li className="px-4 py-2.5 text-sm text-muted-foreground">No goals selected for this deal.</li>}
      </ul>
      )}
      {(cashFlowNote || footer) && (
        <div className="space-y-1 border-t px-4 py-2.5 text-[11px] leading-snug">
          {cashFlowNote && (
            <p className="flex items-start gap-1.5 text-caution">
              <TriangleAlert className="mt-px size-3 shrink-0" />
              Cash flow is negative — you&apos;ll be paying into this property each month until the value-add plays out.
            </p>
          )}
          {footer && <p className="text-muted-foreground">{footer}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Monthly / annual cash flow statement ─────────────────────────────────

function LabelCell({ children, metric, sub }: { children: React.ReactNode; metric?: MetricDefinition; sub?: string }) {
  return (
    <TableCell className="py-2">
      <div className="flex items-center gap-1.5">
        {children}
        {metric && <InfoTip metric={metric} />}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </TableCell>
  );
}

export function CashFlowStatement({ a }: { a: DealAnalysis }) {
  const row = (m: D) => (
    <>
      <TableCell className="num py-2 text-right">{moneyC(m)}</TableCell>
      <TableCell className="num py-2 text-right text-muted-foreground">{money(m.times(12))}</TableCell>
    </>
  );
  const expenses = a.expenses.filter((e) => !e.monthly.isZero());
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Line item</TableHead>
          <TableHead className="text-right">Monthly</TableHead>
          <TableHead className="text-right">Annual</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <LabelCell>Gross scheduled income</LabelCell>
          {row(a.grossMonthlyIncome)}
        </TableRow>
        <TableRow>
          <LabelCell sub="Vacancy rate × gross income">Less vacancy</LabelCell>
          {row(a.monthlyVacancyLoss.negated())}
        </TableRow>
        <TableRow className="bg-muted/40 font-medium">
          <LabelCell metric={METRICS.effectiveGrossIncome}>Effective gross income</LabelCell>
          {row(a.effectiveMonthlyIncome)}
        </TableRow>
        {expenses.map((e) => (
          <TableRow key={e.key}>
            <LabelCell sub={e.basis}>{e.label}</LabelCell>
            {row(e.monthly.negated())}
          </TableRow>
        ))}
        <TableRow className="font-medium">
          <LabelCell>Total operating expenses</LabelCell>
          {row(a.monthlyOperatingExpenses.negated())}
        </TableRow>
        <TableRow className="bg-muted/40 font-medium">
          <LabelCell metric={METRICS.noi}>Net operating income</LabelCell>
          {row(a.monthlyNOI)}
        </TableRow>
        <TableRow>
          <LabelCell metric={METRICS.mortgagePayment}>Mortgage (principal & interest)</LabelCell>
          {row(a.monthlyMortgagePayment.negated())}
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow className={cn("font-semibold", a.monthlyCashFlow.isNegative() ? "text-negative" : "text-positive")}>
          <LabelCell metric={METRICS.monthlyCashFlow}>Cash flow</LabelCell>
          <TableCell className="num py-2.5 text-right">{moneyC(a.monthlyCashFlow)}</TableCell>
          <TableCell className="num py-2.5 text-right">{money(a.annualCashFlow)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

// ─── Acquisition & ratios ─────────────────────────────────────────────────

function DefRow({ label, value, metric, emphasis }: { label: string; value: string; metric?: MetricDefinition; emphasis?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2 text-sm", emphasis && "font-semibold")}>
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <span className={cn(emphasis && "text-foreground")}>{label}</span>
        {metric && <InfoTip metric={metric} />}
      </dt>
      <dd className="num text-right">{value}</dd>
    </div>
  );
}

export function AcquisitionSummary({ a, interestRate, termYears, isCash }: { a: DealAnalysis; interestRate: string; termYears: number; isCash: boolean }) {
  return (
    <dl className="divide-y">
      <DefRow label="Purchase price" value={money(a.purchasePrice)} />
      <DefRow label={`Down payment${isCash ? " (all cash)" : ""}`} value={money(a.downPayment)} />
      <DefRow label="Closing costs" value={money(a.closingCosts)} />
      <DefRow label="Rehab / repairs" value={money(a.rehabCosts)} />
      <DefRow label="Total cash invested" value={money(a.totalCashInvested)} metric={METRICS.totalCashInvested} emphasis />
      {a.afterRepairValue && (
        <>
          <DefRow label="After-repair value" value={money(a.afterRepairValue)} metric={METRICS.afterRepairValue} />
          <DefRow label="Equity created" value={money(a.equityCreated)} metric={METRICS.equityCreated} />
          <DefRow label="70% rule max offer" value={money(a.maxOffer70)} metric={METRICS.maxOffer70} />
        </>
      )}
      {!isCash && (
        <>
          <DefRow label="Loan amount" value={money(a.loanAmount)} />
          <DefRow label="Loan-to-value" value={formatPercent(a.loanToValue, 1)} metric={METRICS.loanToValue} />
          <DefRow label={`Loan terms`} value={`${interestRate}% · ${termYears} yrs`} />
          <DefRow label="Monthly P&I" value={moneyC(a.monthlyMortgagePayment)} metric={METRICS.mortgagePayment} />
        </>
      )}
    </dl>
  );
}

export function RatioSummary({ a }: { a: DealAnalysis }) {
  const onePct = a.onePercentRule;
  return (
    <dl className="divide-y">
      <DefRow
        label="1% rule"
        value={onePct ? `${formatPercent(onePct)} ${onePct.gte(0.01) ? "· meets" : "· below"}` : "—"}
        metric={METRICS.onePercentRule}
      />
      <DefRow label="Gross rent multiplier" value={formatRatio(a.grossRentMultiplier, 2, "×")} metric={METRICS.grm} />
      <DefRow label="Operating expense ratio" value={formatPercent(a.operatingExpenseRatio, 1)} metric={METRICS.operatingExpenseRatio} />
      <DefRow label="Break-even occupancy" value={formatPercent(a.breakEvenOccupancy, 1)} metric={METRICS.breakEvenOccupancy} />
      <DefRow label="Cash flow per unit" value={`${money(a.monthlyCashFlowPerUnit)}/mo`} />
      <DefRow label="Price per unit" value={money(a.pricePerUnit)} />
      {a.pricePerSquareFoot && <DefRow label="Price per sq ft" value={moneyC(a.pricePerSquareFoot)} />}
    </dl>
  );
}

export function YearOneReturn({ a }: { a: DealAnalysis }) {
  return (
    <dl className="divide-y">
      <DefRow label="Cash flow" value={money(a.annualCashFlow)} />
      <DefRow label="Principal paydown" value={money(a.yearOnePrincipalPaydown)} />
      <DefRow label="Appreciation (assumed)" value={money(a.yearOneAppreciation)} />
      <DefRow label="Total year-1 return" value={money(a.yearOneTotalReturn)} emphasis />
      <DefRow label="Total ROI" value={formatPercent(a.yearOneTotalROI)} metric={METRICS.yearOneTotalROI} emphasis />
    </dl>
  );
}

// ─── Long-term projection ─────────────────────────────────────────────────

export function SaleSummary({ a }: { a: DealAnalysis }) {
  const s = a.sale;
  return (
    // Sized by its own container: 4 across on the wide property page, 2 across in the narrow analyzer panel.
    <div className="@container">
    <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
      <MetricCard label={`IRR (${s.holdingPeriodYears}-yr hold)`} value={formatPercent(s.irr)} tone={toneFor(s.irr)} metric={METRICS.irr} />
      <MetricCard label="Equity multiple" value={formatRatio(s.equityMultiple, 2, "×")} metric={METRICS.equityMultiple} />
      <MetricCard label="Net sale proceeds" value={money(s.netSaleProceeds)} metric={METRICS.netSaleProceeds} sub={`Sale at ${money(s.salePrice)}`} />
      <MetricCard
        label="Total profit"
        value={money(s.totalProfit)}
        tone={toneFor(s.totalProfit)}
        sub={`Incl. ${money(s.totalCashFlow)} cash flow`}
      />
    </div>
    </div>
  );
}

export function ProjectionPanel({ a, showTable = true, note }: { a: DealAnalysis; showTable?: boolean; note?: React.ReactNode }) {
  // The year-by-year table is long (up to 30 rows): folded on screen, always printed.
  const [tableOpen, setTableOpen] = useState(false);
  const data = a.projections.map((p) => ({
    year: p.year,
    propertyValue: chartNumber(p.propertyValue, 0),
    loanBalance: chartNumber(p.loanBalance, 0),
    equity: chartNumber(p.equity, 0),
  }));
  return (
    <div className="space-y-5">
      <SaleSummary a={a} />
      {note && <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{note}</p>}
      <ProjectionChart data={data} />
      {showTable && (
        <div className="space-y-2">
          <Button type="button" variant="outline" size="sm" className="no-print" onClick={() => setTableOpen((o) => !o)} aria-expanded={tableOpen}>
            <ChevronDown className={cn("transition-transform", tableOpen && "rotate-180")} />
            {tableOpen ? "Hide" : "Show"} year-by-year table ({a.projections.length} years)
          </Button>
          <div className={cn(!tableOpen && "hidden print:block")}>
            <ProjectionTable a={a} />
          </div>
        </div>
      )}
    </div>
  );
}

export function ProjectionTable({ a }: { a: DealAnalysis }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table className="text-xs">
        <TableHeader>
          <TableRow>
            <TableHead>Year</TableHead>
            <TableHead className="text-right">Gross income</TableHead>
            <TableHead className="text-right">Op. expenses</TableHead>
            <TableHead className="text-right">NOI</TableHead>
            <TableHead className="text-right">Debt service</TableHead>
            <TableHead className="text-right">Cash flow</TableHead>
            <TableHead className="text-right">CoC</TableHead>
            <TableHead className="text-right">Loan balance</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">Equity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {a.projections.map((p) => (
            <TableRow key={p.year} className="num">
              <TableCell>{p.year}</TableCell>
              <TableCell className="text-right">{money(p.grossIncome)}</TableCell>
              <TableCell className="text-right">{money(p.operatingExpenses)}</TableCell>
              <TableCell className="text-right">{money(p.noi)}</TableCell>
              <TableCell className="text-right">{money(p.debtService)}</TableCell>
              <TableCell className={cn("text-right", p.cashFlow.isNegative() && "text-negative")}>{money(p.cashFlow)}</TableCell>
              <TableCell className="text-right">{formatPercent(p.cashOnCash, 1)}</TableCell>
              <TableCell className="text-right">{money(p.loanBalance)}</TableCell>
              <TableCell className="text-right">{money(p.propertyValue)}</TableCell>
              <TableCell className="text-right font-medium">{money(p.equity)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AmortizationTable({ a }: { a: DealAnalysis }) {
  if (a.amortization.length === 0) {
    return <p className="text-sm text-muted-foreground">All-cash purchase — no loan to amortize.</p>;
  }
  return (
    <div className="max-h-96 overflow-auto rounded-lg border">
      <Table className="text-xs">
        <TableHeader className="sticky top-0 bg-card">
          <TableRow>
            <TableHead>Year</TableHead>
            <TableHead className="text-right">Payments</TableHead>
            <TableHead className="text-right">Principal</TableHead>
            <TableHead className="text-right">Interest</TableHead>
            <TableHead className="text-right">Ending balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {a.amortization.map((r) => (
            <TableRow key={r.year} className="num">
              <TableCell>{r.year}</TableCell>
              <TableCell className="text-right">{money(r.payment)}</TableCell>
              <TableCell className="text-right">{money(r.principal)}</TableCell>
              <TableCell className="text-right">{money(r.interest)}</TableCell>
              <TableCell className="text-right">{money(r.endingBalance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Formula reference ────────────────────────────────────────────────────

export function FormulaReference() {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {Object.values(METRICS).map((m) => (
        <div key={m.label}>
          <dt className="text-sm font-medium">{m.label}</dt>
          <dd className="mt-0.5 font-mono text-xs text-foreground/80">{m.formula}</dd>
          <dd className="mt-0.5 text-xs text-muted-foreground">{m.description}</dd>
        </div>
      ))}
    </dl>
  );
}

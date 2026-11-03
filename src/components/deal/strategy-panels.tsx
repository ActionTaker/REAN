"use client";

import { useDeferredValue, useMemo } from "react";
import { CheckCircle2, CircleMinus, ShieldAlert, Target, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricCard, toneFor } from "@/components/common/metric-card";
import { cn } from "@/lib/utils";
import {
  D,
  analyzeBrrrr,
  dec,
  formatCurrency,
  formatPercent,
  formatRatio,
  brrrrMaxPrice,
  brrrrStress,
  flipMaxPriceForProfit,
  flipMaxPriceForRoi,
  flipStress,
  seventyPercentMax,
  type BrrrrAnalysis,
  type DealInputs,
  type FlipAnalysis,
  type HoldPhase,
  type MaxPriceResult,
  type StrategyInputs,
} from "@/lib/finance";
import { STRATEGIES, type SavedStrategyInputs, type StrategyGoals, type StrategyValue } from "@/lib/strategy";
export { rateStrategy, strategyChecks } from "@/lib/strategy-rating";
import { NumberInput } from "./number-input";

const money = (v: D | null | undefined) => (v ? formatCurrency(v) : "—");
const parse = (s: string) => {
  const t = s.replace(/[,$%\s]/g, "");
  return /^-?\d*\.?\d+$/.test(t) ? dec(t) : null;
};

// ─── Picker ───────────────────────────────────────────────────────────────

export function StrategyPicker({ value, onChange }: { value: StrategyValue; onChange: (v: StrategyValue) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Investment strategy">
      {STRATEGIES.map((s) => {
        const active = value === s.value;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s.value)}
            className={cn(
              "rounded-xl border bg-card px-3 py-2.5 text-left shadow-xs transition-colors sm:py-3",
              active ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/30",
            )}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className={cn("size-3 rounded-full border", active ? "border-foreground bg-foreground" : "border-muted-foreground/40")} />
              {s.label}
            </div>
            <div className="mt-1 hidden text-xs text-muted-foreground sm:block">{s.short}</div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Inputs ───────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <div className="text-[11px] leading-snug text-muted-foreground">{hint}</div>}
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/**
 * Purchase financing, rehab & holding, and refinance (BRRRR) or sale (Flip).
 * `conventionalFields` = the deal's regular down-payment/rate/term inputs, shown when the purchase uses a normal mortgage.
 */
export function StrategyInputCards({
  strategy,
  s,
  onChange,
  hold,
  conventionalFields,
  arv,
}: {
  strategy: Exclude<StrategyValue, "BUY_HOLD">;
  s: SavedStrategyInputs;
  onChange: (s: SavedStrategyInputs) => void;
  hold: HoldPhase;
  conventionalFields: React.ReactNode;
  arv: D | null;
}) {
  const set = <K extends keyof SavedStrategyInputs>(k: K, v: SavedStrategyInputs[K]) => onChange({ ...s, [k]: v });
  const a = s.acquisition;
  return (
    <>
      <Panel
        title="Purchase financing"
        description={strategy === "BRRRR" ? "How you buy and fund the rehab before refinancing." : "How you buy and fund the rehab until the sale."}
      >
        <div className="space-y-4">
          <Field label="Loan type">
            <Select value={a.type} onValueChange={(v) => set("acquisition", { ...a, type: v as typeof a.type })}>
              <SelectTrigger className="w-full sm:w-72" aria-label="Loan type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hardMoney">Hard money (interest-only, funds rehab)</SelectItem>
                <SelectItem value="conventional">Conventional mortgage</SelectItem>
                <SelectItem value="cash">All cash</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {a.type === "hardMoney" && (
            <div className="grid gap-4 sm:grid-cols-4">
              <Field label="Loan to purchase" hint={`= ${money(hold.loanAmount.minus(hold.rehabFinanced))}`}>
                <NumberInput suffix="%" value={a.loanToCostPct} onChange={(e) => set("acquisition", { ...a, loanToCostPct: e.target.value })} aria-label="Loan to purchase price" />
              </Field>
              <Field label="Rehab financed" hint={`= ${money(hold.rehabFinanced)}`}>
                <NumberInput suffix="%" value={a.rehabFinancedPct} onChange={(e) => set("acquisition", { ...a, rehabFinancedPct: e.target.value })} aria-label="Rehab financed" />
              </Field>
              <Field label="Interest rate" hint={`${money(hold.monthlyPayment)}/mo interest-only`}>
                <NumberInput suffix="%" value={a.rate} onChange={(e) => set("acquisition", { ...a, rate: e.target.value })} aria-label="Hard money rate" />
              </Field>
              <Field label="Points" hint={`= ${money(hold.points)} at closing`}>
                <NumberInput suffix="%" value={a.pointsPct} onChange={(e) => set("acquisition", { ...a, pointsPct: e.target.value })} aria-label="Points" />
              </Field>
            </div>
          )}
          {a.type === "conventional" && conventionalFields}
          {a.type === "cash" && <p className="text-xs text-muted-foreground">Purchase and rehab paid in cash — no loan to pay off{strategy === "BRRRR" ? " before the refinance" : ""}.</p>}
        </div>
      </Panel>

      <Panel title="Rehab & holding" description="Costs of owning the property while it's being fixed and before it's rented or sold.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={strategy === "BRRRR" ? "Months until refinance" : "Months until sold"} hint="Rehab + leasing or listing time">
            <NumberInput suffix="months" value={s.holdMonths} onChange={(e) => set("holdMonths", e.target.value)} aria-label="Hold months" />
          </Field>
          <Field label="Utilities while vacant" hint="Electric, water, gas during rehab">
            <NumberInput prefix="$" suffix="/mo" value={s.holdingUtilitiesMonthly} onChange={(e) => set("holdingUtilitiesMonthly", e.target.value)} aria-label="Holding utilities" />
          </Field>
          <div className="rounded-lg bg-muted/40 p-3 text-xs">
            <div className="text-muted-foreground">Holding costs</div>
            <div className="num text-base font-semibold">{money(hold.holdingCosts)}</div>
            <div className="text-muted-foreground">{money(hold.monthlyHoldingCost)}/mo taxes, insurance, HOA, utilities · plus {money(hold.interestPaid)} interest</div>
          </div>
        </div>
      </Panel>

      {strategy === "BRRRR" ? (
        <Panel title="Refinance" description="Cash-out refinance on the after-repair value once the property is rented (lenders often require ~6 months of ownership).">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Loan-to-value" hint={arv ? `= ${money(arv.times(dec(s.refi.ltvPct || 0)).div(100))} on ARV` : "Needs an ARV"}>
              <NumberInput suffix="% of ARV" value={s.refi.ltvPct} onChange={(e) => set("refi", { ...s.refi, ltvPct: e.target.value })} aria-label="Refinance LTV" />
            </Field>
            <Field label="Rate">
              <NumberInput suffix="%" value={s.refi.rate} onChange={(e) => set("refi", { ...s.refi, rate: e.target.value })} aria-label="Refinance rate" />
            </Field>
            <Field label="Term">
              <NumberInput suffix="years" value={s.refi.termYears} onChange={(e) => set("refi", { ...s.refi, termYears: e.target.value })} aria-label="Refinance term" />
            </Field>
            <Field label="Closing costs" hint="Of the new loan">
              <NumberInput suffix="%" value={s.refi.closingPct} onChange={(e) => set("refi", { ...s.refi, closingPct: e.target.value })} aria-label="Refinance closing costs" />
            </Field>
          </div>
        </Panel>
      ) : (
        <Panel title="Sale" description="What it sells for after the rehab, and the cost of selling.">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Sale price" hint={s.flip.salePrice ? undefined : arv ? `Blank = ARV (${money(arv)})` : "Blank = ARV"}>
              <NumberInput prefix="$" placeholder={arv ? arv.toFixed(0) : ""} value={s.flip.salePrice} onChange={(e) => set("flip", { ...s.flip, salePrice: e.target.value })} aria-label="Sale price" />
            </Field>
            <Field label="Selling costs" hint="Agent commission + seller closing/transfer costs">
              <NumberInput suffix="%" value={s.flip.sellingCostPct} onChange={(e) => set("flip", { ...s.flip, sellingCostPct: e.target.value })} aria-label="Selling costs" />
            </Field>
          </div>
        </Panel>
      )}
    </>
  );
}

// ─── Results ──────────────────────────────────────────────────────────────

function Row({ label, value, sub, strong, negative }: { label: string; value: string; sub?: string; strong?: boolean; negative?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5 text-sm", strong && "border-t pt-2 font-semibold")}>
      <span className={cn(!strong && "text-muted-foreground")}>
        {label}
        {sub && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{sub}</span>}
      </span>
      <span className={cn("num whitespace-nowrap", negative && "text-negative")}>{value}</span>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{n}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function BrrrrMetrics({ b, columns = 2 }: { b: BrrrrAnalysis; columns?: 2 | 3 }) {
  const r = b.rental;
  return (
    <div className={cn("grid gap-3", columns === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
      <MetricCard
        label="Cash left in deal"
        value={b.cashLeftInDeal.gt(0) ? money(b.cashLeftInDeal) : "$0"}
        tone={b.cashLeftInDeal.gt(0) ? "default" : "positive"}
        sub={b.cashLeftInDeal.lt(0) ? `${money(b.cashLeftInDeal.negated())} more than you put in came back` : `of ${money(b.hold.totalCashIn)} invested`}
      />
      <MetricCard label="Cash recovered" value={formatPercent(b.cashRecovered, 0)} tone={b.cashRecovered && b.cashRecovered.gte(1) ? "positive" : "default"} sub={`${money(b.cashOut)} back at refinance`} />
      <MetricCard label="Cash flow after refi" value={money(r.monthlyCashFlow)} tone={toneFor(r.monthlyCashFlow)} sub={`${money(r.annualCashFlow)} / year`} />
      <MetricCard
        label="Cash-on-cash"
        value={b.infiniteReturn ? "∞" : formatPercent(r.cashOnCash)}
        tone={b.infiniteReturn ? "positive" : toneFor(r.cashOnCash)}
        sub={b.infiniteReturn ? "No cash left in the deal" : "On cash left in the deal"}
      />
      <MetricCard label="Equity after refi" value={money(b.equityAfterRefi)} sub={`ARV ${money(b.hold.arv)} − new loan`} />
      <MetricCard label="DSCR after refi" value={r.dscr ? formatRatio(r.dscr, 2, "×") : "—"} sub={`New loan ${money(b.refiLoan)}`} />
    </div>
  );
}

export function BrrrrSteps({ b, input }: { b: BrrrrAnalysis; input: DealInputs }) {
  const h = b.hold;
  return (
    <div className="space-y-4">
      {h.arvMissing && <p className="rounded-md bg-caution/10 px-3 py-2 text-xs text-caution">No ARV entered — using purchase price + rehab. Add an ARV for a real refinance estimate.</p>}
      <Step n={1} title="Buy">
        <Row label="Purchase price" value={money(dec(input.purchasePrice))} />
        <Row label="Loan" value={money(h.loanAmount.minus(h.rehabFinanced))} />
        <Row label="Closing costs + points" value={money(dec(input.closingCosts).plus(h.points))} />
      </Step>
      <Step n={2} title={`Rehab & hold · ${h.months} months`}>
        <Row label="Rehab budget" value={money(dec(input.rehabCosts))} sub={h.rehabFinanced.gt(0) ? `${money(h.rehabFinanced)} lender-funded` : undefined} />
        <Row label="Holding costs" value={money(h.holdingCosts)} />
        <Row label="Loan payments while holding" value={money(h.monthlyPayment.times(h.months))} />
        <Row label="Total cash you put in" value={money(h.totalCashIn)} strong />
      </Step>
      <Step n={3} title="Refinance">
        <Row label="New loan" value={money(b.refiLoan)} />
        <Row label="Pay off purchase loan" value={`−${money(h.payoff)}`} />
        <Row label="Refinance closing costs" value={`−${money(b.refiClosingCosts)}`} />
        <Row label="Cash back to you" value={money(b.cashOut)} strong negative={b.cashOut.isNegative()} />
      </Step>
      <Step n={4} title="Rent & repeat">
        <Row label="Cash left in the deal" value={b.cashLeftInDeal.gt(0) ? money(b.cashLeftInDeal) : "$0"} strong />
        <Row label="Cash flow after refi" value={`${money(b.rental.monthlyCashFlow)}/mo`} negative={b.rental.monthlyCashFlow.isNegative()} />
        <Row label="Equity you keep" value={money(b.equityAfterRefi)} />
      </Step>
    </div>
  );
}

export function FlipMetrics({ f, columns = 2 }: { f: FlipAnalysis; columns?: 2 | 3 }) {
  return (
    <div className={cn("grid gap-3", columns === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
      <MetricCard label="Net profit" value={money(f.profit)} tone={toneFor(f.profit)} sub={`${formatPercent(f.margin, 1)} of sale price`} />
      <MetricCard label="ROI on cash" value={formatPercent(f.roi, 1)} tone={toneFor(f.roi)} sub={`Over ${f.hold.months} months`} />
      <MetricCard label="Annualized ROI" value={formatPercent(f.annualizedRoi, 1)} tone={toneFor(f.annualizedRoi)} sub="Compounded to 12 months" />
      <MetricCard label="Cash needed" value={money(f.hold.totalCashIn)} sub="Down, closing, points, unfunded rehab, carrying costs" />
      <MetricCard label="Break-even sale price" value={money(f.breakEvenSalePrice)} sub={`Planned sale ${money(f.salePrice)}`} />
      <MetricCard label="All-in cost" value={money(f.hold.allInCost)} sub="Before selling costs" />
    </div>
  );
}

export function FlipStatement({ f, input }: { f: FlipAnalysis; input: DealInputs }) {
  const h = f.hold;
  return (
    <div className="space-y-0.5">
      {h.arvMissing && !dec(f.salePrice).gt(0) && <p className="mb-2 rounded-md bg-caution/10 px-3 py-2 text-xs text-caution">No ARV or sale price entered.</p>}
      <Row label="Sale price" value={money(f.salePrice)} />
      <Row label="Selling costs" value={`−${money(f.sellingCosts)}`} />
      <Row label="Purchase price" value={`−${money(dec(input.purchasePrice))}`} />
      <Row label="Closing costs" value={`−${money(dec(input.closingCosts))}`} />
      <Row label="Rehab" value={`−${money(dec(input.rehabCosts))}`} />
      <Row label={`Holding costs · ${h.months} mo`} value={`−${money(h.holdingCosts)}`} />
      <Row label="Loan interest + points" value={`−${money(h.financingCosts)}`} />
      <Row label="Net profit" value={money(f.profit)} strong negative={f.profit.isNegative()} />
      <Row label="Cash you put in" value={money(h.totalCashIn)} />
      <Row label="Cash back at closing" value={money(f.netSaleProceeds)} sub="after paying off the loan" />
    </div>
  );
}

// ─── Max offer + stress test ──────────────────────────────────────────────

type GoalRow = {
  key: string;
  label: string;
  enabled: boolean;
  target?: string;
  unit?: { prefix?: string; suffix?: string };
  cmp: "≤" | "≥";
  result: MaxPriceResult | null;
  /** Not driven by price (e.g. post-refi cash flow): shown as a check only. */
  checkOnly?: { passed: boolean | null; note: string };
};

export function StrategyOfferTools({
  strategy,
  inputs,
  s,
  goals,
  onGoalsChange,
  action,
}: {
  strategy: Exclude<StrategyValue, "BUY_HOLD">;
  inputs: DealInputs;
  s: StrategyInputs;
  goals: StrategyGoals;
  onGoalsChange: (g: StrategyGoals) => void;
  action?: React.ReactNode;
}) {
  const deferred = useDeferredValue(inputs);
  const ready = dec(deferred.purchasePrice).gt(0);
  const price = dec(deferred.purchasePrice);

  const rows = useMemo<GoalRow[]>(() => {
    if (!ready) return [];
    const seventy = seventyPercentMax(deferred);
    const seventyRow = (enabled: boolean): GoalRow => ({
      key: "seventy",
      label: "70% rule",
      enabled,
      cmp: "≤",
      result: seventy ? { price: seventy.gt(0) ? seventy.div(500).floor().times(500) : null, unbounded: false } : null,
    });
    if (strategy === "BRRRR") {
      const g = goals.brrrr;
      const cashLeft = parse(g.cashLeft.target);
      const b = analyzeForChecks(deferred, s);
      const cf = parse(g.cashFlow.target);
      const dscr = parse(g.dscr.target);
      return [
        { key: "cashLeft", label: "Cash left in deal", enabled: g.cashLeft.enabled, target: g.cashLeft.target, unit: { prefix: "$" }, cmp: "≤", result: cashLeft ? brrrrMaxPrice(deferred, s, cashLeft) : null },
        seventyRow(g.seventy.enabled),
        {
          key: "cashFlow", label: "Cash flow after refi", enabled: g.cashFlow.enabled, target: g.cashFlow.target, unit: { prefix: "$", suffix: "/mo" }, cmp: "≥", result: null,
          checkOnly: { passed: cf ? b.rental.monthlyCashFlow.gte(cf) : null, note: `${money(b.rental.monthlyCashFlow)}/mo — set by rent, ARV and the refinance, not the price` },
        },
        {
          key: "dscr", label: "DSCR after refi", enabled: g.dscr.enabled, target: g.dscr.target, unit: { suffix: "×" }, cmp: "≥", result: null,
          checkOnly: { passed: dscr && b.rental.dscr ? b.rental.dscr.gte(dscr) : null, note: `${b.rental.dscr ? formatRatio(b.rental.dscr, 2, "×") : "—"} — not affected by price` },
        },
      ];
    }
    const g = goals.flip;
    const profit = parse(g.profit.target);
    const roi = parse(g.roi.target);
    return [
      { key: "profit", label: "Net profit", enabled: g.profit.enabled, target: g.profit.target, unit: { prefix: "$" }, cmp: "≥", result: profit ? flipMaxPriceForProfit(deferred, s, profit) : null },
      { key: "roi", label: "ROI on cash", enabled: g.roi.enabled, target: g.roi.target, unit: { suffix: "%" }, cmp: "≥", result: roi ? flipMaxPriceForRoi(deferred, s, roi) : null },
      seventyRow(g.seventy.enabled),
    ];
  }, [deferred, s, goals, strategy, ready]);

  const setGoal = (key: string, patch: Partial<{ enabled: boolean; target: string }>) => {
    if (strategy === "BRRRR") {
      const k = key as keyof StrategyGoals["brrrr"];
      onGoalsChange({ ...goals, brrrr: { ...goals.brrrr, [k]: { ...goals.brrrr[k], ...patch } } });
    } else {
      const k = key as keyof StrategyGoals["flip"];
      onGoalsChange({ ...goals, flip: { ...goals.flip, [k]: { ...goals.flip[k], ...patch } } });
    }
  };

  const priced = rows.filter((r) => r.enabled && !r.checkOnly && r.result);
  const binding = priced.reduce<GoalRow | null>((min, r) => {
    if (!min) return r;
    if (r.result!.price === null || (min.result!.price !== null && r.result!.price.lt(min.result!.price))) return r;
    return min;
  }, null);
  const scaleMax = D.max(price, ...rows.flatMap((r) => (r.result?.price && !r.result.unbounded ? [r.result.price] : []))).times(1.08);
  const pctOf = (v: D) => `${D.min(v.div(scaleMax).times(100), 100).toFixed(2)}%`;

  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm"><Target className="size-4" /> Max offer price · {strategy === "BRRRR" ? "BRRRR" : "Flip"}</CardTitle>
        <CardDescription className="text-xs">
          {strategy === "BRRRR"
            ? "The most you can pay and still pull your cash back out — plus the rental checks after the refinance."
            : "The most you can pay and still hit your profit and return targets."}
        </CardDescription>
        {action && <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">{action}</div>}
      </CardHeader>
      <CardContent>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Enter a purchase price to see the max offer price.</p>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <div className={cn("rounded-lg border px-4 py-3", !binding ? "bg-muted/40" : binding.result!.price && price.lte(binding.result!.price) ? "border-positive/30 bg-positive/5" : "border-negative/30 bg-negative/5")}>
                {!binding ? (
                  <p className="text-sm text-muted-foreground">Turn on a price goal below.</p>
                ) : binding.result!.price ? (
                  <>
                    <p className="text-sm">
                      Offer at or below <span className="num text-lg font-semibold">{money(binding.result!.price)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Limited by {binding.label.toLowerCase()}. Your price {money(price)} is{" "}
                      {price.lte(binding.result!.price) ? `${money(binding.result!.price.minus(price))} under it.` : `${money(price.minus(binding.result!.price))} over it.`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm">No price reaches your {binding.label.toLowerCase()} goal with these numbers.</p>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="w-12 px-3 py-2 text-left font-medium">Use</th>
                      <th className="px-3 py-2 text-left font-medium">Goal</th>
                      <th className="px-3 py-2 text-left font-medium">Target</th>
                      <th className="px-3 py-2 text-right font-medium">Max price</th>
                      <th className="hidden min-w-40 px-3 py-2 text-left font-medium md:table-cell">vs. your price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r) => {
                      const max = r.result?.price ?? null;
                      const invalid = r.target !== undefined && !parse(r.target);
                      const ok = r.checkOnly ? r.checkOnly.passed : max ? price.lte(max) : null;
                      const Icon = ok === null ? CircleMinus : ok ? CheckCircle2 : XCircle;
                      return (
                        <tr key={r.key} className={cn(!r.enabled && "text-muted-foreground")}>
                          <td className="px-3 py-2"><Checkbox checked={r.enabled} onCheckedChange={(v) => setGoal(r.key, { enabled: v === true })} aria-label={`Use ${r.label} goal`} /></td>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-2">
                              <Icon className={cn("size-4 shrink-0", !r.enabled || ok === null ? "text-muted-foreground/60" : ok ? "text-positive" : "text-negative")} />
                              <span className={cn("font-medium", r.enabled && "text-foreground")}>{r.label}</span>
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {r.target === undefined ? (
                              <span className="text-xs">ARV × 70% − rehab</span>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{r.cmp}</span>
                                <NumberInput value={r.target} onChange={(e) => setGoal(r.key, { target: e.target.value })} prefix={r.unit?.prefix} suffix={r.unit?.suffix} className="h-8 w-32 text-xs" aria-label={`${r.label} target`} aria-invalid={invalid} />
                              </div>
                            )}
                          </td>
                          <td className="num px-3 py-2 text-right font-semibold">
                            {invalid ? <span className="text-xs font-normal text-destructive">Enter a number</span>
                              : r.checkOnly ? <span className="text-xs font-normal">{r.checkOnly.note}</span>
                              : !r.result ? <span className="text-xs font-normal">Needs an ARV</span>
                              : max ? `${money(max)}${r.result.unbounded ? "+" : ""}` : <span className="text-xs font-normal">Not reachable</span>}
                          </td>
                          <td className="hidden px-3 py-2 md:table-cell">
                            {max && !r.checkOnly && (
                              <div className={cn("relative h-2.5 rounded-full bg-muted", !r.enabled && "opacity-40")}>
                                <div className={cn("absolute inset-y-0 left-0 rounded-full", ok ? "bg-positive/60" : "bg-negative/50")} style={{ width: pctOf(max) }} />
                                <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-foreground" style={{ left: pctOf(price) }} aria-hidden />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Max prices keep the ARV, rehab, financing terms and hold time fixed; closing costs scale with price. Rounded down to $500.
              </p>
            </div>
            {strategy === "BRRRR" ? (
              <BrrrrStressTable inputs={deferred} s={s} maxCashLeft={goals.brrrr.cashLeft.enabled ? parse(goals.brrrr.cashLeft.target) : null} />
            ) : (
              <FlipStressTable inputs={deferred} s={s} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** BRRRR checks only need year-one numbers, so use the fast analysis. */
function analyzeForChecks(i: DealInputs, s: StrategyInputs) {
  return analyzeBrrrr(i, s, { yearOneOnly: true });
}

function StressShell({ title, intro, head, children, footer }: { title: string; intro: string; head: string[]; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-medium"><ShieldAlert className="size-4" /> {title}</h3>
        <p className="text-xs text-muted-foreground">{intro}</p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>{head.map((h, i) => <th key={h} className={cn("px-3 py-2 font-medium", i === 0 ? "text-left" : "text-right")}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">{children}</tbody>
        </table>
      </div>
      {footer}
    </section>
  );
}

function BrrrrStressTable({ inputs, s, maxCashLeft }: { inputs: DealInputs; s: StrategyInputs; maxCashLeft: D | null }) {
  const t = useMemo(() => brrrrStress(inputs, s), [inputs, s]);
  // A row passes only if the rental still cash flows AND (when a cash-left goal is on) you still get your cash back.
  const tooMuchLeft = (v: D) => maxCashLeft !== null && v.gt(maxCashLeft);
  return (
    <StressShell
      title="Stress test"
      intro={`What if the refinance or rehab doesn't go to plan? Each line changes one thing; the last changes all of them.${maxCashLeft !== null ? ` Red cash-left = above your ${money(maxCashLeft)} goal.` : ""}`}
      head={["If…", "Cash left in deal", "Cash flow after refi"]}
    >
      <tr className="bg-muted/20 text-muted-foreground">
        <td className="px-3 py-2">As entered</td>
        <td className="num px-3 py-2 text-right">{t.base.cashLeftInDeal.gt(0) ? money(t.base.cashLeftInDeal) : "$0"}</td>
        <td className="num px-3 py-2 text-right">{money(t.base.monthlyCashFlow)}/mo</td>
      </tr>
      {[...t.rows, t.combined].map((r) => {
        const cfOk = !r.monthlyCashFlow.isNegative();
        const cashOk = !tooMuchLeft(r.cashLeftInDeal);
        const ok = cfOk && cashOk;
        return (
          <tr key={r.key} className={cn(r.key === "combined" && "border-t-2 font-medium")}>
            <td className="px-3 py-2"><span className="flex items-center gap-2">{ok ? <CheckCircle2 className="size-4 shrink-0 text-positive" /> : <XCircle className="size-4 shrink-0 text-negative" />}{r.label}</span></td>
            <td className={cn("num px-3 py-2 text-right", !cashOk && "text-negative")}>{r.cashLeftInDeal.gt(0) ? money(r.cashLeftInDeal) : "$0"}</td>
            <td className={cn("num px-3 py-2 text-right", cfOk ? "text-positive" : "text-negative")}>{money(r.monthlyCashFlow)}/mo</td>
          </tr>
        );
      })}
    </StressShell>
  );
}

function FlipStressTable({ inputs, s }: { inputs: DealInputs; s: StrategyInputs }) {
  const t = useMemo(() => flipStress(inputs, s), [inputs, s]);
  const price = dec(inputs.purchasePrice);
  const be = t.breakEvenPrice.price;
  return (
    <StressShell
      title="Stress test"
      intro="Does the flip still make money if it sells for less, costs more or takes longer?"
      head={["If…", "Net profit", "ROI"]}
      footer={
        <p className="text-xs">
          {be ? (
            <>To still break even with <span className="font-medium">all of these at once</span>, pay no more than <span className="num font-semibold">{money(be)}</span>
              <span className="text-muted-foreground"> — {price.lte(be) ? `${money(be.minus(price))} of cushion.` : `${money(price.minus(be))} below your price.`}</span></>
          ) : (
            <span className="text-muted-foreground">With all of these at once, no purchase price breaks even.</span>
          )}
        </p>
      }
    >
      <tr className="bg-muted/20 text-muted-foreground">
        <td className="px-3 py-2">As entered</td>
        <td className="num px-3 py-2 text-right">{money(t.base.profit)}</td>
        <td className="num px-3 py-2 text-right">{formatPercent(t.base.roi, 1)}</td>
      </tr>
      {[...t.rows, t.combined].map((r) => {
        const ok = !r.profit.isNegative();
        return (
          <tr key={r.key} className={cn(r.key === "combined" && "border-t-2 font-medium")}>
            <td className="px-3 py-2"><span className="flex items-center gap-2">{ok ? <CheckCircle2 className="size-4 shrink-0 text-positive" /> : <XCircle className="size-4 shrink-0 text-negative" />}{r.label}</span></td>
            <td className={cn("num px-3 py-2 text-right", ok ? "text-positive" : "text-negative")}>{money(r.profit)}</td>
            <td className="num px-3 py-2 text-right">{formatPercent(r.roi, 1)}</td>
          </tr>
        );
      })}
    </StressShell>
  );
}


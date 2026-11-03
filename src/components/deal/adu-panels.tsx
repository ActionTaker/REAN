"use client";

import { Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MetricCard, toneFor } from "@/components/common/metric-card";
import { cn } from "@/lib/utils";
import { D, dec, formatCurrency, formatPercent, formatRatio, type AduAnalysis } from "@/lib/finance";
import { ADU_TYPES, defaultAduCostPerSqft, type AduType } from "@/lib/finance/adu";
import type { SavedAduInputs } from "@/lib/adu";
import { NumberInput } from "./number-input";

const money = (v: D | null | undefined) => (v ? formatCurrency(v) : "—");

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint && <div className="text-[11px] leading-snug text-muted-foreground">{hint}</div>}
    </div>
  );
}

function UseLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-medium text-foreground underline underline-offset-2">
      {children}
    </button>
  );
}

/** Analyzer card: switch an ADU scenario on and describe it. */
export function AduSection({
  value,
  onChange,
  onEnable,
  costIndex,
  stateCode,
  rentSuggestion,
  dealCapRate,
}: {
  value: SavedAduInputs | null;
  onChange: (v: SavedAduInputs | null) => void;
  onEnable: () => void;
  costIndex: string;
  stateCode: string | null;
  rentSuggestion: D | null;
  dealCapRate: D | null;
}) {
  const set = <K extends keyof SavedAduInputs>(k: K, v: SavedAduInputs[K]) => value && onChange({ ...value, [k]: v });
  const costEstimate = value ? defaultAduCostPerSqft(value.type, costIndex) : null;
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm"><Home className="size-4" /> ADU (accessory dwelling unit)</CardTitle>
          <CardDescription className="text-xs">
            Model building a backyard cottage, addition, garage conversion or junior unit: cost, rent, cash flow and the equity it creates.
          </CardDescription>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
          <Switch checked={!!value} onCheckedChange={(on) => (on ? onEnable() : onChange(null))} />
          Add an ADU
        </label>
      </CardHeader>
      {value && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="ADU type">
            {ADU_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={value.type === t.value}
                onClick={() =>
                  onChange({
                    ...value,
                    type: t.value as AduType,
                    costPerSqft: defaultAduCostPerSqft(t.value, costIndex).toString(),
                    softCosts: String(t.softCosts),
                    squareFeet: t.value === "jadu" && dec(value.squareFeet || 0).gt(500) ? "400" : value.squareFeet,
                  })
                }
                className={cn(
                  "rounded-lg border p-2.5 text-left transition-colors",
                  value.type === t.value ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/30",
                )}
              >
                <div className="text-xs font-semibold">{t.label}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t.description}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Size">
              <NumberInput suffix="sq ft" value={value.squareFeet} onChange={(e) => set("squareFeet", e.target.value)} aria-label="ADU size" />
            </Field>
            <Field
              label="Build cost"
              hint={
                costEstimate && value.costPerSqft !== costEstimate.toString() ? (
                  <>Estimate ${costEstimate.toString()}/sq ft{stateCode ? ` (${stateCode})` : ""} · <UseLink onClick={() => set("costPerSqft", costEstimate.toString())}>Use</UseLink></>
                ) : (
                  `Rough ${stateCode ?? "U.S."} estimate — replace with a bid`
                )
              }
            >
              <NumberInput prefix="$" suffix="/sq ft" value={value.costPerSqft} onChange={(e) => set("costPerSqft", e.target.value)} aria-label="Build cost per square foot" />
            </Field>
            <Field label="Design, permits, hookups" hint="Plans, fees, utility connections">
              <NumberInput prefix="$" value={value.softCosts} onChange={(e) => set("softCosts", e.target.value)} aria-label="Soft costs" />
            </Field>
            <Field label="Build time" hint="No ADU rent during the build">
              <NumberInput suffix="months" value={value.buildMonths} onChange={(e) => set("buildMonths", e.target.value)} aria-label="Build months" />
            </Field>
            <Field
              label="ADU rent"
              hint={
                rentSuggestion && value.monthlyRent !== rentSuggestion.toString() ? (
                  <>Est. {formatCurrency(rentSuggestion)} from the main unit&apos;s $/sq ft · <UseLink onClick={() => set("monthlyRent", rentSuggestion.toString())}>Use</UseLink></>
                ) : rentSuggestion ? (
                  "Main unit's rent per sq ft +10% (small units rent higher per sq ft)"
                ) : (
                  "Enter the main rent and size for a suggestion"
                )
              }
            >
              <NumberInput prefix="$" suffix="/mo" value={value.monthlyRent} onChange={(e) => set("monthlyRent", e.target.value)} aria-label="ADU rent" />
            </Field>
            <Field label="Pay for it with" hint={value.financing.type === "loan" ? "HELOC or construction loan; interest-only while building" : undefined}>
              <div className="inline-flex w-full rounded-lg border p-0.5" role="radiogroup" aria-label="ADU financing">
                {(["cash", "loan"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={value.financing.type === t}
                    onClick={() => set("financing", { ...value.financing, type: t })}
                    className={cn("flex-1 rounded-md py-1.5 text-xs", value.financing.type === t ? "bg-foreground text-background" : "text-muted-foreground")}
                  >
                    {t === "cash" ? "Cash" : "Loan"}
                  </button>
                ))}
              </div>
            </Field>
            {value.financing.type === "loan" && (
              <>
                <Field label="Financed">
                  <NumberInput suffix="% of cost" value={value.financing.financedPct} onChange={(e) => set("financing", { ...value.financing, financedPct: e.target.value })} aria-label="Financed percent" />
                </Field>
                <Field label="Rate · term">
                  <div className="flex gap-2">
                    <NumberInput suffix="%" value={value.financing.rate} onChange={(e) => set("financing", { ...value.financing, rate: e.target.value })} aria-label="ADU loan rate" />
                    <NumberInput suffix="yrs" value={value.financing.termYears} onChange={(e) => set("financing", { ...value.financing, termYears: e.target.value })} aria-label="ADU loan term" />
                  </div>
                </Field>
              </>
            )}
            <Field label="Value it at" hint={value.capRate ? "Your cap rate" : `Blank = this deal's cap rate (${formatPercent(dealCapRate)})`}>
              <NumberInput suffix="% cap" placeholder={dealCapRate ? dealCapRate.times(100).toFixed(2) : "6"} value={value.capRate} onChange={(e) => set("capRate", e.target.value)} aria-label="Cap rate for valuing the ADU" />
            </Field>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Costs are rough U.S. averages scaled for your state — ADU prices swing widely with site work, finishes and local fees. Check zoning
            and get contractor bids before relying on these numbers.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

/** Key ADU results: cost, cash flow, value and equity. */
export function AduMetrics({ r, columns = 2 }: { r: AduAnalysis; columns?: 2 | 3 }) {
  return (
    <div className={cn("grid gap-3", columns === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
      <MetricCard label="Equity created" value={money(r.equityCreated)} tone={toneFor(r.equityCreated)} sub={`Value added ${money(r.valueAdded)}`} />
      <MetricCard label="Total build cost" value={money(r.totalCost)} sub={r.loanAmount.gt(0) ? `${money(r.cashInvested)} cash · ${money(r.loanAmount)} loan` : "All cash"} />
      <MetricCard label="ADU cash flow" value={`${money(r.monthlyCashFlow)}`} tone={toneFor(r.monthlyCashFlow)} sub="per month, after its costs" />
      <MetricCard label="Cash-on-cash" value={formatPercent(r.cashOnCash)} tone={toneFor(r.cashOnCash)} sub={r.paybackYears ? `Pays back in ${formatRatio(r.paybackYears, 1)} yrs` : "No payback from cash flow"} />
      <MetricCard label="Break-even build cost" value={r.breakEvenCostPerSqft ? `${formatCurrency(r.breakEvenCostPerSqft)}/sq ft` : "—"} sub={r.breakEvenCostPerSqft ? "Build for less and it adds equity" : "Rent too low to cover the cost"} />
      <MetricCard label="Property cash flow" value={money(r.combinedMonthlyCashFlow)} tone={toneFor(r.combinedMonthlyCashFlow)} sub={`/mo with the ADU`} />
    </div>
  );
}

function Row({ label, value, strong, negative }: { label: string; value: string; strong?: boolean; negative?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5 text-sm", strong && "border-t pt-2 font-semibold")}>
      <span className={cn(!strong && "text-muted-foreground")}>{label}</span>
      <span className={cn("num whitespace-nowrap", negative && "text-negative")}>{value}</span>
    </div>
  );
}

/** Line-by-line: build cost, monthly ADU income statement, value and equity. */
export function AduStatement({ r }: { r: AduAnalysis }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Monthly</div>
        <Row label="ADU rent" value={money(r.grossRent)} />
        <Row label="Vacancy" value={`−${money(r.vacancyLoss)}`} />
        <Row label="Repairs, CapEx, management" value={`−${money(r.operatingExpenses)}`} />
        <Row label="Added property tax" value={`−${money(r.addedPropertyTax)}`} />
        <Row label="Added insurance" value={`−${money(r.addedInsurance)}`} />
        <Row label="ADU net operating income" value={money(r.monthlyNOI)} strong />
        {r.monthlyPayment.gt(0) && <Row label="Loan payment" value={`−${money(r.monthlyPayment)}`} />}
        <Row label="ADU cash flow" value={money(r.monthlyCashFlow)} strong negative={r.monthlyCashFlow.isNegative()} />
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Build & value</div>
        <Row label="Construction" value={money(r.constructionCost)} />
        <Row label="Design, permits, hookups" value={money(r.totalCost.minus(r.constructionCost))} />
        <Row label="Total build cost" value={money(r.totalCost)} strong />
        <Row label="Value added (NOI × 12 ÷ cap rate)" value={money(r.valueAdded)} />
        <Row label="Equity created" value={money(r.equityCreated)} strong negative={r.equityCreated.isNegative()} />
        <Row label="Return on cost" value={formatPercent(r.returnOnCost)} />
        <Row label="Cash you put in" value={money(r.cashInvested)} />
      </div>
    </div>
  );
}

/** Property page / report panel for a saved ADU scenario. */
export function AduPanel({ r, s, stateCode }: { r: AduAnalysis & { capRateUsed: D; capRateSource: string }; s: SavedAduInputs; stateCode: string | null }) {
  const t = ADU_TYPES.find((x) => x.value === s.type);
  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm"><Home className="size-4" /> ADU scenario</CardTitle>
        <CardDescription className="text-xs">
          {t?.label} · {s.squareFeet} sq ft at ${s.costPerSqft}/sq ft{stateCode ? ` (${stateCode})` : ""} · {s.buildMonths}-month build ·{" "}
          {s.financing.type === "loan" ? `${s.financing.financedPct}% financed at ${s.financing.rate}%` : "paid in cash"} · valued at a{" "}
          {formatPercent(r.capRateUsed)} cap rate{r.capRateSource === "deal" ? " (this deal's)" : ""}. Not included in the numbers above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AduMetrics r={r} columns={3} />
        <AduStatement r={r} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Value added uses the income approach: the ADU&apos;s yearly NOI ÷ cap rate (the cap rate also absorbs the property tax on that
          value). Appraisers often value ADUs from sold comps instead, which can be lower — especially where few sales have ADUs. Equity
          created = value added − total build cost. Estimates, not guarantees.
        </p>
      </CardContent>
    </Card>
  );
}

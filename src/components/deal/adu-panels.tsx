"use client";

import { Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { D, dec, formatCurrency, formatPercent, formatRatio, type DealAnalysis } from "@/lib/finance";
import { ADU_TYPES, compareWithAdu, defaultAduCostPerSqft, type AduScenarioColumn, type AduType } from "@/lib/finance/adu";
import type { RunAduResult, SavedAduInputs } from "@/lib/adu";
import { NumberInput } from "./number-input";

const money = (v: D | null | undefined) => (v ? formatCurrency(v) : "—");

function UseLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-medium text-foreground underline underline-offset-2">
      {children}
    </button>
  );
}

/** One input line: label and a short explanation on the left, the input on the right. */
function InputRow({ label, explain, hint, children }: { label: string; explain?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_minmax(0,9.5rem)] items-start gap-3 py-2.5">
      <div className="min-w-0">
        <Label className="text-sm leading-6">{label}</Label>
        {explain && <p className="text-[11px] leading-snug text-muted-foreground">{explain}</p>}
      </div>
      <div className="space-y-1">
        {children}
        {hint && <div className="text-[11px] leading-snug text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

function ResultLine({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "positive" | "negative" }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1 text-sm", strong && "border-t-2 border-foreground/80 pt-2.5")}>
      <span className={cn(strong ? "font-semibold" : "text-muted-foreground")}>{label}</span>
      <span
        className={cn(
          "num whitespace-nowrap",
          strong && "text-lg font-semibold",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Analyzer card: switch an ADU scenario on and describe it. Left: what it costs to build. Right: what it brings in. */
export function AduSection({
  value,
  onChange,
  onEnable,
  costIndex,
  stateCode,
  rentSuggestion,
  dealCapRate,
  result,
}: {
  value: SavedAduInputs | null;
  onChange: (v: SavedAduInputs | null) => void;
  onEnable: () => void;
  costIndex: string;
  stateCode: string | null;
  rentSuggestion: D | null;
  dealCapRate: D | null;
  /** Live results for the values entered (null until there's a size). */
  result: RunAduResult | null;
}) {
  const set = <K extends keyof SavedAduInputs>(k: K, v: SavedAduInputs[K]) => value && onChange({ ...value, [k]: v });
  const costEstimate = value ? defaultAduCostPerSqft(value.type, costIndex) : null;
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Home className="size-4" /> ADU (accessory dwelling unit)
          </CardTitle>
          <CardDescription className="text-xs">
            Would adding a second unit pay off? See what it costs to build, what it rents for, and the equity it adds.
          </CardDescription>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
          <Switch checked={!!value} onCheckedChange={(on) => (on ? onEnable() : onChange(null))} />
          Add an ADU
        </label>
      </CardHeader>
      {value && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Type of unit</div>
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
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: building it */}
            <div className="rounded-lg border p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">What it costs to build</div>
              <div className="divide-y">
                <InputRow label="Size" explain="Living area of the new unit.">
                  <NumberInput suffix="sq ft" value={value.squareFeet} onChange={(e) => set("squareFeet", e.target.value)} aria-label="ADU size" />
                </InputRow>
                <InputRow
                  label="Cost per sq ft"
                  explain="Construction only — get a contractor bid when you can."
                  hint={
                    costEstimate && value.costPerSqft !== costEstimate.toString() ? (
                      <>
                        Est. ${costEstimate.toString()}
                        {stateCode ? ` (${stateCode})` : ""} · <UseLink onClick={() => set("costPerSqft", costEstimate.toString())}>Use</UseLink>
                      </>
                    ) : (
                      `Rough ${stateCode ?? "U.S."} average`
                    )
                  }
                >
                  <NumberInput
                    prefix="$"
                    suffix="/sq ft"
                    value={value.costPerSqft}
                    onChange={(e) => set("costPerSqft", e.target.value)}
                    aria-label="Build cost per square foot"
                  />
                </InputRow>
                <InputRow label="Permits & design" explain="Plans, city fees, utility hookups.">
                  <NumberInput prefix="$" value={value.softCosts} onChange={(e) => set("softCosts", e.target.value)} aria-label="Soft costs" />
                </InputRow>
              </div>
              {result && <ResultLine label={`Total build cost`} value={formatCurrency(result.totalCost)} strong />}
              <div className="mt-2 divide-y border-t">
                <InputRow label="Build time" explain="No ADU rent comes in while it's being built.">
                  <NumberInput
                    suffix="months"
                    value={value.buildMonths}
                    onChange={(e) => set("buildMonths", e.target.value)}
                    aria-label="Build months"
                  />
                </InputRow>
                <InputRow
                  label="Pay for it with"
                  explain={value.financing.type === "loan" ? "HELOC or construction loan, interest-only while building." : "Your own cash."}
                >
                  <div className="inline-flex w-full rounded-lg border p-0.5" role="radiogroup" aria-label="ADU financing">
                    {(["cash", "loan"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={value.financing.type === t}
                        onClick={() => set("financing", { ...value.financing, type: t })}
                        className={cn(
                          "flex-1 rounded-md py-1.5 text-xs",
                          value.financing.type === t ? "bg-foreground text-background" : "text-muted-foreground",
                        )}
                      >
                        {t === "cash" ? "Cash" : "Loan"}
                      </button>
                    ))}
                  </div>
                </InputRow>
                {value.financing.type === "loan" && (
                  <>
                    <InputRow label="Financed" explain="Share of the build cost the loan covers.">
                      <NumberInput
                        suffix="%"
                        value={value.financing.financedPct}
                        onChange={(e) =>
                          set("financing", {
                            ...value.financing,
                            financedPct: e.target.value,
                          })
                        }
                        aria-label="Financed percent"
                      />
                    </InputRow>
                    <InputRow label="Loan rate">
                      <NumberInput
                        suffix="%"
                        value={value.financing.rate}
                        onChange={(e) =>
                          set("financing", {
                            ...value.financing,
                            rate: e.target.value,
                          })
                        }
                        aria-label="ADU loan rate"
                      />
                    </InputRow>
                    <InputRow label="Loan term">
                      <NumberInput
                        suffix="years"
                        value={value.financing.termYears}
                        onChange={(e) =>
                          set("financing", {
                            ...value.financing,
                            termYears: e.target.value,
                          })
                        }
                        aria-label="ADU loan term"
                      />
                    </InputRow>
                  </>
                )}
              </div>
              {result && result.loanAmount.gt(0) && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Cash you put in {formatCurrency(result.cashInvested)} (incl. interest while building) · loan {formatCurrency(result.loanAmount)} ·
                  payment {formatCurrency(result.monthlyPayment)}/mo
                </p>
              )}
            </div>

            {/* Right: what it brings in */}
            <div className="space-y-1 rounded-lg border bg-muted/20 p-4">
              <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">What it brings in</div>
              <div className="divide-y">
                <InputRow
                  label="ADU rent"
                  explain="Monthly rent for the new unit."
                  hint={
                    rentSuggestion && value.monthlyRent !== rentSuggestion.toString() ? (
                      <>
                        Est. {formatCurrency(rentSuggestion)} · <UseLink onClick={() => set("monthlyRent", rentSuggestion.toString())}>Use</UseLink>
                      </>
                    ) : rentSuggestion ? (
                      "Main unit's rent per sq ft +10%"
                    ) : (
                      "Enter the main rent and size for an estimate"
                    )
                  }
                >
                  <NumberInput
                    prefix="$"
                    suffix="/mo"
                    value={value.monthlyRent}
                    onChange={(e) => set("monthlyRent", e.target.value)}
                    aria-label="ADU rent"
                  />
                </InputRow>
                <InputRow
                  label="Cap rate"
                  explain="Used to value the extra rent: yearly profit ÷ cap rate. Lower rate → higher value."
                  hint={
                    value.capRate
                      ? "Your cap rate"
                      : result && dealCapRate && !result.capRateUsed.eq(dealCapRate)
                        ? `Blank → this deal's ${formatPercent(dealCapRate)}, kept within 5–12% → ${formatPercent(result.capRateUsed)}`
                        : `Blank → this deal's ${formatPercent(dealCapRate)}`
                  }
                >
                  <NumberInput
                    suffix="%"
                    placeholder={result ? result.capRateUsed.times(100).toDecimalPlaces(2).toString() : "6"}
                    value={value.capRate}
                    onChange={(e) => set("capRate", e.target.value)}
                    aria-label="Cap rate for valuing the ADU"
                  />
                </InputRow>
              </div>
              {result ? (
                <div className="pt-2">
                  <ResultLine
                    label="ADU cash flow"
                    value={`${formatCurrency(result.monthlyCashFlow)}/mo`}
                    tone={result.monthlyCashFlow.isNegative() ? "negative" : "positive"}
                  />
                  <ResultLine label="Value added" value={formatCurrency(result.valueAdded)} />
                  <ResultLine label="− Total build cost" value={formatCurrency(result.totalCost)} />
                  <ResultLine
                    label="Equity created"
                    value={formatCurrency(result.equityCreated)}
                    strong
                    tone={result.equityCreated.isNegative() ? "negative" : "positive"}
                  />
                  <p className="pt-1 text-[11px] text-muted-foreground">Every line is worked out below.</p>
                </div>
              ) : (
                <p className="pt-2 text-xs text-muted-foreground">Enter a size to see the results.</p>
              )}
            </div>
          </div>
          {result && (
            <div className="rounded-lg border p-4">
              <div className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">How these numbers are worked out</div>
              <AduWorkings r={result} costPerSqft={value.costPerSqft} />
            </div>
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Costs are rough U.S. averages scaled for your state. ADU prices swing widely with site work, finishes and local fees. Check zoning and get
            contractor bids before relying on these numbers.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

const pctText = (v: string) => `${v.replace(/\.?0+$/, "") || "0"}%`;

function WorkRow({
  label,
  basis,
  value,
  strong,
  tone,
}: {
  label: string;
  basis?: string;
  value: string;
  strong?: boolean;
  tone?: "positive" | "negative";
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 py-1.5", strong && "border-t-2 border-foreground/80 pt-2")}>
      <div className="min-w-0">
        <div className={cn("text-sm", strong ? "font-semibold" : "text-foreground/90")}>{label}</div>
        {basis && <div className="text-[11px] leading-snug text-muted-foreground">{basis}</div>}
      </div>
      <span
        className={cn(
          "num shrink-0 text-sm whitespace-nowrap",
          strong && "text-base font-semibold",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Shows the work: every line of the ADU's monthly cash flow with the rate it came from,
 * then how value added and equity follow, and what isn't included.
 */
export function AduWorkings({
  r,
  costPerSqft,
  extra,
}: {
  r: RunAduResult;
  costPerSqft?: string;
  /** Shown under value & equity (e.g. the build cost on the property page). */ extra?: React.ReactNode;
}) {
  const b = r.basis;
  const m = (v: D) => formatCurrency(v, { cents: true });
  const neg = (v: D) => `−${m(v)}`;
  const tone = (v: D): "positive" | "negative" => (v.isNegative() ? "negative" : "positive");
  return (
    <div className="grid gap-x-8 gap-y-4 @container lg:grid-cols-2">
      <div>
        <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Monthly cash flow, line by line</div>
        <WorkRow label="ADU rent" basis="What you entered" value={m(r.grossRent)} />
        <WorkRow label="Vacancy" basis={`${pctText(b.vacancyPct)} of rent — this deal's vacancy rate`} value={neg(r.vacancyLoss)} />
        <WorkRow label="Repairs" basis={`${pctText(b.maintenancePct)} of rent — this deal's maintenance rate`} value={neg(r.maintenance)} />
        <WorkRow label="CapEx reserve" basis={`${pctText(b.capexPct)} of rent — roof, HVAC, appliances later`} value={neg(r.capex)} />
        <WorkRow label="Management" basis={`${pctText(b.managementPct)} of rent actually collected (after vacancy)`} value={neg(r.management)} />
        <WorkRow
          label="Added insurance"
          basis={`${pctText(b.insurancePct)}/yr of the ${formatCurrency(r.constructionCost)} construction cost ÷ 12`}
          value={neg(r.addedInsurance)}
        />
        <WorkRow
          label="Added property tax"
          basis={`${pctText(b.taxPct)}/yr (${b.taxState ? `${b.taxState} average` : "U.S. average — pick a state for yours"}) of the ${formatCurrency(r.valueAdded)} value it adds ÷ 12`}
          value={neg(r.addedPropertyTax)}
        />
        {b.loan && <WorkRow label="ADU net operating income" value={m(r.monthlyNOI)} strong />}
        {b.loan && (
          <WorkRow
            label="Loan payment"
            basis={`${formatCurrency(b.loan.amount)} at ${pctText(b.loan.rate)} over ${b.loan.termYears} years`}
            value={neg(r.monthlyPayment)}
          />
        )}
        <WorkRow
          label="ADU cash flow"
          basis={b.loan ? "Net operating income − loan payment" : "Paid in cash, so there's no loan payment"}
          value={`${m(r.monthlyCashFlow)}/mo`}
          strong
          tone={tone(r.monthlyCashFlow)}
        />
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Value and equity</div>
          <WorkRow
            label="Value added"
            basis={`12 × NOI before tax ${formatCurrency(r.preTaxNoi.minus(r.addedInsurance), { cents: true })} ÷ (cap ${formatPercent(r.capRateUsed)} + tax ${pctText(b.taxPct)}). The tax sits in the divisor because it's charged on the value the ADU adds.`}
            value={formatCurrency(r.valueAdded)}
          />
          <WorkRow label="− Total build cost" value={formatCurrency(r.totalCost)} />
          <WorkRow label="Equity created" value={formatCurrency(r.equityCreated)} strong tone={tone(r.equityCreated)} />
          <p className="pt-1 text-[11px] leading-snug text-muted-foreground">
            {r.breakEvenCostPerSqft
              ? `Adds equity if built for under ${formatCurrency(r.breakEvenCostPerSqft)}/sq ft${costPerSqft ? ` (you entered $${costPerSqft})` : ""}.`
              : "At this rent the unit can't cover its own cost — it doesn't add equity at any build cost."}{" "}
          </p>
        </div>

        <div className="rounded-md bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Not included:</span> separate utilities or HOA dues for the ADU (subtract them if you&apos;ll
          pay them). Build time doesn&apos;t change the monthly figure — it only adds loan interest during construction to the cash you put in
          {r.cashInvested.gt(0) ? ` (${formatCurrency(r.cashInvested)})` : ""}.
        </div>
        {extra}
      </div>
    </div>
  );
}

/** Side-by-side summary: the deal without the ADU, the ADU on its own, and both together. */
export function AduComparison({ base, r, compact }: { base: DealAnalysis; r: RunAduResult; compact?: boolean }) {
  const c = compareWithAdu(base, r);
  const cols = [
    { key: "without", label: "Without ADU", v: c.without },
    { key: "aduOnly", label: "ADU only", v: c.aduOnly },
    { key: "together", label: "With ADU", v: c.together },
  ] as const;
  const signedTone = (v: D | null) => (v ? (v.isNegative() ? "text-negative" : "text-positive") : "");
  const rows: {
    label: string;
    hint?: string;
    cell: (v: AduScenarioColumn) => string;
    tone?: (v: AduScenarioColumn) => string;
  }[] = [
    {
      label: "Cash flow / mo",
      cell: (v) => money(v.monthlyCashFlow),
      tone: (v) => signedTone(v.monthlyCashFlow),
    },
    { label: "Cash you put in", cell: (v) => money(v.cashInvested) },
    {
      label: "Cash-on-cash",
      cell: (v) => formatPercent(v.cashOnCash),
      tone: (v) => signedTone(v.cashOnCash),
    },
    { label: "NOI / yr", cell: (v) => money(v.annualNOI) },
    {
      label: "Equity created",
      hint: base.equityCreated ? undefined : "Main house needs an ARV",
      cell: (v) => (v.equityCreated ? money(v.equityCreated) : "—"),
      tone: (v) => signedTone(v.equityCreated),
    },
    {
      label: "DSCR",
      cell: (v) => (v.dscr ? formatRatio(v.dscr, 2, "×") : "—"),
    },
  ];
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className={cn("w-full", compact ? "text-xs" : "text-sm")}>
          <thead>
            <tr className="border-b text-[11px] text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium" />
              {cols.map((col) => (
                <th
                  key={col.key}
                  className={cn("px-3 py-2 text-right font-medium whitespace-nowrap", col.key === "together" && "bg-muted/50 text-foreground")}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.label}
                  {row.hint && <div className="text-[10px] leading-tight">{row.hint}</div>}
                </td>
                {cols.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "num px-3 py-2 text-right whitespace-nowrap",
                      row.tone?.(col.v),
                      col.key === "together" && "bg-muted/50 font-semibold",
                    )}
                  >
                    {row.cell(col.v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        ADU only: {money(r.totalCost)} build
        {r.loanAmount.gt(0) ? ` (${money(r.loanAmount)} loan)` : ", all cash"}, valued at a {formatPercent(r.capRateUsed)} cap rate.{" "}
        {r.breakEvenCostPerSqft ? (
          <>
            It adds equity if built for under <span className="num font-medium text-foreground">{formatCurrency(r.breakEvenCostPerSqft)}/sq ft</span>.
          </>
        ) : (
          "At this rent it doesn't add equity at any build cost."
        )}
      </p>
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

/** Property page / report panel for a saved ADU scenario. */
export function AduPanel({ r, s, stateCode, base }: { r: RunAduResult; s: SavedAduInputs; stateCode: string | null; base: DealAnalysis }) {
  const t = ADU_TYPES.find((x) => x.value === s.type);
  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Home className="size-4" /> ADU scenario
        </CardTitle>
        <CardDescription className="text-xs">
          {t?.label} · {s.squareFeet} sq ft at ${s.costPerSqft}/sq ft
          {stateCode ? ` (${stateCode})` : ""} · {s.buildMonths}-month build ·{" "}
          {s.financing.type === "loan" ? `${s.financing.financedPct}% financed at ${s.financing.rate}%` : "paid in cash"} · valued at a{" "}
          {formatPercent(r.capRateUsed)} cap rate
          {r.capRateSource === "deal" ? " (this deal's)" : ""}. Not included in the numbers above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AduComparison base={base} r={r} />
        <AduWorkings
          r={r}
          costPerSqft={s.costPerSqft}
          extra={
            <div>
              <div className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Build cost</div>
              <Row label={`Construction (${s.squareFeet} sq ft × $${s.costPerSqft})`} value={money(r.constructionCost)} />
              <Row label="Permits & design" value={money(r.totalCost.minus(r.constructionCost))} />
              <Row label="Total build cost" value={money(r.totalCost)} strong />
              {r.loanAmount.gt(0) && <Row label="Loan" value={money(r.loanAmount)} />}
              <Row label="Cash you put in" value={money(r.cashInvested)} />
              <Row label="Return on cost (equity ÷ build cost)" value={formatPercent(r.returnOnCost)} />
            </div>
          }
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Value added uses the income approach: the ADU&apos;s yearly NOI ÷ cap rate (the cap rate also absorbs the property tax on that value).
          Appraisers often value ADUs from sold comps instead, which can be lower — especially where few sales have ADUs. Equity created = value added
          − total build cost. Estimates, not guarantees.
        </p>
      </CardContent>
    </Card>
  );
}

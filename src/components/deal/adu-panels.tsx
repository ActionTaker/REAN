"use client";

import { CheckCircle2, Home, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { D, dec, formatCurrency, formatPercent, formatRatio, type DealAnalysis } from "@/lib/finance";
import { ADU_TYPES, compareWithAdu, defaultAduCostPerSqft, type AduScenarioColumn, type AduType, type AduValuationMethod } from "@/lib/finance/adu";
import { defaultAduValuation, type RunAduResult, type SavedAduInputs, type SavedAduValuation } from "@/lib/adu";
import { parseTarget, type OfferGoals } from "@/lib/offer-goals";
import { NumberInput } from "./number-input";

const money = (v: D | null | undefined) => (v ? formatCurrency(v) : "—");

function UseLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-medium text-foreground underline underline-offset-2">
      {children}
    </button>
  );
}

const VALUATION_METHODS: { value: AduValuationMethod; label: string; description: string }[] = [
  { value: "lower", label: "Lower of two", description: "Uses whichever is lower: the rent-based value or the $/sq ft value. The safe default." },
  { value: "income", label: "By rent", description: "Yearly rent profit ÷ cap rate — what an investor would pay for that income." },
  { value: "ppsf", label: "By $/sq ft", description: "Area $/sq ft × ADU size × a discount — closer to how appraisers credit an ADU." },
  { value: "manual", label: "My number", description: "A value you were quoted by an appraiser or agent." },
];

function ValuationLine({ label, value, used }: { label: string; value: D | null; used: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", used ? "font-semibold text-foreground" : "text-muted-foreground")}>
      <span>
        {label}
        {used && " · used"}
      </span>
      <span className="num">{value ? formatCurrency(value) : "—"}</span>
    </div>
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
  const valuation = value?.valuation ?? defaultAduValuation();
  const setValuation = (patch: Partial<SavedAduValuation>) => value && onChange({ ...value, valuation: { ...valuation, ...patch } });
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
              </div>
              <div className="space-y-2 border-t pt-3">
                <div>
                  <div className="text-sm font-medium">How to value it</div>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Investors value rent; appraisers value what similar homes sell for. Starting with the lower of the two is the safe choice.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1 rounded-lg border p-0.5" role="radiogroup" aria-label="How to value the ADU">
                  {VALUATION_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      role="radio"
                      aria-checked={valuation.method === m.value}
                      title={m.description}
                      onClick={() => setValuation({ method: m.value })}
                      className={cn(
                        "rounded-md px-2 py-1.5 text-xs",
                        valuation.method === m.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] leading-snug text-muted-foreground">{VALUATION_METHODS.find((m) => m.value === valuation.method)?.description}</p>
              </div>
              <div className="divide-y">
                {(valuation.method === "income" || valuation.method === "lower") && (
                  <InputRow
                    label="Cap rate"
                    explain="Yearly rent profit ÷ cap rate. Lower rate → higher value."
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
                )}
                {(valuation.method === "ppsf" || valuation.method === "lower") && (
                  <>
                    <InputRow
                      label="Area value per sq ft"
                      explain="What homes like this sell for per sq ft."
                      hint={
                        valuation.ppsf
                          ? "Your number"
                          : result?.basis.ppsf
                            ? `Blank → this deal's ${result.basis.ppsfSource === "arv" ? "ARV" : "price"} ÷ house size`
                            : "Enter the ARV and house size, or type a $/sq ft"
                      }
                    >
                      <NumberInput
                        prefix="$"
                        suffix="/sq ft"
                        placeholder={result?.basis.ppsf && result.basis.ppsfSource !== "custom" ? result.basis.ppsf.toDecimalPlaces(0).toString() : ""}
                        value={valuation.ppsf}
                        onChange={(e) => setValuation({ ppsf: e.target.value })}
                        aria-label="Area value per square foot"
                      />
                    </InputRow>
                    <InputRow label="ADU counts for" explain="Share of that $/sq ft an appraiser credits a separate small unit. 50–75% is typical.">
                      <NumberInput suffix="%" value={valuation.discountPct} onChange={(e) => setValuation({ discountPct: e.target.value })} aria-label="ADU share of area value per square foot" />
                    </InputRow>
                  </>
                )}
                {valuation.method === "manual" && (
                  <InputRow label="Value it adds" explain="From an appraiser, agent or sales of homes with ADUs.">
                    <NumberInput prefix="$" value={valuation.manualValue} onChange={(e) => setValuation({ manualValue: e.target.value })} aria-label="Value the ADU adds" />
                  </InputRow>
                )}
              </div>
              {result && (
                <div className="space-y-1 rounded-md bg-muted/50 px-3 py-2 text-[11px]">
                  <ValuationLine label="By rent (cap rate)" value={result.valuations.income} used={result.valuationUsed === "income"} />
                  <ValuationLine label="By $/sq ft" value={result.valuations.ppsf} used={result.valuationUsed === "ppsf"} />
                  {valuation.method === "manual" && <ValuationLine label="Your number" value={result.valuations.manual} used={result.valuationUsed === "manual"} />}
                </div>
              )}
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
              <AduWorkings r={result} costPerSqft={value.costPerSqft} squareFeet={value.squareFeet} />
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

// Trim trailing zeros after a decimal point only ("8.50" → "8.5", "60" stays "60").
const pctText = (v: string) => `${(v.includes(".") ? v.replace(/\.?0+$/, "") : v) || "0"}%`;

/** One phrase for how the value added was found, e.g. "by $/sq ft ($312 × 60%)". */
export function valuationPhrase(r: RunAduResult): string {
  if (r.valuationUsed === "manual") return "at the value you entered";
  if (r.valuationUsed === "ppsf") return `by $/sq ft (${r.basis.ppsf ? formatCurrency(r.basis.ppsf) : "—"} × ${pctText(r.basis.discountPct)})`;
  return `by rent at a ${formatPercent(r.capRateUsed)} cap rate`;
}

/** The "Value added" line's explanation, with the numbers that produced it. */
function valueBasis(r: RunAduResult, sqft?: string): string {
  const b = r.basis;
  const lower = r.valuations.ppsf ? ` Compare: rent-based ${formatCurrency(r.valuations.income)}, $/sq ft ${formatCurrency(r.valuations.ppsf)}.` : "";
  if (r.valuationUsed === "manual") return "The value you entered (from an appraiser, agent or sales of homes with ADUs).";
  if (r.valuationUsed === "ppsf")
    return `${b.ppsf ? formatCurrency(b.ppsf) : "—"}/sq ft${b.ppsfSource === "custom" ? "" : ` (this deal's ${b.ppsfSource === "arv" ? "ARV" : "price"} ÷ house size)`} × ${sqft ?? "ADU"} sq ft × ${pctText(b.discountPct)} ADU credit.${lower}`;
  return `12 × NOI before tax ${formatCurrency(r.preTaxNoi.minus(r.addedInsurance), { cents: true })} ÷ (cap ${formatPercent(r.capRateUsed)} + tax ${pctText(b.taxPct)}). The tax sits in the divisor because it's charged on the value the ADU adds.${lower}`;
}

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
  squareFeet,
  extra,
}: {
  r: RunAduResult;
  costPerSqft?: string;
  squareFeet?: string;
  /** Shown under value & equity (e.g. the build cost on the property page). */
  extra?: React.ReactNode;
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
            basis={valueBasis(r, squareFeet)}
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

type ColKey = "without" | "aduOnly" | "together";
type GoalTargets = Partial<Record<"cashFlow" | "cashOnCash" | "dscr" | "equity", D>>;

/** Goal targets from the deal's max-offer goals (only the ones turned on). */
export function aduGoalTargets(goals: OfferGoals | null | undefined): GoalTargets {
  if (!goals) return {};
  const t = (k: "breakEven" | "cashOnCash" | "dscr" | "equity") => (goals[k]?.enabled ? parseTarget(goals[k].target) : null);
  const out: GoalTargets = {};
  const cf = t("breakEven");
  if (cf) out.cashFlow = cf;
  const coc = t("cashOnCash");
  if (coc) out.cashOnCash = coc.div(100);
  const dscr = t("dscr");
  if (dscr) out.dscr = dscr;
  const eq = t("equity");
  if (eq) out.equity = eq;
  return out;
}

/** Plain-language verdict on what the ADU changes, from the without / with columns. */
function aduVerdict(c: ReturnType<typeof compareWithAdu>, r: RunAduResult): string {
  const before = c.without.monthlyCashFlow;
  const after = c.together.monthlyCashFlow;
  const parts: string[] = [];
  if (before.isNegative() && !after.isNegative()) parts.push(`turns cash flow positive (${money(before)} → ${money(after)}/mo)`);
  else if (!before.isNegative() && after.isNegative()) parts.push(`turns cash flow negative (${money(before)} → ${money(after)}/mo)`);
  else parts.push(`${after.gte(before) ? "adds" : "costs"} ${money(after.minus(before).abs())}/mo of cash flow`);
  parts.push(r.equityCreated.isNegative() ? `loses ${money(r.equityCreated.abs())} of equity` : `adds ${money(r.equityCreated)} of equity`);
  return `Building the ADU ${parts.join(" and ")}, for ${money(r.cashInvested)} more cash in.`;
}

/** Side-by-side summary: the deal without the ADU, the ADU on its own, and both together — with goal checks and the change. */
export function AduComparison({ base, r, compact, targets = {} }: { base: DealAnalysis; r: RunAduResult; compact?: boolean; targets?: GoalTargets }) {
  const c = compareWithAdu(base, r);
  const cols: { key: ColKey; label: string; v: AduScenarioColumn }[] = [
    { key: "without", label: "Without ADU", v: c.without },
    { key: "aduOnly", label: "ADU only", v: c.aduOnly },
    { key: "together", label: "With ADU", v: c.together },
  ];
  const signedTone = (v: D | null) => (v ? (v.isNegative() ? "text-negative" : "text-positive") : "");
  type RowDef = {
    label: string;
    hint?: string;
    get: (v: AduScenarioColumn) => D | null;
    fmt: (v: D | null) => string;
    tone?: boolean;
    goal?: { target: D; text: string };
    /** Change is reported for "With ADU" vs "Without". */
    delta?: (d: D) => string;
  };
  const pct = (v: D | null) => formatPercent(v);
  const rows: RowDef[] = [
    {
      label: "Cash flow / mo",
      get: (v) => v.monthlyCashFlow,
      fmt: money,
      tone: true,
      goal: targets.cashFlow ? { target: targets.cashFlow, text: `≥ ${money(targets.cashFlow)}` } : undefined,
      delta: (d) => `${d.isNegative() ? "−" : "+"}${money(d.abs())}`,
    },
    { label: "Cash you put in", get: (v) => v.cashInvested, fmt: money, delta: (d) => `${d.isNegative() ? "−" : "+"}${money(d.abs())}` },
    {
      label: "Cash-on-cash",
      get: (v) => v.cashOnCash,
      fmt: pct,
      tone: true,
      goal: targets.cashOnCash ? { target: targets.cashOnCash, text: `≥ ${formatPercent(targets.cashOnCash, 1)}` } : undefined,
      delta: (d) => `${d.isNegative() ? "−" : "+"}${d.abs().times(100).toDecimalPlaces(2).toString()} pts`,
    },
    { label: "NOI / yr", get: (v) => v.annualNOI, fmt: money, delta: (d) => `${d.isNegative() ? "−" : "+"}${money(d.abs())}` },
    {
      label: "Equity created",
      hint: base.equityCreated ? undefined : "Main house needs an ARV",
      get: (v) => v.equityCreated,
      fmt: money,
      tone: true,
      goal: targets.equity ? { target: targets.equity, text: `≥ ${money(targets.equity)}` } : undefined,
      delta: (d) => `${d.isNegative() ? "−" : "+"}${money(d.abs())}`,
    },
    {
      label: "DSCR",
      get: (v) => v.dscr,
      fmt: (v) => (v ? formatRatio(v, 2, "×") : "—"),
      delta: (d) => `${d.isNegative() ? "−" : "+"}${d.abs().toDecimalPlaces(2).toString()}×`,
      goal: targets.dscr ? { target: targets.dscr, text: `≥ ${formatRatio(targets.dscr, 2, "×")}` } : undefined,
    },
  ];
  return (
    <div className="space-y-2">
      <p className={cn("rounded-lg border bg-card px-3 py-2 leading-snug", compact ? "text-xs" : "text-sm")}>{aduVerdict(c, r)}</p>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
        <table className={cn("w-full", compact ? "text-xs" : "text-sm")}>
          <thead>
            <tr className="border-b text-[11px] text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium" />
              {cols.map((col) => (
                <th key={col.key} className={cn("px-3 py-2 text-right font-medium whitespace-nowrap", col.key === "together" && "bg-muted/50 text-foreground")}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const before = row.get(c.without);
              const after = row.get(c.together);
              const change = before && after && row.delta ? after.minus(before) : null;
              return (
                <tr key={row.label}>
                  <td className="px-3 py-2 align-top text-muted-foreground">
                    {row.label}
                    {row.goal && <div className="text-[10px] leading-tight">Goal {row.goal.text}</div>}
                    {row.hint && <div className="text-[10px] leading-tight">{row.hint}</div>}
                  </td>
                  {cols.map((col) => {
                    const v = row.get(col.v);
                    // Goals judge the whole property (without / with); "ADU only" isn't a deal on its own.
                    const judged = row.goal && v && col.key !== "aduOnly" ? v.gte(row.goal.target) : null;
                    return (
                      <td key={col.key} className={cn("px-3 py-2 text-right align-top whitespace-nowrap", col.key === "together" && "bg-muted/50")}>
                        <span className={cn("num inline-flex items-center gap-1", row.tone && signedTone(v), col.key === "together" && "font-semibold")}>
                          {judged !== null &&
                            (judged ? (
                              <CheckCircle2 className="size-3 text-positive" aria-label="meets goal" />
                            ) : (
                              <XCircle className="size-3 text-negative" aria-label="misses goal" />
                            ))}
                          {row.fmt(v)}
                        </span>
                        {col.key === "together" && change && !change.isZero() && (
                          <div className="num text-[10px] font-normal text-muted-foreground">{row.delta!(change)}</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        ADU only: {money(r.totalCost)} build{r.loanAmount.gt(0) ? ` (${money(r.loanAmount)} loan)` : ", all cash"}, valued {valuationPhrase(r)}.{" "}
        {r.breakEvenCostPerSqft ? (
          <>
            It adds equity if built for under <span className="num font-medium text-foreground">{formatCurrency(r.breakEvenCostPerSqft)}/sq ft</span>.
          </>
        ) : (
          "At this rent it doesn't add equity at any build cost."
        )}{" "}
        ✓/✗ = your goals for this deal, judged on the whole property.
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
export function AduPanel({ r, s, stateCode, base, targets }: { r: RunAduResult; s: SavedAduInputs; stateCode: string | null; base: DealAnalysis; targets?: GoalTargets }) {
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
          {s.financing.type === "loan" ? `${s.financing.financedPct}% financed at ${s.financing.rate}%` : "paid in cash"} · valued {valuationPhrase(r)}. Not included in the numbers above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AduComparison base={base} r={r} targets={targets} />
        <AduWorkings
          r={r}
          costPerSqft={s.costPerSqft}
          squareFeet={s.squareFeet}
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
          Rent-based value = the ADU&apos;s yearly NOI ÷ cap rate (an investor&apos;s view). $/sq ft value = the area&apos;s $/sq ft × size × a discount,
          closer to how appraisers credit an ADU — often lower where few sales have ADUs. Equity created = value added − total build cost. Estimates,
          not guarantees.
        </p>
      </CardContent>
    </Card>
  );
}

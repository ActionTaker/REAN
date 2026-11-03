"use client";

import { useDeferredValue, useMemo } from "react";
import { CheckCircle2, CircleMinus, ShieldAlert, Target, XCircle } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  D,
  dec,
  formatCurrency,
  formatPercent,
  maxPriceFor,
  seventyPercentMax,
  stressTest,
  type DealInputs,
  type MaxPriceResult,
  type RepriceOptions,
} from "@/lib/finance";
import {
  OFFER_GOALS,
  STRATEGIES,
  applyStrategy,
  currentStrategy,
  parseTarget,
  toPriceGoal,
  DEFAULT_OFFER_OPTIONS,
  type OfferGoalKey,
  type OfferGoals,
  type OfferOptions,
} from "@/lib/offer-goals";
import { NumberInput } from "./number-input";

type RowState =
  | { status: "ok"; result: MaxPriceResult }
  | { status: "invalid" } // target isn't a number
  | { status: "needsArv" }
  | { status: "na"; reason: string };

function solve(inputs: DealInputs, goals: OfferGoals, opts: RepriceOptions): Record<OfferGoalKey, RowState> {
  const hasArv = dec(inputs.afterRepairValue).gt(0);
  const out = {} as Record<OfferGoalKey, RowState>;
  for (const g of OFFER_GOALS) {
    if (g.needsArv && !hasArv) {
      out[g.key] = { status: "needsArv" };
    } else if (g.key === "dscr" && inputs.isCashPurchase) {
      out[g.key] = { status: "na", reason: "All cash — no loan" };
    } else if (g.key === "seventy") {
      const m = seventyPercentMax(inputs)!;
      out[g.key] = { status: "ok", result: { price: m.gt(0) ? m.div(500).floor().times(500) : null, unbounded: false } };
    } else {
      const t = parseTarget(goals[g.key].target);
      out[g.key] = t ? { status: "ok", result: maxPriceFor(inputs, toPriceGoal(g.key, t), opts) } : { status: "invalid" };
    }
  }
  return out;
}

/**
 * Max offer price for the goals the user picks for this deal, plus a stress test.
 * Shown under the analyzer (goals saved with the deal) and on the property page.
 */
export function DealTools({
  inputs,
  goals,
  onGoalsChange,
  action,
}: {
  inputs: DealInputs;
  goals: OfferGoals;
  onGoalsChange: (g: OfferGoals) => void;
  /** Extra control in the header, e.g. a "Save goals" button on the property page. */
  action?: React.ReactNode;
}) {
  const deferred = useDeferredValue(inputs);
  const ready = dec(deferred.purchasePrice).gt(0) && dec(deferred.monthlyRent).gt(0);
  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm"><Target className="size-4" /> Max offer price</CardTitle>
        <CardDescription className="text-xs">
          Choose the goals that matter for this deal — cash flow in one market, equity in another — and see the highest price that meets them.
        </CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Enter a purchase price and rent to see the max offer price.</p>
        ) : (
          <div className="space-y-8">
            <MaxOffer inputs={deferred} goals={goals} onGoalsChange={onGoalsChange} />
            <StressTest inputs={deferred} opts={goals.options ?? DEFAULT_OFFER_OPTIONS} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MaxOffer({ inputs, goals, onGoalsChange }: { inputs: DealInputs; goals: OfferGoals; onGoalsChange: (g: OfferGoals) => void }) {
  const options = goals.options ?? DEFAULT_OFFER_OPTIONS;
  const states = useMemo(() => solve(inputs, goals, goals.options ?? DEFAULT_OFFER_OPTIONS), [inputs, goals]);
  const price = dec(inputs.purchasePrice);
  const strategy = currentStrategy(goals);
  const setGoal = (key: OfferGoalKey, patch: Partial<OfferGoals[OfferGoalKey]>) =>
    onGoalsChange({ ...goals, [key]: { ...goals[key], ...patch } });

  // Binding constraint = lowest max price among the goals in use.
  const inUse = OFFER_GOALS.filter((g) => goals[g.key].enabled);
  const solved = inUse.flatMap((g) => {
    const s = states[g.key];
    return s.status === "ok" ? [{ label: g.label, price: s.result.price }] : [];
  });
  const binding = solved.reduce<{ label: string; price: D | null } | null>((min, r) => {
    if (!min) return r;
    if (r.price === null || (min.price !== null && r.price.lt(min.price))) return r;
    return min;
  }, null);
  const skipped = inUse.filter((g) => states[g.key].status !== "ok").length;

  const scaleMax = D.max(
    price,
    ...OFFER_GOALS.flatMap((g) => {
      const s = states[g.key];
      return s.status === "ok" && s.result.price && !s.result.unbounded ? [s.result.price] : [];
    }),
  ).times(1.08);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Strategy</span>
        <div className="inline-flex flex-wrap rounded-lg border p-0.5" role="radiogroup" aria-label="Strategy preset">
          {STRATEGIES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={strategy === s.value}
              title={s.description}
              onClick={() => onGoalsChange(applyStrategy(goals, s.value))}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs",
                strategy === s.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {strategy === "custom" && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Custom</span>}
        <span className="text-[11px] text-muted-foreground">
          {strategy !== "custom" ? STRATEGIES.find((s) => s.value === strategy)?.description : "Your own mix of goals"}
        </span>
      </div>

      <RepriceChoices inputs={inputs} options={options} onChange={(o) => onGoalsChange({ ...goals, options: o })} />

      <div
        className={cn(
          "rounded-lg border px-4 py-3",
          !binding ? "bg-muted/40" : binding.price && price.lte(binding.price) ? "border-positive/30 bg-positive/5" : "border-negative/30 bg-negative/5",
        )}
      >
        {!binding ? (
          <p className="text-sm text-muted-foreground">Turn on at least one goal below.</p>
        ) : binding.price ? (
          <>
            <p className="text-sm">
              To meet {solved.length === 1 ? "this goal" : `your ${solved.length} goals`}, offer at or below{" "}
              <span className="num text-lg font-semibold">{formatCurrency(binding.price)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Limited by {binding.label.toLowerCase()}. Your current price {formatCurrency(price)} is{" "}
              {price.lte(binding.price)
                ? `${formatCurrency(binding.price.minus(price))} under it.`
                : `${formatCurrency(price.minus(binding.price))} (${formatPercent(price.minus(binding.price).div(price), 1)}) over it.`}
              {skipped > 0 && ` ${skipped} selected goal${skipped > 1 ? "s" : ""} couldn't be checked (see below).`}
            </p>
          </>
        ) : (
          <p className="text-sm">
            No price meets your {binding.label.toLowerCase()} goal at these rents and expenses. Lower that target or turn it off.
          </p>
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
              <th className="hidden min-w-44 px-3 py-2 text-left font-medium md:table-cell">vs. your price</th>
              <th className="px-3 py-2 text-right font-medium">Difference</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {OFFER_GOALS.map((g) => {
              const st = states[g.key];
              const enabled = goals[g.key].enabled;
              const max = st.status === "ok" ? st.result.price : null;
              const ok = max !== null && price.lte(max);
              const pctOf = (v: D) => `${D.min(v.div(scaleMax).times(100), 100).toFixed(2)}%`;
              const Icon = st.status !== "ok" ? CircleMinus : ok ? CheckCircle2 : XCircle;
              return (
                <tr key={g.key} className={cn(!enabled && "text-muted-foreground")}>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={enabled}
                      onCheckedChange={(v) => setGoal(g.key, { enabled: v === true })}
                      aria-label={`Use ${g.label} goal`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          !enabled || st.status !== "ok" ? "text-muted-foreground/60" : ok ? "text-positive" : "text-negative",
                        )}
                      />
                      <span className={cn("font-medium", enabled && "text-foreground")}>{g.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {g.key === "seventy" ? (
                      <span className="text-xs">ARV × 70% − rehab</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">≥</span>
                        <NumberInput
                          value={goals[g.key].target}
                          onChange={(e) => setGoal(g.key, { target: e.target.value })}
                          prefix={g.unit.prefix}
                          suffix={g.unit.suffix}
                          className="h-8 w-32 text-xs"
                          aria-label={`${g.label} target`}
                          aria-invalid={st.status === "invalid"}
                          disabled={st.status === "needsArv" || st.status === "na"}
                        />
                      </div>
                    )}
                  </td>
                  <td className="num px-3 py-2 text-right font-semibold">
                    {st.status === "invalid" && <span className="text-xs font-normal text-destructive">Enter a number</span>}
                    {st.status === "needsArv" && <span className="text-xs font-normal">Needs an ARV</span>}
                    {st.status === "na" && <span className="text-xs font-normal">{st.reason}</span>}
                    {st.status === "ok" && (max ? `${formatCurrency(max)}${st.result.unbounded ? "+" : ""}` : <span className="text-xs font-normal">Not reachable</span>)}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    {st.status === "ok" && (
                      <div className={cn("relative h-2.5 rounded-full bg-muted", !enabled && "opacity-40")} title={max ? `Max ${formatCurrency(max)} · your price ${formatCurrency(price)}` : undefined}>
                        {max && <div className={cn("absolute inset-y-0 left-0 rounded-full", ok ? "bg-positive/60" : "bg-negative/50")} style={{ width: pctOf(max) }} />}
                        <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-foreground" style={{ left: pctOf(price) }} aria-hidden />
                      </div>
                    )}
                  </td>
                  <td className={cn("num px-3 py-2 text-right text-xs", enabled && st.status === "ok" && (ok ? "text-positive" : "text-negative"))}>
                    {max ? `${ok ? "+" : "−"}${formatCurrency(max.minus(price).abs())}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Each max price keeps rent, insurance, other expenses, rehab, the interest rate and loan term fixed, and lets closing costs scale with
        price. Down payment and property tax follow the choices above. Rounded down to $500. Equity and the 70% rule need an after-repair
        value.
      </p>
    </div>
  );
}

/** How the down payment and property tax move as the price is searched. */
function RepriceChoices({ inputs, options, onChange }: { inputs: DealInputs; options: OfferOptions; onChange: (o: OfferOptions) => void }) {
  const price = dec(inputs.purchasePrice);
  const downDollars = price.times(dec(inputs.downPaymentPercent)).div(100);
  const tax = dec(inputs.propertyTaxAnnual);
  const taxPct = price.gt(0) ? tax.div(price).times(100) : null;
  const choice = <K extends keyof OfferOptions>(
    k: K,
    label: string,
    items: { value: OfferOptions[K]; label: string; hint: string }[],
  ) => (
    <div className="space-y-1.5">
      <div className="text-xs font-medium">{label}</div>
      <div className="inline-flex w-full rounded-lg border p-0.5 sm:w-auto" role="radiogroup" aria-label={label}>
        {items.map((it) => (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={options[k] === it.value}
            onClick={() => onChange({ ...options, [k]: it.value })}
            className={cn(
              "flex-1 rounded-md px-2.5 py-1 text-xs sm:flex-none",
              options[k] === it.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{items.find((it) => it.value === options[k])?.hint}</p>
    </div>
  );
  return (
    <div className="grid gap-4 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
      {inputs.isCashPurchase ? (
        <div className="space-y-1.5">
          <div className="text-xs font-medium">Down payment at other prices</div>
          <p className="text-[11px] text-muted-foreground">All-cash purchase — the whole price is paid in cash at every price.</p>
        </div>
      ) : (
        choice("downPayment", "Down payment at other prices", [
          { value: "percent", label: `Same ${String(inputs.downPaymentPercent)}%`, hint: "Cheaper price → smaller down payment and smaller loan, same percentage." },
          {
            value: "amount",
            label: `Same ${formatCurrency(downDollars)}`,
            hint: `You bring ${formatCurrency(downDollars)} at any price — a cheaper price means a bigger share down and a smaller loan.`,
          },
        ])
      )}
      {choice("propertyTax", "Property tax at other prices", [
        { value: "fixed", label: `Stays ${formatCurrency(tax)}/yr`, hint: "For states that don't reassess on sale, or a tax bill you already know." },
        {
          value: "reassess",
          label: taxPct ? `Follows price (${taxPct.toDecimalPlaces(2).toString()}%)` : "Follows price",
          hint: "For states that reassess at sale (e.g. California): tax stays the same share of the price you pay.",
        },
      ])}
    </div>
  );
}

function StressTest({ inputs, opts }: { inputs: DealInputs; opts: RepriceOptions }) {
  const s = useMemo(() => stressTest(inputs, opts), [inputs, opts]);
  const price = dec(inputs.purchasePrice);
  const breakEven = s.combinedBreakEvenPrice.price;
  const rows = [...s.rows, s.combined];
  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-medium"><ShieldAlert className="size-4" /> Stress test</h3>
        <p className="text-xs text-muted-foreground">
          Does it still cash flow if things go wrong? Each line changes one assumption; the last applies all of them together.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">If…</th>
              <th className="px-3 py-2 text-right font-medium">Cash flow / mo</th>
              <th className="px-3 py-2 text-right font-medium">Change</th>
              <th className="px-3 py-2 text-right font-medium">Cash-on-cash</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            <tr className="bg-muted/20 text-muted-foreground">
              <td className="px-3 py-2">As entered</td>
              <td className="num px-3 py-2 text-right">{formatCurrency(s.base.monthlyCashFlow)}</td>
              <td className="px-3 py-2 text-right">—</td>
              <td className="num px-3 py-2 text-right">{formatPercent(s.base.cashOnCash, 1)}</td>
            </tr>
            {rows.map((r) => {
              const ok = !r.monthlyCashFlow.isNegative();
              const Icon = ok ? CheckCircle2 : XCircle;
              return (
                <tr key={r.key} className={cn(r.key === "combined" && "border-t-2 font-medium")}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <Icon className={cn("size-4 shrink-0", ok ? "text-positive" : "text-negative")} />
                      {r.label}
                    </span>
                  </td>
                  <td className={cn("num px-3 py-2 text-right font-medium", ok ? "text-positive" : "text-negative")}>{formatCurrency(r.monthlyCashFlow)}</td>
                  <td className="num px-3 py-2 text-right text-xs text-muted-foreground">{formatCurrency(r.monthlyCashFlow.minus(s.base.monthlyCashFlow))}</td>
                  <td className="num px-3 py-2 text-right">{formatPercent(r.cashOnCash, 1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs">
        {breakEven ? (
          <>
            To still break even with <span className="font-medium">all of these at once</span>, pay no more than{" "}
            <span className="num font-semibold">{formatCurrency(breakEven)}</span>
            <span className="text-muted-foreground">
              {" "}— {price.lte(breakEven) ? `${formatCurrency(breakEven.minus(price))} of cushion at your price.` : `${formatCurrency(price.minus(breakEven))} below your current price.`}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">With all of these at once, the deal doesn&apos;t break even at any price — the rent can&apos;t carry the expenses.</span>
        )}
      </p>
    </section>
  );
}

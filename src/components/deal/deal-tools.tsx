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
} from "@/lib/finance";
import {
  OFFER_GOALS,
  STRATEGIES,
  applyStrategy,
  currentStrategy,
  parseTarget,
  toPriceGoal,
  type OfferGoalKey,
  type OfferGoals,
} from "@/lib/offer-goals";
import { NumberInput } from "./number-input";

type RowState =
  | { status: "ok"; result: MaxPriceResult }
  | { status: "invalid" } // target isn't a number
  | { status: "needsArv" }
  | { status: "na"; reason: string };

function solve(inputs: DealInputs, goals: OfferGoals): Record<OfferGoalKey, RowState> {
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
      out[g.key] = t ? { status: "ok", result: maxPriceFor(inputs, toPriceGoal(g.key, t)) } : { status: "invalid" };
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
            <StressTest inputs={deferred} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MaxOffer({ inputs, goals, onGoalsChange }: { inputs: DealInputs; goals: OfferGoals; onGoalsChange: (g: OfferGoals) => void }) {
  const states = useMemo(() => solve(inputs, goals), [inputs, goals]);
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
        Each max price keeps rent, expenses, rehab and loan terms fixed and lets closing costs scale with price. Property taxes aren&apos;t
        re-assessed — in states that reassess on sale, check taxes at your offer price. Rounded down to $500. Equity and the 70% rule need an
        after-repair value.
      </p>
    </div>
  );
}

function StressTest({ inputs }: { inputs: DealInputs }) {
  const s = useMemo(() => stressTest(inputs), [inputs]);
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

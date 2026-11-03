"use client";

import { Plus, Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { compareToEstimates, dec, formatCurrency, formatPercent } from "@/lib/finance";
import { ESTIMATE_KINDS, ESTIMATE_SOURCES, cleanAmount, type EstimateKind, type OtherEstimate } from "@/lib/other-estimates";
import { NumberInput } from "./number-input";

const KIND_TEXT: Record<EstimateKind, { yours: string; field: string; suffix: string }> = {
  arv: { yours: "Your ARV", field: "ARV", suffix: "" },
  rent: { yours: "Your rent", field: "rent", suffix: "/mo" },
};

/** Average of one kind of estimate vs. the figure on the deal, with a one-click "Use average". */
function KindSummary({ kind, rows, current, onUse }: { kind: EstimateKind; rows: OtherEstimate[]; current: string; onUse?: (v: string) => void }) {
  const c = compareToEstimates(rows.filter((r) => r.kind === kind).map((r) => cleanAmount(r.amount)), cleanAmount(current) || null);
  if (!c.average) return null;
  const t = KIND_TEXT[kind];
  const avg = c.average.toDecimalPlaces(0);
  const big = c.gap && c.gap.abs().gte("0.1");
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-muted/50 px-3 py-2 text-xs">
      <div>
        <span className="font-medium">
          {kind === "arv" ? "Value" : "Rent"}: average {formatCurrency(avg)}{t.suffix}
        </span>
        <span className="text-muted-foreground">
          {" "}of {c.count}
          {c.count > 1 ? ` (${formatCurrency(c.low!)} – ${formatCurrency(c.high!)})` : ""}
        </span>
        {c.gap && (
          <span className={cn("ml-1", big ? "font-medium text-caution" : "text-muted-foreground")}>
            · {c.gap.abs().lt("0.0005") ? `${t.yours} matches` : `${t.yours} is ${formatPercent(c.gap.abs(), 1)} ${c.gap.isNegative() ? "below" : "above"}`}
          </span>
        )}
      </div>
      {onUse && avg.toString() !== cleanAmount(current) && (
        <Button type="button" variant="outline" size="sm" className="h-7" onClick={() => onUse(avg.toString())}>
          Use average as {t.field}
        </Button>
      )}
    </div>
  );
}

/** Analyzer card: values copied from Zillow, Redfin, an agent… to cross-check ARV and rent. */
export function OtherEstimatesSection({
  rows,
  onChange,
  currentArv,
  currentRent,
  onUseArv,
  onUseRent,
}: {
  rows: OtherEstimate[];
  onChange: (rows: OtherEstimate[]) => void;
  currentArv: string;
  currentRent: string;
  onUseArv: (v: string) => void;
  onUseRent: (v: string) => void;
}) {
  const set = (i: number, patch: Partial<OtherEstimate>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const add = () => onChange([...rows, { source: "Zillow", kind: rows.at(-1)?.kind ?? "arv", amount: "", note: "" }]);
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm"><Scale className="size-4" /> Outside estimates</CardTitle>
          <CardDescription className="text-xs">
            Copy values from Zillow, Redfin, your agent or an appraisal to cross-check your ARV and rent.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}><Plus /> Add</Button>
      </CardHeader>
      {rows.length > 0 && (
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 border-b pb-2 last:border-0 last:pb-0 sm:grid-cols-[9rem_8rem_9rem_1fr_auto] sm:border-0 sm:pb-0">
                <Select value={r.source} onValueChange={(v) => set(i, { source: v })}>
                  <SelectTrigger className="h-8 w-full" aria-label={`Estimate ${i + 1} source`}><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTIMATE_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={r.kind} onValueChange={(v) => set(i, { kind: v as EstimateKind })}>
                  <SelectTrigger className="h-8 w-full" aria-label={`Estimate ${i + 1} type`}><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTIMATE_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
                </Select>
                <div className="order-4 sm:order-none"><NumberInput prefix="$" value={r.amount} onChange={(e) => set(i, { amount: e.target.value })} aria-label={`Estimate ${i + 1} amount`} className="h-8" /></div>
                <Input value={r.note} onChange={(e) => set(i, { note: e.target.value })} placeholder="Note (date, link…)" aria-label={`Estimate ${i + 1} note`} className="order-5 col-span-2 h-8 sm:order-none sm:col-span-1" />
                <Button type="button" variant="ghost" size="icon-sm" className="order-3 justify-self-end sm:order-none" onClick={() => onChange(rows.filter((_, j) => j !== i))} aria-label={`Remove estimate ${i + 1}`}>
                  <X />
                </Button>
              </div>
            ))}
          </div>
          <KindSummary kind="arv" rows={rows} current={currentArv} onUse={onUseArv} />
          <KindSummary kind="rent" rows={rows} current={currentRent} onUse={onUseRent} />
          <p className="text-[11px] text-muted-foreground">
            Automated estimates (Zestimate, Redfin Estimate) describe the home as it is today — they are not an after-repair value. Use them as a sanity check next to your comps.
          </p>
        </CardContent>
      )}
    </Card>
  );
}

/** Read-only list for the property page and report. */
export function OtherEstimatesSummary({ rows, currentArv, currentRent }: { rows: OtherEstimate[]; currentArv: string; currentRent: string }) {
  return (
    <div className="space-y-3">
      <div className="divide-y rounded-lg border text-sm">
        {rows.map((r, i) => (
          <div key={i} className="flex items-baseline justify-between gap-4 px-3 py-1.5">
            <span>
              {r.source} <span className="text-xs text-muted-foreground">· {r.kind === "arv" ? "value" : "rent"}{r.note ? ` · ${r.note}` : ""}</span>
            </span>
            <span className="num">{cleanAmount(r.amount) ? `${formatCurrency(dec(cleanAmount(r.amount)))}${r.kind === "rent" ? "/mo" : ""}` : "—"}</span>
          </div>
        ))}
      </div>
      <KindSummary kind="arv" rows={rows} current={currentArv} />
      <KindSummary kind="rent" rows={rows} current={currentRent} />
    </div>
  );
}

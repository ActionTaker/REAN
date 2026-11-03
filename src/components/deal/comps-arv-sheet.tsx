"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpDown, Check, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { D, dec, formatCurrency } from "@/lib/finance";
import {
  DEFAULT_ARV_SETTINGS,
  analyzeComps,
  defaultSettingsFor,
  type CompsMode,
  isActiveListing,
  type ArvMethodKey,
  type CompCondition,
  type CompRow,
  type Subject,
} from "@/lib/property-data/comps-arv";
import type { ArvAnalysis } from "@/lib/property-data/arv-analysis";
import type { PropertyLookup } from "@/lib/property-data/types";
import { NumberInput } from "./number-input";
import { CompsMap } from "./comps-map";

const money = (v: D | null | undefined) => (v ? formatCurrency(v) : "—");
const signed = (v: D) => (v.isZero() ? "—" : `${v.isNegative() ? "−" : "+"}${formatCurrency(v.abs())}`);
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type SortKey = "similarity" | "distance" | "adjusted" | "date";

/** Plain-language key to the table: price → adjustments → adjusted price → ARV. */
function ReadingGuide({ mode }: { mode: CompsMode }) {
  const rent = mode === "rent";
  return (
    <details className="group rounded-lg border bg-muted/30 text-xs" open>
      <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 font-medium">
        How to read this table
        <span className="text-[11px] font-normal text-muted-foreground group-open:hidden">Show</span>
        <span className="hidden text-[11px] font-normal text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <ol className="grid gap-3 border-t px-3 py-3 sm:grid-cols-3">
        <li>
          <div className="font-semibold">① {rent ? "Rent" : "Price"} — what that home actually {rent ? "rents" : "sold"} for</div>
          <p className="mt-0.5 text-muted-foreground">
            The tag tells you which kind: <strong>{rent ? "For rent · asking" : "For sale · asking price"}</strong> is still on the market, so it&apos;s only
            what the owner hopes to get. <strong>Off market</strong> means the listing ended — usually {rent ? "leased" : "sold"} at about that{" "}
            {rent ? "rent" : "price"}.
          </p>
        </li>
        <li>
          <div className="font-semibold">② Adjust to yours — correct for differences</div>
          <p className="mt-0.5 text-muted-foreground">
            No two homes match. If the comp is <strong>smaller</strong>, has fewer beds or baths, or is older than yours, its {rent ? "rent" : "price"} is
            adjusted <strong>up</strong>; if it&apos;s bigger or newer, <strong>down</strong>. Example: a comp 200 sq ft smaller, where homes go for $150/sq ft → +$15,000 (size counts at half the $/sq ft by default).
          </p>
        </li>
        <li>
          <div className="font-semibold">③ Adjusted {rent ? "rent" : "price"} = ① + ②</div>
          <p className="mt-0.5 text-muted-foreground">
            What <strong>your</strong> {rent ? "unit would rent for" : "home would sell for"} if it were like that comp. {rent ? "Market rent" : "The ARV"} is built
            from these adjusted numbers — not from the raw {rent ? "rents" : "prices"} — so compare this column.
          </p>
        </li>
      </ol>
    </details>
  );
}

const COPY: Record<CompsMode, {
  title: string; what: string; heading: string; priceCol: string; use: string; manual: string; now: string; per: string; listedNote: string; footer: string;
}> = {
  sale: {
    title: "Comps & ARV",
    what: "comparable sales",
    heading: "Comparable sales",
    priceCol: "Sale price",
    use: "Use as ARV",
    manual: "Your own ARV",
    now: "ARV in this deal now",
    per: "",
    listedNote: "that's an asking price, not a sale",
    footer:
      "RentCast tracks listings, not recorded deeds — \u201coff market\u201d usually means sold, but confirm closed prices with an agent or the county record.",
  },
  rent: {
    title: "Comps & Rent",
    what: "rental comps",
    heading: "Rental comps",
    priceCol: "Rent / mo",
    use: "Use as rent",
    manual: "Your own rent (per unit)",
    now: "Rent per unit in this deal now",
    per: "/mo",
    listedNote: "that's an advertised rent, which can run above signed leases",
    footer:
      "Rental comps are listings — advertised rents can run a little above what tenants actually sign for. Check with a local property manager before you rely on the top of the range.",
  },
};

/**
 * Full Comps & ARV workspace: pick comps, tag condition, see every adjustment,
 * compare methods and apply one to the deal's ARV. Free — nothing paywalled.
 */
export function CompsArvSheet({
  mode = "sale",
  open,
  onOpenChange,
  lookup,
  subject,
  subjectInputs,
  onSubjectChange,
  analysis,
  onAnalysisChange,
  currentArv,
  onUseArv,
}: {
  /** "sale" → ARV from sales comps; "rent" → market rent per unit from rental comps. */
  mode?: CompsMode;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lookup: PropertyLookup;
  subject: Subject;
  /** What's typed in the deal form (may be blank — then the property record's value is used and shown as a hint). */
  subjectInputs: Record<"squareFeet" | "bedrooms" | "bathrooms" | "yearBuilt", string>;
  onSubjectChange: (field: "squareFeet" | "bedrooms" | "bathrooms" | "yearBuilt", value: string) => void;
  analysis: ArvAnalysis;
  onAnalysisChange: (a: ArvAnalysis) => void;
  currentArv: string;
  onUseArv: (value: string, method: ArvMethodKey | "manual") => void;
}) {
  const copy = COPY[mode];
  const comps = useMemo(() => (mode === "rent" ? lookup.rent?.comparables : lookup.value?.comparables) ?? [], [lookup, mode]);
  const avm = mode === "rent" ? lookup.rent?.perUnit ?? null : lookup.value?.estimate ?? null;
  const result = useMemo(
    () => analyzeComps(subject, comps, analysis.choices, analysis.settings, avm, mode),
    [subject, comps, analysis, avm, mode],
  );
  const [sort, setSort] = useState<SortKey>("similarity");
  const [showSettings, setShowSettings] = useState(false);
  const [manual, setManual] = useState(dec(currentArv || 0).gt(0) ? currentArv : "");

  // Letters follow similarity order so the map and table always agree, however the table is sorted.
  const letters = useMemo(() => {
    const bySim = [...result.rows].sort((a, b) => (b.comp.correlation ?? 0) - (a.comp.correlation ?? 0));
    return new Map(bySim.map((r, i) => [r.id, LETTERS.at(i) ?? "·"]));
  }, [result.rows]);

  const rows = useMemo(() => {
    const rs = [...result.rows];
    const time = (r: CompRow) => (r.comp.date ? Date.parse(r.comp.date) : 0);
    switch (sort) {
      case "similarity":
        return rs.sort((a, b) => (b.comp.correlation ?? 0) - (a.comp.correlation ?? 0));
      case "distance":
        return rs.sort((a, b) => (a.comp.distanceMiles ?? 99) - (b.comp.distanceMiles ?? 99));
      case "adjusted":
        return rs.sort((a, b) => b.adjustedPrice.comparedTo(a.adjustedPrice));
      case "date":
        return rs.sort((a, b) => time(b) - time(a));
    }
  }, [result.rows, sort]);

  const setChoice = (id: string, patch: Partial<{ included: boolean; condition: CompCondition | null }>) => {
    const prev = analysis.choices[id] ?? { included: true, condition: null };
    onAnalysisChange({ ...analysis, choices: { ...analysis.choices, [id]: { ...prev, ...patch } } });
  };
  const setSetting = (k: keyof typeof DEFAULT_ARV_SETTINGS, v: string | boolean) =>
    onAnalysisChange({ ...analysis, settings: { ...analysis.settings, [k]: v } });

  const current = dec(currentArv || 0);
  const confColor = { high: "text-positive", medium: "text-caution", low: "text-negative" }[result.confidence.level];
  const activeCount = comps.filter(isActiveListing).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-6xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>
            {lookup.address.formatted} · {comps.length} {copy.what} from {lookup.provider === "rentcast" ? "RentCast" : "demo data"}. Choose which comps
            count, mark the renovated ones, and apply a number to this deal.
            {mode === "rent" && (lookup.rent?.units ?? 1) > 1 && ` Rents are per unit; applying multiplies by ${lookup.rent!.units} units.`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-6 pb-8">
          {/* ── Methods ─────────────────────────────────────────────── */}
          <section className="grid gap-3 md:grid-cols-5">
            {result.methods.map((m) => {
              const applied = m.value && current.eq(m.value) && analysis.method === m.key;
              const main = m.key === "recommended";
              return (
                <div
                  key={m.key}
                  className={cn(
                    "flex flex-col rounded-xl border p-3",
                    main && "border-series-1/50 bg-series-1/5 md:col-span-2",
                  )}
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {m.label}
                    {main && (
                      <span className={cn("rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold uppercase", confColor)}>
                        {result.confidence.level} confidence
                      </span>
                    )}
                  </div>
                  <div className={cn("num mt-1 font-semibold tracking-tight", main ? "text-3xl" : "text-xl")}>
                    {money(m.value)}
                    {m.value && copy.per && <span className="text-sm font-normal text-muted-foreground">{copy.per}</span>}
                  </div>
                  {main && result.range && (
                    <div className="num text-xs text-muted-foreground">
                      Adjusted comps, middle half: {money(result.range.low)} – {money(result.range.high)}
                    </div>
                  )}
                  <p className="mt-1 flex-1 text-[11px] leading-snug text-muted-foreground">{m.formula}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant={applied ? "secondary" : main ? "default" : "outline"}
                    className="mt-2"
                    disabled={!m.value}
                    onClick={() => m.value && onUseArv(m.value.toString(), m.key)}
                  >
                    {applied ? <><Check /> In use</> : copy.use}
                  </Button>
                </div>
              );
            })}
          </section>

          <section className="flex flex-wrap items-end gap-3 rounded-xl border p-3">
            <div className="space-y-1">
              <Label htmlFor="manual-arv" className="text-xs">{copy.manual}</Label>
              <NumberInput id="manual-arv" prefix="$" value={manual} onChange={(e) => setManual(e.target.value)} className="h-8 w-40" />
            </div>
            <Button type="button" size="sm" variant="outline" disabled={!/^\d+(\.\d+)?$/.test(manual.replace(/[,$\s]/g, ""))} onClick={() => onUseArv(manual.replace(/[,$\s]/g, ""), "manual")}>
              Use my number
            </Button>
            <p className="text-xs text-muted-foreground">
              {copy.now}: <span className="num font-medium text-foreground">{current.gt(0) ? formatCurrency(current) : "not set"}</span>
              {analysis.method && <> · from {analysis.method === "manual" ? "your number" : result.methods.find((m) => m.key === analysis.method)?.label.toLowerCase()}</>}
            </p>
          </section>

          {/* ── Subject + confidence + map ─────────────────────────── */}
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-medium">Subject property</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  Adjustments compare each comp to these. Gray numbers come from the property record; type to override (it updates the deal too).
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(
                    [
                      ["squareFeet", "Sq ft", subject.squareFeet],
                      ["bedrooms", "Beds", subject.bedrooms],
                      ["bathrooms", "Baths", subject.bathrooms],
                      ["yearBuilt", "Year built", subject.yearBuilt],
                    ] as const
                  ).map(([k, label, v]) => (
                    <div key={k} className="space-y-1">
                      <Label htmlFor={`subj-${k}`} className="text-xs">{label}</Label>
                      <Input
                        id={`subj-${k}`}
                        inputMode="decimal"
                        className={cn("h-8", (v === null || v === "") && "border-caution")}
                        value={subjectInputs[k]}
                        placeholder={v === null || v === "" ? "missing" : String(v)}
                        onChange={(e) => onSubjectChange(k, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-4 text-sm">
                <h3 className="font-medium">
                  Confidence: <span className={cn("capitalize", confColor)}>{result.confidence.level}</span>
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{result.confidence.reasons.join(" · ")}</p>
                {result.notes.map((n) => (
                  <p key={n} className="mt-2 flex gap-1.5 text-xs text-caution"><AlertTriangle className="mt-px size-3.5 shrink-0" />{n}</p>
                ))}
                {activeCount > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {activeCount} comp{activeCount > 1 ? "s are" : " is"} still listed — {copy.listedNote}.
                  </p>
                )}
              </div>
            </div>
            <CompsMap lookup={lookup} rows={result.rows} letters={letters} priceSuffix={copy.per} />
          </section>

          {/* ── Comps table ────────────────────────────────────────── */}
          <section className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-medium">{copy.heading} <span className="font-normal text-muted-foreground">· {result.used} of {comps.length} in use</span></h3>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={analysis.settings.excludeActive} onCheckedChange={(v) => setSetting("excludeActive", v)} />
                Exclude active listings
              </label>
              <div className="ml-auto flex items-center gap-2">
                <ArrowUpDown className="size-3.5 text-muted-foreground" />
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger size="sm" className="w-40" aria-label="Sort comps"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="similarity">Most similar</SelectItem>
                    <SelectItem value="distance">Closest</SelectItem>
                    <SelectItem value="adjusted">Highest adjusted</SelectItem>
                    <SelectItem value="date">Most recent</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowSettings((s) => !s)} aria-expanded={showSettings}>
                  <SlidersHorizontal /> Adjustments
                </Button>
              </div>
            </div>

            {showSettings && (
              <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-5">
                {(
                  [
                    ["sizeAdjPct", "Size", "% of median $/sq ft"],
                    ["bedAdjPct", "Per bedroom", "% of median price"],
                    ["bathAdjPct", "Per bathroom", "% of median price"],
                    ["agePctPerYear", "Per year of age", "% of median price"],
                    ["ageCapPct", "Age cap", "% of comp price"],
                  ] as const
                ).map(([k, label, hint]) => (
                  <div key={k} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <NumberInput suffix="%" value={analysis.settings[k]} onChange={(e) => setSetting(k, e.target.value)} className="h-8 text-xs" aria-label={label} />
                    <p className="text-[10px] text-muted-foreground">{hint}</p>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground sm:col-span-4">
                  Size is adjusted at half the going $/sq ft by default, because location doesn&apos;t grow with the house. Median{" "}
                  {mode === "rent" ? "rent" : "price"} {money(result.medianPrice)}, median{" "}
                  {result.medianPpsf ? formatCurrency(result.medianPpsf, { cents: mode === "rent" }) : "—"}/sq ft.
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={() => onAnalysisChange({ ...analysis, settings: { ...defaultSettingsFor(mode) } })}>
                  <RotateCcw /> Defaults
                </Button>
              </div>
            )}

            <ReadingGuide mode={mode} />

            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-10 px-3 py-2 text-left font-medium">Use</th>
                    <th className="px-3 py-2 text-left font-medium">Comp</th>
                    <th className="px-3 py-2 text-right font-medium">Bd / Ba · Sq ft · Built</th>
                    <th className="px-3 py-2 text-right font-medium">① {copy.priceCol}</th>
                    <th className="px-3 py-2 text-right font-medium">② Adjust to yours</th>
                    <th className="px-3 py-2 text-right font-medium text-foreground">③ Adjusted {mode === "rent" ? "rent" : "price"}</th>
                    <th className="px-3 py-2 text-left font-medium">Condition</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r) => {
                    const c = r.comp;
                    const active = isActiveListing(c);
                    const total = r.adjustments.size.plus(r.adjustments.bedrooms).plus(r.adjustments.bathrooms).plus(r.adjustments.age);
                    return (
                      <tr key={r.id} className={cn(!r.included && "text-muted-foreground opacity-70")}>
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={r.included}
                            disabled={!!r.autoExcluded}
                            onCheckedChange={(v) => setChoice(r.id, { included: v === true })}
                            aria-label={`Use ${c.address}`}
                          />
                        </td>
                        <td className="max-w-72 px-3 py-2.5">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-series-1/15 text-[10px] font-semibold text-series-1">
                              {letters.get(r.id)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground" title={c.address}>{c.address}</div>
                              <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                                <span className={cn("rounded px-1", active ? "bg-caution/15 text-caution" : "bg-muted")}>
                                  {active ? (mode === "rent" ? "For rent · asking" : "For sale · asking price") : mode === "rent" ? "Off market · likely leased" : "Off market · likely sold"}
                                  {c.date && ` ${new Date(c.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                                </span>
                                {c.distanceMiles !== null && <span>{c.distanceMiles.toFixed(2)} mi</span>}
                                {c.correlation !== null && <span>{(c.correlation * 100).toFixed(1)}% similar</span>}
                                {r.autoExcluded && <span className="text-caution">{r.autoExcluded}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="num px-3 py-2.5 text-right text-xs whitespace-nowrap">
                          {c.bedrooms ?? "—"} / {c.bathrooms ?? "—"} · {c.squareFeet?.toLocaleString("en-US") ?? "—"} · {c.yearBuilt ?? "—"}
                        </td>
                        <td className="num px-3 py-2.5 text-right whitespace-nowrap">
                          {money(dec(c.price))}
                          <div className="text-[11px] text-muted-foreground">{r.ppsf ? `${formatCurrency(r.ppsf, { cents: mode === "rent" })}/sq ft` : ""}</div>
                        </td>
                        <td className="num px-3 py-2.5 text-right text-xs">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="underline decoration-dotted underline-offset-2">{total.isZero() ? "None" : signed(total)}</button>
                            </TooltipTrigger>
                            <TooltipContent className="space-y-0.5 text-left">
                              <div>Size: {signed(r.adjustments.size)}</div>
                              <div>Bedrooms: {signed(r.adjustments.bedrooms)}</div>
                              <div>Bathrooms: {signed(r.adjustments.bathrooms)}</div>
                              <div>Age: {signed(r.adjustments.age)}</div>
                            </TooltipContent>
                          </Tooltip>
                          <div className="mt-0.5 ml-auto max-w-36 text-[10px] leading-tight text-muted-foreground">
                            {(
                              [
                                ["size", r.adjustments.size],
                                ["beds", r.adjustments.bedrooms],
                                ["baths", r.adjustments.bathrooms],
                                ["age", r.adjustments.age],
                              ] as const
                            )
                              .filter(([, v]) => !v.isZero())
                              .map(([k, v]) => (
                                <span key={k} className="ml-1.5 inline-block whitespace-nowrap">{k} {signed(v)}</span>
                              ))}
                          </div>
                        </td>
                        <td className="num px-3 py-2.5 text-right font-semibold whitespace-nowrap">{money(r.adjustedPrice)}</td>
                        <td className="px-3 py-2.5">
                          <div className="inline-flex rounded-md border p-0.5" role="radiogroup" aria-label={`Condition of ${c.address}`}>
                            {(
                              [
                                ["renovated", "Reno"],
                                ["average", "Avg"],
                                ["dated", "Dated"],
                              ] as const
                            ).map(([v, label]) => (
                              <button
                                key={v}
                                type="button"
                                role="radio"
                                aria-checked={r.condition === v}
                                title={v === "renovated" ? "Updated / renovated — what your rehab should look like" : v === "average" ? "Average condition" : "Needs work"}
                                onClick={() => setChoice(r.id, { condition: r.condition === v ? null : v })}
                                className={cn(
                                  "rounded px-1.5 py-0.5 text-[11px]",
                                  r.condition === v
                                    ? v === "renovated"
                                      ? "bg-positive text-white"
                                      : "bg-foreground text-background"
                                    : "text-muted-foreground hover:text-foreground",
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Mark comps that look renovated in their listing photos as <strong>Reno</strong>: the recommendation then uses only those.{" "}
              {copy.footer}
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { D, dec, formatCurrency } from "@/lib/finance";
import { analyzeComps, isActiveListing, perUnitSubject, type CompRow, type CompsMode, type Subject } from "@/lib/property-data/comps-arv";
import { emptyArvAnalysis } from "@/lib/property-data/arv-analysis";
import type { PropertyRecord } from "@/lib/property-mapping";
import { CompsMap } from "./comps-map";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Letters by similarity, the same order the Comps & ARV panel uses, so A on the map is A in the table. */
export function compLetters(rows: CompRow[]): Map<string, string> {
  const bySim = [...rows].sort((a, b) => (b.comp.correlation ?? 0) - (a.comp.correlation ?? 0));
  return new Map(bySim.map((r, i) => [r.id, LETTERS.at(i) ?? "·"]));
}

const CONFIDENCE: Record<string, string> = { high: "text-positive", medium: "text-caution", low: "text-negative" };

/**
 * Read-only comps for a saved deal (property page and report): map, the numbers that came out,
 * and every comp with its adjusted price — using the choices and condition tags saved in the analyzer.
 */
export function SavedComps({ record, printAll = false }: { record: PropertyRecord; printAll?: boolean }) {
  const data = record.marketData;
  const hasSale = (data?.value?.comparables.length ?? 0) > 0;
  const hasRent = (data?.rent?.comparables.length ?? 0) > 0;
  const [mode, setMode] = useState<CompsMode>(hasSale ? "sale" : "rent");
  if (!data || (!hasSale && !hasRent)) return null;
  const modes: CompsMode[] = printAll ? ([hasSale && "sale", hasRent && "rent"].filter(Boolean) as CompsMode[]) : [mode];
  return (
    <div className="space-y-4">
      {!printAll && hasSale && hasRent && (
        <div className="inline-flex rounded-lg border p-0.5" role="tablist" aria-label="Comps">
          {(["sale", "rent"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded-md px-3 py-1.5 text-xs font-medium", mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}
            >
              {m === "sale" ? `Sales comps & ARV (${data.value!.comparables.length})` : `Rental comps (${data.rent!.comparables.length})`}
            </button>
          ))}
        </div>
      )}
      {modes.map((m) => (
        <CompsView key={m} record={record} mode={m} showTitle={printAll} />
      ))}
    </div>
  );
}

function CompsView({ record, mode, showTitle }: { record: PropertyRecord; mode: CompsMode; showTitle: boolean }) {
  const lookup = record.marketData!;
  const rent = mode === "rent";
  const subject: Subject = useMemo(() => {
    const f = {
      squareFeet: record.squareFeet ?? lookup.facts.squareFeet,
      bedrooms: record.bedrooms ?? lookup.facts.bedrooms,
      bathrooms: record.bathrooms ?? (lookup.facts.bathrooms != null ? String(lookup.facts.bathrooms) : null),
      yearBuilt: record.yearBuilt ?? lookup.facts.yearBuilt,
    };
    return rent ? perUnitSubject({ ...f, units: record.units }) : f;
  }, [record, lookup, rent]);
  const result = useMemo(() => {
    const saved = (rent ? record.rentAnalysis : record.arvAnalysis) ?? emptyArvAnalysis(mode);
    const comps = (rent ? lookup.rent?.comparables : lookup.value?.comparables) ?? [];
    const avm = rent ? lookup.rent?.perUnit ?? null : lookup.value?.estimate ?? null;
    return analyzeComps(subject, comps, saved.choices, saved.settings, avm, mode);
  }, [subject, record, lookup, rent, mode]);
  const letters = useMemo(() => compLetters(result.rows), [result.rows]);
  const rows = useMemo(() => [...result.rows].sort((a, b) => (letters.get(a.id) ?? "").localeCompare(letters.get(b.id) ?? "")), [result.rows, letters]);

  const per = rent ? "/mo" : "";
  const units = Math.max(1, record.units);
  const inDeal = rent ? dec(record.monthlyRent).div(units) : record.afterRepairValue ? dec(record.afterRepairValue) : null;
  const money = (v: D | null) => (v ? `${formatCurrency(v)}${per}` : "—");

  return (
    <section className="space-y-3 print:break-inside-avoid">
      {showTitle && <h3 className="text-sm font-semibold">{rent ? "Rental comps" : "Sales comps & ARV"}</h3>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label={rent ? "Comps say (rent per unit)" : "Comps say (ARV)"}
          value={money(result.recommended?.value ?? null)}
          sub={result.recommended?.basis}
        />
        <Stat
          label={rent ? "Rent per unit in this deal" : "ARV in this deal"}
          value={money(inDeal && inDeal.gt(0) ? inDeal : null)}
          sub={
            inDeal && inDeal.gt(0) && result.recommended
              ? (() => {
                  const gap = inDeal.minus(result.recommended.value);
                  return gap.isZero() ? "Same as the comps" : `${formatCurrency(gap.abs())} ${gap.isNegative() ? "below" : "above"} the comps`;
                })()
              : "Not set"
          }
        />
        <Stat
          label="Confidence"
          value={result.confidence.level[0].toUpperCase() + result.confidence.level.slice(1)}
          valueClass={CONFIDENCE[result.confidence.level]}
          sub={
            result.range
              ? `Middle half of adjusted ${rent ? "rents" : "prices"} ${money(result.range.low)} – ${money(result.range.high)}`
              : `${result.used} comp${result.used === 1 ? "" : "s"} in use`
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start print:static">
          <CompsMap lookup={lookup} rows={result.rows} letters={letters} priceSuffix={per} />
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Comp</th>
                <th className="hidden px-3 py-2 text-right font-medium sm:table-cell">Bd/Ba · Sq ft</th>
                <th className="px-3 py-2 text-right font-medium">{rent ? "Rent" : "Price"}</th>
                <th className="px-3 py-2 text-right font-medium text-foreground">Adjusted to yours</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const c = r.comp;
                const active = isActiveListing(c);
                return (
                  <tr key={r.id} className={cn(!r.included && "opacity-50")}>
                    <td className="max-w-60 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                            r.condition === "renovated" ? "bg-positive text-white" : "bg-series-1/15 text-series-1",
                          )}
                        >
                          {letters.get(r.id)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium" title={c.address}>
                            {c.address.split(",")[0]}
                          </div>
                          <div className="flex flex-wrap gap-x-1.5 text-[10px] text-muted-foreground">
                            <span className={cn(active && "text-caution")}>
                              {active ? (rent ? "Asking" : "For sale · asking") : rent ? "Leased" : "Likely sold"}
                              {c.date && ` ${new Date(c.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                            </span>
                            {c.distanceMiles != null && <span>· {c.distanceMiles.toFixed(2)} mi</span>}
                            {r.condition === "renovated" && <span className="text-positive">· Reno</span>}
                            {!r.included && <span>· not used</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num hidden px-3 py-2 text-right whitespace-nowrap text-muted-foreground sm:table-cell">
                      {c.bedrooms ?? "—"}/{c.bathrooms ?? "—"} · {c.squareFeet?.toLocaleString("en-US") ?? "—"}
                    </td>
                    <td className="num px-3 py-2 text-right whitespace-nowrap">{formatCurrency(dec(c.price))}</td>
                    <td className="num px-3 py-2 text-right font-semibold whitespace-nowrap">{formatCurrency(r.adjustedPrice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <MapPin className="mt-px size-3 shrink-0" />
        Adjusted = the comp&apos;s {rent ? "rent" : "price"} corrected for size, beds, baths and age so it compares with this property. Green letters are comps
        marked renovated. To change which comps count, open the deal&apos;s Comps panel in the analyzer.
      </p>
    </section>
  );
}

function Stat({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("num mt-0.5 text-lg font-semibold", valueClass)}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{sub}</div>}
    </div>
  );
}

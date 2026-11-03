"use client";

import { AlertTriangle, ChevronRight, Database, ListChecks } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InfoTip } from "@/components/common/info-tip";
import { METRICS, dec, formatCurrency } from "@/lib/finance";
import { propertyTypeLabel } from "@/lib/constants";
import type { Comparable, PropertyLookup } from "@/lib/property-data/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PropertyPhoto } from "./property-photo";

const money = (s: string | null | undefined) => (s ? formatCurrency(dec(s)) : "—");

function Tile({ label, value, sub, children, info }: { label: string; value: string; sub?: React.ReactNode; children?: React.ReactNode; info?: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border bg-background p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{label}{info}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-0.5 flex-1 text-[11px] leading-snug text-muted-foreground">{sub}</div>}
      {children}
    </div>
  );
}

/** Estimates, property facts and comps from an address lookup. Used live in the analyzer and as a stored snapshot. */
/** Big, obvious entry point into the Comps & ARV / Comps & Rent panels. */
function CompsButton({ count, kind, onClick }: { count: number; kind: "sale" | "rent"; onClick: () => void }) {
  return (
    <div className="mt-3 space-y-1">
      <Button type="button" onClick={onClick} className="w-full justify-between" size="lg">
        <span className="flex min-w-0 items-center gap-2">
          <ListChecks />
          <span className="truncate">{kind === "sale" ? "Comps & ARV" : "Rent comps"}</span>
        </span>
        <ChevronRight />
      </Button>
      <p className="text-center text-[11px] text-muted-foreground">
        {count} {kind === "sale" ? "comparable sales" : "rental comps"} · pick, adjust, apply
      </p>
    </div>
  );
}

export function MarketDataSummary({
  data,
  compact,
  onOpenComps,
}: {
  data: PropertyLookup;
  compact?: boolean;
  /** When given, the ARV and rent tiles get a button that opens the matching comps panel. */
  onOpenComps?: (mode: "sale" | "rent") => void;
}) {
  const saleComps = data.value?.comparables.length ?? 0;
  const rentComps = data.rent?.comparables.length ?? 0;
  const f = data.facts;
  const facts = [
    f.propertyType ? propertyTypeLabel(f.propertyType) : f.providerPropertyType,
    f.units > 1 ? `${f.units} units` : null,
    f.bedrooms !== null ? `${f.bedrooms} bd` : null,
    f.bathrooms !== null ? `${f.bathrooms} ba` : null,
    f.squareFeet ? `${f.squareFeet.toLocaleString("en-US")} sq ft` : null,
    f.yearBuilt ? `Built ${f.yearBuilt}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      {data.provider === "demo" && (
        <div className="flex items-start gap-2 rounded-lg border border-caution/40 bg-caution/10 px-3 py-2 text-xs font-medium text-caution">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          Demo mode: synthetic numbers for trying the feature — not real market data.
        </div>
      )}

      <div className="flex items-start gap-3">
        <PropertyPhoto location={photoLocation(data)} className="w-40 shrink-0" width={320} height={200} />
        <div className="min-w-0">
          <p className="text-sm font-medium">{data.address.formatted}</p>
          <p className="text-xs text-muted-foreground">{facts.join(" · ") || "No property details found"}</p>
        </div>
      </div>

      <div className={cn("grid gap-2", compact ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-3")}>
        <Tile
          label="As-is value"
          value={money(data.value?.estimate)}
          sub={data.value?.low && data.value.high ? `Range ${money(data.value.low)} – ${money(data.value.high)}` : "No estimate"}
        />
        <Tile label="ARV estimate" value={money(data.arv?.estimate)} sub={data.arv?.method ?? "Needs a value estimate"} info={<InfoTip metric={METRICS.afterRepairValue} />}>
          {onOpenComps && saleComps > 0 && <CompsButton kind="sale" count={saleComps} onClick={() => onOpenComps("sale")} />}
        </Tile>
        <Tile
          label={data.rent && data.rent.units > 1 ? `Rent (${data.rent.units} units)` : "Market rent"}
          value={
            data.rent
              ? `${money(data.rent.compsPerUnit ? dec(data.rent.compsPerUnit).times(Math.max(1, data.rent.units)).toString() : data.rent.total)}/mo`
              : "—"
          }
          sub={
            data.rent
              ? `${data.rent.compsPerUnit ? `From adjusted rental comps${data.rent.units > 1 ? ` (${money(data.rent.compsPerUnit)}/unit)` : ""} · RentCast estimate ${money(data.rent.perUnit)}` : `RentCast estimate`} · range ${money(data.rent.low)} – ${money(data.rent.high)}`
              : "No estimate"
          }
        >
          {onOpenComps && rentComps > 0 && <CompsButton kind="rent" count={rentComps} onClick={() => onOpenComps("rent")} />}
        </Tile>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <div><dt className="text-muted-foreground">Property tax</dt><dd className="num">{data.propertyTaxAnnual ? `${money(data.propertyTaxAnnual.amount)}/yr (${data.propertyTaxAnnual.year})` : "—"}</dd></div>
        <div><dt className="text-muted-foreground">HOA</dt><dd className="num">{data.hoaMonthly ? `${money(data.hoaMonthly)}/mo` : "None found"}</dd></div>
        <div><dt className="text-muted-foreground">Last sale</dt><dd className="num">{data.facts.lastSalePrice ? `${money(data.facts.lastSalePrice)}${data.facts.lastSaleDate ? ` (${data.facts.lastSaleDate.slice(0, 4)})` : ""}` : "—"}</dd></div>
        <div><dt className="text-muted-foreground">Source</dt><dd>{data.provider === "rentcast" ? "RentCast" : "Demo"} · {new Date(data.fetchedAt).toLocaleDateString("en-US")}{data.cached ? " (cached)" : ""}</dd></div>
      </dl>

      {data.warnings.filter((w) => !w.startsWith("DEMO")).length > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {data.warnings.filter((w) => !w.startsWith("DEMO")).map((w) => (
            <li key={w} className="flex gap-1.5"><AlertTriangle className="mt-px size-3 shrink-0 text-caution" />{w}</li>
          ))}
        </ul>
      )}

      {/* With the Comps buttons above, the full panels replace these lists; saved snapshots (no buttons) still show them. */}
      {!onOpenComps && data.value && data.value.comparables.length > 0 && <CompTable title="Comparable sales" comps={data.value.comparables} unit="" />}
      {!onOpenComps && data.rent && data.rent.comparables.length > 0 && <CompTable title="Comparable rentals" comps={data.rent.comparables} unit="/mo" />}

      <p className="text-[11px] text-muted-foreground">
        Automated estimates from public records and listings. They can be wrong. Check them against local comps, an appraisal, and a property manager&apos;s rent opinion.
      </p>
    </div>
  );
}

function CompTable({ title, comps, unit }: { title: string; comps: Comparable[]; unit: string }) {
  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-medium">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
        <Database className="size-3.5 text-muted-foreground" />
        {title} ({comps.length})
      </summary>
      <div className="overflow-x-auto border-t">
        <Table className="text-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Bd/Ba</TableHead>
              <TableHead className="text-right">Sq ft</TableHead>
              <TableHead className="text-right">$/sq ft</TableHead>
              <TableHead className="text-right">Distance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comps.map((c, i) => (
              <TableRow key={`${c.address}-${i}`} className="num">
                <TableCell className="max-w-56 truncate" title={c.address}>{c.address}</TableCell>
                <TableCell className="text-right">{money(c.price)}{unit}</TableCell>
                <TableCell className="text-right">{c.bedrooms ?? "—"}/{c.bathrooms ?? "—"}</TableCell>
                <TableCell className="text-right">{c.squareFeet?.toLocaleString("en-US") ?? "—"}</TableCell>
                <TableCell className="text-right">{c.squareFeet ? formatCurrency(dec(c.price).div(c.squareFeet), { cents: unit !== "" }) : "—"}</TableCell>
                <TableCell className="text-right">{c.distanceMiles !== null ? `${c.distanceMiles.toFixed(2)} mi` : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}

/** Coordinates aim the camera more precisely than an address string. */
export function photoLocation(d: PropertyLookup): string {
  const { latitude, longitude } = d.facts;
  return latitude != null && longitude != null ? `${latitude},${longitude}` : d.address.formatted;
}

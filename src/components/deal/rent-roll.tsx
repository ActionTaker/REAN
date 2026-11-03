"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/finance";
import { rentRollTotal, rollForUnits, type RentRollRow } from "@/lib/rent-roll";
import { NumberInput } from "./number-input";

/** Per-unit rents for 2+ unit properties. The total becomes the deal's monthly rent. */
export function RentRollEditor({
  rows: saved,
  units,
  onChange,
  onRemove,
}: {
  rows: RentRollRow[];
  units: number;
  onChange: (rows: RentRollRow[]) => void;
  onRemove: () => void;
}) {
  const rows = rollForUnits(saved, units);
  const set = (i: number, patch: Partial<RentRollRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-xs font-medium">Rent roll · {rows.length} units</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <X /> Use one total instead
        </Button>
      </div>
      <div className="divide-y">
        <div className="hidden grid-cols-[1fr_4.5rem_4.5rem_8rem] gap-2 px-3 py-1.5 text-[11px] text-muted-foreground sm:grid">
          <span>Unit</span><span>Beds</span><span>Baths</span><span>Rent / mo</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_8rem] gap-2 px-3 py-2 sm:grid-cols-[1fr_4.5rem_4.5rem_8rem]">
            <Input value={r.label} onChange={(e) => set(i, { label: e.target.value })} aria-label={`Unit ${i + 1} name`} className="h-8" />
            <div className="hidden sm:block"><NumberInput value={r.beds} onChange={(e) => set(i, { beds: e.target.value })} aria-label={`Unit ${i + 1} beds`} placeholder="bd" className="h-8" /></div>
            <div className="hidden sm:block"><NumberInput value={r.baths} onChange={(e) => set(i, { baths: e.target.value })} aria-label={`Unit ${i + 1} baths`} placeholder="ba" className="h-8" /></div>
            <NumberInput prefix="$" value={r.rent} onChange={(e) => set(i, { rent: e.target.value })} aria-label={`Unit ${i + 1} rent`} className="h-8" />
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t bg-muted/40 px-3 py-2 text-sm font-semibold">
        <span>Total monthly rent</span>
        <span className="num">{formatCurrency(rentRollTotal(rows))}</span>
      </div>
    </div>
  );
}

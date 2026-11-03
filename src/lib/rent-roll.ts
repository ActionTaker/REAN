import { D, ZERO, dec } from "@/lib/finance/decimal";

/** One unit of a 2+ unit property's rent roll (strings, as typed). */
export interface RentRollRow {
  label: string;
  beds: string;
  baths: string;
  rent: string;
}

const clean = (s: string) => (s ?? "").replace(/[,$\s]/g, "");

/** The roll sized to the unit count: saved rows first, blanks for the rest. */
export function rollForUnits(saved: RentRollRow[] | null, units: number): RentRollRow[] {
  const n = Math.max(1, Math.min(units, 50));
  return Array.from({ length: n }, (_, i) => saved?.[i] ?? { label: `Unit ${i + 1}`, beds: "", baths: "", rent: "" });
}

export function rentRollTotal(rows: RentRollRow[]): D {
  return rows.reduce((t, r) => {
    const v = clean(r.rent);
    return /^\d*\.?\d*$/.test(v) && v !== "" && v !== "." ? t.plus(dec(v)) : t;
  }, ZERO);
}

/** Start a roll by splitting the current total evenly. */
export function seedRentRoll(totalRent: string, units: number): RentRollRow[] {
  const n = Math.max(1, Math.min(units, 50));
  const total = clean(totalRent);
  const each = total && /^\d*\.?\d*$/.test(total) ? dec(total).div(n).toDecimalPlaces(0) : null;
  return rollForUnits(null, n).map((r) => ({ ...r, rent: each && each.gt(0) ? each.toString() : "" }));
}

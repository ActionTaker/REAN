import { D, dec } from "./decimal";
import { analyzeDeal } from "./analysis";
import { maxPriceFor, type MaxPriceResult } from "./solver";
import type { DealInputs } from "./types";

/**
 * Plain-language "what if things go wrong" checks. Each scenario changes one
 * assumption by an amount that commonly happens in practice; "combined" applies
 * them all at once.
 */
interface Scenario {
  key: string;
  label: string;
  /** Skip when the scenario can't apply (e.g. rate shock on an all-cash deal). */
  applies?: (i: DealInputs) => boolean;
  apply: (i: DealInputs) => DealInputs;
}

const times = (v: unknown, f: string) => dec(v as string).times(f).toString();

export const STRESS_SCENARIOS: Scenario[] = [
  { key: "rent", label: "Rent 10% lower", apply: (i) => ({ ...i, monthlyRent: times(i.monthlyRent, "0.9") }) },
  {
    key: "rate",
    label: "Interest rate 1 pt higher",
    applies: (i) => !i.isCashPurchase,
    apply: (i) => ({ ...i, interestRate: dec(i.interestRate).plus(1).toString() }),
  },
  { key: "vacancy", label: "Vacancy 3 pts higher", apply: (i) => ({ ...i, vacancyRate: dec(i.vacancyRate).plus(3).toString() }) },
  {
    key: "costs",
    label: "Taxes & insurance 20% higher",
    apply: (i) => ({ ...i, propertyTaxAnnual: times(i.propertyTaxAnnual, "1.2"), insuranceAnnual: times(i.insuranceAnnual, "1.2") }),
  },
  {
    key: "repairs",
    label: "Repairs & CapEx 50% higher",
    apply: (i) => ({ ...i, maintenancePercent: times(i.maintenancePercent, "1.5"), capexPercent: times(i.capexPercent, "1.5") }),
  },
];

export interface StressRow {
  key: string;
  label: string;
  monthlyCashFlow: D;
  cashOnCash: D | null;
}

export interface StressResult {
  base: StressRow;
  rows: StressRow[];
  combined: StressRow;
  /** Highest price that still breaks even with every scenario hitting at once. */
  combinedBreakEvenPrice: MaxPriceResult;
}

function row(key: string, label: string, i: DealInputs): StressRow {
  const a = analyzeDeal(i, { yearOneOnly: true });
  return { key, label, monthlyCashFlow: a.monthlyCashFlow, cashOnCash: a.cashOnCash };
}

export function stressTest(input: DealInputs): StressResult {
  const active = STRESS_SCENARIOS.filter((s) => s.applies?.(input) ?? true);
  const combinedInputs = active.reduce((acc, s) => s.apply(acc), input);
  return {
    base: row("base", "As entered", input),
    rows: active.map((s) => row(s.key, s.label, s.apply(input))),
    combined: row("combined", "All of the above at once", combinedInputs),
    combinedBreakEvenPrice: maxPriceFor(combinedInputs, { kind: "cashFlow", minMonthly: dec(0) }),
  };
}

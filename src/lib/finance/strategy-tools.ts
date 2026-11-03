import { D, dec, pct, type DecimalLike } from "./decimal";
import { maxPriceWhere, type MaxPriceResult } from "./solver";
import { analyzeBrrrr, analyzeFlip, type StrategyInputs } from "./strategies";
import type { DealInputs } from "./types";

/** Max offer + stress tests for BRRRR and Flip (Buy & Hold uses solver.ts / stress.ts). */

export function brrrrMaxPrice(input: DealInputs, s: StrategyInputs, maxCashLeft: DecimalLike): MaxPriceResult {
  const cap = dec(maxCashLeft);
  return maxPriceWhere(input, (i) => analyzeBrrrr(i, s, { yearOneOnly: true }).cashLeftInDeal.lte(cap));
}

export function flipMaxPriceForProfit(input: DealInputs, s: StrategyInputs, minProfit: DecimalLike): MaxPriceResult {
  const floor = dec(minProfit);
  return maxPriceWhere(input, (i) => analyzeFlip(i, s).profit.gte(floor));
}

export function flipMaxPriceForRoi(input: DealInputs, s: StrategyInputs, minRoiPercent: DecimalLike): MaxPriceResult {
  const floor = pct(minRoiPercent);
  return maxPriceWhere(input, (i) => {
    const r = analyzeFlip(i, s).roi;
    return r !== null && r.gte(floor);
  });
}


// ─── Stress tests ─────────────────────────────────────────────────────────

interface Shock {
  key: string;
  label: string;
  apply: (i: DealInputs, s: StrategyInputs) => [DealInputs, StrategyInputs];
}

const times = (v: unknown, f: string) => dec(v as string).times(f).toString();
const plusMonths = (s: StrategyInputs, n: number): StrategyInputs => ({ ...s, holdMonths: dec(s.holdMonths).plus(n).toString() });

const BRRRR_SHOCKS: Shock[] = [
  { key: "arv", label: "ARV 10% lower (smaller refinance)", apply: (i, s) => [{ ...i, afterRepairValue: times(i.afterRepairValue, "0.9") }, s] },
  { key: "rehab", label: "Rehab 20% over budget", apply: (i, s) => [{ ...i, rehabCosts: times(i.rehabCosts, "1.2") }, s] },
  { key: "hold", label: "Takes 3 months longer", apply: (i, s) => [i, plusMonths(s, 3)] },
  { key: "rate", label: "Refinance rate 1 pt higher", apply: (i, s) => [i, { ...s, refi: { ...s.refi, rate: dec(s.refi.rate).plus(1).toString() } }] },
  { key: "rent", label: "Rent 10% lower", apply: (i, s) => [{ ...i, monthlyRent: times(i.monthlyRent, "0.9") }, s] },
];

const FLIP_SHOCKS: Shock[] = [
  {
    key: "sale",
    label: "Sells for 10% less",
    apply: (i, s) => {
      const base = dec(s.flip.salePrice).gt(0) ? dec(s.flip.salePrice) : dec(i.afterRepairValue).gt(0) ? dec(i.afterRepairValue) : null;
      return base ? [i, { ...s, flip: { ...s.flip, salePrice: base.times("0.9").toString() } }] : [i, s];
    },
  },
  { key: "rehab", label: "Rehab 20% over budget", apply: (i, s) => [{ ...i, rehabCosts: times(i.rehabCosts, "1.2") }, s] },
  { key: "hold", label: "Takes 3 months longer", apply: (i, s) => [i, plusMonths(s, 3)] },
];

export interface BrrrrStressRow { key: string; label: string; cashLeftInDeal: D; monthlyCashFlow: D }
export interface FlipStressRow { key: string; label: string; profit: D; roi: D | null }

function run<T>(shocks: Shock[], input: DealInputs, s: StrategyInputs, row: (key: string, label: string, i: DealInputs, s: StrategyInputs) => T) {
  const rows = shocks.map((sh) => {
    const [i2, s2] = sh.apply(input, s);
    return row(sh.key, sh.label, i2, s2);
  });
  const [ci, cs] = shocks.reduce<[DealInputs, StrategyInputs]>((acc, sh) => sh.apply(acc[0], acc[1]), [input, s]);
  return { rows, combined: row("combined", "All of the above at once", ci, cs), combinedInputs: [ci, cs] as const };
}

export function brrrrStress(input: DealInputs, s: StrategyInputs) {
  const mk = (key: string, label: string, i: DealInputs, st: StrategyInputs): BrrrrStressRow => {
    const b = analyzeBrrrr(i, st, { yearOneOnly: true });
    return { key, label, cashLeftInDeal: b.cashLeftInDeal, monthlyCashFlow: b.rental.monthlyCashFlow };
  };
  const base = mk("base", "As entered", input, s);
  const { rows, combined } = run(BRRRR_SHOCKS, input, s, mk);
  return { base, rows, combined };
}

export function flipStress(input: DealInputs, s: StrategyInputs) {
  const mk = (key: string, label: string, i: DealInputs, st: StrategyInputs): FlipStressRow => {
    const f = analyzeFlip(i, st);
    return { key, label, profit: f.profit, roi: f.roi };
  };
  const base = mk("base", "As entered", input, s);
  const { rows, combined, combinedInputs } = run(FLIP_SHOCKS, input, s, mk);
  // Highest price that still breaks even if everything goes wrong at once.
  const breakEvenPrice = flipMaxPriceForProfit(combinedInputs[0], combinedInputs[1], 0);
  return { base, rows, combined, breakEvenPrice };
}

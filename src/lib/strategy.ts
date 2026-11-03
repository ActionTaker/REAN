import { DEFAULT_STRATEGY_INPUTS, type StrategyInputs } from "@/lib/finance/strategies";

/** Client-safe strategy config: labels, saved-input shape and per-strategy goals. */

export const STRATEGIES = [
  { value: "BUY_HOLD", label: "Buy & Hold", short: "Rent it out long term", description: "Monthly cash flow, returns and long-term equity." },
  { value: "BRRRR", label: "BRRRR", short: "Buy, rehab, rent, refinance", description: "Pull your cash back out with a refinance, then keep renting." },
  { value: "FLIP", label: "Flip", short: "Buy, rehab, sell", description: "Profit and return from reselling after repairs." },
] as const;

export type StrategyValue = (typeof STRATEGIES)[number]["value"];

export const strategyLabel = (v: string) => STRATEGIES.find((s) => s.value === v)?.label ?? "Buy & Hold";

type Goal = { enabled: boolean; target: string };

export interface StrategyGoals {
  brrrr: { cashLeft: Goal; cashFlow: Goal; dscr: Goal; seventy: { enabled: boolean } };
  flip: { profit: Goal; roi: Goal; seventy: { enabled: boolean } };
}

/** Saved shape (strings, as typed). */
export interface SavedStrategyInputs {
  holdMonths: string;
  holdingUtilitiesMonthly: string;
  acquisition: { type: "cash" | "hardMoney" | "conventional"; loanToCostPct: string; rehabFinancedPct: string; rate: string; pointsPct: string };
  refi: { ltvPct: string; rate: string; termYears: string; closingPct: string };
  flip: { salePrice: string; sellingCostPct: string };
  goals: StrategyGoals;
}

export function defaultStrategyInputs(minDscr = "1.25"): SavedStrategyInputs {
  const d = DEFAULT_STRATEGY_INPUTS;
  return {
    holdMonths: String(d.holdMonths),
    holdingUtilitiesMonthly: String(d.holdingUtilitiesMonthly),
    acquisition: {
      type: d.acquisition.type,
      loanToCostPct: String(d.acquisition.loanToCostPct),
      rehabFinancedPct: String(d.acquisition.rehabFinancedPct),
      rate: String(d.acquisition.rate),
      pointsPct: String(d.acquisition.pointsPct),
    },
    refi: { ltvPct: String(d.refi.ltvPct), rate: String(d.refi.rate), termYears: String(d.refi.termYears), closingPct: String(d.refi.closingPct) },
    flip: { salePrice: "", sellingCostPct: String(d.flip.sellingCostPct) },
    goals: {
      brrrr: {
        cashLeft: { enabled: true, target: "0" },
        cashFlow: { enabled: true, target: "0" },
        dscr: { enabled: true, target: minDscr },
        seventy: { enabled: false },
      },
      flip: { profit: { enabled: true, target: "30000" }, roi: { enabled: true, target: "20" }, seventy: { enabled: true } },
    },
  };
}

/** Saved inputs merged over defaults (so fields added later still have values). */
export function resolveStrategyInputs(saved: Partial<SavedStrategyInputs> | null | undefined, minDscr?: string): SavedStrategyInputs {
  const d = defaultStrategyInputs(minDscr);
  if (!saved) return d;
  return {
    ...d,
    ...saved,
    acquisition: { ...d.acquisition, ...saved.acquisition },
    refi: { ...d.refi, ...saved.refi },
    flip: { ...d.flip, ...saved.flip },
    goals: {
      brrrr: { ...d.goals.brrrr, ...saved.goals?.brrrr },
      flip: { ...d.goals.flip, ...saved.goals?.flip },
    },
  };
}

/** Saved strings → engine inputs (invalid numbers become 0 inside the engine). */
export function toEngineInputs(s: SavedStrategyInputs): StrategyInputs {
  return {
    holdMonths: s.holdMonths || "0",
    holdingUtilitiesMonthly: s.holdingUtilitiesMonthly || "0",
    acquisition: { ...s.acquisition },
    refi: { ltvPct: s.refi.ltvPct || "0", rate: s.refi.rate || "0", termYears: parseInt(s.refi.termYears, 10) || 30, closingPct: s.refi.closingPct || "0" },
    flip: { salePrice: s.flip.salePrice.replace(/[,$\s]/g, "") || null, sellingCostPct: s.flip.sellingCostPct || "0" },
  };
}

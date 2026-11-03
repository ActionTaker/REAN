import {
  analyzeBrrrr,
  analyzeDeal,
  analyzeFlip,
  type BrrrrAnalysis,
  type DealAnalysis,
  type DealRating,
  type FlipAnalysis,
  type InvestmentCriteria,
} from "@/lib/finance";
import { rateAgainstGoals, resolveOfferGoals } from "@/lib/offer-goals";
import { recordToInputs, type PropertyRecord } from "@/lib/property-mapping";
import { resolveStrategyInputs, toEngineInputs, type StrategyValue } from "@/lib/strategy";
import { rateStrategy, strategyChecks } from "@/lib/strategy-rating";

export interface AnalyzedProperty {
  record: PropertyRecord;
  strategy: StrategyValue;
  /**
   * The rental view of the deal: Buy & Hold as entered; BRRRR after the refinance
   * (returns on cash left in the deal). For flips it's only a placeholder — use `flip`.
   */
  analysis: DealAnalysis;
  rating: DealRating;
  brrrr?: BrrrrAnalysis;
  flip?: FlipAnalysis;
}

export function analyzeRecords(records: PropertyRecord[], criteria: InvestmentCriteria): AnalyzedProperty[] {
  return records.map((record) => {
    const inputs = recordToInputs(record);
    const strategy = record.strategy ?? "BUY_HOLD";
    if (strategy === "BUY_HOLD") {
      const analysis = analyzeDeal(inputs);
      // Each deal is rated against its own goals (falling back to Settings criteria).
      return { record, strategy, analysis, rating: rateAgainstGoals(analysis, resolveOfferGoals(record.offerGoals, criteria)).rating };
    }
    const saved = resolveStrategyInputs(record.strategyInputs, String(criteria.minDscr));
    const engine = toEngineInputs(saved);
    const brrrr = strategy === "BRRRR" ? analyzeBrrrr(inputs, engine) : undefined;
    const flip = strategy === "FLIP" ? analyzeFlip(inputs, engine) : undefined;
    const checks = strategyChecks(strategy, saved.goals, { brrrr, flip }, inputs);
    return { record, strategy, analysis: brrrr?.rental ?? analyzeDeal(inputs), rating: rateStrategy(strategy, checks, { brrrr, flip }), brrrr, flip };
  });
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

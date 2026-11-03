import { analyzeDeal, type DealAnalysis, type DealRating, type InvestmentCriteria } from "@/lib/finance";
import { rateAgainstGoals, resolveOfferGoals } from "@/lib/offer-goals";
import { recordToInputs, type PropertyRecord } from "@/lib/property-mapping";

export interface AnalyzedProperty {
  record: PropertyRecord;
  analysis: DealAnalysis;
  rating: DealRating;
}

export function analyzeRecords(records: PropertyRecord[], criteria: InvestmentCriteria): AnalyzedProperty[] {
  return records.map((record) => {
    const analysis = analyzeDeal(recordToInputs(record));
    // Each deal is rated against its own goals (falling back to Settings criteria).
    return { record, analysis, rating: rateAgainstGoals(analysis, resolveOfferGoals(record.offerGoals, criteria)).rating };
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

import { D, dec, type DecimalLike } from "@/lib/finance/decimal";
import { benchmarkFor } from "./state-data";

/** U.S.-average cost to rebuild a house, per sq ft, before the regional factor. */
const REBUILD_PER_SQFT = 175;
/** Landlord (DP-3) policies typically run above an owner-occupied HO-3. */
const LANDLORD_FACTOR = "1.15";
const BENCHMARK_DWELLING = 300_000;

export interface CostEstimate {
  amount: D;
  /** Human-readable derivation shown under the field. */
  basis: string;
}

const usd = (v: D) => `$${v.toDecimalPlaces(0).toNumber().toLocaleString("en-US")}`;

/**
 * Annual landlord insurance. The state's average premium is quoted for $300k of
 * dwelling coverage, so it's scaled by this home's estimated rebuild cost
 * (sq ft × regional rebuild $/sq ft), falling back to 70% of price.
 */
export function estimateInsurance(input: { state?: string | null; squareFeet?: number | null; price?: DecimalLike | null }): CostEstimate | null {
  const { code, data } = benchmarkFor(input.state);
  const price = dec(input.price);
  let dwelling: D;
  let dwellingBasis: string;
  if (input.squareFeet && input.squareFeet > 0) {
    dwelling = dec(input.squareFeet).times(REBUILD_PER_SQFT).times(data.costIndex);
    dwellingBasis = `${input.squareFeet.toLocaleString("en-US")} sq ft rebuild`;
  } else if (price.gt(0)) {
    dwelling = price.times("0.7");
    dwellingBasis = "70% of price";
  } else {
    return null;
  }
  const amount = dec(data.insurance).times(dwelling.div(BENCHMARK_DWELLING)).times(LANDLORD_FACTOR).div(10).toDecimalPlaces(0).times(10);
  return {
    amount,
    basis: `${code ?? "U.S."} avg ${usd(dec(data.insurance))}/yr per $300k × ${usd(dwelling)} coverage (${dwellingBasis}) × 1.15 landlord`,
  };
}

/** Buyer closing costs from the state's average share of purchase price. */
export function estimateClosingCosts(input: { state?: string | null; price?: DecimalLike | null }): CostEstimate | null {
  const price = dec(input.price);
  if (price.lte(0)) return null;
  const { code, data } = benchmarkFor(input.state);
  const amount = price.times(data.closingPct).div(100).div(10).toDecimalPlaces(0).times(10);
  return { amount, basis: `${code ?? "U.S."} avg ${data.closingPct}% of price` };
}

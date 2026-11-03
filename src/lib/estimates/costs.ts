import { D, dec, type DecimalLike } from "@/lib/finance/decimal";
import { NATIONAL_PROPERTY_TAX_PCT, PROPERTY_TAX_PCT, benchmarkFor } from "./state-data";

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

/** Annual property tax from the state's effective rate on owner-occupied homes × purchase price. */
export function estimatePropertyTax(input: { state?: string | null; price?: DecimalLike | null }): CostEstimate | null {
  const price = dec(input.price);
  if (price.lte(0)) return null;
  const code = input.state?.toUpperCase() ?? null;
  const known = code ? PROPERTY_TAX_PCT[code] : undefined;
  const rate = known ?? NATIONAL_PROPERTY_TAX_PCT;
  const amount = price.times(rate).div(100).div(10).toDecimalPlaces(0).times(10);
  // The average is across all owners. Where assessments reset at sale (California's Prop 13), a new
  // buyer pays the 1% base rate on the price plus local levies — more than this average.
  const note = code === "CA" ? " — new CA buyers pay a 1% base rate on the price plus local levies, so expect more" : "";
  return { amount, basis: `${known ? code : "U.S."} avg effective rate ${rate}% × purchase price${note}` };
}

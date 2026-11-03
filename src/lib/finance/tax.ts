import { D, ZERO, dec, pct, type DecimalLike } from "./decimal";
import type { DealAnalysis } from "./types";

/**
 * Simplified federal after-tax view of a rental: straight-line residential
 * depreciation (27.5 years) and the mortgage-interest deduction. Ignores the
 * mid-month convention, passive-loss limits, state tax and depreciation
 * recapture — it's an estimate to discuss with a tax professional.
 */

export const RESIDENTIAL_RECOVERY_YEARS = "27.5";

export interface TaxAssumptions {
  /** Marginal income tax rate, %. */
  taxRatePct: DecimalLike;
  /** Share of the purchase price that is the building (land isn't depreciable), %. */
  buildingValuePct: DecimalLike;
}

export const DEFAULT_TAX_ASSUMPTIONS: TaxAssumptions = { taxRatePct: "24", buildingValuePct: "80" };

export interface AfterTaxYear {
  year: number;
  noi: D;
  interest: D;
  depreciation: D;
  /** NOI − interest − depreciation. Negative = a paper loss. */
  taxableIncome: D;
  /** Tax owed (negative = tax saved, if the loss is usable). */
  tax: D;
  cashFlow: D;
  afterTaxCashFlow: D;
}

export interface AfterTaxAnalysis {
  depreciableBasis: D;
  annualDepreciation: D;
  years: AfterTaxYear[];
  yearOne: AfterTaxYear;
  /** Year-1 after-tax cash flow ÷ cash invested. */
  afterTaxCashOnCash: D | null;
}

export function analyzeAfterTax(a: DealAnalysis, t: TaxAssumptions): AfterTaxAnalysis {
  // Land isn't depreciable; closing costs are added to the basis and split the same way. Rehab is a capital improvement on the building.
  const depreciableBasis = a.purchasePrice.plus(a.closingCosts).times(pct(t.buildingValuePct)).plus(a.rehabCosts);
  const annualDepreciation = depreciableBasis.div(RESIDENTIAL_RECOVERY_YEARS);
  const rate = pct(t.taxRatePct);
  const recoveryYears = dec(RESIDENTIAL_RECOVERY_YEARS);
  const years = a.projections.map((p) => {
    // The final partial year of the 27.5-year schedule gets the remaining half year.
    const remaining = D.max(recoveryYears.minus(p.year - 1), ZERO);
    const depreciation = annualDepreciation.times(D.min(remaining, 1));
    const taxableIncome = p.noi.minus(p.interestPaid).minus(depreciation);
    const tax = taxableIncome.times(rate);
    return { year: p.year, noi: p.noi, interest: p.interestPaid, depreciation, taxableIncome, tax, cashFlow: p.cashFlow, afterTaxCashFlow: p.cashFlow.minus(tax) };
  });
  const yearOne = years[0] ?? {
    year: 1, noi: a.annualNOI, interest: ZERO, depreciation: annualDepreciation, taxableIncome: ZERO, tax: ZERO, cashFlow: a.annualCashFlow, afterTaxCashFlow: a.annualCashFlow,
  };
  return {
    depreciableBasis,
    annualDepreciation,
    years,
    yearOne,
    afterTaxCashOnCash: a.totalCashInvested.gt(0) ? yearOne.afterTaxCashFlow.div(a.totalCashInvested) : null,
  };
}

import { D, ONE, TWELVE, ZERO, dec, pct, safeDiv, type DecimalLike } from "./decimal";
import { monthlyPayment } from "./mortgage";

/**
 * ADU (accessory dwelling unit) add-on: what it costs to build, what it rents
 * for, what it does to cash flow, and how much value/equity it creates.
 * A scenario on top of a deal — the deal's own analysis is left unchanged.
 * Pure, decimal-only.
 */

export type AduType = "detached" | "attached" | "garage" | "jadu";

export const ADU_TYPES: { value: AduType; label: string; description: string; costPerSqft: number; softCosts: number }[] = [
  // Rough U.S.-average all-in construction $/sq ft and fixed soft costs (design, permits, utility hookups).
  // Ranges vary widely by market and finish — every figure is editable and labelled as an estimate.
  { value: "detached", label: "Detached (new build)", description: "Stand-alone backyard cottage", costPerSqft: 300, softCosts: 30000 },
  { value: "attached", label: "Attached addition", description: "Built onto the main house", costPerSqft: 250, softCosts: 25000 },
  { value: "garage", label: "Garage conversion", description: "Existing garage turned into a unit", costPerSqft: 175, softCosts: 15000 },
  { value: "jadu", label: "Junior ADU (JADU)", description: "Unit carved out inside the house (≤500 sq ft)", costPerSqft: 125, softCosts: 10000 },
];

export interface AduInputs {
  type: AduType;
  squareFeet: DecimalLike;
  /** Construction cost per sq ft (before the soft costs). */
  costPerSqft: DecimalLike;
  /** Design, permits, impact fees, utility connections. */
  softCosts: DecimalLike;
  /** Monthly rent for the ADU. */
  monthlyRent: DecimalLike;
  /** Cash, or a loan (HELOC / construction-to-perm) for part of the cost. */
  financing: { type: "cash" | "loan"; financedPct: DecimalLike; rate: DecimalLike; termYears: number };
  /** Months of construction with no ADU rent. */
  buildMonths: DecimalLike;
}

/** The host deal's numbers the ADU math needs. */
export interface AduContext {
  /** Vacancy and the %-of-rent expenses are taken from the deal. */
  vacancyRate: DecimalLike;
  maintenancePercent: DecimalLike;
  capexPercent: DecimalLike;
  managementPercent: DecimalLike;
  /** Cap rate used to value the ADU's extra income (decimal, e.g. 0.06). */
  capRate: DecimalLike;
  /** Effective property tax rate (%) applied to the value added. */
  propertyTaxPct: DecimalLike;
  /** Deal monthly cash flow without the ADU (for the before/after view). */
  baseMonthlyCashFlow: DecimalLike;
}

export interface AduAnalysis {
  constructionCost: D;
  totalCost: D;
  loanAmount: D;
  cashInvested: D;
  monthlyPayment: D;
  // Income & expenses (monthly)
  grossRent: D;
  vacancyLoss: D;
  operatingExpenses: D;
  addedPropertyTax: D;
  addedInsurance: D;
  monthlyNOI: D;
  monthlyCashFlow: D;
  annualCashFlow: D;
  /** Annual cash flow ÷ cash invested in the ADU. Null when no cash went in. */
  cashOnCash: D | null;
  /** Years of ADU cash flow to earn back the cash invested. */
  paybackYears: D | null;
  // Value
  valueAdded: D;
  equityCreated: D;
  /** Equity created ÷ total cost. */
  returnOnCost: D | null;
  /** Deal cash flow with the ADU. */
  combinedMonthlyCashFlow: D;
  /** Construction $/sq ft at which equity created is exactly zero (null if even $0/sq ft can't break even). */
  breakEvenCostPerSqft: D | null;
}

/** Insurance for the added structure, as % of its construction cost per year (rough). */
export const ADU_INSURANCE_PCT = "0.35";

export function analyzeAdu(a: AduInputs, ctx: AduContext): AduAnalysis {
  const constructionCost = dec(a.squareFeet).times(dec(a.costPerSqft));
  const totalCost = constructionCost.plus(dec(a.softCosts));
  const loanAmount = a.financing.type === "loan" ? totalCost.times(D.min(pct(a.financing.financedPct), ONE)) : ZERO;
  const payment = monthlyPayment(loanAmount, a.financing.rate, a.financing.termYears);
  // Interest-only carry while it's being built, then the cash you put in.
  const buildMonths = D.max(dec(a.buildMonths), ZERO);
  const constructionInterest = loanAmount.times(pct(a.financing.rate)).div(TWELVE).times(buildMonths);
  const cashInvested = totalCost.minus(loanAmount).plus(constructionInterest);

  const grossRent = dec(a.monthlyRent);
  const vacancyLoss = grossRent.times(pct(ctx.vacancyRate));
  const collected = grossRent.minus(vacancyLoss);
  const operatingExpenses = grossRent
    .times(pct(ctx.maintenancePercent).plus(pct(ctx.capexPercent)))
    .plus(collected.times(pct(ctx.managementPercent)));

  // Value first (income approach), then the property tax that value brings.
  // NOI before the added tax/insurance is what the market capitalizes; tax/insurance are then charged on it.
  const capRate = dec(ctx.capRate);
  const preTaxNoi = collected.minus(operatingExpenses);
  const addedInsurance = constructionCost.times(pct(ADU_INSURANCE_PCT)).div(TWELVE);
  // Solve value = 12·(preTaxNoi − insurance − value·taxRate/12) / capRate  →  value = 12·(preTaxNoi − insurance) / (capRate + taxRate)
  const taxRate = pct(ctx.propertyTaxPct);
  const denom = capRate.plus(taxRate);
  const valueAdded = denom.gt(0) ? D.max(preTaxNoi.minus(addedInsurance).times(TWELVE).div(denom), ZERO) : ZERO;
  const addedPropertyTax = valueAdded.times(taxRate).div(TWELVE);

  // Equity = 0 ⇔ (12·preTaxNoi − c·sqft·k) / denom = c·sqft + soft, k = insurance rate  →  c = (12·preTaxNoi − soft·denom) / (sqft·(denom + k))
  const sqft = dec(a.squareFeet);
  const k = pct(ADU_INSURANCE_PCT);
  const breakEven = denom.gt(0) && sqft.gt(0) ? preTaxNoi.times(TWELVE).minus(dec(a.softCosts).times(denom)).div(sqft.times(denom.plus(k))) : null;

  const monthlyNOI = preTaxNoi.minus(addedInsurance).minus(addedPropertyTax);
  const monthlyCashFlow = monthlyNOI.minus(payment);
  const annualCashFlow = monthlyCashFlow.times(TWELVE);
  return {
    constructionCost,
    totalCost,
    loanAmount,
    cashInvested,
    monthlyPayment: payment,
    grossRent,
    vacancyLoss,
    operatingExpenses,
    addedPropertyTax,
    addedInsurance,
    monthlyNOI,
    monthlyCashFlow,
    annualCashFlow,
    cashOnCash: cashInvested.gt(0) ? annualCashFlow.div(cashInvested) : null,
    paybackYears: annualCashFlow.gt(0) && cashInvested.gt(0) ? cashInvested.div(annualCashFlow) : null,
    valueAdded,
    equityCreated: valueAdded.minus(totalCost),
    returnOnCost: safeDiv(valueAdded.minus(totalCost), totalCost),
    combinedMonthlyCashFlow: dec(ctx.baseMonthlyCashFlow).plus(monthlyCashFlow),
    breakEvenCostPerSqft: breakEven && breakEven.gt(0) ? breakEven : null,
  };
}

/** ADU rent suggestion: the main unit's rent per sq ft, with a 10% small-unit premium (smaller units rent for more per sq ft). */
export function suggestAduRent(mainRent: DecimalLike, mainSqft: number | null, aduSqft: DecimalLike): D | null {
  if (!mainSqft || mainSqft <= 0 || !dec(mainRent).gt(0) || !dec(aduSqft).gt(0)) return null;
  return dec(mainRent).div(mainSqft).times(dec(aduSqft)).times("1.1").div(25).toDecimalPlaces(0).times(25);
}

/** Cost/sq ft default for a type, scaled by the state construction-cost factor. */
export function defaultAduCostPerSqft(type: AduType, costIndex: DecimalLike): D {
  const t = ADU_TYPES.find((x) => x.value === type) ?? ADU_TYPES[0];
  return dec(t.costPerSqft).times(dec(costIndex)).div(5).toDecimalPlaces(0).times(5);
}

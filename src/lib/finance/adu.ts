import { D, ONE, TWELVE, ZERO, dec, pct, safeDiv, type DecimalLike } from "./decimal";
import { monthlyPayment } from "./mortgage";
import type { DealAnalysis } from "./types";

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
  /** Repairs, CapEx reserve and management, itemized (they sum to operatingExpenses). */
  maintenance: D;
  capex: D;
  management: D;
  operatingExpenses: D;
  /** NOI before the added insurance and property tax. */
  preTaxNoi: D;
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
  const maintenance = grossRent.times(pct(ctx.maintenancePercent));
  const capex = grossRent.times(pct(ctx.capexPercent));
  const management = collected.times(pct(ctx.managementPercent));
  const operatingExpenses = maintenance.plus(capex).plus(management);

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
    maintenance,
    capex,
    management,
    operatingExpenses,
    preTaxNoi,
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

/** One column of the without / ADU only / together comparison. */
export interface AduScenarioColumn {
  monthlyCashFlow: D;
  annualNOI: D;
  cashInvested: D;
  /** Annual cash flow ÷ cash invested. */
  cashOnCash: D | null;
  /** Equity created (ARV − project cost for the house; value added − build cost for the ADU). Null when the house has no ARV. */
  equityCreated: D | null;
  /** NOI ÷ debt service, when there's debt. */
  dscr: D | null;
}

/** The deal without the ADU, the ADU on its own, and both together — every figure summed in decimals. */
export function compareWithAdu(base: DealAnalysis, adu: AduAnalysis): { without: AduScenarioColumn; aduOnly: AduScenarioColumn; together: AduScenarioColumn } {
  const aduDebt = adu.monthlyPayment.times(TWELVE);
  const without: AduScenarioColumn = {
    monthlyCashFlow: base.monthlyCashFlow,
    annualNOI: base.annualNOI,
    cashInvested: base.totalCashInvested,
    cashOnCash: base.cashOnCash,
    equityCreated: base.equityCreated,
    dscr: base.dscr,
  };
  const aduOnly: AduScenarioColumn = {
    monthlyCashFlow: adu.monthlyCashFlow,
    annualNOI: adu.monthlyNOI.times(TWELVE),
    cashInvested: adu.cashInvested,
    cashOnCash: adu.cashOnCash,
    equityCreated: adu.equityCreated,
    dscr: aduDebt.gt(0) ? adu.monthlyNOI.times(TWELVE).div(aduDebt) : null,
  };
  const cash = without.cashInvested.plus(aduOnly.cashInvested);
  const noi = without.annualNOI.plus(aduOnly.annualNOI);
  const debt = base.annualDebtService.plus(aduDebt);
  const monthly = without.monthlyCashFlow.plus(aduOnly.monthlyCashFlow);
  const together: AduScenarioColumn = {
    monthlyCashFlow: monthly,
    annualNOI: noi,
    cashInvested: cash,
    cashOnCash: safeDiv(monthly.times(TWELVE), cash),
    // Without an ARV the house has no equity figure; the ADU's still counts on its own.
    equityCreated: (base.equityCreated ?? ZERO).plus(adu.equityCreated),
    dscr: debt.gt(0) ? noi.div(debt) : null,
  };
  return { without, aduOnly, together };
}

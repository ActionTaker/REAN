import { D, ONE, TWELVE, ZERO, dec, pct, safeDiv, type DecimalLike } from "./decimal";
import { analyzeDeal } from "./analysis";
import { monthlyPayment } from "./mortgage";
import type { DealAnalysis, DealInputs } from "./types";

/**
 * BRRRR and Flip on top of the Buy & Hold engine. Both share a
 * purchase-and-hold phase (buy, rehab, carry the property while it's vacant);
 * BRRRR then refinances and rents, a Flip sells. Pure, decimal-only.
 */

export type Strategy = "BUY_HOLD" | "BRRRR" | "FLIP";

export type AcquisitionType = "cash" | "hardMoney" | "conventional";

export interface StrategyInputs {
  /** Months from purchase until refinance (BRRRR) or sale closes (Flip). */
  holdMonths: DecimalLike;
  /** Owner-paid utilities while vacant/under rehab, per month. */
  holdingUtilitiesMonthly: DecimalLike;
  acquisition: {
    type: AcquisitionType;
    /** Hard money: % of purchase price lent. */
    loanToCostPct: DecimalLike;
    /** Hard money: % of the rehab budget the lender funds. */
    rehabFinancedPct: DecimalLike;
    /** Hard money: annual interest rate (interest-only). */
    rate: DecimalLike;
    /** Hard money: points (% of loan) paid at closing. */
    pointsPct: DecimalLike;
  };
  refi: {
    /** Cash-out refinance loan as % of ARV. */
    ltvPct: DecimalLike;
    rate: DecimalLike;
    termYears: number;
    /** Refinance closing costs as % of the new loan. */
    closingPct: DecimalLike;
  };
  flip: {
    /** Blank → ARV. */
    salePrice: DecimalLike | null;
    /** Agent commission + seller closing/transfer costs, % of sale price. */
    sellingCostPct: DecimalLike;
  };
}

export const DEFAULT_STRATEGY_INPUTS: StrategyInputs = {
  holdMonths: "6",
  holdingUtilitiesMonthly: "250",
  acquisition: { type: "hardMoney", loanToCostPct: "90", rehabFinancedPct: "100", rate: "11", pointsPct: "2" },
  refi: { ltvPct: "75", rate: "7.25", termYears: 30, closingPct: "2" },
  flip: { salePrice: null, sellingCostPct: "8" },
};

export interface HoldPhase {
  months: number;
  arv: D;
  /** ARV wasn't entered — purchase price + rehab was used instead. */
  arvMissing: boolean;
  loanAmount: D;
  /** Part of the loan that funds rehab (hard money draws). */
  rehabFinanced: D;
  points: D;
  monthlyPayment: D;
  interestPaid: D;
  principalPaid: D;
  /** Loan balance to pay off at refinance / sale. */
  payoff: D;
  monthlyHoldingCost: D;
  holdingCosts: D;
  /** Interest + points. */
  financingCosts: D;
  /** Down payment + closing + points + rehab the lender doesn't fund. */
  cashAtPurchase: D;
  /** Holding costs + loan payments during the hold, paid out of pocket. */
  cashDuringHold: D;
  totalCashIn: D;
  /** Price + closing + rehab + holding + interest + points. */
  allInCost: D;
}

/** Buy, rehab and carry the property for `holdMonths`. */
export function holdPhase(input: DealInputs, s: StrategyInputs): HoldPhase {
  const price = dec(input.purchasePrice);
  const closing = dec(input.closingCosts);
  const rehab = dec(input.rehabCosts);
  const months = Math.max(0, Math.round(dec(s.holdMonths).toNumber()));
  const arvIn = dec(input.afterRepairValue);
  const arvMissing = !arvIn.gt(0);
  const arv = arvMissing ? price.plus(rehab) : arvIn;

  let loanAmount = ZERO, rehabFinanced = ZERO, points = ZERO, payment = ZERO, interestPaid = ZERO, principalPaid = ZERO;
  const a = s.acquisition;
  if (a.type === "hardMoney") {
    rehabFinanced = rehab.times(D.min(pct(a.rehabFinancedPct), ONE));
    loanAmount = price.times(D.min(pct(a.loanToCostPct), ONE)).plus(rehabFinanced);
    points = loanAmount.times(pct(a.pointsPct));
    // Interest-only on the full loan from day one (conservative: real draws arrive over the rehab).
    payment = loanAmount.times(pct(a.rate)).div(TWELVE);
    interestPaid = payment.times(months);
  } else if (a.type === "conventional" && !input.isCashPurchase) {
    loanAmount = price.times(ONE.minus(D.min(pct(input.downPaymentPercent), ONE)));
    payment = monthlyPayment(loanAmount, input.interestRate, input.loanTermYears);
    const r = pct(input.interestRate).div(TWELVE);
    let bal = loanAmount;
    for (let m = 0; m < months && bal.gt(0); m++) {
      const i = bal.times(r);
      const p = D.min(payment.minus(i), bal);
      interestPaid = interestPaid.plus(i);
      principalPaid = principalPaid.plus(p);
      bal = bal.minus(p);
    }
  }
  const payoff = loanAmount.minus(principalPaid);

  const monthlyHoldingCost = dec(input.propertyTaxAnnual)
    .plus(dec(input.insuranceAnnual))
    .div(TWELVE)
    .plus(dec(input.hoaMonthly))
    .plus(dec(s.holdingUtilitiesMonthly));
  const holdingCosts = monthlyHoldingCost.times(months);
  const financingCosts = interestPaid.plus(points);

  const purchaseFinanced = loanAmount.minus(rehabFinanced);
  const cashAtPurchase = price.minus(purchaseFinanced).plus(closing).plus(points).plus(rehab.minus(rehabFinanced));
  const cashDuringHold = holdingCosts.plus(payment.times(months));

  return {
    months,
    arv,
    arvMissing,
    loanAmount,
    rehabFinanced,
    points,
    monthlyPayment: payment,
    interestPaid,
    principalPaid,
    payoff,
    monthlyHoldingCost,
    holdingCosts,
    financingCosts,
    cashAtPurchase,
    cashDuringHold,
    totalCashIn: cashAtPurchase.plus(cashDuringHold),
    allInCost: price.plus(closing).plus(rehab).plus(holdingCosts).plus(financingCosts),
  };
}

// ─── BRRRR ────────────────────────────────────────────────────────────────

export interface BrrrrAnalysis {
  hold: HoldPhase;
  refiLoan: D;
  refiClosingCosts: D;
  /** Refi loan − payoff − refi closing. Negative = cash you must bring to refinance. */
  cashOut: D;
  /** Total cash in − cash out. ≤ 0 means every dollar came back (or more). */
  cashLeftInDeal: D;
  /** Cash out ÷ total cash in. */
  cashRecovered: D | null;
  equityAfterRefi: D;
  /** The rental after refinancing: new loan on ARV, returns measured on cash left in the deal. */
  rental: DealAnalysis;
  /** All invested cash came back, so cash-on-cash is unbounded. */
  infiniteReturn: boolean;
}

export function analyzeBrrrr(input: DealInputs, s: StrategyInputs, opts: { yearOneOnly?: boolean } = {}): BrrrrAnalysis {
  const hold = holdPhase(input, s);
  const refiLoan = hold.arv.times(pct(s.refi.ltvPct));
  const refiClosingCosts = refiLoan.times(pct(s.refi.closingPct));
  const cashOut = refiLoan.minus(hold.payoff).minus(refiClosingCosts);
  const cashLeftInDeal = hold.totalCashIn.minus(cashOut);
  const rental = analyzeDeal(
    {
      ...input,
      purchasePrice: hold.arv.toString(),
      closingCosts: "0",
      rehabCosts: "0",
      afterRepairValue: hold.arv.toString(),
      isCashPurchase: false,
      downPaymentPercent: dec(100).minus(dec(s.refi.ltvPct)).toString(),
      interestRate: s.refi.rate,
      loanTermYears: s.refi.termYears,
    },
    { yearOneOnly: opts.yearOneOnly, cashInvested: cashLeftInDeal },
  );
  return {
    hold,
    refiLoan,
    refiClosingCosts,
    cashOut,
    cashLeftInDeal,
    cashRecovered: safeDiv(cashOut, hold.totalCashIn),
    equityAfterRefi: hold.arv.minus(refiLoan),
    rental,
    infiniteReturn: !cashLeftInDeal.gt(0) && rental.annualCashFlow.gt(0),
  };
}

// ─── Flip ─────────────────────────────────────────────────────────────────

export interface FlipAnalysis {
  hold: HoldPhase;
  salePrice: D;
  sellingCosts: D;
  /** Sale price − selling costs − loan payoff: cash back at closing. */
  netSaleProceeds: D;
  profit: D;
  /** Profit ÷ total cash in. */
  roi: D | null;
  /** ROI compounded to a 12-month rate. */
  annualizedRoi: D | null;
  /** Profit ÷ sale price. */
  margin: D | null;
  /** Sale price at which profit is exactly zero. */
  breakEvenSalePrice: D;
}

export function analyzeFlip(input: DealInputs, s: StrategyInputs): FlipAnalysis {
  const hold = holdPhase(input, s);
  const saleIn = dec(s.flip.salePrice);
  const salePrice = saleIn.gt(0) ? saleIn : hold.arv;
  const sellPct = pct(s.flip.sellingCostPct);
  const sellingCosts = salePrice.times(sellPct);
  const netSaleProceeds = salePrice.minus(sellingCosts).minus(hold.payoff);
  const profit = salePrice.minus(sellingCosts).minus(hold.allInCost);
  const roi = safeDiv(profit, hold.totalCashIn);
  let annualizedRoi: D | null = null;
  if (roi && hold.months > 0 && roi.gt(-1)) {
    annualizedRoi = ONE.plus(roi).pow(dec(12).div(hold.months)).minus(ONE);
  }
  return {
    hold,
    salePrice,
    sellingCosts,
    netSaleProceeds,
    profit,
    roi,
    annualizedRoi,
    margin: safeDiv(profit, salePrice),
    breakEvenSalePrice: ONE.minus(sellPct).gt(0) ? hold.allInCost.div(ONE.minus(sellPct)) : hold.allInCost,
  };
}

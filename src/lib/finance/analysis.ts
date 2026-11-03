import { D, ONE, TWELVE, ZERO, dec, pct, safeDiv, sum, type DecimalLike } from "./decimal";
import { irr } from "./irr";
import { amortizationByYear, monthlyPayment } from "./mortgage";
import type { DealAnalysis, DealInputs, ExpenseLine, YearProjection } from "./types";

/**
 * Underwrites a Buy & Hold rental. Pure function: no I/O, no floating point —
 * every intermediate value is a Decimal. See `formulas.ts` for the
 * human-readable definitions shown in the UI.
 */
export interface AnalyzeOptions {
  /**
   * Compute only what year-1 metrics need (cash flow, CoC, cap rate, DSCR…):
   * one year of amortization and projection, no IRR. ~20× faster; used by the
   * max-price solver, which re-runs the analysis many times.
   */
  yearOneOnly?: boolean;
  /**
   * Cash actually left in the deal, when it isn't down + closing + rehab —
   * e.g. after a BRRRR cash-out refinance. Drives cash-on-cash, ROI, IRR and
   * equity multiple. Zero or less = all cash recovered (those ratios become null).
   */
  cashInvested?: DecimalLike;
}

export function analyzeDeal(input: DealInputs, opts: AnalyzeOptions = {}): DealAnalysis {
  // ── Acquisition ───────────────────────────────────────────────────────────
  const purchasePrice = dec(input.purchasePrice);
  const closingCosts = dec(input.closingCosts);
  const rehabCosts = dec(input.rehabCosts);

  const downPaymentRate = input.isCashPurchase ? ONE : D.min(pct(input.downPaymentPercent), ONE);
  const downPayment = purchasePrice.times(downPaymentRate);
  const loanAmount = purchasePrice.minus(downPayment);
  const totalCashInvested =
    opts.cashInvested !== undefined ? D.max(dec(opts.cashInvested), ZERO) : downPayment.plus(closingCosts).plus(rehabCosts);
  const totalProjectCost = purchasePrice.plus(closingCosts).plus(rehabCosts);
  const loanToValue = safeDiv(loanAmount, purchasePrice);
  const arvInput = dec(input.afterRepairValue);
  const afterRepairValue = arvInput.gt(0) ? arvInput : null;
  const startingValue = afterRepairValue ?? purchasePrice;

  // ── Debt ──────────────────────────────────────────────────────────────────
  const termYears = input.isCashPurchase ? 0 : input.loanTermYears;
  const monthlyMortgagePayment = monthlyPayment(loanAmount, input.interestRate, termYears);
  const holdYears = opts.yearOneOnly ? 1 : Math.max(1, Math.floor(input.holdingPeriodYears || 1));
  const amortization = amortizationByYear(
    loanAmount,
    input.interestRate,
    termYears,
    opts.yearOneOnly ? 1 : Math.max(holdYears, termYears),
  );
  const annualDebtService = amortization[0]?.payment ?? ZERO;

  // ── Income ────────────────────────────────────────────────────────────────
  const monthlyRent = dec(input.monthlyRent);
  const grossMonthlyIncome = monthlyRent.plus(dec(input.otherMonthlyIncome));
  const vacancyRate = pct(input.vacancyRate);

  const expenseGrowth = pct(input.expenseGrowthRate);
  const rentGrowth = pct(input.rentGrowthRate);
  const appreciation = pct(input.appreciationRate);

  /** Operating expenses for a given month's gross income, with fixed costs inflated by `fixedFactor`. */
  const buildExpenses = (grossMonthly: D, fixedFactor: D): ExpenseLine[] => {
    const effective = grossMonthly.times(ONE.minus(vacancyRate));
    const fixed = (key: string, label: string, monthly: D, basis: string): ExpenseLine => {
      const m = monthly.times(fixedFactor);
      return { key, label, monthly: m, annual: m.times(TWELVE), basis };
    };
    const variable = (key: string, label: string, rate: D, base: D, basis: string): ExpenseLine => {
      const m = base.times(rate);
      return { key, label, monthly: m, annual: m.times(TWELVE), basis };
    };
    return [
      fixed("propertyTax", "Property taxes", dec(input.propertyTaxAnnual).div(TWELVE), "Annual amount ÷ 12"),
      fixed("insurance", "Insurance", dec(input.insuranceAnnual).div(TWELVE), "Annual amount ÷ 12"),
      fixed("hoa", "HOA fees", dec(input.hoaMonthly), "Monthly amount"),
      fixed("utilities", "Utilities (owner-paid)", dec(input.utilitiesMonthly), "Monthly amount"),
      fixed("other", "Other expenses", dec(input.otherMonthlyExpenses), "Monthly amount"),
      variable(
        "maintenance",
        "Repairs & maintenance",
        pct(input.maintenancePercent),
        grossMonthly,
        `${dec(input.maintenancePercent).toString()}% of gross monthly income`,
      ),
      variable(
        "capex",
        "Capital expenditures",
        pct(input.capexPercent),
        grossMonthly,
        `${dec(input.capexPercent).toString()}% of gross monthly income`,
      ),
      variable(
        "management",
        "Property management",
        pct(input.managementPercent),
        effective,
        `${dec(input.managementPercent).toString()}% of collected income (after vacancy)`,
      ),
    ];
  };

  const monthlyVacancyLoss = grossMonthlyIncome.times(vacancyRate);
  const effectiveMonthlyIncome = grossMonthlyIncome.minus(monthlyVacancyLoss);
  const expenses = buildExpenses(grossMonthlyIncome, ONE);
  const monthlyOperatingExpenses = sum(expenses.map((e) => e.monthly));
  const annualOperatingExpenses = monthlyOperatingExpenses.times(TWELVE);

  // ── Profitability ─────────────────────────────────────────────────────────
  const monthlyNOI = effectiveMonthlyIncome.minus(monthlyOperatingExpenses);
  const annualNOI = monthlyNOI.times(TWELVE);
  const annualCashFlow = annualNOI.minus(annualDebtService);
  const monthlyCashFlow = annualCashFlow.div(TWELVE);

  const grossAnnualIncome = grossMonthlyIncome.times(TWELVE);
  const units = Math.max(1, input.units ?? 1);

  // ── Multi-year projection ─────────────────────────────────────────────────
  const projections: YearProjection[] = [];
  let cumulativeCashFlow = ZERO;
  for (let year = 1; year <= holdYears; year++) {
    const rentFactor = ONE.plus(rentGrowth).pow(year - 1);
    const expenseFactor = ONE.plus(expenseGrowth).pow(year - 1);
    const grossMonthly = grossMonthlyIncome.times(rentFactor);
    const yearExpenses = buildExpenses(grossMonthly, expenseFactor);

    const grossIncome = grossMonthly.times(TWELVE);
    const vacancyLoss = grossIncome.times(vacancyRate);
    const effectiveGrossIncome = grossIncome.minus(vacancyLoss);
    const operatingExpenses = sum(yearExpenses.map((e) => e.annual));
    const noi = effectiveGrossIncome.minus(operatingExpenses);
    const amort = amortization[year - 1];
    const debtService = amort?.payment ?? ZERO;
    const cashFlow = noi.minus(debtService);
    cumulativeCashFlow = cumulativeCashFlow.plus(cashFlow);
    const propertyValue = startingValue.times(ONE.plus(appreciation).pow(year));
    const loanBalance = amort?.endingBalance ?? ZERO;

    projections.push({
      year,
      grossIncome,
      vacancyLoss,
      effectiveGrossIncome,
      operatingExpenses,
      noi,
      debtService,
      cashFlow,
      cumulativeCashFlow,
      principalPaid: amort?.principal ?? ZERO,
      interestPaid: amort?.interest ?? ZERO,
      loanBalance,
      propertyValue,
      equity: propertyValue.minus(loanBalance),
      cashOnCash: safeDiv(cashFlow, totalCashInvested),
    });
  }

  // ── Sale at the end of the holding period ─────────────────────────────────
  const last = projections[projections.length - 1];
  const salePrice = last.propertyValue;
  const sellingCosts = salePrice.times(pct(input.sellingCostPercent));
  const loanPayoff = last.loanBalance;
  const netSaleProceeds = salePrice.minus(sellingCosts).minus(loanPayoff);
  const totalCashFlow = last.cumulativeCashFlow;
  const totalProfit = netSaleProceeds.plus(totalCashFlow).minus(totalCashInvested);
  const irrFlows = [
    totalCashInvested.negated(),
    ...projections.map((p, i) => (i === projections.length - 1 ? p.cashFlow.plus(netSaleProceeds) : p.cashFlow)),
  ];

  // ── Year-one total return ─────────────────────────────────────────────────
  const yearOnePrincipalPaydown = amortization[0]?.principal ?? ZERO;
  const yearOneAppreciation = startingValue.times(appreciation);
  const yearOneTotalReturn = annualCashFlow.plus(yearOnePrincipalPaydown).plus(yearOneAppreciation);

  return {
    purchasePrice,
    downPayment,
    loanAmount,
    closingCosts,
    rehabCosts,
    totalCashInvested,
    totalProjectCost,
    loanToValue,
    afterRepairValue,
    startingValue,
    equityCreated: afterRepairValue ? afterRepairValue.minus(totalProjectCost) : null,
    maxOffer70: afterRepairValue ? afterRepairValue.times("0.7").minus(rehabCosts) : null,

    monthlyMortgagePayment,
    annualDebtService,

    grossMonthlyIncome,
    monthlyVacancyLoss,
    effectiveMonthlyIncome,

    expenses,
    monthlyOperatingExpenses,
    annualOperatingExpenses,

    monthlyNOI,
    annualNOI,
    monthlyCashFlow,
    annualCashFlow,

    capRate: safeDiv(annualNOI, purchasePrice),
    cashOnCash: safeDiv(annualCashFlow, totalCashInvested),
    dscr: annualDebtService.isZero() ? null : annualNOI.div(annualDebtService),
    grossRentMultiplier: safeDiv(purchasePrice, grossAnnualIncome),
    onePercentRule: safeDiv(grossMonthlyIncome, purchasePrice),
    operatingExpenseRatio: safeDiv(annualOperatingExpenses, effectiveMonthlyIncome.times(TWELVE)),
    breakEvenOccupancy: safeDiv(annualOperatingExpenses.plus(annualDebtService), grossAnnualIncome),
    monthlyCashFlowPerUnit: monthlyCashFlow.div(units),
    pricePerUnit: purchasePrice.div(units),
    pricePerSquareFoot: input.squareFeet ? purchasePrice.div(input.squareFeet) : null,

    yearOnePrincipalPaydown,
    yearOneAppreciation,
    yearOneTotalReturn,
    yearOneTotalROI: safeDiv(yearOneTotalReturn, totalCashInvested),

    projections,
    amortization: amortization.slice(0, Math.max(termYears, 0)),
    sale: {
      holdingPeriodYears: holdYears,
      salePrice,
      sellingCosts,
      loanPayoff,
      netSaleProceeds,
      totalCashFlow,
      totalProfit,
      equityMultiple: safeDiv(netSaleProceeds.plus(totalCashFlow), totalCashInvested),
      irr: totalCashInvested.isZero() || opts.yearOneOnly ? null : irr(irrFlows),
    },
  };
}

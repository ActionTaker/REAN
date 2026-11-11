import { analyzeDeal } from "./analysis";
import { dec, pct, type DecimalLike } from "./decimal";
import type { DealAnalysis } from "./types";

/** The few numbers the landing-page calculator asks for; everything else uses the stated defaults. */
export interface QuickRentalInputs {
  price: DecimalLike;
  monthlyRent: DecimalLike;
  downPaymentPercent: DecimalLike;
  interestRate: DecimalLike;
  propertyTaxAnnual: DecimalLike;
  insuranceAnnual: DecimalLike;
}

/** Defaults shown under the calculator, so visitors can see what's assumed. */
export const QUICK_DEFAULTS = {
  closingCostPercent: "3",
  vacancyRate: "5",
  maintenancePercent: "5",
  capexPercent: "5",
  managementPercent: "8",
  loanTermYears: 30,
} as const;

/** Year-one Buy & Hold analysis from the quick inputs (no account, no lookups). */
export function quickRentalAnalysis(q: QuickRentalInputs): DealAnalysis {
  const price = dec(q.price);
  return analyzeDeal(
    {
      purchasePrice: price,
      closingCosts: price.times(pct(QUICK_DEFAULTS.closingCostPercent)),
      rehabCosts: 0,
      isCashPurchase: false,
      downPaymentPercent: q.downPaymentPercent,
      interestRate: q.interestRate,
      loanTermYears: QUICK_DEFAULTS.loanTermYears,
      monthlyRent: q.monthlyRent,
      otherMonthlyIncome: 0,
      vacancyRate: QUICK_DEFAULTS.vacancyRate,
      propertyTaxAnnual: q.propertyTaxAnnual,
      insuranceAnnual: q.insuranceAnnual,
      hoaMonthly: 0,
      utilitiesMonthly: 0,
      otherMonthlyExpenses: 0,
      maintenancePercent: QUICK_DEFAULTS.maintenancePercent,
      capexPercent: QUICK_DEFAULTS.capexPercent,
      managementPercent: QUICK_DEFAULTS.managementPercent,
      appreciationRate: 0,
      rentGrowthRate: 0,
      expenseGrowthRate: 0,
      sellingCostPercent: 0,
      holdingPeriodYears: 1,
    },
    { yearOneOnly: true },
  );
}

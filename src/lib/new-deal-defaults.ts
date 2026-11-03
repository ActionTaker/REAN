import type { SettingsRecord } from "@/lib/data/settings";
import type { DealFormValues } from "@/lib/validation/deal";
import type { TaxAssumptions } from "@/lib/finance/tax";
import { defaultStrategyInputs, type SavedStrategyInputs } from "@/lib/strategy";

/** After-tax estimate assumptions from Settings. */
export function taxAssumptionsFrom(s: SettingsRecord): TaxAssumptions {
  return { taxRatePct: s.taxRatePct, buildingValuePct: s.buildingValuePct };
}

/** BRRRR / Flip inputs for a new deal, from the user's Settings. */
export function strategyDefaultsFrom(s: SettingsRecord): SavedStrategyInputs {
  const d = defaultStrategyInputs(s.minDscr);
  return {
    ...d,
    holdMonths: s.defaultHoldMonths,
    acquisition: { ...d.acquisition, loanToCostPct: s.defaultHardMoneyLtcPct, rate: s.defaultHardMoneyRate, pointsPct: s.defaultHardMoneyPointsPct },
    refi: { ...d.refi, ltvPct: s.defaultRefiLtvPct, rate: s.defaultRefiRate },
    flip: { ...d.flip, sellingCostPct: s.defaultFlipSellingCostPct },
  };
}

/** A blank deal pre-filled with the user's default assumptions from Settings. */
export function newDealDefaults(s: SettingsRecord): DealFormValues {
  return {
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    propertyType: "SINGLE_FAMILY",
    status: "ANALYZING",
    units: "1",
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    yearBuilt: "",
    notes: "",
    purchasePrice: "",
    closingCosts: "0",
    rehabCosts: "0",
    afterRepairValue: "",
    rehabPlan: null,
    offerGoals: null,
    arvAnalysis: null,
    rentAnalysis: null,
    strategy: s.defaultStrategy ?? "BUY_HOLD",
    strategyInputs: strategyDefaultsFrom(s) as never,
    aduInputs: null,
    isCashPurchase: false,
    downPaymentPercent: s.defaultDownPaymentPercent,
    interestRate: s.defaultInterestRate,
    loanTermYears: s.defaultLoanTermYears,
    monthlyRent: "",
    otherMonthlyIncome: "0",
    vacancyRate: s.defaultVacancyRate,
    propertyTaxAnnual: "0",
    insuranceAnnual: "0",
    hoaMonthly: "0",
    utilitiesMonthly: "0",
    otherMonthlyExpenses: "0",
    maintenancePercent: s.defaultMaintenancePercent,
    capexPercent: s.defaultCapexPercent,
    managementPercent: s.defaultManagementPercent,
    appreciationRate: s.defaultAppreciationRate,
    rentGrowthRate: s.defaultRentGrowthRate,
    expenseGrowthRate: s.defaultExpenseGrowthRate,
    sellingCostPercent: s.defaultSellingCostPercent,
    holdingPeriodYears: s.defaultHoldingPeriodYears,
  };
}

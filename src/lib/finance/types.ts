import type { DecimalLike, D } from "./decimal";

/**
 * Everything needed to underwrite a Buy & Hold rental.
 * Percentages are expressed as whole numbers (7.25 means 7.25%).
 */
export interface DealInputs {
  // Purchase
  purchasePrice: DecimalLike;
  closingCosts: DecimalLike;
  rehabCosts: DecimalLike;
  /** Optional after-repair value; when > 0 it replaces purchase price as the starting value for projections. */
  afterRepairValue?: DecimalLike | null;

  // Financing
  isCashPurchase: boolean;
  downPaymentPercent: DecimalLike;
  interestRate: DecimalLike;
  loanTermYears: number;

  // Income (monthly)
  monthlyRent: DecimalLike;
  otherMonthlyIncome: DecimalLike;
  vacancyRate: DecimalLike;

  // Operating expenses
  propertyTaxAnnual: DecimalLike;
  insuranceAnnual: DecimalLike;
  hoaMonthly: DecimalLike;
  utilitiesMonthly: DecimalLike;
  otherMonthlyExpenses: DecimalLike;
  maintenancePercent: DecimalLike;
  capexPercent: DecimalLike;
  managementPercent: DecimalLike;

  // Projection assumptions
  appreciationRate: DecimalLike;
  rentGrowthRate: DecimalLike;
  expenseGrowthRate: DecimalLike;
  sellingCostPercent: DecimalLike;
  holdingPeriodYears: number;

  /** Used only for per-unit metrics. */
  units?: number;
  /** Used only for price-per-square-foot. */
  squareFeet?: number | null;
}

export interface ExpenseLine {
  key: string;
  label: string;
  monthly: D;
  annual: D;
  /** Human-readable description of how this line is derived. */
  basis: string;
}

export interface YearProjection {
  year: number;
  grossIncome: D;
  vacancyLoss: D;
  effectiveGrossIncome: D;
  operatingExpenses: D;
  noi: D;
  debtService: D;
  cashFlow: D;
  cumulativeCashFlow: D;
  principalPaid: D;
  interestPaid: D;
  loanBalance: D;
  propertyValue: D;
  equity: D;
  /** Cash-on-cash for this year, based on initial cash invested. */
  cashOnCash: D | null;
}

export interface AmortizationYear {
  year: number;
  payment: D;
  principal: D;
  interest: D;
  endingBalance: D;
}

export interface SaleAnalysis {
  holdingPeriodYears: number;
  salePrice: D;
  sellingCosts: D;
  loanPayoff: D;
  netSaleProceeds: D;
  totalCashFlow: D;
  totalProfit: D;
  equityMultiple: D | null;
  /** Annualized internal rate of return; null if it can't be solved. */
  irr: D | null;
}

export interface DealAnalysis {
  // Acquisition
  purchasePrice: D;
  downPayment: D;
  loanAmount: D;
  closingCosts: D;
  rehabCosts: D;
  totalCashInvested: D;
  totalProjectCost: D;
  loanToValue: D | null;
  afterRepairValue: D | null;
  /** Value the projection compounds from: ARV when provided, otherwise purchase price. */
  startingValue: D;
  /** ARV − total project cost (price + closing + rehab). */
  equityCreated: D | null;
  /** 70% rule: ARV × 70% − rehab. */
  maxOffer70: D | null;

  // Debt
  monthlyMortgagePayment: D;
  annualDebtService: D;

  // Income (monthly)
  grossMonthlyIncome: D;
  monthlyVacancyLoss: D;
  effectiveMonthlyIncome: D;

  // Expenses
  expenses: ExpenseLine[];
  monthlyOperatingExpenses: D;
  annualOperatingExpenses: D;

  // Profitability
  monthlyNOI: D;
  annualNOI: D;
  monthlyCashFlow: D;
  annualCashFlow: D;

  // Ratios (decimals, e.g. 0.065 = 6.5%)
  capRate: D | null;
  cashOnCash: D | null;
  dscr: D | null;
  grossRentMultiplier: D | null;
  onePercentRule: D | null;
  operatingExpenseRatio: D | null;
  breakEvenOccupancy: D | null;
  monthlyCashFlowPerUnit: D;
  pricePerUnit: D | null;
  pricePerSquareFoot: D | null;

  // Year-one return components
  yearOnePrincipalPaydown: D;
  yearOneAppreciation: D;
  yearOneTotalReturn: D;
  yearOneTotalROI: D | null;

  projections: YearProjection[];
  amortization: AmortizationYear[];
  sale: SaleAnalysis;
}

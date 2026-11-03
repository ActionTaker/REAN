/**
 * Plain-language definitions for every metric we show. The UI renders these
 * next to the numbers so the user can always see how a figure was produced.
 */
export interface MetricDefinition {
  label: string;
  formula: string;
  description: string;
}

export const METRICS = {
  monthlyCashFlow: {
    label: "Monthly Cash Flow",
    formula: "(Annual NOI − Annual Debt Service) ÷ 12",
    description: "What's left each month after collecting rent and paying operating expenses and the mortgage.",
  },
  capRate: {
    label: "Cap Rate",
    formula: "Annual NOI ÷ Purchase Price",
    description: "Unlevered yield on the purchase price. Ignores financing, so it compares properties on equal footing.",
  },
  cashOnCash: {
    label: "Cash-on-Cash Return",
    formula: "Annual Cash Flow ÷ Total Cash Invested",
    description: "Year-one cash return on the cash you actually put in (down payment + closing + rehab).",
  },
  noi: {
    label: "Net Operating Income",
    formula: "Effective Gross Income − Operating Expenses",
    description: "Property income after vacancy and operating costs, before mortgage payments.",
  },
  dscr: {
    label: "DSCR",
    formula: "Annual NOI ÷ Annual Debt Service",
    description: "How many times NOI covers the mortgage. Lenders commonly look for 1.20–1.25 or higher.",
  },
  totalCashInvested: {
    label: "Total Cash Invested",
    formula: "Down Payment + Closing Costs + Rehab Costs",
    description: "Out-of-pocket cash required to acquire and stabilize the property.",
  },
  mortgagePayment: {
    label: "Mortgage Payment (P&I)",
    formula: "L · r(1+r)ⁿ ÷ ((1+r)ⁿ − 1), r = rate ÷ 12, n = years × 12",
    description: "Fixed monthly principal and interest. Taxes and insurance are counted as operating expenses.",
  },
  grm: {
    label: "Gross Rent Multiplier",
    formula: "Purchase Price ÷ Gross Annual Income",
    description: "Years of gross income needed to equal the price. Lower is generally better.",
  },
  onePercentRule: {
    label: "1% Rule",
    formula: "Gross Monthly Income ÷ Purchase Price",
    description: "Quick screening heuristic: monthly rent of at least 1% of price. A rule of thumb, not a verdict.",
  },
  operatingExpenseRatio: {
    label: "Operating Expense Ratio",
    formula: "Annual Operating Expenses ÷ Effective Gross Income",
    description: "Share of collected income consumed by operating costs. The \"50% rule\" assumes roughly half.",
  },
  breakEvenOccupancy: {
    label: "Break-even Occupancy",
    formula: "(Operating Expenses + Debt Service) ÷ Gross Potential Income",
    description: "Occupancy needed to cover all costs. Management is held at its full-occupancy amount for simplicity.",
  },
  yearOneTotalROI: {
    label: "Year-1 Total ROI",
    formula: "(Cash Flow + Principal Paydown + Appreciation) ÷ Total Cash Invested",
    description: "All four return drivers except tax benefits, for the first year. Appreciation is an assumption.",
  },
  irr: {
    label: "IRR",
    formula: "Rate where NPV(−Cash Invested, CF₁ … CFₙ + Net Sale Proceeds) = 0",
    description: "Annualized return over the full holding period including the projected sale.",
  },
  equityMultiple: {
    label: "Equity Multiple",
    formula: "(Total Cash Flow + Net Sale Proceeds) ÷ Total Cash Invested",
    description: "Total cash returned per dollar invested over the holding period.",
  },
  netSaleProceeds: {
    label: "Net Sale Proceeds",
    formula: "Projected Value − Selling Costs − Loan Payoff",
    description: "Cash at sale, using the appreciation and selling-cost assumptions.",
  },
  effectiveGrossIncome: {
    label: "Effective Gross Income",
    formula: "Gross Income − Vacancy Loss",
    description: "Income you expect to actually collect.",
  },
  afterRepairValue: {
    label: "After-Repair Value (ARV)",
    formula: "Estimated market value once planned repairs are complete",
    description: "When entered, the projection compounds appreciation from ARV instead of the purchase price.",
  },
  equityCreated: {
    label: "Equity Created",
    formula: "ARV − (Purchase Price + Closing Costs + Rehab)",
    description: "Value added at acquisition if the ARV estimate holds. Not realized until sale or refinance.",
  },
  maxOffer: {
    label: "Max Offer Price",
    formula: "Highest price where every goal you turned on still holds (lowest of each goal's max price)",
    description: "Found by re-pricing the deal and keeping rent, expenses and loan terms; closing costs scale with price. Set the goals under Max offer price.",
  },
  maxOffer70: {
    label: "70% Rule Max Offer",
    formula: "ARV × 70% − Rehab Costs",
    description: "Common flipper/BRRRR ceiling on purchase price. A heuristic, not a valuation.",
  },
  loanToValue: {
    label: "Loan-to-Value",
    formula: "Loan Amount ÷ Purchase Price",
    description: "Share of the price financed by the lender.",
  },
} satisfies Record<string, MetricDefinition>;

export type MetricKey = keyof typeof METRICS;

export const DISCLAIMER =
  "Figures are estimates based on the assumptions entered. They are not guarantees of future performance and are not financial, tax, or legal advice. Verify all inputs with qualified professionals before investing.";

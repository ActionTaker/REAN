import { z } from "zod";
import Decimal from "decimal.js";
import { DEAL_STATUSES, PROPERTY_TYPES } from "@/lib/constants";

/** Parse without throwing — format errors are reported by the regex check, not here. */
const tryDecimal = (s: string): Decimal | null => {
  try {
    return new Decimal(s);
  } catch {
    return null;
  }
};
const gte = (s: string, n: number) => tryDecimal(s)?.gte(n) ?? true;
const lte = (s: string, n: number) => tryDecimal(s)?.lte(n) ?? true;

/**
 * Numeric form fields stay strings end-to-end (form → server → Prisma Decimal)
 * so no value ever passes through a binary float.
 */
const decimalField = (label: string, { min = 0, max = 1e12, scale = 2 }: { min?: number; max?: number; scale?: number } = {}) =>
  z
    .string()
    .transform((s) => s.replace(/[,$%\s]/g, ""))
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .regex(new RegExp(`^-?\\d+(\\.\\d{0,${scale}})?$`), `${label} must be a number with up to ${scale} decimals`)
        .refine((s) => gte(s, min), `${label} must be at least ${min}`)
        .refine((s) => lte(s, max), `${label} must be at most ${max.toLocaleString("en-US")}`),
    );

const money = (label: string, max = 1e11) => decimalField(label, { max });
const percent = (label: string, max = 100) => decimalField(label, { max, scale: 4 });

const intField = (label: string, min: number, max: number) =>
  z
    .string()
    .transform((s) => s.replace(/[,\s]/g, ""))
    .pipe(
      z
        .string()
        .regex(/^\d+$/, `${label} must be a whole number`)
        .refine((s) => Number(s) >= min && Number(s) <= max, `${label} must be between ${min} and ${max}`),
    );

const optionalInt = (label: string, min: number, max: number) =>
  z.union([z.literal(""), intField(label, min, max)]).optional().default("");

const optionalText = (max: number) => z.string().trim().max(max).optional().default("");

const goal = z.object({ enabled: z.boolean(), target: z.string().max(20) });
/** Targets stay free text here; the calculator shows invalid ones as input errors. */
export const offerGoalsSchema = z.object({
  breakEven: goal,
  cashFlowPerUnit: goal,
  cashOnCash: goal,
  capRate: goal,
  dscr: goal,
  equity: goal,
  seventy: goal,
  options: z.object({ downPayment: z.enum(["percent", "amount"]), propertyTax: z.enum(["fixed", "reassess"]) }).optional(),
});

/** Comps & ARV tool state saved with a deal. */
export const arvAnalysisSchema = z.object({
  choices: z
    .record(
      z.string().max(300),
      z.object({ included: z.boolean(), condition: z.enum(["renovated", "average", "dated"]).nullable() }),
    )
    .refine((r) => Object.keys(r).length <= 100, "Too many comps"),
  settings: z.object({
    sizeAdjPct: z.string().max(10),
    bedAdjPct: z.string().max(10),
    bathAdjPct: z.string().max(10),
    agePctPerYear: z.string().max(10),
    ageCapPct: z.string().max(10),
    excludeActive: z.boolean(),
  }),
  method: z.enum(["recommended", "adjustedAverage", "conservative", "ppsf", "avm", "manual"]).nullable(),
});

const num = z.string().trim().max(20).regex(/^-?\d*\.?\d*$/, "Enter a number");
const g = z.object({ enabled: z.boolean(), target: num });
/** BRRRR / Flip inputs (see src/lib/strategy.ts). Lenient strings; the engine treats blanks as 0. */
export const strategyInputsSchema = z.object({
  holdMonths: num,
  holdingUtilitiesMonthly: num,
  acquisition: z.object({ type: z.enum(["cash", "hardMoney", "conventional"]), loanToCostPct: num, rehabFinancedPct: num, rate: num, pointsPct: num }),
  refi: z.object({ ltvPct: num, rate: num, termYears: num, closingPct: num }),
  flip: z.object({ salePrice: z.string().trim().max(20).regex(/^[\d,$.\s]*$/, "Enter a number"), sellingCostPct: num }),
  goals: z.object({
    brrrr: z.object({ cashLeft: g, cashFlow: g, dscr: g, seventy: z.object({ enabled: z.boolean() }) }),
    flip: z.object({ profit: g, roi: g, seventy: z.object({ enabled: z.boolean() }) }),
  }),
});

const money0 = z.string().trim().max(20).regex(/^[\d,$.\s]*$/, "Enter a number");
/** ADU scenario (see src/lib/adu.ts). Lenient strings; blanks count as 0. */
export const aduInputsSchema = z.object({
  type: z.enum(["detached", "attached", "garage", "jadu"]),
  squareFeet: num,
  costPerSqft: money0,
  softCosts: money0,
  monthlyRent: money0,
  buildMonths: num,
  capRate: num,
  financing: z.object({ type: z.enum(["cash", "loan"]), financedPct: num, rate: num, termYears: num }),
});

/** Rent roll: one row per unit. Lenient strings; blank rent counts as 0. */
export const rentRollSchema = z
  .array(z.object({ label: z.string().trim().max(40), beds: z.string().trim().max(5), baths: z.string().trim().max(5), rent: money0 }))
  .max(500);

/** Outside estimates, entered by hand. */
export const otherEstimatesSchema = z
  .array(z.object({ source: z.string().trim().max(40), kind: z.enum(["arv", "rent"]), amount: money0, note: z.string().trim().max(200) }))
  .max(30);

export const dealSchema = z
  .object({
    name: z.string().trim().min(1, "Give this deal a name").max(120),
    address: optionalText(200),
    city: optionalText(100),
    state: optionalText(2),
    zip: z.union([z.literal(""), z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a 5-digit ZIP")]).optional().default(""),
    propertyType: z.enum(PROPERTY_TYPES.map((t) => t.value) as [string, ...string[]]),
    status: z.enum(DEAL_STATUSES.map((s) => s.value) as [string, ...string[]]),
    units: intField("Units", 1, 500),
    bedrooms: optionalInt("Bedrooms", 0, 500),
    bathrooms: z.union([z.literal(""), decimalField("Bathrooms", { max: 500, scale: 1 })]).optional().default(""),
    squareFeet: optionalInt("Square feet", 0, 1_000_000),
    yearBuilt: optionalInt("Year built", 1700, 2100),
    notes: optionalText(5000),

    purchasePrice: money("Purchase price").refine((s) => tryDecimal(s)?.gt(0) ?? true, "Purchase price must be greater than 0"),
    closingCosts: money("Closing costs"),
    rehabCosts: money("Rehab costs"),
    afterRepairValue: z.union([z.literal(""), money("After-repair value")]).optional().default(""),
    offerGoals: offerGoalsSchema.nullable().optional().default(null),
    arvAnalysis: arvAnalysisSchema.nullable().optional().default(null),
    rentAnalysis: arvAnalysisSchema.nullable().optional().default(null),
    strategy: z.enum(["BUY_HOLD", "BRRRR", "FLIP"]).optional().default("BUY_HOLD"),
    strategyInputs: strategyInputsSchema.nullable().optional().default(null),
    aduInputs: aduInputsSchema.nullable().optional().default(null),
    rentRoll: rentRollSchema.nullable().optional().default(null),
    otherEstimates: otherEstimatesSchema.nullable().optional().default(null),
    rehabPlan: z
      .object({
        scope: z.enum(["COSMETIC", "MODERATE", "HEAVY"]),
        contingencyPct: percent("Contingency", 100),
        customized: z.boolean(),
        items: z
          .array(
            z.object({
              key: z.string().max(40),
              label: z.string().trim().min(1, "Name this item").max(80),
              amount: money("Item amount", 1e8),
              basis: z.string().max(120).optional(),
            }),
          )
          .max(40),
      })
      .nullable()
      .optional()
      .default(null),

    isCashPurchase: z.boolean(),
    downPaymentPercent: percent("Down payment"),
    interestRate: percent("Interest rate", 30),
    loanTermYears: intField("Loan term", 1, 40),

    monthlyRent: money("Monthly rent"),
    otherMonthlyIncome: money("Other income"),
    vacancyRate: percent("Vacancy rate"),

    propertyTaxAnnual: money("Property taxes"),
    insuranceAnnual: money("Insurance"),
    hoaMonthly: money("HOA"),
    utilitiesMonthly: money("Utilities"),
    otherMonthlyExpenses: money("Other expenses"),
    maintenancePercent: percent("Maintenance"),
    capexPercent: percent("CapEx"),
    managementPercent: percent("Management"),

    appreciationRate: decimalField("Appreciation", { min: -20, max: 30, scale: 4 }),
    rentGrowthRate: decimalField("Rent growth", { min: -20, max: 30, scale: 4 }),
    expenseGrowthRate: decimalField("Expense growth", { min: -20, max: 30, scale: 4 }),
    sellingCostPercent: percent("Selling costs", 25),
    holdingPeriodYears: intField("Holding period", 1, 40),
  });

export type DealFormValues = z.input<typeof dealSchema>;
export type DealFormOutput = z.output<typeof dealSchema>;

export const settingsSchema = z.object({
  name: z.string().trim().max(100).optional().default(""),
  targetCapRate: percent("Target cap rate", 50),
  targetCashOnCash: percent("Target cash-on-cash", 100),
  minMonthlyCashFlowPerUnit: decimalField("Min cash flow per unit", { min: -100_000, max: 100_000 }),
  minDscr: decimalField("Min DSCR", { max: 10, scale: 4 }),
  defaultDownPaymentPercent: percent("Down payment"),
  defaultInterestRate: percent("Interest rate", 30),
  defaultLoanTermYears: intField("Loan term", 1, 40),
  defaultVacancyRate: percent("Vacancy"),
  defaultMaintenancePercent: percent("Maintenance"),
  defaultCapexPercent: percent("CapEx"),
  defaultManagementPercent: percent("Management"),
  defaultAppreciationRate: decimalField("Appreciation", { min: -20, max: 30, scale: 4 }),
  defaultRentGrowthRate: decimalField("Rent growth", { min: -20, max: 30, scale: 4 }),
  defaultExpenseGrowthRate: decimalField("Expense growth", { min: -20, max: 30, scale: 4 }),
  defaultSellingCostPercent: percent("Selling costs", 25),
  defaultHoldingPeriodYears: intField("Holding period", 1, 40),
  defaultStrategy: z.enum(["BUY_HOLD", "BRRRR", "FLIP"]).default("BUY_HOLD"),
  defaultHoldMonths: intField("Rehab & hold time", 0, 60),
  defaultHardMoneyLtcPct: percent("Hard money loan-to-cost"),
  defaultHardMoneyRate: percent("Hard money rate", 30),
  defaultHardMoneyPointsPct: percent("Points", 10),
  defaultRefiLtvPct: percent("Refinance LTV"),
  defaultRefiRate: percent("Refinance rate", 30),
  defaultFlipSellingCostPct: percent("Selling costs", 25),
  taxRatePct: percent("Tax rate", 60),
  buildingValuePct: percent("Building share"),
});

export type SettingsFormValues = z.input<typeof settingsSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(8, "Use at least 8 characters").max(200),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email").trim().toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

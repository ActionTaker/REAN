import { Prisma, type DealStatus, type InvestmentStrategy, type PropertyType } from "@prisma/client";
import type { SavedStrategyInputs, StrategyValue } from "@/lib/strategy";
import type { SavedAduInputs } from "@/lib/adu";
import type { RentRollRow } from "@/lib/rent-roll";
import type { DealInputs } from "@/lib/finance";
import type { PropertyLookup } from "@/lib/property-data/types";
import type { RehabPlan } from "@/lib/estimates/rehab";
import type { OfferGoals } from "@/lib/offer-goals";
import type { ArvAnalysis } from "@/lib/property-data/arv-analysis";
import type { DealFormOutput, DealFormValues } from "@/lib/validation/deal";

/** Client-safe, serializable property. Decimal columns are carried as strings. */
export interface PropertyRecord {
  id: string;
  isSample: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  propertyType: string;
  units: number;
  bedrooms: number | null;
  bathrooms: string | null;
  squareFeet: number | null;
  yearBuilt: number | null;
  notes: string | null;
  purchasePrice: string;
  closingCosts: string;
  rehabCosts: string;
  afterRepairValue: string | null;
  marketData: PropertyLookup | null;
  rehabPlan: RehabPlan | null;
  offerGoals: OfferGoals | null;
  arvAnalysis: ArvAnalysis | null;
  rentAnalysis: ArvAnalysis | null;
  strategy: StrategyValue;
  strategyInputs: SavedStrategyInputs | null;
  aduInputs: SavedAduInputs | null;
  rentRoll: RentRollRow[] | null;
  isCashPurchase: boolean;
  downPaymentPercent: string;
  interestRate: string;
  loanTermYears: number;
  monthlyRent: string;
  otherMonthlyIncome: string;
  vacancyRate: string;
  propertyTaxAnnual: string;
  insuranceAnnual: string;
  hoaMonthly: string;
  utilitiesMonthly: string;
  otherMonthlyExpenses: string;
  maintenancePercent: string;
  capexPercent: string;
  managementPercent: string;
  appreciationRate: string;
  rentGrowthRate: string;
  expenseGrowthRate: string;
  sellingCostPercent: string;
  holdingPeriodYears: number;
}

export const DECIMAL_KEYS = [
  "purchasePrice",
  "closingCosts",
  "rehabCosts",
  "downPaymentPercent",
  "interestRate",
  "monthlyRent",
  "otherMonthlyIncome",
  "vacancyRate",
  "propertyTaxAnnual",
  "insuranceAnnual",
  "hoaMonthly",
  "utilitiesMonthly",
  "otherMonthlyExpenses",
  "maintenancePercent",
  "capexPercent",
  "managementPercent",
  "appreciationRate",
  "rentGrowthRate",
  "expenseGrowthRate",
  "sellingCostPercent",
] as const;

export function recordToInputs(r: PropertyRecord): DealInputs {
  return {
    purchasePrice: r.purchasePrice,
    closingCosts: r.closingCosts,
    rehabCosts: r.rehabCosts,
    afterRepairValue: r.afterRepairValue,
    isCashPurchase: r.isCashPurchase,
    downPaymentPercent: r.downPaymentPercent,
    interestRate: r.interestRate,
    loanTermYears: r.loanTermYears,
    monthlyRent: r.monthlyRent,
    otherMonthlyIncome: r.otherMonthlyIncome,
    vacancyRate: r.vacancyRate,
    propertyTaxAnnual: r.propertyTaxAnnual,
    insuranceAnnual: r.insuranceAnnual,
    hoaMonthly: r.hoaMonthly,
    utilitiesMonthly: r.utilitiesMonthly,
    otherMonthlyExpenses: r.otherMonthlyExpenses,
    maintenancePercent: r.maintenancePercent,
    capexPercent: r.capexPercent,
    managementPercent: r.managementPercent,
    appreciationRate: r.appreciationRate,
    rentGrowthRate: r.rentGrowthRate,
    expenseGrowthRate: r.expenseGrowthRate,
    sellingCostPercent: r.sellingCostPercent,
    holdingPeriodYears: r.holdingPeriodYears,
    units: r.units,
    squareFeet: r.squareFeet,
  };
}

const str = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

export function recordToFormValues(r: PropertyRecord): DealFormValues {
  return {
    name: r.name,
    address: str(r.address),
    city: str(r.city),
    state: str(r.state),
    zip: str(r.zip),
    propertyType: r.propertyType,
    status: r.status,
    units: str(r.units),
    bedrooms: str(r.bedrooms),
    bathrooms: str(r.bathrooms),
    squareFeet: str(r.squareFeet),
    yearBuilt: str(r.yearBuilt),
    notes: str(r.notes),
    afterRepairValue: r.afterRepairValue ? trimZeros(r.afterRepairValue) : "",
    rehabPlan: r.rehabPlan,
    offerGoals: r.offerGoals,
    arvAnalysis: r.arvAnalysis,
    rentAnalysis: r.rentAnalysis,
    strategy: r.strategy,
    strategyInputs: r.strategyInputs,
    aduInputs: r.aduInputs,
    rentRoll: r.rentRoll,
    isCashPurchase: r.isCashPurchase,
    loanTermYears: str(r.loanTermYears),
    holdingPeriodYears: str(r.holdingPeriodYears),
    ...Object.fromEntries(DECIMAL_KEYS.map((k) => [k, trimZeros(r[k])])),
  } as DealFormValues;
}

/** "7.2500" → "7.25", "300000.00" → "300000" */
export function trimZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/** Live analysis on partially-typed form values; invalid fields count as 0. */
export function formValuesToInputs(v: Partial<DealFormValues>): DealInputs {
  const clean = (s: unknown) => {
    const t = String(s ?? "").replace(/[,$%\s]/g, "");
    return /^-?\d*\.?\d+$|^-?\d+\.?$/.test(t) ? t.replace(/\.$/, "") : "0";
  };
  const int = (s: unknown, fallback: number) => {
    const n = parseInt(String(s ?? ""), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  return {
    ...(Object.fromEntries(DECIMAL_KEYS.map((k) => [k, clean(v[k])])) as Pick<DealInputs, (typeof DECIMAL_KEYS)[number]>),
    afterRepairValue: clean(v.afterRepairValue),
    isCashPurchase: Boolean(v.isCashPurchase),
    loanTermYears: int(v.loanTermYears, 30),
    holdingPeriodYears: Math.min(int(v.holdingPeriodYears, 10), 40),
    units: int(v.units, 1),
    squareFeet: v.squareFeet ? int(v.squareFeet, 0) || null : null,
  };
}

const nullableInt = (s: string | undefined) => (s ? parseInt(s, 10) : null);
const nullableText = (s: string | undefined) => (s ? s : null);

/** Validated form output → Prisma column values. Decimal columns accept strings directly. */
export function formOutputToData(o: DealFormOutput) {
  return {
    name: o.name,
    address: nullableText(o.address),
    city: nullableText(o.city),
    state: nullableText(o.state?.toUpperCase()),
    zip: nullableText(o.zip),
    propertyType: o.propertyType as PropertyType,
    status: o.status as DealStatus,
    units: parseInt(o.units, 10),
    bedrooms: nullableInt(o.bedrooms),
    bathrooms: o.bathrooms ? o.bathrooms : null,
    squareFeet: nullableInt(o.squareFeet),
    yearBuilt: nullableInt(o.yearBuilt),
    notes: nullableText(o.notes),
    afterRepairValue: o.afterRepairValue ? o.afterRepairValue : null,
    // Prisma.DbNull clears the column when the user removes the plan.
    rehabPlan: o.rehabPlan ? (o.rehabPlan as Prisma.InputJsonValue) : Prisma.DbNull,
    offerGoals: o.offerGoals ? (o.offerGoals as Prisma.InputJsonValue) : Prisma.DbNull,
    arvAnalysis: o.arvAnalysis ? (o.arvAnalysis as Prisma.InputJsonValue) : Prisma.DbNull,
    rentAnalysis: o.rentAnalysis ? (o.rentAnalysis as Prisma.InputJsonValue) : Prisma.DbNull,
    strategy: (o.strategy ?? "BUY_HOLD") as InvestmentStrategy,
    strategyInputs: o.strategyInputs ? (o.strategyInputs as Prisma.InputJsonValue) : Prisma.DbNull,
    aduInputs: o.aduInputs ? (o.aduInputs as Prisma.InputJsonValue) : Prisma.DbNull,
    rentRoll: o.rentRoll?.length ? (o.rentRoll as Prisma.InputJsonValue) : Prisma.DbNull,
    isCashPurchase: o.isCashPurchase,
    loanTermYears: parseInt(o.loanTermYears, 10),
    holdingPeriodYears: parseInt(o.holdingPeriodYears, 10),
    ...(Object.fromEntries(DECIMAL_KEYS.map((k) => [k, o[k]])) as Record<(typeof DECIMAL_KEYS)[number], string>),
  };
}

export function formatAddress(r: Pick<PropertyRecord, "address" | "city" | "state" | "zip">): string {
  const cityState = [r.city, [r.state, r.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [r.address, cityState].filter(Boolean).join(", ");
}

/** Where to point the street photo: saved lookup coordinates, else the full street address, else nothing. */
export function recordPhotoLocation(r: Pick<PropertyRecord, "address" | "city" | "state" | "zip" | "marketData">): string | null {
  const f = r.marketData?.facts;
  if (f?.latitude != null && f?.longitude != null) return `${f.latitude},${f.longitude}`;
  return r.address ? formatAddress(r) : null;
}

import { ADU_INSURANCE_PCT, ADU_TYPES, DEFAULT_ADU_DISCOUNT_PCT, analyzeAdu, type AduValuationMethod, defaultAduCostPerSqft, type AduAnalysis, type AduInputs, type AduType } from "@/lib/finance/adu";
import { D, ZERO, dec, pct } from "@/lib/finance/decimal";
import type { DealAnalysis, DealInputs } from "@/lib/finance/types";
import { NATIONAL_PROPERTY_TAX_PCT, PROPERTY_TAX_PCT } from "@/lib/estimates/state-data";

/** Saved (string) shape of the ADU scenario, as typed in the form. */
export interface SavedAduInputs {
  type: AduType;
  squareFeet: string;
  costPerSqft: string;
  softCosts: string;
  monthlyRent: string;
  buildMonths: string;
  /** Blank = value the ADU at the deal's own cap rate. */
  capRate: string;
  financing: { type: "cash" | "loan"; financedPct: string; rate: string; termYears: string };
  /** How the value it adds is estimated. Missing on older saves → the lower of rent-based and $/sq ft-based. */
  valuation?: SavedAduValuation;
}

export interface SavedAduValuation {
  method: AduValuationMethod;
  /** Blank = this deal's ARV (or price) ÷ house size. */
  ppsf: string;
  discountPct: string;
  manualValue: string;
}

export const defaultAduValuation = (): SavedAduValuation => ({ method: "lower", ppsf: "", discountPct: DEFAULT_ADU_DISCOUNT_PCT, manualValue: "" });

export function defaultAduInputs(costIndex: string, rentSuggestion: string | null): SavedAduInputs {
  return {
    type: "detached",
    squareFeet: "600",
    costPerSqft: defaultAduCostPerSqft("detached", costIndex).toString(),
    softCosts: String(ADU_TYPES[0].softCosts),
    monthlyRent: rentSuggestion ?? "",
    buildMonths: "8",
    capRate: "",
    financing: { type: "cash", financedPct: "80", rate: "8.5", termYears: "30" },
    valuation: defaultAduValuation(),
  };
}

export function toEngineAdu(s: SavedAduInputs, autoPpsf: D | null = null): AduInputs {
  const n = (v: string) => (v ?? "").replace(/[,$%\s]/g, "") || "0";
  return {
    type: s.type,
    squareFeet: n(s.squareFeet),
    costPerSqft: n(s.costPerSqft),
    softCosts: n(s.softCosts),
    monthlyRent: n(s.monthlyRent),
    buildMonths: n(s.buildMonths),
    financing: {
      type: s.financing.type,
      financedPct: n(s.financing.financedPct),
      rate: n(s.financing.rate),
      termYears: parseInt(s.financing.termYears, 10) || 30,
    },
    valuation: (() => {
      const v = s.valuation ?? defaultAduValuation();
      const custom = n(v.ppsf);
      return {
        method: v.method,
        ppsf: dec(custom).gt(0) ? custom : (autoPpsf?.toString() ?? null),
        discountPct: n(v.discountPct) === "0" && !v.discountPct ? DEFAULT_ADU_DISCOUNT_PCT : n(v.discountPct),
        manualValue: n(v.manualValue),
      };
    })(),
  };
}

/** The cap rate the ADU is valued at: the user's, else the deal's own clamped to 5–12% (a very low cap rate would inflate the value), else 6%. */
export function aduCapRate(s: SavedAduInputs, dealCapRate: D | null): { rate: D; source: "custom" | "deal" | "default" } {
  const custom = s.capRate.replace(/[%\s]/g, "");
  if (custom && dec(custom).gt(0)) return { rate: pct(custom), source: "custom" };
  if (dealCapRate && dealCapRate.gt(0)) return { rate: D.min(D.max(dealCapRate, "0.05"), "0.12"), source: "deal" };
  return { rate: dec("0.06"), source: "default" };
}

/** Run the ADU scenario against a deal (Buy & Hold analysis, or a BRRRR's post-refi rental). */
/** The rates behind each line of the ADU math, so the UI can show its work. */
export interface AduBasis {
  vacancyPct: string;
  maintenancePct: string;
  capexPct: string;
  managementPct: string;
  taxPct: string;
  /** "CA", or null for the U.S. average. */
  taxState: string | null;
  insurancePct: string;
  loan: { amount: D; rate: string; termYears: number } | null;
  /** $/sq ft used for the $/sq ft valuation, and where it came from. */
  ppsf: D | null;
  ppsfSource: "custom" | "arv" | "price" | null;
  discountPct: string;
}

export type RunAduResult = AduAnalysis & { capRateUsed: D; capRateSource: "custom" | "deal" | "default"; basis: AduBasis };

export function runAdu(s: SavedAduInputs, deal: DealInputs, analysis: DealAnalysis, state: string | null | undefined): RunAduResult {
  const cap = aduCapRate(s, analysis.capRate);
  const code = state?.toUpperCase() ?? "";
  // The area's $/sq ft: this deal's ARV (else price) ÷ house size, unless the user typed one.
  const houseSqft = deal.squareFeet ? dec(deal.squareFeet) : ZERO;
  const arv = dec(deal.afterRepairValue);
  const basisValue = arv.gt(0) ? arv : dec(deal.purchasePrice);
  const autoPpsf = houseSqft.gt(0) && basisValue.gt(0) ? basisValue.div(houseSqft) : null;
  const engine = toEngineAdu(s, autoPpsf);
  const customPpsf = s.valuation && dec(s.valuation.ppsf.replace(/[,$\s]/g, "") || "0").gt(0);
  const r = analyzeAdu(engine, {
    vacancyRate: deal.vacancyRate,
    maintenancePercent: deal.maintenancePercent,
    capexPercent: deal.capexPercent,
    managementPercent: deal.managementPercent,
    capRate: cap.rate,
    propertyTaxPct: PROPERTY_TAX_PCT[code] ?? NATIONAL_PROPERTY_TAX_PCT,
    baseMonthlyCashFlow: analysis.monthlyCashFlow,
  });
  const str = (v: unknown) => String(v ?? "0");
  return {
    ...r,
    capRateUsed: cap.rate,
    capRateSource: cap.source,
    basis: {
      vacancyPct: str(deal.vacancyRate),
      maintenancePct: str(deal.maintenancePercent),
      capexPct: str(deal.capexPercent),
      managementPct: str(deal.managementPercent),
      taxPct: PROPERTY_TAX_PCT[code] ?? NATIONAL_PROPERTY_TAX_PCT,
      taxState: PROPERTY_TAX_PCT[code] ? code : null,
      insurancePct: ADU_INSURANCE_PCT,
      loan: r.loanAmount.gt(0) ? { amount: r.loanAmount, rate: str(engine.financing.rate), termYears: engine.financing.termYears } : null,
      ppsf: engine.valuation?.ppsf ? dec(engine.valuation.ppsf) : null,
      ppsfSource: customPpsf ? "custom" : autoPpsf ? (arv.gt(0) ? "arv" : "price") : null,
      discountPct: str(engine.valuation?.discountPct ?? DEFAULT_ADU_DISCOUNT_PCT),
    },
  };
}

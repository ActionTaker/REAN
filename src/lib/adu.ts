import { ADU_TYPES, analyzeAdu, defaultAduCostPerSqft, type AduAnalysis, type AduInputs, type AduType } from "@/lib/finance/adu";
import { D, dec, pct } from "@/lib/finance/decimal";
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
}

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
  };
}

export function toEngineAdu(s: SavedAduInputs): AduInputs {
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
export function runAdu(s: SavedAduInputs, deal: DealInputs, analysis: DealAnalysis, state: string | null | undefined): AduAnalysis & { capRateUsed: D; capRateSource: "custom" | "deal" | "default" } {
  const cap = aduCapRate(s, analysis.capRate);
  const code = state?.toUpperCase() ?? "";
  const r = analyzeAdu(toEngineAdu(s), {
    vacancyRate: deal.vacancyRate,
    maintenancePercent: deal.maintenancePercent,
    capexPercent: deal.capexPercent,
    managementPercent: deal.managementPercent,
    capRate: cap.rate,
    propertyTaxPct: PROPERTY_TAX_PCT[code] ?? NATIONAL_PROPERTY_TAX_PCT,
    baseMonthlyCashFlow: analysis.monthlyCashFlow,
  });
  return { ...r, capRateUsed: cap.rate, capRateSource: cap.source };
}

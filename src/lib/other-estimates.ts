/** Values the user copies from Zillow, Redfin, an agent, etc. Entered by hand — never scraped. */
export const ESTIMATE_SOURCES = ["Zillow", "Redfin", "Realtor.com", "Agent / BPO", "Appraisal", "Property manager", "Other"] as const;
export const ESTIMATE_KINDS = [
  { value: "arv", label: "ARV / value" },
  { value: "rent", label: "Rent / mo" },
] as const;
export type EstimateKind = (typeof ESTIMATE_KINDS)[number]["value"];

export interface OtherEstimate {
  source: string;
  kind: EstimateKind;
  amount: string;
  /** Optional: date seen, link or note. */
  note: string;
}

export const cleanAmount = (s: string) => {
  const v = (s ?? "").replace(/[,$\s]/g, "");
  return /^\d+(\.\d+)?$/.test(v) ? v : "";
};

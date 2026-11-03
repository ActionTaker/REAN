import { DEFAULT_ARV_SETTINGS, type ArvMethodKey, type ArvSettings, type CompChoice } from "./comps-arv";

/** Comps & ARV tool state saved with a deal (client-safe). */
export interface ArvAnalysis {
  choices: Record<string, CompChoice>;
  settings: ArvSettings;
  /** Which estimate was last applied to the ARV field; "manual" = typed by the user. */
  method: ArvMethodKey | "manual" | null;
}

export function emptyArvAnalysis(): ArvAnalysis {
  return { choices: {}, settings: { ...DEFAULT_ARV_SETTINGS }, method: null };
}

import { defaultSettingsFor, type ArvMethodKey, type ArvSettings, type CompChoice, type CompsMode } from "./comps-arv";

/** Comps & ARV tool state saved with a deal (client-safe). */
export interface ArvAnalysis {
  choices: Record<string, CompChoice>;
  settings: ArvSettings;
  /** Which estimate was last applied to the ARV field; "manual" = typed by the user. */
  method: ArvMethodKey | "manual" | null;
}

export function emptyArvAnalysis(mode: CompsMode = "sale"): ArvAnalysis {
  return { choices: {}, settings: { ...defaultSettingsFor(mode) }, method: null };
}

import { common } from "./common";
import { nav } from "./nav";
import { settings } from "./settings";
import { dashboard } from "./dashboard";
import { onboarding } from "./onboarding";
import { workout } from "./workout";
import { plan } from "./plan";
import { history } from "./history";
import { auth } from "./auth";
import { coach } from "./coach";

// Each namespace file exports { en: {...}, fr: {...} } for its own slice of
// strings — kept as separate files (not one giant dictionary) so different
// screens/features can be translated independently without touching a
// shared file.
const NAMESPACES = { common, nav, settings, dashboard, onboarding, workout, plan, history, auth, coach } as const;

export type Language = "en" | "fr";

function buildDictionary(lang: Language) {
  const dict: Record<string, Record<string, string>> = {};
  for (const [namespace, entries] of Object.entries(NAMESPACES)) {
    dict[namespace] = entries[lang];
  }
  return dict;
}

export const dictionaries: Record<Language, Record<string, Record<string, string>>> = {
  en: buildDictionary("en"),
  fr: buildDictionary("fr"),
};

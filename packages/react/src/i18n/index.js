import ar from "./ar";
import en from "./en";
import tr from "./tr";

// Built-in UI languages. Hosts can add or override languages through the
// `messages` prop of <ApiReference>; English is the fallback for any key a
// language does not define.
export const BUILT_IN_MESSAGES = { en, tr, ar };

export const LOCALE_NAMES = {
  en: "English",
  tr: "Türkçe",
  ar: "العربية",
};

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ur", "ps", "sd", "ug", "yi", "dv", "ku"]);

export function directionOf(locale) {
  return RTL_LANGUAGES.has(String(locale ?? "").toLowerCase().split("-")[0]) ? "rtl" : "ltr";
}

// Merges built-in messages with host overrides: { tr: { "sidebar.search": "…" } }.
export function mergeMessages(overrides = {}) {
  const merged = {};
  for (const locale of new Set([...Object.keys(BUILT_IN_MESSAGES), ...Object.keys(overrides)])) {
    merged[locale] = { ...BUILT_IN_MESSAGES[locale], ...overrides[locale] };
  }
  return merged;
}

// Looks a key up for `locale` (then its base language, then English) and
// fills {param} placeholders. Unknown keys are returned as-is.
export function translate(messages, locale, key, params) {
  const base = String(locale ?? "").split("-")[0];
  const value = messages[locale]?.[key] ?? messages[base]?.[key] ?? messages.en?.[key] ?? key;
  if (!params) return value;

  return value.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

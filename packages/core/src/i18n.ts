import type { OpenAPIObject } from "./types";

// Localized text for OpenAPI objects through the "x-i18n" extension:
//
//   {
//     "summary": "List users",
//     "x-i18n": { "tr": { "summary": "Kullanıcıları listele" } }
//   }
//
// Works on any object with human-readable fields (info, tags, operations,
// parameters, responses, schemas): the field is looked up for the UI locale,
// then its base language ("pt" for "pt-BR"), and finally the plain field,
// which holds the document's authored language. Markdown fields may also use
// ":::lang" blocks (markdown.ts); both can be combined.

export function localize(node: OpenAPIObject | null | undefined, field: string, locale?: string): any {
  const translations = node?.["x-i18n"];
  if (translations && locale) {
    const target = String(locale).toLowerCase();
    const base = target.split("-")[0];
    for (const [tag, values] of Object.entries(translations)) {
      const normalized = tag.toLowerCase().replace("_", "-");
      if ((normalized === target || normalized === base) && typeof values?.[field] === "string") return values[field];
    }
  }
  return node?.[field];
}

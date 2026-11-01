// Sidebar search. Text is folded before comparing: lower case and accents
// dropped, so "imza" finds "İmza", "dogrulama" finds "Doğrulama" and "ı"
// matches "i".
export function fold(value) {
  return String(value).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/ı/g, "i");
}

export const includesQuery = (values, query) => values.filter(Boolean).some((value) => fold(value).includes(query));

// Outline entries whose heading or text contains the query: a matching entry
// keeps all its sections, otherwise only the matching sections stay.
export function filterOutline(entries, query) {
  return entries
    .map((entry) => {
      if (includesQuery([entry.text, entry.body], query)) return entry;
      const sections = entry.sections.filter((section) => includesQuery([section.text, section.body], query));
      return sections.length ? { ...entry, sections } : null;
    })
    .filter(Boolean);
}

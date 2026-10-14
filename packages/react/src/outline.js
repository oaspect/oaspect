import { anchorHeadings, headingsOf, parseMarkdown, selectLocale } from "@oaspect/core";

// Navigation outline of a Markdown description, for the sidebar: the
// shallowest heading level gives the entries, the next level their
// `sections`. Anchors match the ones <Markdown anchorPrefix> puts on the
// headings, because both run anchorHeadings() on the same blocks.
export function markdownOutline(source, locale, prefix) {
  if (!source) return [];
  const headings = headingsOf(anchorHeadings(selectLocale(parseMarkdown(source), locale), prefix));
  if (headings.length === 0) return [];

  const top = Math.min(...headings.map((heading) => heading.level));
  const entries = [];
  for (const heading of headings) {
    if (heading.level === top) entries.push({ anchor: heading.anchor, text: heading.text, sections: [] });
    else if (heading.level === top + 1 && entries.length > 0) entries.at(-1).sections.push({ anchor: heading.anchor, text: heading.text });
  }
  return entries;
}

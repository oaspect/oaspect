import { anchorHeadings, headingsOf, parseMarkdown, selectLocale } from "@oaspect/core";

// Navigation outline of a Markdown description, for the sidebar: the
// shallowest heading level gives the entries, the next level their
// `sections`. Anchors match the ones <Markdown anchorPrefix> puts on the
// headings, because both run anchorHeadings() on the same blocks. Each entry
// and section also carries the plain `body` text under its heading (up to the
// next heading), so the sidebar search finds a section by what it says.
export function markdownOutline(source, locale, prefix) {
  if (!source) return [];
  const blocks = flatten(anchorHeadings(selectLocale(parseMarkdown(source), locale), prefix));
  const headings = headingsOf(blocks);
  if (headings.length === 0) return [];

  const top = Math.min(...headings.map((heading) => heading.level));
  const entries = [];
  let current = null; // the entry or section the following text belongs to
  let index = 0;
  for (const block of blocks) {
    if (block.type === "heading" && block.anchor) {
      const heading = headings[index++];
      current = null;
      if (heading.level === top) {
        current = { anchor: heading.anchor, text: heading.text, body: "", sections: [] };
        entries.push(current);
      } else if (heading.level === top + 1 && entries.length > 0) {
        current = { anchor: heading.anchor, text: heading.text, body: "" };
        entries.at(-1).sections.push(current);
      }
    } else if (current) {
      current.body = `${current.body} ${textOf(block)}`.trim();
    }
  }
  return entries;
}

// The chosen language's blocks, unwrapped (headingsOf() looks inside them too).
const flatten = (blocks) => blocks.flatMap((block) => (block.type === "lang-selected" ? flatten(block.children) : [block]));

// Every piece of text in a block: paragraphs, list items, table cells, code.
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join(" ");
  if (!node || typeof node !== "object") return "";
  const own = [node.value, node.text, node.alt].filter((value) => typeof value === "string");
  const nested = Object.entries(node)
    .filter(([key, value]) => key !== "type" && value && typeof value === "object")
    .map(([, value]) => textOf(value));
  return [...own, ...nested].filter(Boolean).join(" ");
}

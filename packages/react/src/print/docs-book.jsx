// A docs folder as a book: one chapter per page in navigation order, its
// h2 headings as numbered sections, links between pages pointing at the
// page they land on.
import { anchorHeadings, plainText, resolveDocAsset, resolveDocLink } from "@oaspect/core";
import { bookId, BookBlocks, bookState, numberBlocks, rewriteBlocks } from "./blocks";

// Links between pages and separators only: "← Contents", "← Previous · Next →".
const SEPARATOR = /^[\s·•|/–—-]*$/;
function isNavigation(paragraph) {
  const links = paragraph.children.filter((node) => node.type === "link");
  return (
    links.length > 0 &&
    links.every((link) => !/^[a-z][a-z0-9+.-]*:|^\/\//i.test(link.href)) &&
    paragraph.children.every((node) => node.type === "link" || (node.type === "text" && SEPARATOR.test(node.value)) || node.type === "br")
  );
}

const pageAnchor = (slug) => `page/${slug || "index"}`;
const headingPrefix = (slug) => `p/${slug || "index"}`;

/** Element id in the docs book of a page, or of a heading on it: what a docs route ({ slug, id }) opens. */
export const docsBookTarget = (slug, id) => bookId(id ? `${headingPrefix(slug)}/${id}` : pageAnchor(slug));

/**
 * @param {{ model, t, locale, meta? }} input — model from buildDocs()
 * @returns {{ meta, chapters, references }}
 */
export function docsBook({ model, t, locale, meta = {} }) {
  const state = bookState();
  // Element id → docs route, so a link followed in the book can update the address.
  const routes = new Map();
  const chapters = model.pages.map((page, index) => {
    const number = index + 1;
    // The page title is the chapter title; the rest is its content.
    // :::lang blocks are already narrowed to the reader's language; unwrapped, their headings are the page's own.
    const flat = page.blocks.flatMap((block) => (block.type === "lang-selected" ? block.children : [block]));
    const firstTitle = flat.findIndex((block) => block.type === "heading" && block.level === 1);
    const body = firstTitle === -1 ? flat : flat.filter((_, position) => position !== firstTitle);
    const content = rewriteBlocks(body, { image: (src) => resolveDocAsset(page.path, src), keep: (paragraph) => !isNavigation(paragraph) });
    const blocks = numberBlocks(anchorHeadings(content, headingPrefix(page.slug), 4), state, { chapter: number, title: page.title });
    const resolveLink = (href) => {
      if (/^#[^/]/.test(href)) return `#${headingPrefix(page.slug)}/${href.slice(1)}`;
      const target = resolveDocLink(page.path, href);
      if (!target) return href;
      return target.id ? `#${headingPrefix(target.slug)}/${target.id}` : `#${pageAnchor(target.slug)}`;
    };
    routes.set(docsBookTarget(page.slug), { slug: page.slug });
    const prefix = `${headingPrefix(page.slug)}/`;
    for (const block of blocks) {
      if (block.type === "heading" && block.anchor?.startsWith(prefix)) routes.set(bookId(block.anchor), { slug: page.slug, id: block.anchor.slice(prefix.length) });
    }
    const sections = [];
    for (const block of blocks) {
      if (block.type === "heading" && block.level === 2 && block.anchor) {
        sections.push({ id: bookId(block.anchor), title: plainText(block.children), num: block.num });
      }
    }
    return {
      id: bookId(pageAnchor(page.slug)),
      label: `${t("print.chapter")} ${number}`,
      title: page.title,
      sections,
      content: <BookBlocks blocks={blocks} t={t} resolveLink={resolveLink} />,
    };
  });

  const first = model.pages[0];
  const intro = first?.blocks.flatMap((block) => (block.type === "lang-selected" ? block.children : [block])).find((block) => block.type === "paragraph" && !isNavigation(block));
  return {
    meta: {
      kicker: t("print.docsKicker"),
      title: model.title || first?.title || "Docs",
      summary: intro ? plainText(intro.children) : "",
      date: new Date().toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" }),
      ...meta,
    },
    chapters,
    references: [...state.references],
    routes,
  };
}

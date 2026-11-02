// A docs folder as a book: one chapter per page in navigation order, its
// h2 headings as numbered sections, links between pages pointing at the
// page they land on.
import { anchorHeadings, plainText, resolveDocLink } from "@oaspect/core";
import { bookId, BookBlocks, bookState, numberBlocks } from "./blocks";

const pageAnchor = (slug) => `page/${slug || "index"}`;
const headingPrefix = (slug) => `p/${slug || "index"}`;

/**
 * @param {{ model, t, locale, meta? }} input — model from buildDocs()
 * @returns {{ meta, chapters, references }}
 */
export function docsBook({ model, t, locale, meta = {} }) {
  const state = bookState();
  const chapters = model.pages.map((page, index) => {
    const number = index + 1;
    // The page title is the chapter title; the rest is its content.
    const firstTitle = page.blocks.findIndex((block) => block.type === "heading" && block.level === 1);
    const body = firstTitle === -1 ? page.blocks : page.blocks.filter((_, position) => position !== firstTitle);
    const blocks = numberBlocks(anchorHeadings(body, headingPrefix(page.slug), 4), state, { chapter: number, title: page.title });
    const resolveLink = (href) => {
      if (/^#[^/]/.test(href)) return `#${headingPrefix(page.slug)}/${href.slice(1)}`;
      const target = resolveDocLink(page.path, href);
      if (!target) return href;
      return target.id ? `#${headingPrefix(target.slug)}/${target.id}` : `#${pageAnchor(target.slug)}`;
    };
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
  const intro = first?.blocks.find((block) => block.type === "paragraph");
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
  };
}

// Developer docs: a set of Markdown files shown as a small documentation
// site (navigation, pages, search), like Docsify.
//
// Input is a bundle of files, { path, content }, so any server can produce it
// (the CLI does, from a folder). The navigation comes from a `_sidebar.md` or
// `SUMMARY.md` when there is one (a nested list of links, as in Docsify and
// GitBook); otherwise from the folders, with README.md / index.md first.

import { anchorHeadings, headingsOf, parseMarkdown, plainText, selectLocale } from "./markdown";
import type { InlineNode, MarkdownBlock } from "./types";

export interface DocsFile {
  /** Path relative to the docs root, with "/" separators: "guides/setup.md". */
  path: string;
  content: string;
}

export interface DocsBundle {
  title?: string;
  /** Link for "Edit this page"; "{path}" is replaced by the file's path. */
  editUrl?: string;
  files: DocsFile[];
}

export interface DocPage {
  /** Route of the page: the path without ".md"; "" for the root README/index. */
  slug: string;
  path: string;
  title: string;
  blocks: MarkdownBlock[];
}

export interface DocsGroup {
  /** Empty for the pages at the top of the navigation. */
  label: string;
  pages: DocPage[];
}

export interface DocsModel {
  title: string;
  editUrl?: string;
  groups: DocsGroup[];
  /** Pages in navigation order (for previous/next). */
  pages: DocPage[];
}

export interface DocsSearchResult {
  slug: string;
  title: string;
  /** Heading the match is under, with its id, when not the page top. */
  heading?: string;
  id?: string;
  /** Text around the match. */
  snippet: string;
}

const SIDEBAR = /^(?:_sidebar|summary)\.md$/i;
const INDEX = /^(?:readme|index)\.md$/i;

const isMarkdown = (path: string) => /\.(?:md|markdown)$/i.test(path);

/** Route of a file: "guides/setup.md" → "guides/setup", "guides/README.md" → "guides". */
export function docSlug(path: string): string {
  const parts = path.replace(/^\.?\//, "").split("/");
  const name = parts.pop() ?? "";
  if (INDEX.test(name)) return parts.join("/");
  return [...parts, name.replace(/\.(?:md|markdown)$/i, "")].join("/");
}

function normalizePath(path: string): string {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

const dirname = (path: string) => path.split("/").slice(0, -1).join("/");

/**
 * Resolves a link written in a page. A relative link to a Markdown file
 * ("../setup.md#install") becomes { slug, id }; anything else returns null.
 */
export function resolveDocLink(fromPath: string, href: string): { slug: string; id?: string } | null {
  if (/^[a-z][a-z0-9+.-]*:|^\/\/|^#/i.test(href)) return null;
  const [target, hash] = href.split("#");
  if (!isMarkdown(target)) return null;
  const path = normalizePath(target.startsWith("/") ? target : `${dirname(fromPath)}/${target}`);
  return { slug: docSlug(path), ...(hash ? { id: hash } : {}) };
}

function pageTitle(blocks: MarkdownBlock[], path: string): string {
  const first = headingsOf(anchorHeadings(blocks, "", 1))[0];
  if (first) return first.text;
  const name = path.split("/").pop() ?? path;
  const stem = INDEX.test(name) ? dirname(path).split("/").pop() || "Introduction" : name.replace(/\.(?:md|markdown)$/i, "");
  return stem.replace(/[-_]+/g, " ").replace(/^\w/, (char) => char.toUpperCase());
}

// Navigation from a sidebar file: top-level items that are links are pages
// at the top; items without a link (or "## Heading" lines) start a group of
// the links nested under them / following them.
function sidebarOrder(blocks: MarkdownBlock[], sidebarPath: string): { label: string; paths: string[] }[] {
  const groups: { label: string; paths: string[] }[] = [{ label: "", paths: [] }];
  const linkOf = (nodes: InlineNode[]): string | null => {
    for (const node of nodes) {
      if (node.type === "link") {
        const resolved = resolveDocLink(sidebarPath, node.href);
        if (resolved) return node.href;
      }
      if ("children" in node) {
        const inner = linkOf(node.children);
        if (inner) return inner;
      }
    }
    return null;
  };
  const pathOf = (href: string) => normalizePath(`${dirname(sidebarPath)}/${href.split("#")[0]}`);

  const visitList = (items: Extract<MarkdownBlock, { type: "list" }>["items"], group: { label: string; paths: string[] }) => {
    for (const item of items) {
      const [first, ...rest] = item.children;
      const inline = first && (first.type === "paragraph" || first.type === "heading") ? first.children : [];
      const href = linkOf(inline);
      const nested = rest.filter((block) => block.type === "list") as Extract<MarkdownBlock, { type: "list" }>[];
      if (href) group.paths.push(pathOf(href));
      if (nested.length) {
        const target = href ? group : { label: plainText(inline).trim(), paths: [] };
        if (!href) groups.push(target);
        for (const list of nested) visitList(list.items, target);
      }
    }
  };

  for (const block of blocks) {
    if (block.type === "heading") groups.push({ label: plainText(block.children).trim(), paths: [] });
    else if (block.type === "list") visitList(block.items, groups[groups.length - 1]);
  }
  return groups.filter((group) => group.paths.length > 0);
}

/**
 * Builds the navigation and pages of a docs bundle for one UI language
 * (`:::lang` blocks and headings follow it).
 */
export function buildDocs(bundle: DocsBundle, locale = "en"): DocsModel {
  const files = bundle.files.filter((file) => isMarkdown(file.path)).map((file) => ({ ...file, path: normalizePath(file.path) }));
  const sidebar = files.find((file) => SIDEBAR.test(file.path.split("/").pop() ?? ""));
  const pages = new Map<string, DocPage>();
  for (const file of files) {
    if (file === sidebar) continue;
    const blocks = selectLocale(parseMarkdown(file.content), locale);
    pages.set(file.path, { slug: docSlug(file.path), path: file.path, title: pageTitle(blocks, file.path), blocks });
  }

  const groups: DocsGroup[] = [];
  const placed = new Set<string>();
  if (sidebar) {
    for (const group of sidebarOrder(selectLocale(parseMarkdown(sidebar.content), locale), sidebar.path)) {
      const list = group.paths.map((path) => pages.get(path)).filter((page): page is DocPage => Boolean(page) && !placed.has(page!.path));
      list.forEach((page) => placed.add(page.path));
      if (list.length) groups.push({ label: group.label, pages: list });
    }
  }

  // Files the sidebar does not list (or all of them without a sidebar):
  // grouped by top folder, README/index first, then by name.
  const rest = [...pages.values()].filter((page) => !placed.has(page.path));
  const byFolder = new Map<string, DocPage[]>();
  for (const page of rest) {
    const folder = page.path.includes("/") ? page.path.split("/")[0] : "";
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(page);
  }
  const order = (a: DocPage, b: DocPage) => {
    const ia = INDEX.test(a.path.split("/").pop() ?? "") ? 0 : 1;
    const ib = INDEX.test(b.path.split("/").pop() ?? "") ? 0 : 1;
    return a.path.split("/").length - b.path.split("/").length || ia - ib || a.path.localeCompare(b.path);
  };
  for (const folder of [...byFolder.keys()].sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)))) {
    const list = byFolder.get(folder)!.sort(order);
    const label = folder ? (list.find((page) => page.slug === folder)?.title ?? folder.replace(/[-_]+/g, " ").replace(/^\w/, (char) => char.toUpperCase())) : "";
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.pages.push(...list);
    else groups.push({ label, pages: list });
  }

  const root = pages.get("README.md") ?? pages.get("index.md");
  return {
    title: bundle.title ?? root?.title ?? "Documentation",
    ...(bundle.editUrl ? { editUrl: bundle.editUrl } : {}),
    groups,
    pages: groups.flatMap((group) => group.pages),
  };
}

// Plain text of blocks, for search.
function blockText(block: MarkdownBlock): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
      return plainText(block.children);
    case "code":
      return block.text;
    case "blockquote":
    case "lang":
    case "lang-selected":
      return block.children.map(blockText).join(" ");
    case "list":
      return block.items.map((item) => item.children.map(blockText).join(" ")).join(" ");
    case "table":
      return [...block.header, ...block.rows.flat()].map(plainText).join(" ");
    default:
      return "";
  }
}

// Case, accents and the Turkish dotless i ignored: "Yayına" matches "yayina".
const fold = (text: string) => text.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFKD").replace(/\p{M}/gu, "");

/**
 * Finds pages and sections containing every word of the query (case and
 * accent insensitive). Title and heading matches rank first.
 */
export function searchDocs(model: DocsModel, query: string, limit = 20): DocsSearchResult[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const results: (DocsSearchResult & { score: number })[] = [];

  for (const page of model.pages) {
    // Sections: the page top, then one per h2/h3 with the text up to the next.
    const blocks = anchorHeadings(page.blocks, "", 3);
    const sections: { heading?: string; id?: string; text: string }[] = [{ text: "" }];
    const flat = blocks.flatMap((block) => (block.type === "lang-selected" ? block.children : [block]));
    for (const block of flat) {
      if (block.type === "heading" && block.level > 1 && block.anchor) {
        sections.push({ heading: plainText(block.children), id: block.anchor.slice(1), text: "" });
      } else if (!(block.type === "heading" && block.level === 1)) {
        sections[sections.length - 1].text += ` ${blockText(block)}`;
      }
    }

    for (const section of sections) {
      const haystack = fold(`${page.title} ${section.heading ?? ""} ${section.text}`);
      if (!words.every((word) => haystack.includes(word))) continue;
      const titleHit = words.some((word) => fold(page.title).includes(word));
      const headingHit = section.heading ? words.some((word) => fold(section.heading!).includes(word)) : false;
      const text = section.text.replace(/\s+/g, " ").trim();
      const at = fold(text).indexOf(words[0]);
      // Start at a word boundary about 40 characters before the match.
      const space = at > 40 ? text.lastIndexOf(" ", at - 40) : -1;
      const start = space > 0 ? space + 1 : 0;
      const snippet = at < 0 ? text.slice(0, 120) : `${start > 0 ? "…" : ""}${text.slice(start, start + 140)}${start + 140 < text.length ? "…" : ""}`;
      results.push({
        slug: page.slug,
        title: page.title,
        ...(section.heading ? { heading: section.heading, id: section.id } : {}),
        snippet,
        score: (headingHit ? 2 : 0) + (titleHit ? 1 : 0),
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...result }) => result);
}

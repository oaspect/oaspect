// Markdown parser for OpenAPI descriptions: a GitHub Flavored Markdown subset
// that covers what API docs use in practice.
//
// Blocks:  paragraphs, ATX headings, fenced code, blockquotes, thematic
//          breaks, (nested) ordered/unordered/task lists, GFM tables.
// Inline:  code spans, strong, emphasis, strikethrough, links, images,
//          autolinks (<https://…> and bare URLs), hard breaks, escapes.
//
// Extension: language blocks. Translations of the same content sit next to
// each other and the viewer shows the one matching the UI language:
//
//   :::lang en
//   English text
//   :::
//
//   :::lang tr
//   Türkçe metin
//   :::
//
// A block may list several locales (":::lang tr, az"). Content outside
// language blocks is shared by every language. See selectLocale().
//
// Raw HTML is never interpreted: it stays literal text. The output is a small
// AST that components/markdown.jsx turns into React elements.

import type { InlineNode, ListItem, MarkdownBlock } from "./types";

type LangBlock = Extract<MarkdownBlock, { type: "lang" }>;

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)[^`]*$/;
const LANG_OPEN = /^ {0,3}:{3,}[ \t]*lang[ \t]+([A-Za-z]{2,3}(?:[-_][A-Za-z0-9]+)*(?:[ \t]*,[ \t]*[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]+)*)*)[ \t]*$/;
const CONTAINER_OPEN = /^ {0,3}:{3,}[ \t]*\S/;
const CONTAINER_CLOSE = /^ {0,3}:{3,}[ \t]*$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const BLOCKQUOTE = /^ {0,3}> ?/;
const LIST_ITEM = /^( *)([-*+]|\d{1,9}[.)])([ \t]+|$)(.*)$/;
const TABLE_DELIMITER = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

const isBlank = (line) => line.trim() === "";
const indentOf = (line) => line.match(/^ */)[0].length;
const expandTabs = (line) => line.replace(/\t/g, "    ");

// ---------------------------------------------------------------------------
// Tables

function splitRow(line) {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|") && !row.endsWith("\\|")) row = row.slice(0, -1);

  const cells: string[] = [];
  let current = "";
  let inCode = false;
  for (let index = 0; index < row.length; index += 1) {
    const char = row[index];
    if (char === "\\" && row[index + 1] === "|") {
      current += "|";
      index += 1;
    } else if (char === "`") {
      inCode = !inCode;
      current += char;
    } else if (char === "|" && !inCode) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function isTableStart(lines, index) {
  return (
    index + 1 < lines.length &&
    lines[index].includes("|") &&
    TABLE_DELIMITER.test(lines[index + 1]) &&
    splitRow(lines[index]).length === splitRow(lines[index + 1]).length
  );
}

function parseTable(lines, index) {
  const header = splitRow(lines[index]);
  const align = splitRow(lines[index + 1]).map((cell): "left" | "right" | "center" | null => {
    const left = cell.startsWith(":");
    const right = cell.endsWith(":");
    return left && right ? "center" : right ? "right" : left ? "left" : null;
  });

  const rows: InlineNode[][][] = [];
  let next = index + 2;
  while (next < lines.length && !isBlank(lines[next]) && lines[next].includes("|")) {
    const cells = splitRow(lines[next]);
    rows.push(header.map((_, column) => parseInline(cells[column] ?? "")));
    next += 1;
  }

  return {
    block: { type: "table" as const, align, header: header.map((cell) => parseInline(cell)), rows },
    next,
  };
}

// ---------------------------------------------------------------------------
// Lists

function listMarker(line) {
  const match = LIST_ITEM.exec(line);
  if (!match) return null;
  const [, indent, marker, spacing, rest] = match;
  const ordered = /\d/.test(marker);
  // A marker followed by 5+ spaces starts indented code; treat it as one space.
  const gap = spacing.length === 0 || spacing.length > 4 ? 1 : spacing.length;
  return {
    indent: indent.length,
    ordered,
    bullet: ordered ? marker.slice(-1) : marker,
    start: ordered ? Number.parseInt(marker, 10) : null,
    contentOffset: indent.length + marker.length + gap,
    firstLine: spacing.length > 4 ? `${" ".repeat(spacing.length - 1)}${rest}` : rest,
  };
}

function parseList(lines, index) {
  const first = listMarker(lines[index])!;
  const items: ListItem[] = [];
  let loose = false;
  let next = index;

  while (next < lines.length) {
    const marker = listMarker(lines[next]);
    if (!marker || marker.ordered !== first.ordered || marker.bullet !== first.bullet || marker.indent >= first.contentOffset) break;

    const content = [marker.firstLine];
    next += 1;
    let sawBlank = false;

    while (next < lines.length) {
      const line = lines[next];
      if (isBlank(line)) {
        sawBlank = true;
        content.push("");
        next += 1;
        continue;
      }
      if (indentOf(line) >= marker.contentOffset) {
        content.push(line.slice(marker.contentOffset));
        next += 1;
        continue;
      }
      // Lazy continuation of the item's paragraph.
      if (!sawBlank && !listMarker(line) && !startsBlock(lines, next)) {
        content.push(line.trim());
        next += 1;
        continue;
      }
      break;
    }

    while (content.length && isBlank(content[content.length - 1])) content.pop();
    if (sawBlank && next < lines.length && listMarker(lines[next])?.bullet === first.bullet) loose = true;
    if (content.some((line, lineIndex) => isBlank(line) && lineIndex < content.length - 1)) loose = true;

    let checked: boolean | null = null;
    const task = /^\[([ xX])\][ \t]+/.exec(content[0]);
    if (task) {
      checked = task[1] !== " ";
      content[0] = content[0].slice(task[0].length);
    }

    items.push({ checked, children: parseBlocks(content) });

    // A blank line followed by something that is not a sibling item ends the list.
    if (sawBlank && !(next < lines.length && listMarker(lines[next]))) break;
  }

  return {
    block: { type: "list" as const, ordered: first.ordered, start: first.start, loose, items },
    next,
  };
}

// ---------------------------------------------------------------------------
// Blocks

function startsBlock(lines, index) {
  const line = lines[index];
  return (
    FENCE.test(line) ||
    LANG_OPEN.test(line) ||
    HEADING.test(line) ||
    THEMATIC_BREAK.test(line) ||
    BLOCKQUOTE.test(line) ||
    isTableStart(lines, index)
  );
}

// A list interrupts a paragraph only with a bullet or "1." (CommonMark rule),
// so "2024. was a year" inside a sentence stays text.
function interruptsParagraph(lines, index) {
  if (startsBlock(lines, index)) return true;
  const marker = listMarker(lines[index]);
  return Boolean(marker && marker.firstLine.trim() && (!marker.ordered || marker.start === 1));
}

export function parseBlocks(lines: string[]): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isBlank(line)) {
      index += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const [, marker, language] = fence;
      const indent = indentOf(line);
      const code: string[] = [];
      index += 1;
      while (index < lines.length) {
        const closing = lines[index].trim();
        if (closing.startsWith(marker[0].repeat(marker.length)) && /^[`~]+$/.test(closing)) break;
        code.push(lines[index].slice(Math.min(indent, indentOf(lines[index]))));
        index += 1;
      }
      index += 1;
      blocks.push({ type: "code", language: language.toLowerCase(), text: code.join("\n") });
      continue;
    }

    const lang = LANG_OPEN.exec(line);
    if (lang) {
      const inner: string[] = [];
      let depth = 1;
      index += 1;
      let inFence: string | null = null;
      while (index < lines.length) {
        const current = lines[index];
        const fence = FENCE.exec(current);
        if (fence && (!inFence || current.trim().startsWith(inFence))) inFence = inFence ? null : fence[1];
        if (!inFence) {
          if (CONTAINER_OPEN.test(current)) depth += 1;
          else if (CONTAINER_CLOSE.test(current) && --depth === 0) break;
        }
        inner.push(current);
        index += 1;
      }
      index += 1;
      blocks.push({
        type: "lang",
        locales: lang[1].split(",").map((item) => normalizeTag(item)),
        children: parseBlocks(inner),
      });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, children: parseInline(heading[2] ?? "") });
      index += 1;
      continue;
    }

    if (THEMATIC_BREAK.test(line)) {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    if (BLOCKQUOTE.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length && !isBlank(lines[index])) {
        quoted.push(lines[index].replace(BLOCKQUOTE, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", children: parseBlocks(quoted) });
      continue;
    }

    if (isTableStart(lines, index)) {
      const { block, next } = parseTable(lines, index);
      blocks.push(block);
      index = next;
      continue;
    }

    if (listMarker(line)) {
      const { block, next } = parseList(lines, index);
      blocks.push(block);
      index = next;
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlank(lines[index]) && !interruptsParagraph(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    // Keep hard-break markers (two trailing spaces / backslash) for parseInline.
    const raw = paragraph.map((text, lineIndex) => {
      const original = lines[index - paragraph.length + lineIndex];
      return / {2,}$/.test(original) ? `${text}  ` : text;
    });
    blocks.push({ type: "paragraph", children: parseInline(raw.join("\n")) });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Inline

const PUNCTUATION = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
const BARE_URL = /^https?:\/\/[^\s<]*[^\s<.,:;"')\]!?*_~]/;
const AUTOLINK = /^<((?:https?:\/\/|mailto:)[^\s<>]+)>/;

// Finds the matching "]" for a "[" at `start`, honouring nesting and escapes.
function closingBracket(text, start) {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === "\\") index += 1;
    else if (char === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) index = end;
    } else if (char === "[") depth += 1;
    else if (char === "]" && --depth === 0) return index;
  }
  return -1;
}

// Parses "(destination "title")" at `start`; returns null when malformed.
function linkTarget(text, start) {
  if (text[start] !== "(") return null;
  let index = start + 1;
  while (text[index] === " ") index += 1;

  let href = "";
  if (text[index] === "<") {
    const end = text.indexOf(">", index);
    if (end === -1) return null;
    href = text.slice(index + 1, end);
    index = end + 1;
  } else {
    let depth = 0;
    while (index < text.length) {
      const char = text[index];
      if (char === "\\" && PUNCTUATION.test(text[index + 1] ?? "")) {
        href += text[index + 1];
        index += 2;
        continue;
      }
      if (/\s/.test(char)) break;
      if (char === "(") depth += 1;
      if (char === ")") {
        if (depth === 0) break;
        depth -= 1;
      }
      href += char;
      index += 1;
    }
  }

  while (text[index] === " ") index += 1;
  let title: string | undefined;
  const quote = text[index];
  if (quote === '"' || quote === "'") {
    const end = text.indexOf(quote, index + 1);
    if (end === -1) return null;
    title = text.slice(index + 1, end);
    index = end + 1;
    while (text[index] === " ") index += 1;
  }

  return text[index] === ")" ? { href, title, end: index + 1 } : null;
}

// Closing delimiter for emphasis: not preceded by whitespace, and for single
// "*"/"_" not part of a doubled run.
function closingDelimiter(text, delimiter, from) {
  let index = from;
  while ((index = text.indexOf(delimiter, index)) !== -1) {
    const before = text[index - 1];
    const after = text[index + delimiter.length];
    const doubled = delimiter.length === 1 && (after === delimiter || before === delimiter);
    const escaped = before === "\\";
    const intraword = delimiter[0] === "_" && /\w/.test(after ?? "");
    if (index > from && !/\s/.test(before) && !doubled && !escaped && !intraword) return index;
    index += doubled ? 2 : 1;
  }
  return -1;
}

function pushText(nodes, value) {
  const last = nodes[nodes.length - 1];
  if (last?.type === "text") last.value += value;
  else nodes.push({ type: "text", value });
}

// `links: false` parses a link's label: links cannot nest in HTML, so
// nested links and autolinks there stay plain text.
export function parseInline(text: string, { links = true }: { links?: boolean } = {}): InlineNode[] {
  const nodes: InlineNode[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    const rest = text.slice(index);

    // Escapes
    if (char === "\\" && PUNCTUATION.test(text[index + 1] ?? "")) {
      pushText(nodes, text[index + 1]);
      index += 2;
      continue;
    }

    // Hard breaks: two trailing spaces or a backslash before a newline.
    if (char === "\n") {
      const hard = /( {2,}|\\)$/.test(text.slice(0, index));
      if (hard && nodes[nodes.length - 1]?.type === "text") {
        const last = nodes[nodes.length - 1] as { type: "text"; value: string };
        last.value = last.value.replace(/( {2,}|\\)$/, "");
      }
      if (hard) nodes.push({ type: "br" });
      else pushText(nodes, " ");
      index += 1;
      continue;
    }

    // Code spans: a run of N backticks closed by exactly N backticks.
    if (char === "`") {
      const run = /^`+/.exec(rest)![0];
      const closing = new RegExp(`(?<!\`)${run}(?!\`)`, "g");
      closing.lastIndex = index + run.length;
      const match = closing.exec(text);
      if (match) {
        let value = text.slice(index + run.length, match.index).replace(/\n/g, " ");
        if (/^ .* $/.test(value) && value.trim()) value = value.slice(1, -1);
        nodes.push({ type: "code", value });
        index = match.index + run.length;
      } else {
        pushText(nodes, run);
        index += run.length;
      }
      continue;
    }

    // Images and links
    if ((links && char === "[") || (char === "!" && text[index + 1] === "[")) {
      const image = char === "!";
      const open = image ? index + 1 : index;
      const close = closingBracket(text, open);
      const target = close !== -1 ? linkTarget(text, close + 1) : null;
      if (target) {
        const label = text.slice(open + 1, close);
        nodes.push(
          image
            ? { type: "image", src: target.href, alt: label, title: target.title }
            : { type: "link", href: target.href, title: target.title, children: parseInline(label, { links: false }) },
        );
        index = target.end;
        continue;
      }
    }

    // Autolinks
    const autolink = links && char === "<" ? AUTOLINK.exec(rest) : null;
    if (autolink) {
      nodes.push({ type: "link", href: autolink[1], children: [{ type: "text", value: autolink[1].replace(/^mailto:/, "") }] });
      index += autolink[0].length;
      continue;
    }
    if (links && char === "h" && !/\w/.test(text[index - 1] ?? "")) {
      const url = BARE_URL.exec(rest);
      if (url) {
        nodes.push({ type: "link", href: url[0], children: [{ type: "text", value: url[0] }] });
        index += url[0].length;
        continue;
      }
    }

    // Strong, strikethrough, emphasis
    const delimiter = ["**", "__", "~~"].find((item) => rest.startsWith(item)) ?? (char === "*" || char === "_" ? char : null);
    const leftFlanking = delimiter && rest[delimiter.length] && !/\s/.test(rest[delimiter.length]);
    const wordBefore = /\w/.test(text[index - 1] ?? "");
    if (delimiter && leftFlanking && !(delimiter[0] === "_" && wordBefore)) {
      const end = closingDelimiter(text, delimiter, index + delimiter.length);
      if (end !== -1) {
        const type = delimiter === "~~" ? "del" : delimiter.length === 2 ? "strong" : "em";
        nodes.push({ type, children: parseInline(text.slice(index + delimiter.length, end), { links }) });
        index = end + delimiter.length;
        continue;
      }
    }

    pushText(nodes, delimiter && !leftFlanking ? delimiter : char);
    index += delimiter && !leftFlanking ? delimiter.length : 1;
  }

  return nodes;
}

function normalizeTag(tag) {
  return tag.trim().replace("_", "-").toLowerCase();
}

// Does a block written for `tag` ("pt-br") serve the UI `locale` ("pt")?
function matches(tag, locale) {
  return tag === locale || tag.split("-")[0] === locale.split("-")[0];
}

// Resolves language blocks for one locale. Consecutive lang blocks (blank
// lines between them are fine) are alternatives of the same content: the one
// for `locale` wins, then the first fallback locale, then the first block.
// Returns plain blocks, each chosen group wrapped as { type: "lang-selected" }
// so the renderer can set lang="…" on it.
export function selectLocale(blocks: MarkdownBlock[], locale: string, fallbacks: string[] = ["en"]): MarkdownBlock[] {
  const result: MarkdownBlock[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (block.type !== "lang") {
      result.push(block);
      index += 1;
      continue;
    }

    const group: LangBlock[] = [];
    while (index < blocks.length && blocks[index].type === "lang") group.push(blocks[index++] as LangBlock);

    const target = normalizeTag(locale);
    const chosen =
      group.find((item) => item.locales.some((tag) => tag === target)) ??
      group.find((item) => item.locales.some((tag) => matches(tag, target))) ??
      fallbacks.map((fallback) => group.find((item) => item.locales.some((tag) => matches(tag, normalizeTag(fallback))))).find(Boolean) ??
      group[0];

    result.push({
      type: "lang-selected",
      locale: chosen.locales.find((tag) => matches(tag, target)) ?? chosen.locales[0],
      children: selectLocale(chosen.children, locale, fallbacks),
    });
  }

  return result;
}

export function parseMarkdown(source: unknown): MarkdownBlock[] {
  if (!source) return [];
  return parseBlocks(expandTabs(String(source).replace(/\r\n?/g, "\n")).split("\n"));
}

// Only these URL schemes become links/images; anything else (javascript:,
// data:, vbscript:…) is rendered as plain text.
export function safeUrl(url: unknown, { image = false }: { image?: boolean } = {}): string | null {
  const value = String(url ?? "").trim();
  if (/^(https?:|\/(?!\/)|#|\.{1,2}\/)/i.test(value)) return value;
  if (!image && /^mailto:/i.test(value)) return value;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value) && !value.startsWith("//")) return value;
  return null;
}

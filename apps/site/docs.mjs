// Renders docs/*.md into dist/docs/*.html with oaspect's own Markdown parser
// and highlighter (@oaspect/core): sidebar navigation, an "On this page"
// list, previous/next links and copy buttons on code blocks.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMarkdown, safeUrl, tokenize } from "@oaspect/core";
import { BASE_CSS, FAVICON, escapeHtml, footer, header, icon } from "./shared.mjs";

// Sidebar order. Each entry is [file slug, title]; "index" is docs/index.html.
export const NAV = [
  ["Getting started", [["index", "Introduction"], ["installation", "Installation"], ["frameworks", "Frameworks"]]],
  ["Guides", [["configuration", "Configuration"], ["theming", "Theming and branding"], ["localization", "Localization"], ["try-it", "Try it and authentication"], ["server", "Server helpers"], ["cli", "CLI"]]],
  ["Reference", [["openapi", "OpenAPI support"], ["code-samples", "Code samples"], ["core", "@oaspect/core"], ["faq", "FAQ and limitations"]]],
];

const EDIT_BASE = "https://github.com/oaspect/oaspect/edit/main/apps/site/docs/";

// Fenced-code languages → @oaspect/core tokenizer languages.
const HIGHLIGHT = { js: "javascript", jsx: "javascript", mjs: "javascript", ts: "javascript", tsx: "javascript", javascript: "javascript", json: "json", sh: "shell", bash: "shell", shell: "shell", http: "http", php: "php", python: "python", go: "go", ruby: "ruby", powershell: "powershell" };

// core has no HTML tokenizer; this one covers tags, attributes, strings and comments.
function tokenizeHtml(code) {
  const tokens = [];
  const pattern = /(<!--[\s\S]*?-->)|(<\/?[\w-]+)|([\w-:]+)(?==)|("[^"]*"|'[^']*')|(\/?>)/g;
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    if (match.index > last) tokens.push({ type: null, text: code.slice(last, match.index) });
    const [text, comment, tag, attr, string] = match;
    tokens.push({ type: comment ? "comment" : tag ? "keyword" : attr ? "attr" : string ? "string" : "keyword", text });
    last = match.index + text.length;
  }
  if (last < code.length) tokens.push({ type: null, text: code.slice(last) });
  return tokens;
}

function highlight(code, language) {
  const lang = String(language ?? "").toLowerCase();
  const tokens = lang === "html" ? tokenizeHtml(code) : HIGHLIGHT[lang] ? tokenize(code, HIGHLIGHT[lang]) : [{ type: null, text: code }];
  return tokens.map(({ type, text }) => (type ? `<span class="tk-${type}">${escapeHtml(text)}</span>` : escapeHtml(text))).join("");
}

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[`'"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const plain = (nodes) => nodes.map((node) => (node.type === "text" || node.type === "code" ? node.value : node.children ? plain(node.children) : "")).join("");

// Relative links to other pages are written as "configuration.md#theme" in the
// sources (so they work on GitHub too) and become .html here.
function href(url) {
  const safe = safeUrl(url);
  if (!safe) return null;
  if (/^[\w-]+\.md(#.*)?$/.test(safe)) {
    const [file, hash = ""] = safe.split("#");
    const slug = file.replace(/\.md$/, "");
    return `${slug === "index" ? "./" : `${slug}.html`}${hash ? `#${hash}` : ""}`;
  }
  return safe;
}

function inline(nodes) {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return escapeHtml(node.value);
        case "br":
          return "<br />";
        case "code":
          return `<code>${escapeHtml(node.value)}</code>`;
        case "strong":
        case "em":
        case "del":
          return `<${node.type === "strong" ? "strong" : node.type === "em" ? "em" : "del"}>${inline(node.children)}</${node.type === "strong" ? "strong" : node.type === "em" ? "em" : "del"}>`;
        case "link": {
          const target = href(node.href);
          if (!target) return inline(node.children);
          const external = /^https?:/.test(target);
          return `<a href="${escapeHtml(target)}"${external ? ' rel="noopener"' : ""}>${inline(node.children)}</a>`;
        }
        case "image": {
          const src = safeUrl(node.src, { image: true });
          return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.alt)}" loading="lazy" />` : "";
        }
        default:
          return "";
      }
    })
    .join("");
}

function blocks(list, toc) {
  return list
    .map((block) => {
      switch (block.type) {
        case "heading": {
          const text = plain(block.children);
          if (block.level === 1) return "";
          const id = slugify(text);
          if (block.level <= 3) toc.push({ level: block.level, id, text });
          return `<h${block.level} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>${inline(block.children)}</h${block.level}>`;
        }
        case "paragraph":
          return `<p>${inline(block.children)}</p>`;
        case "code":
          return `<div class="code"><button class="copy" type="button" aria-label="Copy code">${icon("copy", 15)}</button>${block.language ? `<span class="code-lang">${escapeHtml(block.language)}</span>` : ""}<pre><code>${highlight(block.text, block.language)}</code></pre></div>`;
        case "blockquote":
          return `<blockquote>${blocks(block.children, toc)}</blockquote>`;
        case "hr":
          return "<hr />";
        case "list": {
          const tag = block.ordered ? "ol" : "ul";
          const items = block.items
            .map((item) => {
              const body = item.children.length === 1 && item.children[0].type === "paragraph" && !block.loose ? inline(item.children[0].children) : blocks(item.children, toc);
              const box = item.checked === null ? "" : `<input type="checkbox" disabled${item.checked ? " checked" : ""} /> `;
              return `<li>${box}${body}</li>`;
            })
            .join("");
          return `<${tag}${block.ordered && block.start && block.start !== 1 ? ` start="${block.start}"` : ""}>${items}</${tag}>`;
        }
        case "table": {
          const cell = (tag, nodes, index) => `<${tag}${block.align[index] ? ` style="text-align:${block.align[index]}"` : ""}>${inline(nodes)}</${tag}>`;
          return `<div class="table"><table><thead><tr>${block.header.map((nodes, index) => cell("th", nodes, index)).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((nodes, index) => cell("td", nodes, index)).join("")}</tr>`).join("")}</tbody></table></div>`;
        }
        case "lang":
        case "lang-selected":
          return blocks(block.children, toc);
        default:
          return "";
      }
    })
    .join("\n");
}

const CSS = `${BASE_CSS}
    .docs { display: grid; grid-template-columns: 15rem minmax(0, 1fr) 13rem; gap: 3rem; width: min(84rem, 100% - 2rem); margin-inline: auto; }
    .sidebar, .toc { position: sticky; top: 4rem; align-self: start; max-height: calc(100vh - 4rem); overflow-y: auto; padding: 2rem 0; }
    .sidebar h2 { font: 600 .75rem/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: 1.5rem 0 .6rem; }
    .sidebar h2:first-child { margin-top: 0; }
    .sidebar ul, .toc ul { list-style: none; margin: 0; padding: 0; }
    .sidebar a { display: block; padding: .35rem .7rem; border-radius: .5rem; text-decoration: none; color: var(--muted); font-size: .925rem; }
    .sidebar a:hover { color: var(--fg); background: var(--bg-soft); }
    .sidebar a[aria-current="page"] { color: var(--accent); background: var(--accent-soft); font-weight: 600; }
    .sidebar .extra { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); }
    .toc h2 { font-size: .8rem; font-weight: 600; margin: 0 0 .75rem; }
    .toc a { display: block; padding: .2rem 0; font-size: .85rem; color: var(--muted); text-decoration: none; }
    .toc a:hover, .toc a.active { color: var(--accent); }
    .toc .l3 { padding-inline-start: .8rem; }
    .toc .edit { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border); display: inline-flex; gap: .4rem; align-items: center; }
    @media (max-width: 75rem) { .docs { grid-template-columns: 14rem minmax(0, 1fr); } .toc { display: none; } }
    @media (max-width: 52rem) {
      .docs { grid-template-columns: minmax(0, 1fr); gap: 0; }
      .sidebar { position: static; max-height: none; padding: 1rem 0 0; }
      .sidebar-body { display: none; }
      .sidebar.open .sidebar-body { display: block; }
      .menu { display: inline-flex !important; }
    }
    .menu { display: none; align-items: center; gap: .5rem; font: inherit; font-size: .9rem; color: var(--fg); background: var(--bg-soft); border: 1px solid var(--border); border-radius: .6rem; padding: .5rem .8rem; cursor: pointer; }

    article { padding: 2rem 0 0; min-width: 0; }
    .eyebrow { font: 600 .75rem/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); }
    article h1 { font-size: clamp(2rem, 4vw, 2.6rem); letter-spacing: -.03em; line-height: 1.15; margin: .6rem 0 1rem; }
    article .lead { font-size: 1.15rem; color: var(--muted); margin: 0 0 2rem; }
    article h2 { font-size: 1.55rem; letter-spacing: -.02em; margin: 2.75rem 0 .75rem; padding-top: .5rem; }
    article h3 { font-size: 1.15rem; margin: 2rem 0 .5rem; }
    article h4 { font-size: 1rem; margin: 1.5rem 0 .5rem; }
    article h2, article h3, article h4 { position: relative; }
    .anchor { position: absolute; inset-inline-start: -1.1em; color: var(--muted); text-decoration: none; opacity: 0; }
    :is(h2, h3, h4):hover .anchor { opacity: 1; }
    article p, article li { color: color-mix(in oklab, var(--fg) 88%, var(--muted)); }
    article a { color: var(--accent); text-underline-offset: 3px; }
    article :not(pre) > code { font-size: .875em; background: var(--inline-code); border: 1px solid var(--border); border-radius: .35rem; padding: .1rem .35rem; }
    article ul, article ol { padding-inline-start: 1.4rem; }
    article li + li { margin-top: .3rem; }
    article blockquote { margin: 1.5rem 0; padding: .9rem 1.1rem; border-inline-start: 3px solid var(--accent); background: var(--accent-soft); border-radius: .5rem; }
    article blockquote p { margin: .3rem 0; }
    article hr { border: 0; border-top: 1px solid var(--border); margin: 2.5rem 0; }
    .table { overflow-x: auto; margin: 1.25rem 0; border: 1px solid var(--border); border-radius: .75rem; }
    table { border-collapse: collapse; width: 100%; font-size: .9rem; }
    th, td { text-align: start; padding: .6rem .8rem; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { background: var(--bg-soft); font-weight: 600; }
    td code { white-space: nowrap; }
    tr:last-child td { border-bottom: 0; }
    .code { position: relative; margin: 1.25rem 0; background: var(--code-bg); color: var(--code-fg); border-radius: .75rem; border: 1px solid color-mix(in oklab, var(--code-bg) 70%, var(--border)); }
    .code pre { margin: 0; padding: 1rem 1.15rem; overflow-x: auto; font-size: .85rem; line-height: 1.65; }
    .code .copy { position: absolute; top: .5rem; inset-inline-end: .5rem; background: rgb(255 255 255 / .06); border: 0; color: rgb(231 236 232 / .7); border-radius: .4rem; padding: .35rem; cursor: pointer; opacity: 0; transition: opacity .15s; }
    .code:hover .copy, .code .copy:focus-visible { opacity: 1; }
    .code-lang { position: absolute; top: .55rem; inset-inline-end: 2.6rem; font: .7rem ui-monospace, monospace; color: rgb(231 236 232 / .45); }
    .tk-keyword { color: #c084fc; } .tk-string { color: #86efac; } .tk-number { color: #fdba74; } .tk-literal { color: #f9a8d4; }
    .tk-key { color: #7dd3fc; } .tk-attr { color: #fcd34d; } .tk-function { color: #fde68a; } .tk-comment { color: #7c857e; font-style: italic; }
    .tk-variable { color: #fca5a5; } .tk-type { color: #5eead4; }
    .pager { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 4rem; }
    .pager a { display: flex; flex-direction: column; gap: .2rem; padding: 1rem 1.2rem; border: 1px solid var(--border); border-radius: .8rem; text-decoration: none; }
    .pager a:hover { border-color: var(--accent); }
    .pager span { font-size: .8rem; color: var(--muted); }
    .pager .next { text-align: end; grid-column: 2; }
`;

const SCRIPT = `
    for (const button of document.querySelectorAll(".code .copy")) {
      button.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(button.parentElement.querySelector("code").textContent);
          button.setAttribute("aria-label", "Copied");
          setTimeout(() => button.setAttribute("aria-label", "Copy code"), 1500);
        } catch {}
      });
    }
    const sidebar = document.querySelector(".sidebar");
    document.querySelector(".menu").addEventListener("click", (event) => {
      const open = sidebar.classList.toggle("open");
      event.currentTarget.setAttribute("aria-expanded", open);
    });
    const links = [...document.querySelectorAll(".toc a[href^='#']")];
    const headings = links.map((link) => document.getElementById(link.hash.slice(1))).filter(Boolean);
    const spy = () => {
      let current = headings[0];
      for (const heading of headings) if (heading.getBoundingClientRect().top < 120) current = heading;
      for (const link of links) link.classList.toggle("active", current && link.hash === "#" + current.id);
    };
    addEventListener("scroll", spy, { passive: true });
    spy();
`;

export function renderDocs({ dir, version }) {
  const pages = NAV.flatMap(([section, items]) => items.map(([slug, title]) => ({ section, slug, title })));
  return pages.map((page, index) => {
    const source = readFileSync(join(dir, `${page.slug}.md`), "utf8");
    const parsed = parseMarkdown(source);
    // The first paragraph after the H1 is the page lead.
    const h1 = parsed.find((block) => block.type === "heading" && block.level === 1);
    const title = h1 ? plain(h1.children) : page.title;
    const leadIndex = parsed.findIndex((block) => block.type === "paragraph");
    const lead = leadIndex >= 0 ? parsed[leadIndex] : null;
    const body = parsed.filter((_, i) => i !== leadIndex);
    const toc = [];
    const content = blocks(body, toc);
    const prev = pages[index - 1];
    const next = pages[index + 1];
    const link = (slug) => (slug === "index" ? "./" : `${slug}.html`);
    const description = lead ? plain(lead.children) : title;

    const sidebar = NAV.map(
      ([section, items]) => `<h2>${escapeHtml(section)}</h2>
          <ul>${items.map(([slug, label]) => `<li><a href="${link(slug)}"${slug === page.slug ? ' aria-current="page"' : ""}>${escapeHtml(label)}</a></li>`).join("")}</ul>`,
    ).join("\n          ");

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · oaspect docs</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="icon" href="${FAVICON}" />
  <style>${CSS}</style>
</head>
<body>
  ${header({ base: "../", version, current: "docs" })}
  <div class="docs">
    <nav class="sidebar" aria-label="Docs">
      <button class="menu" type="button" aria-expanded="false">${icon("menu", 16)} ${escapeHtml(page.section)} / ${escapeHtml(page.title)}</button>
      <div class="sidebar-body">
          ${sidebar}
        <div class="extra"><ul>
          <li><a href="../reference.html">Server API, rendered by oaspect</a></li>
          <li><a href="../demo/roastery.html">Live demo</a></li>
        </ul></div>
      </div>
    </nav>
    <main id="content">
      <article>
        <span class="eyebrow">${escapeHtml(page.section)}</span>
        <h1>${escapeHtml(title)}</h1>
        ${lead ? `<p class="lead">${inline(lead.children)}</p>` : ""}
        ${content}
        <nav class="pager" aria-label="Pages">
          ${prev ? `<a class="prev" href="${link(prev.slug)}"><span>Previous</span>${escapeHtml(prev.title)}</a>` : ""}
          ${next ? `<a class="next" href="${link(next.slug)}"><span>Next</span>${escapeHtml(next.title)}</a>` : ""}
        </nav>
      </article>
    </main>
    <aside class="toc" aria-label="On this page">
      ${toc.length ? `<h2>On this page</h2><ul>${toc.map((item) => `<li class="l${item.level}"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`).join("")}</ul>` : ""}
      <a class="edit" href="${EDIT_BASE}${page.slug}.md">${icon("edit", 14)} Edit this page</a>
    </aside>
  </div>
  ${footer({ base: "../" })}
  <script>${SCRIPT}</script>
</body>
</html>
`;
    return { file: page.slug === "index" ? "index.html" : `${page.slug}.html`, html };
  });
}

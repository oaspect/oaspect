import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { parseInline, parseMarkdown, safeUrl, selectLocale } from "../src/index";

// Compact inline representation for readable assertions.
function flat(nodes) {
  return nodes
    .map((node) => {
      switch (node.type) {
        case "text":
          return node.value;
        case "br":
          return "<br>";
        case "code":
          return `\`${node.value}\``;
        case "link":
          return `[${flat(node.children)}](${node.href})`;
        case "image":
          return `![${node.alt}](${node.src})`;
        default:
          return `<${node.type}>${flat(node.children)}</${node.type}>`;
      }
    })
    .join("");
}

describe("inline", () => {
  test("emphasis, strong, strikethrough and nesting", () => {
    assert.equal(flat(parseInline("a **b *c* d** ~~e~~ _f_")), "a <strong>b <em>c</em> d</strong> <del>e</del> <em>f</em>");
    assert.equal(flat(parseInline("**Format:** JSON")), "<strong>Format:</strong> JSON");
  });

  test("code spans keep their content literal", () => {
    assert.equal(flat(parseInline("use `{ \"data\": ... }` and ``a ` b``")), 'use `{ "data": ... }` and `a ` b`');
    assert.equal(flat(parseInline("`**not bold**`")), "`**not bold**`");
  });

  test("intraword underscores and unmatched delimiters stay text", () => {
    assert.equal(flat(parseInline("snake_case_name and filter[per_page]")), "snake_case_name and filter[per_page]");
    assert.equal(flat(parseInline("2 * 3 = 6 and **open")), "2 * 3 = 6 and **open");
  });

  test("links, images, autolinks and bare URLs", () => {
    assert.equal(flat(parseInline('[docs](https://x.dev/a_(b) "T")')), "[docs](https://x.dev/a_(b))");
    assert.equal(flat(parseInline("![logo](/logo.svg)")), "![logo](/logo.svg)");
    assert.equal(flat(parseInline("<https://a.dev> or https://b.dev/x.")), "[https://a.dev](https://a.dev) or [https://b.dev/x](https://b.dev/x).");
    assert.equal(flat(parseInline("[not a link] here")), "[not a link] here");
  });

  test("escapes and hard breaks", () => {
    assert.equal(flat(parseInline("\\*literal\\* \\`x\\`")), "*literal* `x`");
    assert.equal(flat(parseInline("one  \ntwo\\\nthree\nfour")), "one<br>two<br>three four");
  });

  test("raw HTML is kept as text", () => {
    assert.equal(flat(parseInline("<script>alert(1)</script>")), "<script>alert(1)</script>");
  });
});

describe("blocks", () => {
  test("headings, paragraphs, hr, blockquote", () => {
    const blocks = parseMarkdown("# Title #\nIntro line\nstill intro\n\n---\n\n> quoted\n> more");
    assert.deepEqual(blocks.map((block) => block.type), ["heading", "paragraph", "hr", "blockquote"]);
    assert.equal(blocks[0].level, 1);
    assert.equal(flat(blocks[0].children), "Title");
    assert.equal(flat(blocks[1].children), "Intro line still intro");
    assert.equal(flat(blocks[3].children[0].children), "quoted more");
  });

  test("fenced code keeps language and content", () => {
    const [block] = parseMarkdown("```json\n{\n  \"a\": 1\n}\n```");
    assert.deepEqual(block, { type: "code", language: "json", text: '{\n  "a": 1\n}' });
    const [tilde] = parseMarkdown("~~~\n```\nnested\n~~~");
    assert.equal(tilde.text, "```\nnested");
  });

  test("GFM tables with alignment, inline content and escaped pipes", () => {
    const [table] = parseMarkdown("| Param | Desc | N |\n|:---|---|--:|\n| `page` | a \\| b | 1 |\n| **x** | | ");
    assert.equal(table.type, "table");
    assert.deepEqual(table.align, ["left", null, "right"]);
    assert.deepEqual(table.header.map(flat), ["Param", "Desc", "N"]);
    assert.deepEqual(table.rows.map((row) => row.map(flat)), [["`page`", "a | b", "1"], ["<strong>x</strong>", "", ""]]);
  });

  test("pipes inside code spans do not split cells", () => {
    const [table] = parseMarkdown("| a | b |\n|---|---|\n| `x|y` | z |");
    assert.deepEqual(table.rows[0].map(flat), ["`x|y`", "z"]);
  });

  test("a table directly after a paragraph line", () => {
    const blocks = parseMarkdown("Parameters:\n| a | b |\n|---|---|\n| 1 | 2 |");
    assert.deepEqual(blocks.map((block) => block.type), ["paragraph", "table"]);
  });

  test("nested, ordered and task lists", () => {
    const [list] = parseMarkdown("- one\n  - nested\n- two\n  continued");
    assert.equal(list.type, "list");
    assert.equal(list.items.length, 2);
    assert.equal(list.items[0].children[1].type, "list");
    assert.equal(flat(list.items[1].children[0].children), "two continued");

    const [ordered] = parseMarkdown("3. c\n4. d");
    assert.deepEqual([ordered.ordered, ordered.start, ordered.items.length], [true, 3, 2]);

    const [tasks] = parseMarkdown("- [x] done\n- [ ] todo");
    assert.deepEqual(tasks.items.map((item) => item.checked), [true, false]);
  });

  test("loose lists are detected", () => {
    assert.equal(parseMarkdown("- a\n\n- b")[0].loose, true);
    assert.equal(parseMarkdown("- a\n- b")[0].loose, false);
  });

  test("numbers inside a sentence do not start a list", () => {
    assert.equal(parseMarkdown("Released in\n2024. It works")[0].type, "paragraph");
  });

  test("the PlayerVerify API introduction renders its table", () => {
    const source = [
      "## Lists",
      "",
      "List endpoints (`GET /{resource}`) share the same query parameters:",
      "",
      "| Parameter | Description |",
      "|---|---|",
      "| `page`, `per_page` | Page number (from 1) and page size (1–100, default 20). |",
      "| `filter[field]` | Exact-match filter, e.g. `filter[status]=pending`. |",
      "",
      "- **Format:** requests and responses are JSON.",
      "- **Money:** e.g. `\"150.0000\"`.",
    ].join("\n");
    const blocks = parseMarkdown(source);
    assert.deepEqual(blocks.map((block) => block.type), ["heading", "paragraph", "table", "list"]);
    assert.equal(blocks[2].rows.length, 2);
    assert.equal(flat(blocks[2].rows[1][0]), "`filter[field]`");
    assert.equal(flat(blocks[3].items[0].children[0].children), "<strong>Format:</strong> requests and responses are JSON.");
  });
});

test("safeUrl allows web, mail and relative URLs only", () => {
  for (const url of ["https://a.dev", "http://a", "/x", "#y", "./z", "page.html", "mailto:a@b.c"]) assert.equal(safeUrl(url), url);
  for (const url of ["javascript:alert(1)", " JAVASCRIPT:alert(1)", "data:text/html,x", "vbscript:x", "//evil.com"]) assert.equal(safeUrl(url), null, url);
  assert.equal(safeUrl("mailto:a@b.c", { image: true }), null);
});

describe("language blocks", () => {
  const source = [
    "Shared intro.",
    "",
    ":::lang en",
    "## Lists",
    "| a | b |",
    "|---|---|",
    "| 1 | 2 |",
    ":::",
    "",
    ":::lang tr, az",
    "## Listeler",
    "```",
    ":::",
    "```",
    ":::",
    "",
    "Shared outro.",
    "",
    ":::lang pt-BR",
    "Olá",
    ":::",
  ].join("\n");
  const blocks = parseMarkdown(source);
  const view = (locale, fallbacks) =>
    selectLocale(blocks, locale, fallbacks).map((block) =>
      block.type === "lang-selected" ? `${block.locale}:${block.children.map((child) => child.type).join("+")}` : block.type,
    );

  test("parses blocks with locales, nested content and fences containing :::", () => {
    assert.deepEqual(blocks.map((block) => block.type), ["paragraph", "lang", "lang", "paragraph", "lang"]);
    assert.deepEqual(blocks[2].locales, ["tr", "az"]);
    assert.deepEqual(blocks[2].children.map((child) => child.type), ["heading", "code"]);
    assert.equal(blocks[2].children[1].text, ":::");
  });

  test("picks the UI language, keeps shared content", () => {
    assert.deepEqual(view("tr"), ["paragraph", "tr:heading+code", "paragraph", "pt-br:paragraph"]);
    assert.deepEqual(view("az"), ["paragraph", "az:heading+code", "paragraph", "pt-br:paragraph"]);
    assert.deepEqual(view("en"), ["paragraph", "en:heading+table", "paragraph", "pt-br:paragraph"]);
  });

  test("falls back to English, then to the first block", () => {
    assert.deepEqual(view("ar"), ["paragraph", "en:heading+table", "paragraph", "pt-br:paragraph"]);
    assert.deepEqual(view("ar", []), ["paragraph", "en:heading+table", "paragraph", "pt-br:paragraph"]);
    assert.deepEqual(view("de", ["tr"]), ["paragraph", "tr:heading+code", "paragraph", "pt-br:paragraph"]);
  });

  test("region tags match the base language", () => {
    assert.equal(view("pt").at(-1), "pt-br:paragraph");
  });

  test("an unclosed block runs to the end", () => {
    const [block] = parseMarkdown(":::lang tr\nMetin");
    assert.equal(block.type, "lang");
    assert.equal(block.children.length, 1);
  });

  test("other ::: lines are not language blocks", () => {
    assert.equal(parseMarkdown(":::note\nx\n:::")[0].type, "paragraph");
  });
});

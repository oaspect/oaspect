"use client";

// Renders OpenAPI descriptions (GFM subset, see src/lib/markdown.js) as React
// elements; raw HTML in the source is never interpreted. Blocks use
// dir="auto" so English spec text stays readable inside an RTL interface.
// ":::lang xx" blocks are resolved for the current UI language.

import { useMemo } from "react";
import { useLocale } from "./i18n/context";
import { parseMarkdown, safeUrl, selectLocale } from "@oaspect/core";
import CodeBlock from "./code-block";

// Fence info strings → tokenizer languages in src/lib/highlight.js.
const CODE_LANGUAGES = {
  json: "json",
  sh: "shell",
  bash: "shell",
  shell: "shell",
  zsh: "shell",
  curl: "shell",
  js: "javascript",
  javascript: "javascript",
  ts: "javascript",
  typescript: "javascript",
  php: "php",
  py: "python",
  python: "python",
  go: "go",
  java: "java",
  kotlin: "kotlin",
  kt: "kotlin",
  cs: "csharp",
  csharp: "csharp",
  rb: "ruby",
  ruby: "ruby",
  swift: "swift",
  dart: "dart",
  rust: "rust",
  rs: "rust",
  c: "c",
  powershell: "powershell",
  ps1: "powershell",
  http: "http",
};

const HEADING_STYLES = {
  1: "text-xl font-bold",
  2: "text-lg font-semibold",
  3: "text-base font-semibold",
  4: "text-sm font-semibold",
  5: "text-sm font-semibold",
  6: "text-xs font-semibold uppercase tracking-wide",
};

function Inline({ nodes }) {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "br":
        return <br key={index} />;
      case "code":
        return (
          <code key={index} dir="ltr" className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {node.value}
          </code>
        );
      case "strong":
        return (
          <strong key={index} className="font-semibold text-foreground">
            <Inline nodes={node.children} />
          </strong>
        );
      case "em":
        return (
          <em key={index}>
            <Inline nodes={node.children} />
          </em>
        );
      case "del":
        return (
          <del key={index}>
            <Inline nodes={node.children} />
          </del>
        );
      case "link": {
        const href = safeUrl(node.href);
        if (!href) return <Inline key={index} nodes={node.children} />;
        const external = /^https?:/i.test(href);
        return (
          <a
            key={index}
            href={href}
            title={node.title}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
            className="text-primary underline underline-offset-2"
          >
            <Inline nodes={node.children} />
          </a>
        );
      }
      case "image": {
        const src = safeUrl(node.src, { image: true });
        if (!src) return node.alt;
        // Plain <img>: description images can come from any host.
        return <img key={index} src={src} alt={node.alt} title={node.title} loading="lazy" className="inline-block max-w-full rounded-lg" />;
      }
      default:
        return null;
    }
  });
}

function Blocks({ blocks, tight = false }) {
  return blocks.map((block, index) => {
    switch (block.type) {
      case "heading": {
        // Descriptions sit under the page's own h1/h2, so levels shift down.
        const Tag = `h${Math.min(block.level + 2, 6)}`;
        return (
          <Tag key={index} dir="auto" className={`${HEADING_STYLES[block.level]} pt-2 text-foreground`}>
            <Inline nodes={block.children} />
          </Tag>
        );
      }
      case "paragraph":
        return tight ? (
          <Inline key={index} nodes={block.children} />
        ) : (
          <p key={index} dir="auto">
            <Inline nodes={block.children} />
          </p>
        );
      case "code":
        return (
          <CodeBlock
            key={index}
            code={block.text}
            language={CODE_LANGUAGES[block.language] ?? "text"}
            toolbar={block.language && <span className="px-1 font-mono text-[11px] text-white/50">{block.language}</span>}
          />
        );
      case "blockquote":
        return (
          <blockquote key={index} className="space-y-3 border-s-4 border-border ps-4 italic">
            <Blocks blocks={block.children} />
          </blockquote>
        );
      case "hr":
        return <hr key={index} className="border-border" />;
      case "lang-selected":
        return (
          <div key={index} lang={block.locale} className="space-y-3">
            <Blocks blocks={block.children} tight={tight} />
          </div>
        );
      case "list": {
        const List = block.ordered ? "ol" : "ul";
        const task = block.items.some((item) => item.checked !== null);
        return (
          <List
            key={index}
            dir="auto"
            start={block.ordered && block.start !== 1 ? block.start : undefined}
            className={`space-y-1.5 ${task ? "ps-1" : `ps-5 ${block.ordered ? "list-decimal" : "list-disc"}`} marker:text-muted-foreground`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className={`${block.loose ? "space-y-2" : "space-y-1"} ${item.checked !== null ? "flex list-none items-start gap-2" : ""}`}>
                {item.checked !== null && (
                  <input type="checkbox" checked={item.checked} readOnly disabled className="mt-1 accent-primary" />
                )}
                <div className={item.checked !== null ? "min-w-0 flex-1 space-y-1" : "contents"}>
                  <Blocks blocks={item.children} tight={!block.loose && item.children.length === 1} />
                </div>
              </li>
            ))}
          </List>
        );
      }
      case "table":
        return (
          // dir="auto": an English table keeps its column order inside an RTL UI.
          // Code tokens (parameter names, values) never wrap mid-token.
          <div key={index} dir="auto" className="overflow-x-auto rounded-lg border border-border">
            <table dir="auto" className="w-full border-collapse text-start text-sm [&_code]:whitespace-nowrap">
              <thead className="bg-muted/60">
                <tr>
                  {block.header.map((cell, column) => (
                    <th
                      key={column}
                      dir="auto"
                      style={block.align[column] ? { textAlign: block.align[column] } : undefined}
                      className="border-b border-border px-3 py-2 text-start font-semibold text-foreground"
                    >
                      <Inline nodes={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-border last:border-b-0">
                    {row.map((cell, column) => (
                      <td
                        key={column}
                        dir="auto"
                        style={block.align[column] ? { textAlign: block.align[column] } : undefined}
                        className="px-3 py-2 align-top"
                      >
                        <Inline nodes={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  });
}

export default function Markdown({ source, className = "" }) {
  const locale = useLocale();
  const blocks = useMemo(() => selectLocale(parseMarkdown(source), locale), [source, locale]);
  if (blocks.length === 0) return null;

  return (
    <div className={`space-y-3 text-sm leading-relaxed ${className}`}>
      <Blocks blocks={blocks} />
    </div>
  );
}

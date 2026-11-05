"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "../i18n/context";
import { directionOf } from "../i18n/index";
import { loadMermaid } from "../mermaid";
import { Caption } from "./blocks";
import { loadPaged } from "./paged";
import { PREVIEW_CSS, printCss } from "./styles";

// The printed book: cover, title page, imprint, contents, chapters,
// appendices and references, laid out in pages by Paged.js.
//
// A book is data: { meta, chapters, references }. Chapters are
// { id, label, title, sections: [{ id, title, num }], content }.

/** A table with an APA caption above it ("Table 4" / title). */
export function BookTable({ label, title, columns, rows, note, t }) {
  return (
    <figure className="table">
      <Caption kind="table" label={label} title={title} t={t} />
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {note && (
        <p className="table-note">
          <em>{t("print.note")}</em> {note}
        </p>
      )}
    </figure>
  );
}

function Contents({ chapters, references, t }) {
  return (
    <section className="front toc" id="contents">
      <h2>{t("print.contents")}</h2>
      <ol>
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <a className="level-1" href={`#${chapter.id}`}>
              <span>
                {chapter.label ? `${chapter.label}. ` : ""}
                {chapter.title}
              </span>
              <span className="dots" />
            </a>
            {chapter.sections?.length > 0 && (
              <ol>
                {chapter.sections.map((section) => (
                  <li key={section.id}>
                    <a className="level-2" href={`#${section.id}`}>
                      <span>
                        {section.num && <span className="num">{section.num}</span>}
                        {section.title}
                      </span>
                      <span className="dots" />
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
        {references.length > 0 && (
          <li>
            <a className="level-1" href="#references">
              <span>{t("print.references")}</span>
              <span className="dots" />
            </a>
          </li>
        )}
      </ol>
    </section>
  );
}

export function Book({ book, style }) {
  const t = useT();
  const { meta, chapters, references } = book;
  const versionLine = meta.version ? `${t("print.version")} ${meta.version}` : null;
  return (
    <>
      {/* Hidden sections would still open pages, so each style renders only its own. */}
      {style !== "apa" && (
      <section className="cover">
        <div>
          {meta.logo && (
            <div className="logo">
              <img src={meta.logo} alt="" />
            </div>
          )}
        </div>
        <div>
          {meta.kicker && <div className="kicker">{meta.kicker}</div>}
          <h1 className="book-title">{meta.title}</h1>
          {meta.subtitle && <div className="subtitle">{meta.subtitle}</div>}
        </div>
        <div className="meta">
          {[meta.organization, versionLine, meta.date].filter(Boolean).map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
      </section>
      )}

      <section className="front first title-page">
        {/* APA running head; inside a page so it does not open one of its own. */}
        <span className="running-head">{meta.title}</span>
        <h2>{meta.title}</h2>
        {meta.subtitle && <p className="subtitle">{meta.subtitle}</p>}
        {meta.organization && <p className="org">{meta.organization}</p>}
        {versionLine && <p>{versionLine}</p>}
        <p>{meta.date}</p>
      </section>

      {style !== "apa" && (
      <section className="front imprint">
        <p>
          <strong>{meta.title}</strong>
          {versionLine ? ` · ${versionLine}` : ""}
        </p>
        <p>{meta.date}</p>
        {meta.contact && <p>{meta.contact}</p>}
        {meta.source && <p className="mono">{meta.source}</p>}
        <p>{t("print.generated")}</p>
      </section>
      )}

      {style === "apa" && meta.summary && (
        <section className="front abstract">
          <h2>{t("print.abstract")}</h2>
          <p>{meta.summary}</p>
        </section>
      )}

      <Contents chapters={chapters} references={references} t={t} />

      {chapters.map((chapter, index) => (
        <section key={chapter.id} id={chapter.id} className={`chapter${index === 0 && style !== "apa" ? " body-start" : ""}`}>
          <div className="chapter-head">
            {chapter.label && <div className="chapter-label">{chapter.label}</div>}
            <h1 className="chapter-title">{chapter.title}</h1>
          </div>
          {chapter.content}
        </section>
      ))}

      {references.length > 0 && (
        <section id="references" className="chapter references">
          <div className="chapter-head">
            <h1 className="chapter-title">{t("print.references")}</h1>
          </div>
          {[...references]
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([url, text]) => (
              <p key={url}>
                {text === url ? "" : `${text}. `}
                <span className="mono">{url}</span>
              </p>
            ))}
        </section>
      )}
    </>
  );
}

// Mermaid blocks become SVG before the pages are laid out.
async function renderDiagrams(root) {
  const blocks = [...root.querySelectorAll('pre[data-mermaid="pending"]')];
  if (blocks.length === 0) return;
  try {
    const mermaid = await loadMermaid();
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
    for (const [index, block] of blocks.entries()) {
      const { svg } = await mermaid.render(`oaspect-print-mermaid-${index}`, block.textContent);
      const figure = document.createElement("div");
      figure.innerHTML = svg;
      block.replaceWith(figure);
    }
  } catch {
    // Diagrams stay as their source text.
  }
}

/**
 * The print preview: a toolbar, then the book as pages. `book` is the data
 * from apiBook()/docsBook(); options are { style, paper, accent }.
 */
export function PrintView({ book, options, onOptions, onClose }) {
  const t = useT();
  const locale = useLocale();
  const sourceRef = useRef(null);
  const pagesRef = useRef(null);
  const [status, setStatus] = useState("preparing");
  const previewerRef = useRef(null);

  // Paged.js adds the book's stylesheet to <head>; a new run or leaving the
  // preview removes the previous one.
  const cleanup = () => {
    try {
      previewerRef.current?.polisher?.destroy?.();
    } catch {
      // already gone
    }
    previewerRef.current = null;
  };
  useEffect(() => cleanup, []);

  useEffect(() => {
    let cancelled = false;
    setStatus("preparing");
    (async () => {
      try {
        const Paged = await loadPaged();
        const content = sourceRef.current.cloneNode(true);
        content.hidden = false;
        await renderDiagrams(content);
        // Pages are measured once, so images must have their size first.
        await Promise.all([...content.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
        if (cancelled) return;
        const fragment = document.createDocumentFragment();
        fragment.append(content);
        cleanup();
        pagesRef.current.innerHTML = "";
        const previewer = new Paged.Previewer();
        previewerRef.current = previewer;
        await previewer.preview(fragment, [{ "oaspect-book.css": printCss(options) }], pagesRef.current);
        if (!cancelled) setStatus("ready");
      } catch (error) {
        if (!cancelled) setStatus(error.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [book, options]);

  const control = "rounded-lg border border-border bg-background px-3 py-1.5 text-sm";
  return (
    <div>
      <style>{PREVIEW_CSS}</style>
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-background/90 px-4 py-2 backdrop-blur">
        <button type="button" onClick={onClose} className={control}>
          {t("print.back")}
        </button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("print.style")}
          <select value={options.style} onChange={(event) => onOptions({ ...options, style: event.target.value })} className={control}>
            <option value="book">{t("print.styleBook")}</option>
            <option value="apa">APA 7</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t("print.paper")}
          <select value={options.paper} onChange={(event) => onOptions({ ...options, paper: event.target.value })} className={control}>
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
        </label>
        <span className="text-sm text-muted-foreground" role="status">
          {status === "preparing" ? t("print.preparing") : status === "ready" ? "" : status}
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={status !== "ready"}
          className="ms-auto rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {t("print.print")}
        </button>
      </div>
      {/* Pages first: in-page links (contents) jump to the first element with the id. */}
      <div ref={pagesRef} className="oaspect-print-pages" lang={locale} dir={directionOf(locale)} />
      <div ref={sourceRef} hidden className="oaspect-book" lang={locale} dir={directionOf(locale)}>
        <Book book={book} style={options.style} />
      </div>
    </div>
  );
}

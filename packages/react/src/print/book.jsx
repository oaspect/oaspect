"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useT } from "../i18n/context";
import { directionOf } from "../i18n/index";
import { ChevronIcon, CloseIcon } from "../icons";
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
export function PrintView({ book, options, onOptions, onClose, target, onNavigate, manageHistory = true }) {
  const t = useT();
  const locale = useLocale();
  const sourceRef = useRef(null);
  const pagesRef = useRef(null);
  const [status, setStatus] = useState("preparing");
  const [pageCount, setPageCount] = useState(0);
  // The target the view has already been scrolled to; a new target or a new layout scrolls again.
  const shownRef = useRef(null);
  const previewerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const close = () => (manageHistory && window.history.state?.oaspectPrint ? window.history.back() : onCloseRef.current());

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
    shownRef.current = null;
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

  // Leaving: the Back and close buttons, Esc, and the browser's back button
  // (opening the view adds a history entry; leaving by button goes back to it).
  // A viewer that keeps the print view in its address (the docs viewer's
  // ?print) passes manageHistory={false} and handles leaving itself.
  useEffect(() => {
    if (manageHistory && !window.history.state?.oaspectPrint) window.history.pushState({ ...window.history.state, oaspectPrint: true }, "");
    const onPop = () => manageHistory && onCloseRef.current();
    const onKey = (event) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.target?.tagName === "SELECT") return;
      close();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, [manageHistory]);

  const scrollTo = (id) => {
    const element = pagesRef.current?.querySelector(`[id="${String(id).replace(/["\\]/g, "")}"]`);
    element?.scrollIntoView({ block: "start" });
    return Boolean(element);
  };

  // Paged.js adds pages one by one: count them for the status line, and show
  // the part of the book the address points at as soon as its page exists,
  // without waiting for the rest of the book.
  useEffect(() => {
    const root = pagesRef.current;
    if (!root) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      setPageCount(root.querySelectorAll(".pagedjs_page").length);
      if (target && shownRef.current !== target && scrollTo(target)) shownRef.current = target;
    };
    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(update);
    });
    observer.observe(root, { childList: true, subtree: true });
    update();
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [target]);

  // Links in the pages: contents and cross references scroll to their target
  // without touching the address (the viewers route on the hash); web links
  // open in a new tab.
  const onPagesClick = (event) => {
    const link = event.target.closest?.("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    if (href.startsWith("#")) {
      event.preventDefault();
      // The viewer may turn it into an address (and scroll through `target`); otherwise scroll here.
      if (!onNavigate?.(href.slice(1))) scrollTo(href.slice(1));
    } else if (/^https?:/i.test(href)) {
      event.preventDefault();
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  const control = "rounded-lg border border-border bg-background px-3 py-1.5 text-sm";
  return (
    <div>
      <style>{PREVIEW_CSS}</style>
      <div className="sticky top-14 z-20 flex flex-wrap items-center gap-2 border-b border-border bg-background/90 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={close}
          title={`${t("print.back")} (Esc)`}
          aria-keyshortcuts="Escape"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <span className="block rotate-180 rtl:rotate-0">
            <ChevronIcon />
          </span>
          {t("print.back")}
          <kbd className="ms-1 rounded border border-border px-1 text-[10px] text-muted-foreground">Esc</kbd>
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
          {status === "preparing" ? (pageCount ? t("print.preparingPages", { count: pageCount }) : t("print.preparing")) : status === "ready" ? t("print.pages", { count: pageCount }) : status}
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={status !== "ready"}
          className="ms-auto rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {t("print.print")}
        </button>
        <button type="button" onClick={close} aria-label={t("print.back")} title={`${t("print.back")} (Esc)`} className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground">
          <CloseIcon className="size-4" />
        </button>
      </div>
      {/* Pages first: in-page links (contents) jump to the first element with the id. */}
      <div ref={pagesRef} onClick={onPagesClick} className="oaspect-print-pages" lang={locale} dir={directionOf(locale)} />
      <div ref={sourceRef} hidden className="oaspect-book" lang={locale} dir={directionOf(locale)}>
        <Book book={book} style={options.style} />
      </div>
    </div>
  );
}

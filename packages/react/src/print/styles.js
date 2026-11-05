// Print stylesheets for Paged.js. Global CSS (it has @page rules), so the
// book's markup uses its own class names under .oaspect-book and no
// Tailwind utilities.
//
// "book": a manual — cover, title page, imprint, contents, chapters opening
// on a right-hand page, running heads, page numbers on the outer corner,
// roman numerals in the front matter.
// "apa": APA 7 — 12 pt Times New Roman, double spacing, 1 in margins,
// 0.5 in paragraph indent, page number top right, APA heading levels, table
// and figure captions above ("Table 1" in bold, the title in italics).

const PAPER = {
  A4: { size: "A4", width: "210mm", height: "297mm" },
  Letter: { size: "letter", width: "8.5in", height: "11in" },
};

const css = String.raw;

const NONE = "content: none;";
const noMargins = `@top-left { ${NONE} } @top-center { ${NONE} } @top-right { ${NONE} } @bottom-left { ${NONE} } @bottom-center { ${NONE} } @bottom-right { ${NONE} }`;

const shared = (paper) => css`
  .oaspect-book { color: #111; }
  .oaspect-book * { box-sizing: border-box; }
  .oaspect-book a { color: inherit; text-decoration: none; }
  .oaspect-book .cover { page: cover; height: ${paper.height}; width: ${paper.width}; break-after: page; }
  .oaspect-book .front { page: front; break-before: page; }
  .oaspect-book .front.first { break-before: auto; }
  .oaspect-book .chapter { page: chapter; }
  .oaspect-book .body-start { counter-reset: page 1; }
  .oaspect-book .chapter-title { string-set: chapter-title content(text); }
  .oaspect-book .book-title { string-set: book-title content(text); }
  .oaspect-book .running-head { string-set: running-head content(text); display: none; }

  .oaspect-book ul { list-style: disc; margin: 0.4em 0 0.8em; padding-inline-start: 1.4em; }
  .oaspect-book ol { list-style: decimal; margin: 0.4em 0 0.8em; padding-inline-start: 1.6em; }
  .oaspect-book li { margin: 0.15em 0; }
  .oaspect-book blockquote { margin: 0.8em 0; padding-inline-start: 1em; border-inline-start: 2pt solid #ccc; color: #333; }
  .oaspect-book .toc ol { list-style: none; margin: 0; padding: 0; }
  .oaspect-book .toc li a { display: flex; align-items: baseline; gap: 0.35em; }
  .oaspect-book .toc li a .dots { flex: 1; border-bottom: 1px dotted #888; transform: translateY(-0.25em); }
  .oaspect-book .toc li a::after { content: target-counter(attr(href url), page); }
  .oaspect-book .toc .level-2 { padding-inline-start: 1.6em; }

  .oaspect-book p, .oaspect-book li { orphans: 3; widows: 3; }
  .oaspect-book h1, .oaspect-book h2, .oaspect-book h3, .oaspect-book h4 { break-after: avoid; break-inside: avoid; }
  .oaspect-book figure { margin: 1.2em 0; }
  .oaspect-book figure.table figcaption, .oaspect-book figure.figure figcaption { break-after: avoid; }
  .oaspect-book table { border-collapse: collapse; width: 100%; }
  .oaspect-book tr { break-inside: avoid; }
  .oaspect-book thead { display: table-header-group; }
  .oaspect-book th, .oaspect-book td { text-align: start; vertical-align: top; padding: 0.3em 0.5em; }
  .oaspect-book table { border-top: 1.5pt solid #111; border-bottom: 1.5pt solid #111; }
  .oaspect-book thead th { border-bottom: 0.75pt solid #111; }
  .oaspect-book code, .oaspect-book pre, .oaspect-book .mono { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; }
  .oaspect-book pre { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0.8em 0; padding: 0.6em 0.8em; background: #f4f4f4; border-inline-start: 2pt solid #bbb; }
  .oaspect-book pre code { background: none; padding: 0; }
  .oaspect-book .figure svg { max-width: 100%; height: auto; }
  .oaspect-book figure.figure { break-inside: avoid; }
  .oaspect-book .figure img { display: block; max-width: 100%; max-height: 120mm; height: auto; margin: 0 auto; border: 0.5pt solid #ccc; }
  .oaspect-book .notes { color: #555; }
  .oaspect-book .endpoint { font-family: ui-monospace, Menlo, monospace; }
  .oaspect-book .endpoint .method { font-weight: 700; margin-inline-end: 0.5em; }
  .oaspect-book .references p { padding-inline-start: 0.5in; text-indent: -0.5in; overflow-wrap: anywhere; }
  .oaspect-book a.external::after { content: " (" attr(href) ")"; font-size: 0.85em; color: #555; overflow-wrap: anywhere; }
  .oaspect-book a.internal::after { content: " (p. " target-counter(attr(href url), page) ")"; color: #555; }

  @page cover { margin: 0; ${noMargins} }
  @page :blank { ${noMargins} }
`;

function bookCss(paper, accent) {
  return css`
  @page { size: ${paper.size}; margin: 22mm 20mm 24mm 24mm; }
  @page :left {
    margin-left: 20mm; margin-right: 24mm;
    @top-left { content: string(book-title); font: italic 8.5pt Georgia, serif; color: #555; }
    @bottom-left { content: counter(page); font: 9pt Georgia, serif; }
  }
  @page :right {
    @top-right { content: string(chapter-title); font: italic 8.5pt Georgia, serif; color: #555; }
    @bottom-right { content: counter(page); font: 9pt Georgia, serif; }
  }
  @page front { @top-left { ${NONE} } @top-right { ${NONE} } @bottom-left { content: counter(page, lower-roman); } @bottom-right { content: counter(page, lower-roman); } }
  @page front:first { @bottom-left { ${NONE} } @bottom-right { ${NONE} } }
  @page chapter:first { @top-left { ${NONE} } @top-right { ${NONE} } }

  .oaspect-book { font: 10.5pt/1.5 "Charter", Georgia, "Times New Roman", serif; hyphens: auto; }
  .oaspect-book p { margin: 0 0 0.7em; text-align: justify; }

  .oaspect-book .cover { display: flex; flex-direction: column; justify-content: space-between; padding: 30mm 24mm 24mm; color: #fff; background: #111 linear-gradient(160deg, ${accent} 0%, #0b1a10 70%); }
  .oaspect-book .cover .logo img { max-height: 16mm; max-width: 70mm; }
  .oaspect-book .cover .kicker { font: 600 11pt/1.4 system-ui, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.8; }
  .oaspect-book .cover h1 { font: 700 34pt/1.1 system-ui, sans-serif; margin: 6mm 0 4mm; letter-spacing: -0.01em; }
  .oaspect-book .cover .subtitle { font: 14pt/1.4 system-ui, sans-serif; opacity: 0.85; }
  .oaspect-book .cover .meta { font: 10pt/1.6 system-ui, sans-serif; opacity: 0.85; border-top: 1px solid rgb(255 255 255 / 0.35); padding-top: 5mm; }

  .oaspect-book .title-page { height: 230mm; display: flex; flex-direction: column; justify-content: center; text-align: center; }
  .oaspect-book .title-page h2 { font: 700 26pt/1.15 system-ui, sans-serif; margin: 0 0 4mm; }
  .oaspect-book .title-page p { text-align: center; }
  .oaspect-book .title-page .subtitle { font-size: 13pt; color: #444; margin-bottom: 18mm; }
  .oaspect-book .title-page .org { font-size: 12pt; }
  .oaspect-book .imprint { height: 230mm; display: flex; flex-direction: column; justify-content: flex-end; font-size: 8.5pt; color: #444; }
  .oaspect-book .imprint p { text-align: start; margin: 0 0 0.4em; }

  .oaspect-book .toc h2 { font: 700 20pt/1.2 system-ui, sans-serif; margin: 0 0 8mm; }
  .oaspect-book .toc .level-1 { font-weight: 700; margin-top: 3mm; }
  .oaspect-book .toc li { margin: 1.2mm 0; }

  .oaspect-book .chapter { break-before: right; }
  .oaspect-book .chapter-head { margin: 18mm 0 12mm; padding-bottom: 5mm; border-bottom: 1.5pt solid ${accent}; }
  .oaspect-book .chapter-label { font: 600 10pt system-ui, sans-serif; letter-spacing: 0.14em; text-transform: uppercase; color: ${accent}; }
  .oaspect-book h1.chapter-title { font: 700 24pt/1.15 system-ui, sans-serif; margin: 2mm 0 0; }
  .oaspect-book h2 { font: 700 14pt/1.3 system-ui, sans-serif; margin: 9mm 0 3mm; }
  .oaspect-book h3 { font: 700 11.5pt/1.3 system-ui, sans-serif; margin: 6mm 0 2mm; }
  .oaspect-book h4 { font: italic 700 10.5pt/1.3 system-ui, sans-serif; margin: 4mm 0 1.5mm; }
  .oaspect-book .num { margin-inline-end: 0.5em; color: ${accent}; }
  .oaspect-book table { font-size: 8.8pt; line-height: 1.35; }
  .oaspect-book pre { font-size: 8pt; line-height: 1.45; }
  .oaspect-book code { font-size: 0.88em; }
  .oaspect-book figcaption { font-size: 9pt; margin-bottom: 1.5mm; }
  .oaspect-book figcaption .label { font-weight: 700; margin-inline-end: 0.4em; }
  .oaspect-book figcaption .title { font-style: italic; }
  .oaspect-book .apa-only { display: none; }
`;
}

function apaCss(paper) {
  return css`
  @page { size: ${paper.size}; margin: 1in; @top-left { content: string(running-head); text-transform: uppercase; font: 12pt "Times New Roman", serif; } @top-right { content: counter(page); font: 12pt "Times New Roman", serif; } }
  @page front { @top-right { content: counter(page); } }

  .oaspect-book { font: 12pt/2 "Times New Roman", Times, serif; }
  .oaspect-book p { margin: 0; text-indent: 0.5in; text-align: left; }
  .oaspect-book li p, .oaspect-book td p, .oaspect-book .title-page p, .oaspect-book .references p { text-indent: 0; }
  .oaspect-book .cover, .oaspect-book .imprint, .oaspect-book .book-only { display: none; }

  .oaspect-book .title-page { padding-top: 2.5in; text-align: center; }
  .oaspect-book .title-page h2 { font-size: 12pt; font-weight: 700; margin: 0 0 24pt; }
  .oaspect-book .title-page p { text-align: center; }
  .oaspect-book .abstract h2, .oaspect-book .toc h2, .oaspect-book .references h1 { font-size: 12pt; font-weight: 700; text-align: center; margin: 0; }
  .oaspect-book .abstract p { text-indent: 0; }
  .oaspect-book .toc li { line-height: 2; }

  .oaspect-book .chapter { break-before: page; }
  .oaspect-book .chapter-label { display: none; }
  .oaspect-book h1.chapter-title { font-size: 12pt; font-weight: 700; text-align: center; margin: 0; }
  .oaspect-book h2 { font-size: 12pt; font-weight: 700; margin: 0; }
  .oaspect-book h3 { font-size: 12pt; font-weight: 700; font-style: italic; margin: 0; }
  .oaspect-book h4 { font-size: 12pt; font-weight: 700; margin: 0 0 0 0.5in; }
  .oaspect-book .num { display: none; }
  .oaspect-book table, .oaspect-book pre { line-height: 1.2; }
  .oaspect-book table { font-size: 10pt; }
  .oaspect-book pre { font-size: 9.5pt; background: none; border: 0; padding: 0 0 0 0.5in; }
  .oaspect-book figure { margin: 12pt 0 24pt; }
  .oaspect-book figcaption { line-height: 2; }
  .oaspect-book figcaption .label { display: block; font-weight: 700; }
  .oaspect-book figcaption .title { display: block; font-style: italic; }
  .oaspect-book .table-note { font-size: 10pt; line-height: 1.5; margin-top: 4pt; }
`;
}

/**
 * @param {{ style?: "book" | "apa", paper?: "A4" | "Letter", accent?: string }} options
 */
export function printCss({ style = "book", paper = "A4", accent = "#16a34a" } = {}) {
  const size = PAPER[paper] ?? PAPER.A4;
  return shared(size) + (style === "apa" ? apaCss(size) : bookCss(size, accent));
}

// What the app around the pages does on screen and when printing: the
// preview shows the pages like sheets; printing shows only them.
export const PREVIEW_CSS = css`
  .oaspect .oaspect-print-pages { background: #e5e7eb; color: #111; padding: 24px 0 48px; min-height: calc(100dvh - 3.5rem); }
  .oaspect .oaspect-print-pages .pagedjs_page { background: #fff; box-shadow: 0 4px 18px rgb(0 0 0 / 0.18); margin: 0 auto 24px; }
  .oaspect[data-theme="dark"] .oaspect-print-pages { background: #18181b; }
  @media print {
    body * { visibility: hidden !important; }
    .oaspect-print-pages, .oaspect-print-pages * { visibility: visible !important; }
    .oaspect-print-pages { position: absolute; inset: 0 auto auto 0; padding: 0 !important; background: none !important; }
    .oaspect-print-pages .pagedjs_page { box-shadow: none !important; margin: 0 !important; }
  }
`;

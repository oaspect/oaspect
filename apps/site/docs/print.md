# Print and PDF

Both viewers print their content as a book. Readers press the printer button in the header, or you open the page straight in the print view. The browser's print dialog then makes a PDF or a paper copy.

[See the Roastery API as a book](../demo/roastery-book.html).

## What the book contains

For an API reference:

- **Cover**: logo, title, subtitle, organization, version and date.
- **Title page** and **imprint** (version, date, contact, source).
- **Contents** with dot leaders and page numbers.
- **Chapter 1, Introduction**: the API description, a table of servers and a table of authentication schemes.
- **A chapter per tag**, with a numbered section per operation ("2.1 List beans"). Each section has the method and path, the description, tables of parameters, request body fields and responses, an example cURL request and an example response. Guide tags (tags without operations) are prose chapters.
- **Webhooks** as a chapter of their own.
- **Appendix A, Models**: a field table per schema, with types, required fields, constraints and allowed values.
- **References**: every web link in the descriptions, which the text also prints in parentheses.

For developer docs, every page is a chapter in navigation order, and its `##` headings are numbered sections. Links between pages print the page they point to ("(p. 12)"). Mermaid diagrams are numbered figures.

## Two styles

| | Book (default) | APA 7 |
| --- | --- | --- |
| Front matter | Cover, title page, imprint, contents | Title page, abstract, contents |
| Type | Serif body, sans-serif headings, justified | Times New Roman 12 pt, double spacing, ragged right |
| Margins | Mirrored for binding | 1 in on every side |
| Page head | Book title on left pages, chapter title on right pages | Running head (title in capitals) on the left |
| Page numbers | Outer corner; roman numerals in the front matter | Top right |
| Headings | Numbered ("3.2") | APA levels: centered bold, bold, bold italic |
| Tables and figures | Numbered across the book, caption above | "Table 1" in bold, the title in italics on the next line |

Both styles keep headings with the text after them and avoid splitting table rows across pages.

## Options

Pass `view` to open in the print view, and `print` for the book:

```js
Oaspect.init("#oaspect", {
  specUrl: "/openapi.json",
  view: "print",
  print: {
    style: "book",          // or "apa"
    paper: "A4",            // or "Letter"
    accent: "#16a34a",      // cover and heading color in the book style
    logo: "/logo-white.svg", // cover logo; defaults to the header logo (its dark variant)
    subtitle: "Integration guide",
    organization: "Acme Inc.",
    date: "November 2026",  // defaults to today, in the UI language
    summary: "…",           // APA abstract; defaults to the first paragraph
  },
});
```

`Oaspect.docs()`, `<ApiReference>` and `<DocsReference>` take the same options. On the elements, use the `view`, `print-style` and `paper` attributes. Add `print` to `hide` (or set `features: { print: false }`) to remove the printer button.

## From the command line

```bash
npx oaspect print openapi.yaml -o api-book.html
npx oaspect docs print docs/ -o handbook.html --print-style apa --paper Letter
```

The file opens in the print view; print it from the browser to get a PDF. For a PDF without a browser window, open the file in headless Chrome (for example with Puppeteer) and call `page.pdf({ preferCSSPageSize: true, printBackground: true })` after the pages appear.

## How it works

The book is laid out by [Paged.js](https://pagedjs.org), which implements the CSS rules for printed pages: page sizes, margins, running heads, page counters and cross references. It is loaded from jsDelivr, pinned with an integrity hash, only when the print view opens, so the print view needs a network connection the first time.

Turn on "Background graphics" in Chrome's print dialog to keep the cover color.

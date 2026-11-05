// Print mode shared by the API reference and the docs viewer.
export { PrintView } from "./book";
export { apiBook } from "./api-book";
export { docsBook, docsBookTarget } from "./docs-book";

export const PRINT_DEFAULTS = { style: "book", paper: "A4" };

/** Book metadata from the `print` prop: what the cover and title page show besides the spec/docs title. */
export function printMeta(print = {}) {
  const meta = {};
  for (const key of ["title", "subtitle", "organization", "author", "date", "logo", "kicker", "summary"]) {
    if (print[key]) meta[key] = print[key];
  }
  if (meta.author && !meta.organization) meta.organization = meta.author;
  return meta;
}

/** Style options for the pages, with defaults. */
export const printOptions = (print = {}) => ({
  style: print.style === "apa" ? "apa" : PRINT_DEFAULTS.style,
  paper: print.paper === "Letter" ? "Letter" : PRINT_DEFAULTS.paper,
  ...(print.accent ? { accent: print.accent } : {}),
});

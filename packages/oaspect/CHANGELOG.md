# oaspect

## 0.3.1

### Patch Changes

- 118ecbc: Developer docs: a page without a `#` heading that opens with another heading (`## Title`) takes it as its title, instead of a title made from the file name.
- Updated dependencies [118ecbc]
  - @oaspect/core@0.3.1

## 0.3.0

### Minor Changes

- 24cdfa0: Developer docs: the viewer shows a folder of Markdown files as a documentation site, one page at a time, with navigation (from `_sidebar.md`/`SUMMARY.md` or the folders), search across pages, "On this page", links between files, previous/next and "Edit this page". Use `oaspect docs build|bundle|serve <dir>`, `Oaspect.docs()`, `<oaspect-docs>` or `<DocsReference>`. Mermaid diagrams (```mermaid blocks) render in docs and in API descriptions, loaded from jsDelivr only when a page has one.

### Patch Changes

- Updated dependencies [24cdfa0]
  - @oaspect/core@0.3.0

## 0.2.0

### Minor Changes

- 2502a76: Guide sections, as in Redoc: headings in `info.description` and tag descriptions are listed in the navigation with their own anchors (`#introduction/…`, `#tag/<tag>/…`); tags without operations (or with `x-traitTag: true`) render as title-and-prose sections; `## Heading {#id}` fixes a heading's anchor across languages. The scroll spy now follows the page position, so short sections highlight correctly.

### Patch Changes

- Updated dependencies [2502a76]
  - @oaspect/core@0.2.0

## 0.1.1

### Patch Changes

- 60e508c: The standalone script inserts its stylesheet first in `<head>`, so the page's own CSS overrides the viewer's variables (`.oaspect { --oaspect-primary: … }`) without extra specificity.
  - @oaspect/core@0.1.1

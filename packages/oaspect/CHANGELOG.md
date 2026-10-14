# oaspect

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

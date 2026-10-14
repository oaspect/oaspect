---
"@oaspect/core": minor
"@oaspect/react": minor
"oaspect": minor
---

Guide sections, as in Redoc: headings in `info.description` and tag descriptions are listed in the navigation with their own anchors (`#introduction/…`, `#tag/<tag>/…`); tags without operations (or with `x-traitTag: true`) render as title-and-prose sections; `## Heading {#id}` fixes a heading's anchor across languages. The scroll spy now follows the page position, so short sections highlight correctly.

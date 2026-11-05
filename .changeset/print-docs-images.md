---
"@oaspect/core": minor
"@oaspect/react": minor
"oaspect": minor
---

Print view of the developer docs: relative images (`../images/a.png`) show as numbered figures with their alt text as caption, lines that only link to other pages ("← Previous · Next →") are left out, and pages written in `:::lang` blocks keep their numbered sections. Leaving the print view is easier: Esc, the browser's back button, a clearer Back button and a close button. Links in the pages work: contents and cross references scroll to their target without changing the address (the viewers route on it), web links open in a new tab. In the docs viewer the print view has an address, like the pages: `#/guides/setup?print` (and `?id=…&print`) opens it at that chapter or heading, and links followed in the book update it. The docs viewer resolves relative images against the page's folder (`resolveDocAsset()` in core). The `oaspect` npm package includes `src/docs-files.js` again, so the CLI starts (#8). The print view shows the part of the book in the address as soon as its page is laid out instead of after the whole book, counts pages while it works, and starts loading Paged.js when the pointer reaches the printer button.

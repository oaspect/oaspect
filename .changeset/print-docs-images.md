---
"@oaspect/core": patch
"@oaspect/react": patch
"oaspect": patch
---

Print view of the developer docs: relative images (`../images/a.png`) show as numbered figures with their alt text as caption, lines that only link to other pages ("← Previous · Next →") are left out, and pages written in `:::lang` blocks keep their numbered sections. The docs viewer resolves relative images against the page's folder (`resolveDocAsset()` in core). The `oaspect` npm package includes `src/docs-files.js` again, so the CLI starts (#8).

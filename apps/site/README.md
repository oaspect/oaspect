# Site

oaspect's website: a landing page, the docs, the `oaspect/server` API
reference (`specs/oaspect.yaml`, rendered by oaspect) and demos.

```bash
pnpm --filter @oaspect/site build         # → apps/site/dist
pnpm --filter @oaspect/site screenshots   # after a build; needs Chrome (CHROME_PATH)
```

- `landing.mjs`: the landing page; `shared.mjs`: colors, header and footer
  shared with the docs.
- `docs/*.md`: the documentation, rendered by `docs.mjs` with
  `@oaspect/core`'s Markdown parser and highlighter. Page order is `NAV` in
  `docs.mjs`; link pages as `configuration.md#anchor` (works on GitHub too).
- `specs/roastery.yaml`: the showcase demo (OpenAPI 3.1, Turkish and Arabic).
- `screenshots.mjs`: captures `public/images/*.webp` (light and dark) from the
  built demos; the landing page and the README use them. "Try it" responses
  are mocked, so nothing leaves the machine. Re-run it after visible UI
  changes and commit the images.

Deployed to GitHub Pages by `.github/workflows/pages.yml`.

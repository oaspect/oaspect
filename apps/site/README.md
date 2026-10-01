# Site

oaspect's website, built with oaspect: `specs/oaspect.yaml` holds the guide
(in `info.description`, English and Turkish `:::lang` blocks) and documents
`oaspect/server`'s handlers; the CLI prerenders it and the demo documents.

```bash
pnpm --filter @oaspect/site build         # → apps/site/dist
pnpm --filter @oaspect/site screenshots   # after a build; needs Chrome (CHROME_PATH)
```

- `landing.mjs`: the landing page.
- `specs/roastery.yaml`: the showcase demo (OpenAPI 3.1, Turkish and Arabic).
- `screenshots.mjs`: captures `public/images/*.webp` (light and dark) from the
  built demos; the landing page and the README use them. "Try it" responses
  are mocked, so nothing leaves the machine. Re-run it after visible UI
  changes and commit the images.

Deployed to GitHub Pages by `.github/workflows/pages.yml`.

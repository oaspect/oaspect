# Site

oaspect's website, built with oaspect: `specs/oaspect.yaml` holds the guide
(in `info.description`, English and Turkish `:::lang` blocks) and documents
`oaspect/server`'s handlers; the CLI prerenders it and the demo documents.

```bash
pnpm --filter @oaspect/site build   # → apps/site/dist
```

Deployed to GitHub Pages by `.github/workflows/pages.yml`.

# oaspect

Interactive API reference for OpenAPI documents — a lightweight alternative to
Redoc and Scalar.

- Three-column reference: navigation, details, code samples
- **Try it**: edit parameters and body, send the request (directly or through a
  CORS-free proxy), inspect status, headers and body; write requests ask for
  confirmation first
- **Code samples** in 16 languages / 30 clients (cURL, fetch, Axios, Python
  requests/httpx, PHP Guzzle, Go, Java, Kotlin, C#, Ruby, Swift, Dart, Rust,
  C, PowerShell, raw HTTP), with syntax highlighting
- Schema trees with `$ref`, `allOf`, `oneOf`/`anyOf`, arrays, maps, cycles
- Markdown descriptions (GFM subset: tables, lists, code blocks…), raw HTML
  never rendered
- **Localized docs**: UI in English, Turkish, Arabic (RTL) or your own
  language; spec text translated with `x-i18n` and `:::lang` blocks
- Light/dark themes, mobile layout, deep links, ⌘K search

> Status: early (0.x). APIs may change before 1.0.

## Packages

| Package | Description |
| ------- | ----------- |
| [`@oaspect/core`](packages/core) | Framework-free OpenAPI processing: `$ref` resolution, examples, request building, code samples, Markdown, highlighting. TypeScript. |
| [`@oaspect/react`](packages/react) | The `<ApiReference>` React component. |

Planned: a standalone bundle (`<script>` + `ApiReference.init()` / web
component), a CLI (`npx oaspect build spec.json`), server helpers for the proxy,
Swagger 2.0 and YAML input.

## Quick start (React)

```jsx
import { ApiReference } from "@oaspect/react";

export default function Docs() {
  return <ApiReference specUrl="/openapi.json" />;
}
```

`@oaspect/react` currently ships its styles as a Tailwind CSS v4 fragment:

```css
@import "tailwindcss";
@import "@oaspect/react/styles.css";
@source "../node_modules/@oaspect/react/dist";
```

### Props

| Prop | Default | Description |
| ---- | ------- | ----------- |
| `spec` / `specUrl` | — | Document object, or URL of the JSON document |
| `title`, `logo` | `info.title` | Header branding |
| `locale`, `defaultLocale`, `onLocaleChange` | `"en"` | UI language (controlled or not) |
| `messages` | — | Override UI strings or add languages: `{ de: { "sidebar.search": "Suchen" } }` |
| `proxyUrl` | `null` | Endpoint that relays "Try" requests server-side |
| `features` | all on | `{ sourceMenu, languageSwitcher, themeToggle, tryIt, models }` |
| `defaultSnippet` | `"shell:curl"` | Initial code sample, `language:client` |
| `storagePrefix` | `"oaspect"` | Prefix for persisted preferences |
| `urlParam` | `"url"` | Query parameter that loads another spec URL; `null` disables |
| `theme` | reader's choice | Force `"light"` or `"dark"` |

A spec endpoint may answer with the header `x-oaspect-spec-source: fallback` to
make the viewer show an "out of date copy" notice.

## Translating your API documentation

Short fields use the `x-i18n` extension:

```json
"summary": "List users",
"x-i18n": { "tr": { "summary": "Kullanıcıları listele" } }
```

Markdown fields can hold every language in language blocks; the reader sees the
one matching the UI language (falling back to English, then the first block):

```markdown
:::lang en
English text
:::

:::lang tr
Türkçe metin
:::
```

## Development

```bash
pnpm install
pnpm build      # all packages
pnpm test       # vitest in every package
pnpm typecheck
```

## License

[MIT](LICENSE)

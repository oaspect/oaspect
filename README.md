# oaspect

Interactive API reference for OpenAPI documents — a lightweight alternative to
Redoc and Scalar.

- Three-column reference: navigation, details, code samples
- **Try it**: edit parameters and body (including file uploads), send the
  request (directly or through a CORS-free proxy), inspect status, headers and
  body; write requests ask for confirmation first
- **Code samples** in 16 languages / 30 clients (cURL, fetch, Axios, Python
  requests/httpx, PHP Guzzle, Go, Java, Kotlin, C#, Ruby, Swift, Dart, Rust,
  C, PowerShell, raw HTTP), with syntax highlighting; `multipart/form-data`
  bodies use each client's own multipart API
- **OpenAPI 3.0 / 3.1 and Swagger 2.0**, JSON or YAML
- Schema trees with `$ref`, `allOf`, `oneOf`/`anyOf`, arrays, maps, cycles
- Markdown descriptions (GFM subset: tables, lists, code blocks…), raw HTML
  never rendered
- **Localized docs**: UI in English, Turkish, Arabic (RTL) or your own
  language; spec text translated with `x-i18n` and `:::lang` blocks
- Light/dark themes, mobile layout, deep links, ⌘K search
- Styles scoped under `.oaspect`: drop it into any page without CSS conflicts
- 128 KB gzipped as a single script, React included

> Status: early (0.x). APIs may change before 1.0.

## Use it

### One script tag

```html
<script src="https://cdn.jsdelivr.net/npm/oaspect" data-spec-url="/openapi.yaml"></script>
```

or mount it yourself:

```html
<div id="docs"></div>
<script src="https://cdn.jsdelivr.net/npm/oaspect"></script>
<script>
  Oaspect.init("#docs", { specUrl: "/openapi.json", defaultLocale: "en" });
</script>
```

### Web component

```html
<oaspect-reference spec-url="/openapi.json" locale="tr" hide="models"></oaspect-reference>
<script src="https://cdn.jsdelivr.net/npm/oaspect"></script>
```

Attributes: `spec-url`, `title`, `locale`, `default-locale`, `proxy-url`,
`theme`, `storage-prefix`, `default-snippet`, `logo`, `logo-dark`, `logo-alt`,
`logo-label`, `hide` (`try-it,models,source-menu,language-switcher,theme-toggle`).
Set the `spec` property to pass a document object.

### CLI

```bash
npx oaspect build openapi.yaml -o docs.html   # one self-contained HTML file
npx oaspect serve openapi.yaml                # live preview with a "Try" proxy
```

### React

```jsx
import { ApiReference, Logo } from "@oaspect/react";
import "@oaspect/react/styles.css";

export default function Docs() {
  return <ApiReference specUrl="/openapi.json" logo={<Logo light="/logo.svg" label="API Docs" />} />;
}
```

### Server proxy for "Try"

APIs without CORS headers can be called through a relay on your server:

```js
import { createProxyHandler } from "oaspect/server";

const proxy = createProxyHandler({ allowedHosts: ["api.example.com"] });
// Next.js: export const POST = proxy;   Hono: app.post("/proxy", (c) => proxy(c.req.raw))
```

Then pass `proxyUrl: "/proxy"` to the viewer. Keep `allowedHosts` to your API:
an open relay lets anyone reach what your server can reach.

### Server spec endpoint

Serve the document from your server, from a live URL with a bundled fallback:

```js
import { createSpecHandler } from "oaspect/server";

export const GET = createSpecHandler({
  url: process.env.SPEC_URL,                 // fetched server-side, cached 60 s
  fallback: () => readFile("openapi.json", "utf8"),
});
```

When the live document cannot be reached, the fallback is served with
`x-oaspect-spec-source: fallback` and the viewer shows an out-of-date notice.

## Examples

- [`examples/html`](examples/html): one script tag, no build step
- [`examples/nextjs`](examples/nextjs): App Router page, spec and proxy route handlers
- [`examples/node`](examples/node): `node:http` server without a framework
- [`apps/playground`](apps/playground): development app with sample documents

## Configuration

| Option (`Oaspect.init` / React prop) | Default | Description |
| ------------------------------------ | ------- | ----------- |
| `spec` / `specUrl` | — | Document object, or URL of a JSON/YAML document |
| `title`, `logo` | `info.title` | Header branding (`logo`: URL or `{ light, dark, alt, label }`; React: any node) |
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

### Theming

Colors are CSS variables on the `.oaspect` root:

```css
.oaspect { --oaspect-primary: #2563eb; }
.oaspect[data-theme="dark"] { --oaspect-primary: #60a5fa; }
```

Tailwind CSS v4 hosts that render their own markup inside the viewer can
import `@oaspect/react/tailwind.css` to get the viewer's colors and its
`dark:` variant.

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

## Packages

| Package | Description |
| ------- | ----------- |
| [`oaspect`](packages/oaspect) | Standalone script, `<oaspect-reference>`, CLI, `oaspect/server` |
| [`@oaspect/react`](packages/react) | The `<ApiReference>` React component and its stylesheet |
| [`@oaspect/core`](packages/core) | Framework-free OpenAPI processing: parsing (JSON/YAML), Swagger 2.0 conversion, `$ref` resolution, examples, request building, code samples, Markdown, highlighting. TypeScript. |

## Known limitations

- External `$ref`s (other files or URLs) are not resolved.
- Security schemes are converted and shown in the document, but "Try" only
  offers a Bearer token.
- A few clients have no multipart encoder (wget, node:http, Python
  http.client, java.net.http); their samples point to another client of the
  same language. PHP cURL arrays cannot repeat a field name.

## Development

```bash
pnpm install
pnpm build      # all packages
pnpm test       # vitest in every package
pnpm typecheck
```

## License

[MIT](LICENSE)

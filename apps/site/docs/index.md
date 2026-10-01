# Introduction

oaspect turns an OpenAPI or Swagger document into an interactive API reference: navigation, readable schemas, code samples in 30 clients and a "Try it" runner, in your readers' language.

## What you get

- A three-column reference: navigation, operation details, code samples and response examples.
- **Try it**: edit parameters, body, files and credentials, send the request and inspect status, headers and body.
- **Code samples** in 16 languages and 30 clients, built from the same request the Try dialog sends.
- **Schemas** as expandable trees: `$ref`, `allOf`, `oneOf`/`anyOf`, constraints, enums and examples.
- **Localization**: the interface in English, Turkish and Arabic (right to left) or your own language, and translated documentation through `x-i18n` and `:::lang` blocks.
- OpenAPI 3.0 and 3.1, Swagger 2.0 (converted on load), JSON or YAML, references split across files.
- Light and dark themes, a phone layout, deep links to every operation and model, and `⌘K` search.

It ships as one 138 KB script (React included) for any web page, a React component, a CLI that writes static HTML, and server helpers for the parts a static page cannot do.

## Quick start

The fastest way is a single script tag. The script finds its own `data-spec-url` and mounts the reference right after itself:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>API reference</title>
  </head>
  <body style="margin: 0">
    <script src="https://cdn.jsdelivr.net/npm/oaspect" data-spec-url="/openapi.yaml"></script>
  </body>
</html>
```

Serve the page next to your `openapi.yaml` and open it. The spec URL may point anywhere the browser can read: same origin, or another origin that sends CORS headers.

Prefer a single file you can host anywhere, with no JavaScript needed to read it?

```bash
npx oaspect build openapi.yaml -o docs.html
```

Using React?

```jsx
import { ApiReference } from "@oaspect/react";
import "@oaspect/react/styles.css";

export default function Docs() {
  return <ApiReference specUrl="/openapi.yaml" />;
}
```

## Pick an integration

| You have | Use | Read |
| --- | --- | --- |
| Any HTML page, CMS or static site | The script tag or `<oaspect-reference>` | [Installation](installation.md) |
| A React, Next.js or Remix app | `@oaspect/react` | [Frameworks](frameworks.md) |
| Vue, Svelte, Angular or anything else | The web component | [Frameworks](frameworks.md#vue-svelte-and-other-frameworks) |
| Only a spec file, and want a page | `oaspect build` | [CLI](cli.md) |
| An API without CORS headers | A proxy from `oaspect/server` | [Server helpers](server.md) |

## Packages

| Package | What it is |
| --- | --- |
| `oaspect` | The standalone script (`window.Oaspect`), the `<oaspect-reference>` web component, the CLI and `oaspect/server` |
| `@oaspect/react` | The `<ApiReference>` component and its scoped stylesheet |
| `@oaspect/core` | Framework-free OpenAPI processing: parsing, Swagger 2.0 conversion, `$ref` resolution, examples, requests, code samples, Markdown and highlighting |

All three are versioned together. oaspect is MIT licensed and has no telemetry.

> oaspect is at 0.x: options may still change before 1.0. Pin a version in production (see [Installation](installation.md#pin-a-version)).

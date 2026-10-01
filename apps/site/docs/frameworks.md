# Frameworks

Recipes for common stacks. React apps use `@oaspect/react`; everything else uses the standalone script or the `<oaspect-reference>` web component.

## Plain HTML and static sites

Hugo, Jekyll, Eleventy, a CMS page or a bare HTML file: add the script where the reference should appear.

```html
<script src="https://cdn.jsdelivr.net/npm/oaspect@0.1.0/dist/oaspect.js" data-spec-url="/openapi.yaml"></script>
```

The reference fills the width of its container and uses the page's scroll. Give it the whole page (`body { margin: 0 }`) for the three-column layout. Its header is sticky at the top of the viewport, so it sits best on a page without another sticky header.

## Next.js

The component uses state and browser APIs, so render it from a client component. The App Router layout imports the stylesheet once:

```jsx
// app/layout.js
import "@oaspect/react/styles.css";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
```

```jsx
// app/docs/page.js
"use client";

import { ApiReference } from "@oaspect/react";

export default function Docs() {
  return <ApiReference specUrl="/openapi" proxyUrl="/api/proxy" />;
}
```

Route handlers can serve the document and relay Try requests (see [Server helpers](server.md)):

```js
// app/openapi/route.js: the live document, or the bundled copy
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createSpecHandler } from "oaspect/server";

export const GET = createSpecHandler({
  url: process.env.SPEC_URL,
  fallback: () => readFile(join(process.cwd(), "public/openapi.json"), "utf8"),
});
```

```js
// app/api/proxy/route.js
import { createProxyHandler } from "oaspect/server";

export const POST = createProxyHandler({ allowedHosts: ["api.example.com"] });
```

A complete app is in [`examples/nextjs`](https://github.com/oaspect/oaspect/tree/main/examples/nextjs).

### Remembering the language

To keep the reader's language between visits (and render it on the server), make the locale controlled and store it in a cookie:

```jsx
"use client";

import { ApiReference, directionOf } from "@oaspect/react";
import { useState } from "react";

export default function Docs({ initialLocale }) {
  const [locale, setLocale] = useState(initialLocale);
  return (
    <ApiReference
      specUrl="/openapi"
      locale={locale}
      onLocaleChange={(next) => {
        document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = next;
        document.documentElement.dir = directionOf(next);
        setLocale(next);
      }}
    />
  );
}
```

The server page reads the cookie with `cookies()` and passes `initialLocale`.

## Vite, Create React App and other React setups

```jsx
import { ApiReference } from "@oaspect/react";
import "@oaspect/react/styles.css";

export function Docs() {
  return <ApiReference specUrl="/openapi.yaml" />;
}
```

Put `openapi.yaml` in `public/`. Remix, React Router and TanStack Start work the same way.

## Vue, Svelte and other frameworks

Load the standalone script once (in `index.html` or with a dynamic import) and use `<oaspect-reference>` in your templates.

**Vue**: tell the compiler that `oaspect-reference` is a custom element.

```js
// vite.config.js
import vue from "@vitejs/plugin-vue";

export default {
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === "oaspect-reference" } } })],
};
```

```html
<template>
  <oaspect-reference spec-url="/openapi.yaml" :locale="locale" />
</template>
```

**Svelte** needs no configuration:

```html
<oaspect-reference spec-url="/openapi.yaml" locale={locale}></oaspect-reference>
```

**Angular**: add `CUSTOM_ELEMENTS_SCHEMA` to the component's `schemas`, then use the element in its template.

Attribute changes re-render the reference, so bound values such as `locale` stay in sync. To pass a document object, set the element's `spec` property.

## Astro

```html
---
// src/pages/docs.astro
---
<html lang="en">
  <body style="margin: 0">
    <script is:inline src="https://cdn.jsdelivr.net/npm/oaspect@0.1.0/dist/oaspect.js" data-spec-url="/openapi.yaml"></script>
  </body>
</html>
```

To ship a prerendered page instead, generate it with `oaspect build` into `public/`.

## Node, Express, Hono and Workers

The server helpers take a Web `Request` and return a `Response`, so they plug into any server. See [Server helpers](server.md#mounting-the-handlers) for Node's `http`, Express, Hono, Bun, Deno and Cloudflare Workers.

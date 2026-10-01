# Installation

Four ways to put the reference on a page, from a single script tag to a React component. All of them take the same options.

## Script tag

Load the standalone bundle from a CDN. It contains React, the viewer and its stylesheet, and needs no build step.

```html
<script src="https://cdn.jsdelivr.net/npm/oaspect" data-spec-url="/openapi.yaml"></script>
```

With `data-spec-url`, the script mounts itself into the element with `id="oaspect"`, or into a new element right after the script. Every option can be given as a `data-` attribute (see [Configuration](configuration.md#html-attributes)).

To decide where it goes, or to pass options that are not strings (callbacks, objects), mount it yourself:

```html
<div id="docs"></div>
<script src="https://cdn.jsdelivr.net/npm/oaspect"></script>
<script>
  const docs = Oaspect.init("#docs", {
    specUrl: "/openapi.yaml",
    defaultLocale: "en",
    logo: { light: "/logo.svg", dark: "/logo-dark.svg", alt: "Acme", label: "API" },
  });
</script>
```

`Oaspect.init` returns a handle with `update(options)` and `destroy()`; see [Configuration](configuration.md#javascript-api).

### Pin a version

`https://cdn.jsdelivr.net/npm/oaspect` always serves the latest release. In production, pin an exact version and add a Subresource Integrity hash, so the browser refuses a file that changed:

```html
<script
  src="https://cdn.jsdelivr.net/npm/oaspect@0.1.0/dist/oaspect.js"
  integrity="sha384-…"
  crossorigin="anonymous"
></script>
```

jsDelivr shows the hash on the package page; you can also compute it:

```bash
curl -s https://cdn.jsdelivr.net/npm/oaspect@0.1.0/dist/oaspect.js | openssl dgst -sha384 -binary | openssl base64 -A
```

unpkg works the same way: `https://unpkg.com/oaspect@0.1.0/dist/oaspect.js`. To self-host, copy `dist/oaspect.js` from the npm package.

## Web component

The same bundle registers `<oaspect-reference>`. Attributes are the kebab-case option names:

```html
<oaspect-reference spec-url="/openapi.yaml" locale="tr" hide="models"></oaspect-reference>
<script src="https://cdn.jsdelivr.net/npm/oaspect"></script>
```

Changing an attribute re-renders the reference. To pass a document object instead of a URL, set the `spec` property:

```js
const element = document.querySelector("oaspect-reference");
element.spec = await fetch("/openapi.json").then((response) => response.json());
```

The web component is the way to use oaspect from Vue, Svelte, Angular or any framework other than React.

## React

```bash
npm install @oaspect/react
```

```jsx
import { ApiReference, Logo } from "@oaspect/react";
import "@oaspect/react/styles.css";

export default function Docs() {
  return (
    <ApiReference
      specUrl="/openapi.yaml"
      logo={<Logo light="/logo.svg" dark="/logo-dark.svg" alt="Acme" label="API" />}
    />
  );
}
```

React 18 and 19 are supported (`react` and `react-dom` are peer dependencies). Import the stylesheet once, anywhere in your app; every rule is scoped under `.oaspect`, so it does not touch the rest of your pages. The component is a client component: in Next.js App Router, render it from a file marked `"use client"` (see [Frameworks](frameworks.md#next-js)).

## CLI

```bash
npx oaspect build openapi.yaml -o docs.html   # one self-contained HTML file
npx oaspect serve openapi.yaml                # live preview with a Try proxy
```

`build` writes one HTML file with the script, the styles and your document inlined, and the reference prerendered, so the page reads without JavaScript and search engines index it. See [CLI](cli.md).

## Requirements

- **Browsers**: current Chrome, Edge, Firefox and Safari (the bundle targets ES2020 and uses `dialog`, `IntersectionObserver` and CSS `color-mix`).
- **Node.js 20 or later** for the CLI and `oaspect/server`.
- **Documents**: OpenAPI 3.0 or 3.1, or Swagger 2.0, as JSON or YAML.

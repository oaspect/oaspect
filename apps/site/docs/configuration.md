# Configuration

Every option, and how to pass it from JavaScript, React, HTML attributes or the CLI. The names are the same everywhere; HTML attributes use their kebab-case form.

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `specUrl` | `string` | | URL of the OpenAPI document (JSON or YAML). Relative `$ref`s resolve against it. |
| `spec` | `object` | | The document as an object. Takes precedence over `specUrl`. |
| `title` | `string` | `info.title` | Text in the header, localized through `x-i18n` when it comes from the document. |
| `logo` | `string`, `object` or React node | | Header logo instead of the title. See [Logo](#logo). |
| `locale` | `string` | | UI language, controlled: the reader's choice is reported through `onLocaleChange` and applied only when you pass it back. |
| `defaultLocale` | `string` | `"en"` | Starting UI language when `locale` is not given; the reader can switch afterwards. |
| `onLocaleChange` | `(locale) => void` | | Called when the reader picks a language. |
| `messages` | `object` | | Extra languages or overrides of the interface strings. See [Localization](localization.md#change-or-add-interface-languages). |
| `proxyUrl` | `string` or `null` | `null` | Endpoint that relays Try requests from your server. See [Try it](try-it.md). |
| `features` | `object` | all `true` | Turn parts of the interface off. See [Features](#features). |
| `defaultSnippet` | `string` | `"shell:curl"` | Code sample shown first, as `language:client`. See [Code samples](code-samples.md). |
| `theme` | `"light"` or `"dark"` | reader's choice | Start in this theme instead of the reader's stored choice or system setting. Add `features: { themeToggle: false }` to lock it. |
| `storagePrefix` | `string` | `"oaspect"` | Prefix of the keys oaspect keeps in `localStorage` and `sessionStorage`. |
| `urlParam` | `string` or `null` | `"url"` | Query parameter that loads another document (`?url=https://…`). `null` turns it off. |
| `lazy` | `boolean` or `"auto"` | `"auto"` | Render operations and models only when they come near the viewport. `"auto"` does it for documents with more than 40 operations. |

### Features

| Key | Default | Turns off |
| --- | --- | --- |
| `tryIt` | `true` | The Try button and dialog |
| `models` | `true` | The Models section and its sidebar entries |
| `sourceMenu` | `true` | The Source menu (load another URL or a local file) |
| `languageSwitcher` | `true` | The UI language menu |
| `themeToggle` | `true` | The light/dark toggle |

```js
Oaspect.init("#docs", {
  specUrl: "/openapi.yaml",
  features: { tryIt: false, sourceMenu: false },
});
```

### Logo

In `Oaspect.init` and the web component, `logo` is an image URL or an object:

```js
logo: {
  light: "/logo.svg",      // light theme, or both when dark is missing
  dark: "/logo-dark.svg",  // dark theme
  alt: "Acme",
  label: "API Reference",  // text next to the logo on wide screens
}
```

In React, `logo` is any node; the `Logo` component gives the same light/dark behavior:

```jsx
import { ApiReference, Logo } from "@oaspect/react";

<ApiReference specUrl="/openapi.yaml" logo={<Logo light="/logo.svg" dark="/logo-dark.svg" alt="Acme" label="API Reference" />} />
```

## Passing options

### JavaScript API

The standalone script defines `window.Oaspect`:

| Member | Description |
| --- | --- |
| `Oaspect.init(target, options)` | Renders into `target` (an element or a selector) and returns a handle. |
| `Oaspect.hydrate(target, options)` | Attaches to markup prerendered by `oaspect build`. `options` must match the ones used to prerender. |
| `Oaspect.version` | The bundle version. |
| `handle.update(options)` | Merges the new options into the current ones and re-renders. |
| `handle.destroy()` | Unmounts the reference. |

```js
const docs = Oaspect.init("#docs", { specUrl: "/v1/openapi.yaml" });

// later: switch the document or the language
docs.update({ specUrl: "/v2/openapi.yaml" });
docs.update({ locale: "tr" });
```

### React props

`<ApiReference>` takes the options as props. Type definitions ship with the package.

```jsx
<ApiReference
  specUrl="/openapi.yaml"
  defaultLocale="tr"
  defaultSnippet="python:requests"
  features={{ models: false }}
  proxyUrl="/api/proxy"
/>
```

### HTML attributes

`<oaspect-reference>` and the auto-mounting script tag read string options from attributes. On the script tag, prefix them with `data-`.

| Attribute | Option |
| --- | --- |
| `spec-url` | `specUrl` |
| `title` | `title` |
| `locale` | `locale` |
| `default-locale` | `defaultLocale` |
| `proxy-url` | `proxyUrl` |
| `theme` | `theme` |
| `storage-prefix` | `storagePrefix` |
| `default-snippet` | `defaultSnippet` |
| `logo`, `logo-dark`, `logo-alt`, `logo-label` | `logo` (`light`, `dark`, `alt`, `label`) |
| `hide` | `features`: a comma-separated list of `try-it`, `models`, `source-menu`, `language-switcher`, `theme-toggle` |

```html
<oaspect-reference
  spec-url="/openapi.yaml"
  default-locale="tr"
  logo="/logo.svg"
  logo-dark="/logo-dark.svg"
  hide="source-menu,models"
></oaspect-reference>
```

```html
<script
  src="https://cdn.jsdelivr.net/npm/oaspect"
  data-spec-url="/openapi.yaml"
  data-proxy-url="/api/proxy"
  data-hide="source-menu"
></script>
```

Options that are not strings (`spec`, `messages`, `onLocaleChange`, `lazy`, `urlParam`) need `Oaspect.init` or the element's `spec` property.

### CLI flags

`oaspect build` and `oaspect serve` take `--title`, `--locale` (as `defaultLocale`), `--theme` and `--logo`. See [CLI](cli.md).

## What the browser stores

Preferences live in the reader's browser, under keys that start with `storagePrefix` and a colon (`oaspect:theme`). Nothing is sent anywhere.

| Key | Storage | Holds |
| --- | --- | --- |
| `theme` | local | `light` or `dark` once the reader toggles it |
| `language` | local | The selected code sample (`language:client`) |
| `token`, `credentials` | local | Bearer token and security scheme credentials entered in the Connection panel |
| `request-mode` | local | Proxy or direct sending |
| `skip-write-confirm` | session | "Don't ask again" for write requests, for this tab only |

Give each reference on a domain its own `storagePrefix` so they do not share tokens.

## The out-of-date notice

When the document comes from an endpoint that answers with the header `x-oaspect-spec-source: fallback`, the reference shows a notice that the reader sees a stored copy. `createSpecHandler` sets it when the live document cannot be loaded (see [Server helpers](server.md#serve-the-document)).

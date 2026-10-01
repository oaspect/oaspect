# Theming and branding

Put your logo in the header, match your colors, and control light and dark mode. The stylesheet is scoped, so none of this leaks into the rest of your page.

## Logo and title

The header shows `title` (or the document's `info.title`) unless you give a `logo`. Pass separate images for light and dark backgrounds, and an optional `label` shown next to the logo on wide screens:

```js
Oaspect.init("#docs", {
  specUrl: "/openapi.yaml",
  logo: { light: "/logo.svg", dark: "/logo-dark.svg", alt: "Acme", label: "API Reference" },
});
```

See [Configuration](configuration.md#logo) for the React and HTML forms.

## Colors

Colors are CSS custom properties on the `.oaspect` element, the root of the reference. Override them in your own stylesheet; dark values go on `.oaspect[data-theme="dark"]`:

```css
.oaspect {
  --oaspect-primary: #2563eb;
  --oaspect-primary-foreground: #ffffff;
}

.oaspect[data-theme="dark"] {
  --oaspect-primary: #60a5fa;
  --oaspect-primary-foreground: #0b1220;
}
```

Load your rules after `@oaspect/react/styles.css` (or anywhere, with the script tag: its styles are injected at the top of `<head>`).

| Variable | Used for |
| --- | --- |
| `--oaspect-background` | Page background |
| `--oaspect-foreground` | Body text |
| `--oaspect-card` | Panels and cards |
| `--oaspect-muted` | Subtle backgrounds: badges, hovered rows |
| `--oaspect-muted-foreground` | Secondary text |
| `--oaspect-border` | Borders and dividers |
| `--oaspect-primary` | Accent: links, active navigation, buttons, focus rings |
| `--oaspect-primary-foreground` | Text on accent backgrounds |
| `--oaspect-code` | Code block background |
| `--oaspect-code-foreground` | Code block text |

Syntax highlighting has its own variables: `--oaspect-syntax-key`, `-string`, `-number`, `-literal`, `-keyword`, `-function`, `-variable`, `-attr`, `-type` and `-comment`.

The defaults meet WCAG AA contrast. When you change them, check text on `--oaspect-background` and `--oaspect-card`, and `--oaspect-primary-foreground` on `--oaspect-primary`.

### Fonts

The reference uses the system font stack. Set your own on the root:

```css
.oaspect {
  font-family: "Inter", system-ui, sans-serif;
}
```

## Light and dark

By default the reference starts in the reader's last choice, or their system setting, and the header toggle switches it. To control it yourself:

| You want | Do |
| --- | --- |
| Always light (or dark) | `theme: "light"` and `features: { themeToggle: false }` |
| Follow your site's own theme switch | Keep `data-theme="light"` or `"dark"` on `<html>`: the reference reads it on load and writes it when the reader toggles |
| Start dark, let readers switch | `theme: "dark"` |

Dark styles apply to `.oaspect[data-theme="dark"]` and to a reference inside any `[data-theme="dark"]` ancestor, so a site-wide `data-theme` on `<html>` is enough.

### No flash on load

A prerendered page (from `oaspect build`, or your own server rendering) is painted before JavaScript runs. Set the theme in a small inline script in `<head>`, before the reference, so the first paint already has the right colors. `oaspect build` adds this for you; with the default `storagePrefix` it is:

```html
<script>
  (() => {
    let theme;
    try { theme = localStorage.getItem("oaspect:theme"); } catch {}
    if (theme !== "light" && theme !== "dark") {
      theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.dataset.theme = theme;
  })();
</script>
```

Use your own `storagePrefix` in the key if you changed it.

## Fitting into your page

- Every rule is scoped under `.oaspect`, Tailwind's cascade layers are unwrapped, and inherited text properties are reset inside the reference, so your site's `h2 { color: purple }` does not reach it and its styles do not reach your page.
- The reference uses the page scroll and a sticky header at the top of the viewport. It looks best with the full width of the page.
- Nested inside your own `<main>`, it becomes a region instead of a second main landmark.

## Tailwind CSS hosts

The viewer does not need Tailwind. If your app uses Tailwind CSS v4 and renders its own markup inside the reference (a custom `logo`, for example), import the bridge to get the viewer's colors as utilities (`bg-oaspect-card`, `text-oaspect-primary`…) and its theme as the `dark:` variant:

```css
@import "tailwindcss";
@import "@oaspect/react/tailwind.css";
```

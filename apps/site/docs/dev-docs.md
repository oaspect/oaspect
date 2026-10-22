# Developer docs

The same viewer shows your team's Markdown docs: a `docs/` folder with setup notes, conventions and runbooks becomes a small documentation site with navigation, search and "On this page", next to your API reference.

## Try it on a folder

```bash
npx oaspect docs serve docs/              # live preview; edit a file, reload the page
npx oaspect docs build docs/ -o dev-docs.html   # one self-contained HTML file
npx oaspect docs bundle docs/ -o dev-docs.json  # the folder as JSON, for your own server
```

All `.md` files under the folder are included; `node_modules`, `vendor`, `dist`, `build` and folders starting with a dot are skipped. `--title` sets the header title and `--edit-url "https://github.com/acme/api/edit/main/docs/{path}"` adds an "Edit this page" link.

[See it with this site's own docs](../demo/dev-docs.html).

## What readers get

- **One page per file**, with headings at full size, tables, code blocks highlighted in the languages oaspect knows, and copy buttons.
- **Navigation** on the left: the pages, and the `##` headings of the page being read.
- **On this page** on the right: the page's `##` and `###` headings, following the scroll.
- **Search** (`⌘K`) across every page and section, ignoring case and accents. Results show the page, the heading and the text around the match.
- **Links between files** work: `[setup](guides/setup.md#install)` opens that page at that heading.
- **Mermaid diagrams** in ```` ```mermaid ```` blocks, drawn in the current theme. Mermaid is loaded from jsDelivr only on pages that have one; until then (and without JavaScript) the source shows as code.
- Light and dark themes, the interface in your readers' language, `:::lang` blocks for translated pages, previous and next links.

Every page and heading has its own address: `#/guides/setup` and `#/guides/setup?id=install`. Add `{#id}` to a heading to keep its address when the text changes or is translated.

## Navigation order {#navigation}

Without anything else, the navigation lists the folders as groups, each with its `README.md` (or `index.md`) first and the other files by name. Page titles come from each file's first `#` heading.

To choose the order and the group names, add a `_sidebar.md` (or `SUMMARY.md`) to the folder: a list of links, as in Docsify and GitBook. Items without a link, or `##` headings, start a group:

```markdown
- [Home](README.md)
- Getting started
  - [Local setup](setup.md)
  - [Tests](tests.md)

## Conventions

- [Resources](resource-structure.md)
- [Commit messages](commits.md)
```

Files the sidebar does not list are still added after the listed ones, so nothing is lost when someone forgets to update it.

## Put it in your app

The viewer takes the docs as a bundle: a JSON object with the files' paths and contents.

```json
{
  "title": "Acme API",
  "editUrl": "https://github.com/acme/api/edit/main/docs/{path}",
  "files": [
    { "path": "README.md", "content": "# Acme API\n…" },
    { "path": "guides/setup.md", "content": "# Setup\n…" }
  ]
}
```

Any server can produce it. Serve it next to a page that loads oaspect:

```html
<script src="https://cdn.jsdelivr.net/npm/oaspect@{{version}}/dist/oaspect.js" data-docs-url="/dev-docs.json"></script>
```

or mount it yourself, or use the web component:

```js
Oaspect.docs("#docs", { docsUrl: "/dev-docs.json", defaultLocale: "en" });
```

```html
<oaspect-docs docs-url="/dev-docs.json"></oaspect-docs>
```

In React:

```jsx
import { DocsReference } from "@oaspect/react";
import "@oaspect/react/styles.css";

<DocsReference docsUrl="/dev-docs.json" />;
```

### Building the bundle on your server

A route that reads the folder on each request keeps the docs as fresh as the deployed code. In PHP:

```php
$root = __DIR__ . "/docs";
$files = [];
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
foreach ($iterator as $file) {
    if (strtolower($file->getExtension()) !== "md") continue;
    $path = str_replace(DIRECTORY_SEPARATOR, "/", substr($file->getPathname(), strlen($root) + 1));
    $files[] = ["path" => $path, "content" => file_get_contents($file->getPathname())];
}
usort($files, fn($a, $b) => strcmp($a["path"], $b["path"]));
header("Content-Type: application/json; charset=utf-8");
echo json_encode(["title" => "Acme API", "files" => $files], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
```

With Node, run `oaspect docs bundle` in your build, or call it from a route.

## Options {#options}

`Oaspect.docs`, `<oaspect-docs>` and `<DocsReference>` take the same options as the API reference where they apply (see [Configuration](configuration.md)):

| Option | Attribute | Description |
| --- | --- | --- |
| `docsUrl` | `docs-url` | URL of a JSON bundle. |
| `docs` | property `docs` | The bundle as an object. Takes precedence over `docsUrl`. |
| `title` | `title` | Header title. Default: the bundle's `title`, else the root README's first heading. |
| `editUrl` | `edit-url` | "Edit this page" link with `{path}`; overrides the bundle's. |
| `logo` | `logo`, `logo-dark`… | Header logo, as in the API reference. |
| `locale`, `defaultLocale`, `onLocaleChange`, `messages` | `locale`, `default-locale` | Interface language. |
| `theme` | `theme` | Force `"light"` or `"dark"`. |
| `storagePrefix` | `storage-prefix` | Prefix of the saved theme. Default `"oaspect-docs"`. |
| `features` | `hide="search,language-switcher,theme-toggle"` | Turn off `search`, `languageSwitcher` or `themeToggle`. |

Raw HTML in the Markdown is shown as text, as in API descriptions. Images and links to other files than Markdown keep their URL as written, so use absolute URLs for images.

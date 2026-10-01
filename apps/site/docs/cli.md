# CLI

The `oaspect` command builds a self-contained HTML reference from a spec file, or serves a live preview while you write the spec.

```bash
npx oaspect build openapi.yaml -o docs.html
npx oaspect serve openapi.yaml
```

Install it in a project with `npm install --save-dev oaspect` to pin the version. Node.js 20 or later.

## build

```bash
oaspect build <spec> [-o docs.html] [options]
```

Writes one HTML file containing the viewer script, its styles and your document. Host it anywhere: a bucket, GitHub Pages, an intranet share, an email attachment.

The reference is **prerendered**: the HTML already holds every operation and model, so the page reads before (and without) JavaScript and search engines index it. The script then attaches to that markup. Pass `--no-prerender` for a smaller file that renders in the browser only.

In a built file the Source menu and `?url=` loading are off (the file documents one API), there is no proxy, and lazy rendering is off so the whole reference is in the HTML.

`<spec>` is a path or an `http(s)` URL, JSON or YAML, OpenAPI 3.x or Swagger 2.0. References to other files or URLs are resolved and inlined.

## serve

```bash
oaspect serve <spec> [--port 8080] [options]
```

Serves the reference at `http://127.0.0.1:8080` and reads `<spec>` again on every page load: edit the file, reload the page. Try requests go through a built-in proxy, so APIs without CORS work.

The proxy allows any host while the server listens on a loopback address. To listen on the network (`--host 0.0.0.0`), list the hosts the proxy may call with `--proxy-hosts`, or turn it off with `--no-proxy`; the command refuses to expose an open relay.

## Options

| Option | Commands | Description |
| --- | --- | --- |
| `-o`, `--output <file>` | build | Output file. Default: the spec's name with `.html`. |
| `--title <text>` | both | Page and header title. Default: `info.title`. |
| `--locale <code>` | both | Starting UI language (`en`, `tr`, `ar`…). Readers can still switch. |
| `--theme <light\|dark>` | both | Force a theme. |
| `--logo <url>` | both | Header logo image. |
| `--no-prerender` | build | Render in the browser only. |
| `--port <number>` | serve | Port. Default `8080`. |
| `--host <address>` | serve | Address to listen on. Default `127.0.0.1`. |
| `--proxy-hosts <list>` | serve | Comma-separated hosts the proxy may call. |
| `--no-proxy` | serve | Turn the Try proxy off. |
| `-h`, `--help` | | Show help. |
| `-v`, `--version` | | Show the version. |

## In CI

Build the reference with your API and publish it with the rest of your static files:

```yaml
# .github/workflows/docs.yml (excerpt)
- run: npx oaspect@0.1.0 build openapi.yaml -o public/docs.html --title "Acme API"
```

The output depends only on the spec and the oaspect version, so pin the version for reproducible builds.

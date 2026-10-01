# FAQ and limitations

Answers to common questions, and what oaspect does not do yet.

## How is oaspect different from Redoc, Swagger UI or Scalar?

oaspect sits between them: a three-column reference like Redoc, a Try runner like Swagger UI and Scalar, in one 138 KB script. Its focus is documentation for readers in several languages (interface and spec translations, right to left included), a scoped stylesheet that does not fight the host page, and static prerendered output from the CLI. It is a viewer only: no hosted platform, no account, no telemetry.

## Try requests fail with a network error

The browser blocked the request because the API does not send CORS headers for the docs' origin. Add them to the API (see [Try it](try-it.md#making-direct-requests-work)) or relay requests through a proxy on your server and set `proxyUrl`.

## The proxy answers 403

The target host is not in `allowedHosts`. Hosts with a port must match the port: `api.example.com:8443`. In a container, `localhost` is the container itself; see [Server helpers](server.md#running-behind-docker).

## My document does not load

Open the browser console: the reference shows the error, and the console has details. Common causes:

- The URL is on another origin without CORS headers. Serve the document from your own origin, or with `createSpecHandler`.
- The file is not OpenAPI: it needs `openapi` (or `swagger`) and `paths`.
- An external `$ref` points to a file the browser cannot fetch.

## Can readers load their own document?

Yes, unless you turn it off: the Source menu takes a URL or a local file (which never leaves the browser), and `?url=https://…` loads a document from a link. Turn them off with `features: { sourceMenu: false }` and `urlParam: null`.

## Is it safe to render untrusted documents?

Descriptions are rendered from Markdown without raw HTML, and links only allow `http`, `https`, `mailto` and relative URLs, so a document cannot run script in your page. Try requests go only where the reader sends them. If you run a proxy, its `allowedHosts` decides what your server can be made to call.

## Does it work with large documents?

Yes. Above 40 operations, sections render only when they come near the viewport (`lazy`), while anchors, search and scroll position keep working.

## Does it work without JavaScript?

A page built with `oaspect build` is prerendered: navigation, operations, schemas and examples are in the HTML. Try, search, theme and language switching need JavaScript.

## Where are my readers' tokens stored?

In their browser's `localStorage`, under your `storagePrefix`. They are sent only with Try requests (to the API, or your proxy). See [Configuration](configuration.md#what-the-browser-stores).

## Limitations

- OAuth2 `authorizationCode` and `implicit` flows have no redirect flow; readers paste a token.
- Some clients have no multipart encoder (Wget, Node `http`, Python `http.client`, Java `java.net.http`); their samples point to another client.
- `const`, `discriminator` and XML details are not shown. `x-codeSamples` and `x-tagGroups` are ignored.
- The interface ships in English, Turkish and Arabic; other languages need `messages`.

Found something else? [Open an issue](https://github.com/oaspect/oaspect/issues).

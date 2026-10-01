# Server helpers

`oaspect/server` has two handlers for what a static page cannot do: relaying Try requests to APIs without CORS headers, and serving your document from a live URL with a stored fallback. Both take a Web `Request` and return a `Response`.

```js
import { createProxyHandler, createSpecHandler, formDataFromParts } from "oaspect/server";
```

They use only Web standard APIs (`fetch`, `Request`, `Response`, `FormData`), so they run on Node.js 20+, Bun, Deno, Cloudflare Workers and in framework route handlers.

## Relay Try requests

```js
const proxy = createProxyHandler({
  allowedHosts: ["api.example.com", "staging.example.com:8443"],
});
```

Mount it as a `POST` route and pass its path to the viewer as `proxyUrl`. The viewer then sends Try requests (and OAuth2 token requests) through it.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `allowedHosts` | `string[]` or `"*"` | required | Hosts the proxy may call. An entry with a port (`localhost:8080`) matches that port only; without one, any port. `"*"` allows every host. |
| `timeoutMs` | `number` | `30000` | Gives up on the upstream request after this long (answers `502`). |
| `rewriteHost` | `(url: URL) => URL` | | Changes the target after the host check, e.g. to reach `localhost` from inside a container. |

> Keep `allowedHosts` to your API. With `"*"`, anyone who can reach your docs can make your server call internal services and cloud metadata addresses. `createProxyHandler` throws when the list is empty.

### What it receives and returns

The viewer posts JSON describing the request:

```json
{
  "method": "PATCH",
  "url": "https://api.example.com/pets/12?notify=true",
  "headers": { "Authorization": "Bearer …", "Content-Type": "application/json" },
  "body": "{\"name\":\"Rex\"}"
}
```

Multipart bodies come as `form`, a list of `{ name, value }` and `{ name, file: { name, type, data } }` parts with base64 file data; `formDataFromParts` turns them into `FormData` if you write your own relay.

The proxy answers `200` with the upstream response, whatever its status:

```json
{
  "status": 201,
  "statusText": "Created",
  "headers": [["content-type", "application/json"], ["x-request-id", "req_8f2c"]],
  "body": "{\"id\":12,\"name\":\"Rex\"}",
  "duration": 84
}
```

Errors are JSON `{ "error": "…" }`: `400` for a malformed payload, URL or protocol (only `http` and `https`), `403` for a host that is not allowed, `405` for anything but `POST`, `502` when the target cannot be reached or times out. Hop-by-hop headers (`Host`, `Connection`, `Content-Length`…) are dropped, and redirects are returned rather than followed.

The [server API reference](../reference.html) documents this contract as an OpenAPI document, rendered by oaspect.

## Serve the document

```js
import { readFile } from "node:fs/promises";

const spec = createSpecHandler({
  url: process.env.SPEC_URL,                          // e.g. https://api.example.com/openapi.json
  fallback: () => readFile("openapi.json", "utf8"),   // stored copy
});
```

Mount it as a `GET` route and use its path as `specUrl`. The live document is fetched server-side, so the API needs no CORS headers, and cached.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `url` | `string` | | Live document URL. |
| `fallback` | `string` or `() => string \| Promise<string>` | | Document text served when `url` is missing or fails. |
| `cacheSeconds` | `number` | `60` | How long a fetched document is reused; also the `Cache-Control` max-age. |
| `timeoutMs` | `number` | `10000` | Upstream timeout. |
| `rewriteHost` | `(url: URL) => URL` | | Changes the live URL before fetching. |

Give at least one of `url` and `fallback`. Every response carries `x-oaspect-spec-source`:

| Value | Meaning |
| --- | --- |
| `remote` | The live document |
| `fallback` | `url` failed and the fallback was served; the viewer shows an out-of-date notice |
| `static` | No `url`, the fallback is the document |

Without a fallback, a failed live fetch answers `502`. JSON and YAML are both passed through.

## Mounting the handlers

### Next.js route handlers

```js
// app/api/proxy/route.js
export const POST = createProxyHandler({ allowedHosts: ["api.example.com"] });

// app/openapi/route.js
export const GET = createSpecHandler({ url: process.env.SPEC_URL, fallback: () => readFile("openapi.json", "utf8") });
```

### Hono, Bun, Deno and Cloudflare Workers

```js
// Hono
app.post("/api/proxy", (c) => proxy(c.req.raw));
app.get("/openapi", () => spec());

// Bun and Deno
Bun.serve({ fetch: (request) => (new URL(request.url).pathname === "/api/proxy" ? proxy(request) : new Response("Not found", { status: 404 })) });
Deno.serve((request) => proxy(request));

// Cloudflare Workers
export default { fetch: (request) => proxy(request) };
```

### Node.js `http` and Express

Node's own server has its own request type; convert it to a Web `Request`, and write the `Response` back:

```js
import { createServer } from "node:http";
import { Readable } from "node:stream";

function toRequest(req) {
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(new URL(req.url, `http://${req.headers.host}`), {
    method: req.method,
    headers: req.headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

createServer(async (req, res) => {
  if (req.url === "/api/proxy") return send(res, await proxy(toRequest(req)));
  if (req.url === "/openapi") return send(res, await spec());
  res.writeHead(404).end();
}).listen(3000);
```

In Express, use the same two functions in a route, and register it before any body parser, which would consume the stream:

```js
app.post("/api/proxy", async (req, res) => send(res, await proxy(toRequest(req))));
```

[`examples/node`](https://github.com/oaspect/oaspect/tree/main/examples/node) is a complete server with the page, the document and the proxy.

## Running behind Docker

When the proxy runs in a container and your API on the host machine, `localhost` points to the container. Map it back:

```js
const proxy = createProxyHandler({
  allowedHosts: ["localhost:8101"],
  rewriteHost: (url) => {
    if (url.hostname === "localhost") url.hostname = "host.docker.internal";
    return url;
  },
});
```

The host check runs before the rewrite, so the allowed list keeps the names your readers see.

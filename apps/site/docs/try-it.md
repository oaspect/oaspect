# Try it and authentication

Every operation has a Try button that opens a request editor. Readers send the request from the docs and see the response, without copying anything into another tool.

## What the dialog does

- Fills path, query, header and cookie parameters and the request body from the document's examples, or from examples generated from the schemas.
- Edits `multipart/form-data` bodies field by field, with file pickers for binary fields.
- Applies the credentials from the Connection panel to the request.
- Shows the status, the time it took, the response headers and the body, highlighted.
- Asks for confirmation before anything other than `GET`, `HEAD` or `OPTIONS`: example values can overwrite real records. Readers can skip the question for the rest of the browser tab.

The code samples beside each operation are built from the same request, so what readers try is what they copy.

Turn the feature off with `features: { tryIt: false }`.

## Servers and variables

The Connection panel in the introduction picks the server from the document's `servers`, or a custom URL, and edits [server variables](https://spec.openapis.org/oas/v3.1.0#server-variable-object) such as `{region}`. The choice applies to every request and code sample.

## Authentication

The panel shows one input per security scheme in `components.securitySchemes`:

| Scheme | Readers enter | Sent as |
| --- | --- | --- |
| `http` `bearer` | A token | `Authorization: Bearer …` |
| `http` `basic` | User name and password | `Authorization: Basic …` |
| `apiKey` | A key | Header, query parameter or cookie, as the scheme says |
| `oauth2` | A token, or credentials to request one | `Authorization: Bearer …` |
| `openIdConnect` | A token | `Authorization: Bearer …` |

For OAuth2 `clientCredentials` and `password` flows, the panel requests the token itself from the flow's `tokenUrl` (through the proxy when there is one). Flows that need a browser redirect (`authorizationCode`, `implicit`) take a token the reader obtained elsewhere.

Operations list the schemes they require. When a security requirement combines schemes (`[{ apiKey: [], bearer: [] }]`), all of them are applied; when it offers alternatives, the first one whose schemes all have credentials is used. A document without security schemes still gets a Bearer token field.

Credentials stay in the reader's browser (`localStorage`, see [Configuration](configuration.md#what-the-browser-stores)) and go only to the API, or to your proxy when it relays the request.

## Direct or through a proxy

Browsers only let a page call another origin when that origin allows it with CORS headers. There are two ways to send Try requests:

| Mode | How | Needs |
| --- | --- | --- |
| Direct | The browser calls the API | The API answers with CORS headers for the docs' origin |
| Proxy | The browser posts the request to your `proxyUrl`; your server sends it | A proxy endpoint, e.g. `createProxyHandler` from `oaspect/server` |

With `proxyUrl` set, the dialog offers both and starts in proxy mode; readers switch and the choice is remembered. Without it, requests go directly.

### Making direct requests work

Your API must answer the browser's preflight (`OPTIONS`) and the request itself with:

```http
Access-Control-Allow-Origin: https://docs.example.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Expose-Headers: *
```

`Access-Control-Allow-Headers: *` does not cover `Authorization`; list it, or echo the request's `Access-Control-Request-Headers`. Without `Access-Control-Expose-Headers`, the dialog sees only a few response headers.

### Using a proxy

```js
import { createProxyHandler } from "oaspect/server";

export const POST = createProxyHandler({ allowedHosts: ["api.example.com"] });
```

```js
Oaspect.init("#docs", { specUrl: "/openapi.yaml", proxyUrl: "/api/proxy" });
```

Serve the proxy from the same origin as the docs, so the proxy itself needs no CORS. Keep `allowedHosts` to your API: an open relay lets anyone reach whatever your server can reach, including internal services and cloud metadata. Details in [Server helpers](server.md).

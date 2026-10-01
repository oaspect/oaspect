# @oaspect/core

The framework-free engine behind the viewer, for building your own documentation UI, linting tools or code generators on the same behavior. TypeScript, ESM, one dependency (`yaml`), no DOM.

```bash
npm install @oaspect/core
```

```ts
import { buildModel, loadSpec, resolveSnippet, buildRequest, defaultValues } from "@oaspect/core";

const spec = await loadSpec(await fetch(url).then((response) => response.text()), {
  baseUrl: url,
  read: (ref) => fetch(ref).then((response) => response.text()),
});

const model = buildModel(spec);
for (const tag of model.tags) {
  for (const operation of tag.operations) console.log(operation.method.toUpperCase(), operation.path, operation.summary);
}
```

Type definitions ship with the package.

## Loading documents

| Function | Does |
| --- | --- |
| `loadSpec(text, { baseUrl, read }?)` | Parses JSON or YAML, converts Swagger 2.0, and resolves external `$ref`s when `baseUrl` and `read` are given. Async. |
| `loadSpecText(text)` | The synchronous part: parse, check, convert. Throws when the text is not an OpenAPI document. |
| `parseSpec(text)` | JSON or YAML text to a value, nothing more. |
| `isOpenApiDocument(value)` | Has `openapi` or `swagger`, and `paths`. |
| `normalizeSpec(doc)` | Converts Swagger 2.0 to OpenAPI 3.0; returns 3.x documents unchanged. |
| `convertSwagger2(doc)`, `convertSchema(schema)` | The conversion itself. |
| `resolveExternalRefs(doc, { baseUrl, read, maxDocuments })` | Loads referenced files through `read(url)` and rewrites references to point inside the document. `hasExternalRefs(doc)` checks first. |

## The model

`buildModel(spec)` turns the document into what a reference shows: tags with their operations, webhooks and models, with parameters merged from path and operation level, `$ref`s resolved, callbacks and links attached.

| Function | Does |
| --- | --- |
| `buildModel(spec)` | `{ openapi, info, servers, securitySchemes, tags, operations, webhooks, schemas }`; each tag has its `operations`. |
| `serverUrl(server, values)` | Fills server variables. |
| `linkTarget(model, link)` | The operation a response link points to. |
| `slugify(text)`, `tagAnchor(name)`, `modelAnchor(name)` | The anchors the viewer uses (`#tag/…`, `#operation/…`, `#model/…`). |

## Schemas and examples

| Function | Does |
| --- | --- |
| `deref(spec, node)`, `resolvePointer(spec, pointer)`, `refName(ref)` | Follow references. |
| `resolveSchema(spec, schema)` | Dereferences and merges `allOf`; returns the schema and its component name. |
| `childrenOf(spec, schema)` | What a tree shows under a schema: properties, array items, map values or `oneOf`/`anyOf` variants. |
| `inferType(schema)`, `typeLabel(spec, schema)`, `constraintsOf(schema)` | `string<email>`, `array<Pet>`, `["≥ 1", "max length 20"]`. |
| `exampleFromSchema(spec, schema)` | Generates an example (see [OpenAPI support](openapi.md#examples)). |
| `mediaExample(spec, media)`, `mediaExamples(spec, media)` | The example of a media type, and its named examples. |

## Requests and code samples

| Function | Does |
| --- | --- |
| `defaultValues(spec, operation)`, `parameterExample(spec, parameter)` | Starting values for parameters. |
| `defaultBody(spec, operation)` | `{ body, form, contentType }` for the request body; `form` for multipart. |
| `buildRequest(operation, { server, values, body, form, contentType, headers })` | `server` is a server object (`{ url }`). Returns an `HttpRequest`: method, URL with query string, headers, body or multipart parts. |
| `SNIPPET_LANGUAGES` | The languages and clients; each client has `build(request)` returning code. |
| `resolveSnippet("python:requests")` | Finds a language and client, with fallbacks. |
| `isMultipart(contentType)`, `formEncode(value)`, `jsonMediaType(content)` | Helpers. |

```ts
const operation = model.operations.find((item) => item.operationId === "pets_create");
const request = buildRequest(operation, {
  server: { url: "https://api.example.com" },
  values: defaultValues(spec, operation),
  ...defaultBody(spec, operation),
  headers: { Authorization: "Bearer TOKEN" },
});
const { client } = resolveSnippet("python:requests");
console.log(client.build(request));
```

## Security

| Function | Does |
| --- | --- |
| `securityRequirements(operation)` | The operation's requirements (or the document's), as lists of scheme names. |
| `applySecurity(schemes, requirements, credentials)` | Headers, query parameters and cookies for the first requirement whose schemes all have credentials. |
| `hasCredential(scheme, credential)`, `describeScheme(scheme)` | Helpers for building an auth panel. |
| `buildTokenRequest(flow, flowObject, credential)`, `TOKEN_FLOWS` | The token request for OAuth2 `clientCredentials` and `password` flows. |

## Text

| Function | Does |
| --- | --- |
| `parseMarkdown(text)` | Markdown to a block tree (the GFM subset the viewer renders, including `:::lang` blocks). `parseBlocks` and `parseInline` are the parts. |
| `selectLocale(blocks, locale, fallbacks)` | Keeps the language block that matches. |
| `safeUrl(url, { image })` | Returns the URL when it is safe to link, else `null`. |
| `localize(node, field, locale)` | The `x-i18n` translation of a field, or the field. |
| `tokenize(code, language)` | Syntax highlighting tokens (`{ type, text }`) for the sample languages and JSON. |

This site's docs pages are rendered with `parseMarkdown` and `tokenize`.

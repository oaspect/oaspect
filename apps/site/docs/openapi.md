# OpenAPI support

What oaspect reads from your document, how it shows it, and the extensions it understands.

## Versions and formats

- **OpenAPI 3.0 and 3.1**, as JSON or YAML.
- **Swagger 2.0**, converted to OpenAPI 3.0 on load: `definitions`, `parameters` and `responses` move to `components`, `body` and `formData` parameters become request bodies, `host`/`basePath`/`schemes` become `servers`, `securityDefinitions` become security schemes.
- The document must have `openapi` (or `swagger`) and `paths`.

## References

- Local `$ref`s (`#/components/schemas/Pet`) anywhere, including cycles, which are shown once and marked.
- **External references** to other files and URLs (`./schemas/pet.yaml`, `common.json#/Error`, `https://…`) resolve relative to the document's URL. With `specUrl` the browser fetches them (same origin, or with CORS); the CLI reads them from disk. A document with up to 100 referenced files is supported.

## What is shown

| OpenAPI | In the reference |
| --- | --- |
| `info` | Title, version, Markdown description, a contact link when `contact.email` is set; counts of operations, tags and models |
| `servers`, server variables | The Connection panel: server picker and variable inputs, applied to Try and samples |
| `tags` | Navigation groups, with descriptions; operations without tags go under "Default" |
| Operations | Method, path, summary, description, operationId, deprecation, required security |
| Parameters | Path, query, header and cookie, with type, required, default, enum, constraints, examples, deprecation |
| Request bodies | Every media type; schema tree and example for each |
| Responses | Status, description, headers, schema tree and examples per media type; `links` to other operations |
| `callbacks` | Shown under their operation, each with its request and responses |
| `webhooks` (3.1) | A Webhooks section, each with its payload and the responses your server should send |
| `components.schemas` | The Models section, one entry per schema |
| `securitySchemes` | The Connection panel inputs; see [Try it](try-it.md#authentication) |

### Schemas

Schema trees expand field by field and show:

- `$ref` (linked by name to its model), `allOf` (merged into one object), `oneOf` and `anyOf` (one tab per variant);
- arrays, maps (`additionalProperties`), nested objects, and 3.1 type arrays (`["string", "null"]` shows as `string | null`);
- `required`, `nullable`, `readOnly`, `writeOnly` and `deprecated` flags;
- `format` in the type (`string<uuid>`), `enum` values, `default`, `example`, `pattern`, minimum and maximum (exclusive too), `multipleOf`, lengths, item counts and `uniqueItems`.

### Examples

Request and response examples come from the media type's `example` or `examples` (with a picker when there are several), else they are generated from the schema. For each field the generator takes, in order: `example`, the first of `examples`, `default`, the first `enum` value, `const`, the first `oneOf`/`anyOf` variant, and otherwise a value for the type: a sample for the `format` (`date-time`, `email`, `uuid`, `uri`…), the `minimum` for numbers, `true` for booleans. `writeOnly` properties are left out.

## Markdown

Descriptions are Markdown (a GitHub-flavored subset): headings, paragraphs, emphasis, strikethrough, inline code, links, images, automatic links, ordered, unordered and task lists, nested lists, tables with alignment, fenced code blocks (highlighted for the languages oaspect knows), block quotes and horizontal rules.

Raw HTML is never rendered: it shows as text. Links and images accept `http`, `https`, `mailto` and relative URLs only.

## Extensions

| Extension | Where | Purpose |
| --- | --- | --- |
| `x-i18n` | Most objects with text | Translations of `summary`, `description`, `title` and tag `name`. See [Localization](localization.md#short-fields-x-i18n). |
| `:::lang` blocks | Markdown text | Several languages in one field. See [Localization](localization.md#long-markdown-lang-blocks). |

Other `x-` extensions are ignored. oaspect stores resolved external documents under `components.x-oaspect-external`; you never write that yourself.

## Not supported yet

- XML schemas (`xml` objects) are shown as plain schemas.
- `const` and `discriminator` are not shown; `x-codeSamples` (Redoc's custom samples) and `x-tagGroups` are ignored.
- OAuth2 `authorizationCode` and `implicit` flows take a token obtained elsewhere; there is no redirect flow.

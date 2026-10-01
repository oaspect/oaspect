# @oaspect/core

Framework-free OpenAPI processing behind [oaspect](https://github.com/oaspect/oaspect):

- `loadSpecText()`, `parseSpec()`, `normalizeSpec()`: JSON or YAML, Swagger 2.0 → OpenAPI 3.0
- `buildModel()`: tags → operations with resolved parameters, bodies and responses
- `resolveSchema()`, `childrenOf()`, `typeLabel()`: `$ref`/`allOf` resolution for schema trees
- `exampleFromSchema()`, `mediaExample()`: example values
- `buildRequest()`, `defaultValues()`, `defaultBody()`: concrete HTTP requests
- `SNIPPET_LANGUAGES`, `resolveSnippet()`: code samples for 30 clients
- `parseMarkdown()`, `selectLocale()`, `localize()`: Markdown with `:::lang` blocks and `x-i18n`
- `tokenize()`: syntax highlighting tokens

Written in TypeScript; ships ESM with type definitions. MIT licensed.

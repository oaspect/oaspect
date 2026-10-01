# oaspect

Interactive API reference for OpenAPI 3.x and Swagger 2.0 documents (JSON or YAML).

```html
<script src="https://cdn.jsdelivr.net/npm/oaspect" data-spec-url="/openapi.yaml"></script>
```

```bash
npx oaspect build openapi.yaml -o docs.html
npx oaspect serve openapi.yaml
```

```js
import { createProxyHandler } from "oaspect/server";
```

See the [main README](https://github.com/oaspect/oaspect) for the web component,
React usage, configuration and translations. MIT licensed.

# @oaspect/react

<a href="https://oaspect.dev/demo/roastery.html"><img src="https://oaspect.dev/images/hero-light.webp" alt="oaspect rendering an OpenAPI document: navigation, an operation and code samples" width="100%" /></a>

The [oaspect](https://github.com/oaspect/oaspect) API reference as a React component.

```jsx
import { ApiReference } from "@oaspect/react";
import "@oaspect/react/styles.css";

<ApiReference specUrl="/openapi.yaml" />;
```

Every module carries `"use client"`, so it works in React Server Components
frameworks such as Next.js. See the [main README](https://github.com/oaspect/oaspect#configuration)
for all props. MIT licensed.

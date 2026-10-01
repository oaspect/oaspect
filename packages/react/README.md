# @oaspect/react

The [oaspect](https://github.com/oaspect/oaspect) API reference as a React component.

```jsx
import { ApiReference } from "@oaspect/react";
import "@oaspect/react/styles.css";

<ApiReference specUrl="/openapi.yaml" />;
```

Every module carries `"use client"`, so it works in React Server Components
frameworks such as Next.js. See the [main README](https://github.com/oaspect/oaspect#configuration)
for all props. MIT licensed.

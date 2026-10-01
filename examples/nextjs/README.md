# Next.js (App Router)

```bash
pnpm dev
```

- `app/page.js`: the `<ApiReference>` component (`@oaspect/react/styles.css` is imported in `layout.js`)
- `app/openapi/route.js`: `createSpecHandler`, the live spec (`SPEC_URL`) with a bundled fallback
- `app/api/proxy/route.js`: `createProxyHandler` for "Try" requests (`ALLOWED_HOSTS`)

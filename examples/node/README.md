# Node (no framework)

```bash
pnpm start                                   # http://localhost:3000
SPEC_URL=https://api.example.com/openapi.json ALLOWED_HOSTS=api.example.com pnpm start
```

`createSpecHandler` and `createProxyHandler` take a Web `Request` and return a
`Response`; `server.mjs` shows the small adapter for `node:http`. The same
handlers plug into Express (via a similar adapter), Hono, Bun, Deno or
Cloudflare Workers as they are.

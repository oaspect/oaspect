// Dependency-free Node server: the viewer page, the spec and a "Try" proxy,
// using oaspect/server's Web-standard handlers.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { Readable } from "node:stream";
import { createProxyHandler, createSpecHandler } from "oaspect/server";

const require = createRequire(import.meta.url);
const bundle = require.resolve("oaspect");
const port = Number(process.env.PORT ?? 3000);

const spec = createSpecHandler({
  url: process.env.SPEC_URL, // optional live document
  fallback: () => readFile(new URL("./openapi.json", import.meta.url), "utf8"),
});
const proxy = createProxyHandler({ allowedHosts: (process.env.ALLOWED_HOSTS ?? "api.example.com").split(",") });

const page = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>API</title><style>body{margin:0}</style></head>
  <body>
    <div id="docs"></div>
    <script src="/oaspect.js"></script>
    <script>Oaspect.init("#docs", { specUrl: "/openapi.json", proxyUrl: "/proxy" });</script>
  </body>
</html>`;

// node:http request → Web Request, Web Response → node:http response.
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
  const { pathname } = new URL(req.url, "http://localhost");
  if (pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(page);
  }
  if (pathname === "/oaspect.js") {
    res.writeHead(200, { "Content-Type": "text/javascript" });
    return res.end(await readFile(bundle));
  }
  if (pathname === "/openapi.json") return send(res, await spec(toRequest(req)));
  if (pathname === "/proxy") return send(res, await proxy(toRequest(req)));
  res.writeHead(404);
  res.end();
}).listen(port, () => console.log(`http://localhost:${port}`));

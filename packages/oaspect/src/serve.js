// `oaspect serve`: local preview server. The spec is re-read on every request,
// so editing the file and reloading the page shows the change.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import { renderHtml } from "./html.js";
import { createProxyHandler } from "./server.js";
import { loadSpec } from "./spec.js";

const PROXY_PATH = "/__oaspect/proxy";
const LOOPBACK = new Set(["127.0.0.1", "localhost", "::1"]);

function toRequest(req, origin) {
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(new URL(req.url, origin), {
    method: req.method,
    headers: Object.entries(req.headers).flatMap(([key, value]) => (Array.isArray(value) ? value.map((item) => [key, item]) : [[key, value]])),
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

/**
 * @param {{ source: string, port?: number, host?: string, proxy?: boolean | string[], bundlePath: string, config?: object }} options
 */
export async function serve({ source, port = 8080, host = "127.0.0.1", proxy = true, bundlePath, config = {} }) {
  await loadSpec(source); // fail fast on a broken document
  // An open relay on a non-loopback address would let the network reach
  // anything this machine can see; require an explicit host list there.
  if (proxy === true && !LOOPBACK.has(host)) {
    throw new Error(`--host ${host} exposes the proxy to the network; pass --proxy-hosts api.example.com or --no-proxy.`);
  }
  const proxyHandler = proxy ? createProxyHandler({ allowedHosts: proxy === true ? "*" : proxy }) : null;

  const html = () =>
    renderHtml({
      title: config.title ?? "API Reference",
      config: { ...config, specUrl: "/openapi.json", proxyUrl: proxyHandler ? PROXY_PATH : null },
      script: { src: "/oaspect.js" },
    });

  const server = createServer(async (req, res) => {
    const origin = `http://${req.headers.host ?? `${host}:${port}`}`;
    const { pathname } = new URL(req.url, origin);
    try {
      if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
        res.end(html());
      } else if (req.method === "GET" && pathname === "/openapi.json") {
        const spec = await loadSpec(source);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        res.end(JSON.stringify(spec));
      } else if (req.method === "GET" && pathname === "/oaspect.js") {
        res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
        res.end(await readFile(bundlePath));
      } else if (pathname === "/favicon.ico") {
        // The page declares an inline icon; answer browsers that still ask.
        res.writeHead(204);
        res.end();
      } else if (proxyHandler && pathname === PROXY_PATH) {
        await send(res, await proxyHandler(toRequest(req, origin)));
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
      }
    } catch (error) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(String(error.message ?? error));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return { server, url: `http://${address.family === "IPv6" ? `[${address.address}]` : address.address}:${address.port}` };
}

import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createProxyHandler, createSpecHandler } from "../src/server.js";

let upstream;
let origin;

beforeAll(async () => {
  upstream = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      res.setHeader("content-type", "application/json");
      if (String(req.headers["content-type"]).startsWith("multipart/form-data")) {
        new Request("http://x", { method: "POST", headers: req.headers, body })
          .formData()
          .then(async (form) => {
            const file = form.get("photo");
            res.end(JSON.stringify({ caption: form.get("caption"), photo: await file.text(), photoName: file.name, photoType: file.type }));
          });
        return;
      }
      res.end(JSON.stringify({ method: req.method, body, auth: req.headers.authorization ?? null, host: req.headers.host }));
    });
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${upstream.address().port}`;
});

afterAll(() => upstream.close());

const call = (handler, payload, method = "POST") =>
  handler(new Request("http://docs.local/proxy", { method, body: method === "POST" ? (typeof payload === "string" ? payload : JSON.stringify(payload)) : undefined }));

describe("createProxyHandler", () => {
  test("requires an explicit host list", () => {
    expect(() => createProxyHandler({ allowedHosts: [] })).toThrow(/allowedHosts/);
    expect(() => createProxyHandler({})).toThrow(/allowedHosts/);
  });

  test("relays method, headers and body; drops Host", async () => {
    const proxy = createProxyHandler({ allowedHosts: "*" });
    const response = await call(proxy, { method: "patch", url: `${origin}/x`, headers: { Authorization: "Bearer t", Host: "evil" }, body: '{"a":1}' });
    const result = await response.json();
    expect(result.status).toBe(200);
    const echoed = JSON.parse(result.body);
    expect([echoed.method, echoed.body, echoed.auth]).toEqual(["PATCH", '{"a":1}', "Bearer t"]);
    expect(echoed.host).not.toBe("evil");
  });

  test("enforces the allowlist by host or hostname", async () => {
    expect((await call(createProxyHandler({ allowedHosts: ["api.example.com"] }), { url: `${origin}/x` })).status).toBe(403);
    expect((await call(createProxyHandler({ allowedHosts: [new URL(origin).host] }), { url: `${origin}/x` })).status).toBe(200);
    expect((await call(createProxyHandler({ allowedHosts: ["127.0.0.1"] }), { url: `${origin}/x` })).status).toBe(200);
  });

  test("rejects bad input and other methods", async () => {
    const proxy = createProxyHandler({ allowedHosts: "*" });
    expect((await call(proxy, "nope")).status).toBe(400);
    expect((await call(proxy, { url: "not a url" })).status).toBe(400);
    expect((await call(proxy, { url: "file:///etc/passwd" })).status).toBe(400);
    expect((await call(proxy, null, "GET")).status).toBe(405);
  });

  test("rewriteHost can redirect the target", async () => {
    const proxy = createProxyHandler({ allowedHosts: ["api.internal"], rewriteHost: () => new URL(`${origin}/rewritten`) });
    const result = await (await call(proxy, { url: "http://api.internal/x" })).json();
    expect(result.status).toBe(200);
  });

  test("rebuilds multipart bodies from base64 parts", async () => {
    const proxy = createProxyHandler({ allowedHosts: "*" });
    const response = await call(proxy, {
      method: "POST",
      url: `${origin}/upload`,
      headers: { "Content-Type": "multipart/form-data" },
      form: [{ name: "caption", value: "hi" }, { name: "photo", file: { name: "a.txt", type: "text/plain", data: btoa("file contents") } }],
    });
    const result = await response.json();
    expect(JSON.parse(result.body)).toEqual({ caption: "hi", photo: "file contents", photoName: "a.txt", photoType: "text/plain" });
  });

  test("reports unreachable targets as 502", async () => {
    expect((await call(createProxyHandler({ allowedHosts: "*" }), { url: "http://127.0.0.1:9/x" })).status).toBe(502);
  });
});

describe("createSpecHandler", () => {
  test("serves the live document, caches it, and falls back when it fails", async () => {
    let calls = 0;
    const live = createServer((req, res) => {
      calls += 1;
      if (req.url === "/broken") {
        res.statusCode = 500;
        return res.end();
      }
      res.setHeader("content-type", "application/json");
      res.end('{"openapi":"3.0.0","paths":{}}');
    });
    await new Promise((resolve) => live.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${live.address().port}`;
    try {
      const handler = createSpecHandler({ url: `${base}/openapi.json`, fallback: "openapi: 3.0.0" });
      const first = await handler();
      expect(first.headers.get("x-oaspect-spec-source")).toBe("remote");
      expect(await first.json()).toEqual({ openapi: "3.0.0", paths: {} });
      await handler();
      expect(calls).toBe(1);

      const broken = await createSpecHandler({ url: `${base}/broken`, fallback: () => "openapi: 3.0.0" })();
      expect(broken.headers.get("x-oaspect-spec-source")).toBe("fallback");
      expect(broken.headers.get("content-type")).toMatch(/yaml/);
      expect(await broken.text()).toBe("openapi: 3.0.0");

      expect((await createSpecHandler({ url: `${base}/broken` })()).status).toBe(502);
      expect((await createSpecHandler({ fallback: "{}" })()).headers.get("x-oaspect-spec-source")).toBe("static");
      expect(() => createSpecHandler({})).toThrow(/url, fallback/);
    } finally {
      live.close();
    }
  });
});

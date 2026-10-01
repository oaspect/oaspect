import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { renderHtml } from "../src/html.js";
import { serve } from "../src/serve.js";

const BIN = new URL("../bin/oaspect.mjs", import.meta.url).pathname;
const SPEC = new URL("./bookstore.json", import.meta.url).pathname;
const BUNDLE = new URL("../dist/oaspect.js", import.meta.url).pathname;
const run = (...args) => execFileSync(process.execPath, [BIN, ...args], { encoding: "utf8", stdio: "pipe" });

describe("renderHtml", () => {
  test("inlined data cannot break out of its <script>", () => {
    const html = renderHtml({ spec: { openapi: "3.0.0", paths: {}, info: { title: "</script><script>alert(1)</script>" } }, script: { src: "o.js" } });
    expect(html).not.toContain("</script><script>alert(1)");
    expect(html).toContain("\\u003c/script>");
  });

  test("escapes the title", () => {
    expect(renderHtml({ title: "<b>x</b>" })).toContain("<title>&lt;b&gt;x&lt;/b&gt;</title>");
  });
});

describe("oaspect build", () => {
  test("writes a self-contained page", () => {
    const out = join(mkdtempSync(join(tmpdir(), "oaspect-cli-")), "docs.html");
    expect(run("build", SPEC, "-o", out, "--locale", "tr")).toMatch(/Wrote .*docs\.html/);
    const html = readFileSync(out, "utf8");
    expect(html).toContain('id="oaspect-spec"');
    expect(html).toContain("Bookstore API");
    expect(html).toContain('"defaultLocale":"tr"');
    expect(html).toContain('"urlParam":null');
    expect(html).not.toMatch(/<script src=/);
  });

  test("prerenders the reference by default and hydrates it", () => {
    const out = join(mkdtempSync(join(tmpdir(), "oaspect-cli-")), "docs.html");
    run("build", SPEC, "-o", out);
    const html = readFileSync(out, "utf8");
    const markup = html.slice(html.indexOf('<div id="oaspect">'), html.indexOf('<script type="application/json"'));
    expect(markup).toContain('id="operation/books-destroy"');
    expect(markup).toContain("Delete book");
    expect(html).toContain('<style id="oaspect-styles">');
    expect(html).toContain('Oaspect.hydrate("#oaspect"');
    expect(html).toContain('"lazy":false');
    expect(html).toContain('localStorage.getItem("oaspect:theme")');
  });

  test("--no-prerender renders in the browser only", () => {
    const out = join(mkdtempSync(join(tmpdir(), "oaspect-cli-")), "docs.html");
    run("build", SPEC, "-o", out, "--no-prerender");
    const html = readFileSync(out, "utf8");
    expect(html).toContain('<div id="oaspect"></div>');
    expect(html).toContain('Oaspect.init("#oaspect"');
  });

  test("reports errors and usage", () => {
    expect(() => run("build", "missing.json")).toThrow(/ENOENT/);
    expect(() => run("frob", SPEC)).toThrow(/unknown command/);
    expect(() => run("serve", SPEC, "--host", "0.0.0.0")).toThrow(/exposes the proxy/);
    expect(run("--help")).toContain("oaspect build <spec>");
  });
});

describe("oaspect serve", () => {
  let instance;

  beforeAll(async () => {
    instance = await serve({ source: SPEC, port: 0, bundlePath: BUNDLE, config: { title: "Local" } });
  });

  afterAll(() => instance.server.close());

  test("serves the page, the spec and the bundle", async () => {
    const page = await (await fetch(`${instance.url}/`)).text();
    expect(page).toContain('"specUrl":"/openapi.json"');
    expect(page).toContain('"proxyUrl":"/__oaspect/proxy"');
    const spec = await (await fetch(`${instance.url}/openapi.json`)).json();
    expect(spec.info.title).toBe("Bookstore API");
    expect((await fetch(`${instance.url}/oaspect.js`)).headers.get("content-type")).toMatch(/javascript/);
    expect((await fetch(`${instance.url}/nope`)).status).toBe(404);
  });

  test("relays proxy requests", async () => {
    const response = await fetch(`${instance.url}/__oaspect/proxy`, { method: "POST", body: JSON.stringify({ url: `${instance.url}/openapi.json` }) });
    const result = await response.json();
    expect(result.status).toBe(200);
    expect(JSON.parse(result.body).info.title).toBe("Bookstore API");
  });
});

describe("YAML and Swagger 2.0 input", () => {
  test("build converts a Swagger 2.0 YAML file", () => {
    const out = join(mkdtempSync(join(tmpdir(), "oaspect-cli-")), "pets.html");
    run("build", new URL("./petstore-swagger2.yaml", import.meta.url).pathname, "-o", out);
    const html = readFileSync(out, "utf8");
    expect(html).toContain('"openapi":"3.0.3"');
    expect(html).toContain("#/components/schemas/Pet");
    expect(html).not.toContain('"swagger":"2.0"');
  });
});

describe("external $refs", () => {
  test("build inlines documents referenced from other files", () => {
    const out = join(mkdtempSync(join(tmpdir(), "oaspect-cli-")), "split.html");
    run("build", new URL("../../core/test/fixtures/split/main.yaml", import.meta.url).pathname, "-o", out);
    const html = readFileSync(out, "utf8");
    expect(html).toContain('"x-oaspect-external"');
    expect(html).toContain("#/components/x-oaspect-external/Pet");
    expect(html).not.toContain("./schemas/pet.yaml");
  });
});

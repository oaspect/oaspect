// Builds the oaspect site into dist/: the landing page (landing.mjs), the
// docs (docs/*.md through docs.mjs), the server API reference (rendered by oaspect from specs/oaspect.yaml) and demo
// pages, each a prerendered, self-contained file from the CLI. public/ holds
// the screenshots (screenshots.mjs) and is copied as is.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { renderDocs } from "./docs.mjs";
import { landing } from "./landing.mjs";

const root = import.meta.dirname;
const dist = resolve(root, "dist");
const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve("oaspect/package.json")), "bin/oaspect.mjs");

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "demo"), { recursive: true });

const build = (spec, out, ...args) => execFileSync(process.execPath, [cli, "build", join(root, "specs", spec), "-o", join(dist, out), ...args], { stdio: "inherit" });

build("oaspect.yaml", "reference.html", "--title", "oaspect server API");
const demos = [
  ["roastery.yaml", "roastery.html", "Roastery", "OpenAPI 3.1 showcase: Turkish and Arabic, oneOf, uploads, webhooks"],
  ["liveness.yaml", "liveness.html", "Liveness", "Guide sections: a WebSocket protocol documented with headings and prose"],
  ["bookstore.json", "bookstore.html", "Bookstore", "OpenAPI 3.0: schemas, allOf/oneOf, code samples"],
  ["petstore-swagger2.yaml", "petstore.html", "Petstore", "Swagger 2.0 YAML, converted on load; multipart upload"],
  ["events.json", "events.html", "Events", "OpenAPI 3.1 webhooks, callbacks, links, server variables"],
  ["auth.json", "auth.html", "Auth", "API key, Basic and OAuth2 security schemes"],
];
for (const [spec, out] of demos) build(spec, `demo/${out}`, ...(spec === "roastery.yaml" ? ["--logo", "roastery-logo.svg"] : []));
// Developer docs demo: this site's own docs/ folder in the docs viewer,
// from a copy with {{version}} filled in as the docs pages have it.
const { version } = JSON.parse(readFileSync(require.resolve("oaspect/package.json"), "utf8"));
const docsCopy = mkdtempSync(join(tmpdir(), "oaspect-site-docs-"));
for (const file of readdirSync(resolve(root, "docs"))) {
  writeFileSync(join(docsCopy, file), readFileSync(resolve(root, "docs", file), "utf8").replaceAll("{{version}}", version));
}
execFileSync(process.execPath, [cli, "docs", "build", docsCopy, "-o", join(dist, "demo/dev-docs.html"), "--title", "oaspect docs", "--edit-url", "https://github.com/oaspect/oaspect/edit/main/apps/site/docs/{path}"], { stdio: "inherit" });
rmSync(docsCopy, { recursive: true, force: true });
if (existsSync(resolve(root, "public"))) cpSync(resolve(root, "public"), dist, { recursive: true });

const devDocs = [null, "dev-docs.html", "Developer docs", "This site's Markdown docs in the docs viewer: navigation, search, Mermaid"];
writeFileSync(join(dist, "index.html"), landing({ version, demos: [...demos.slice(0, 2), devDocs, ...demos.slice(2)] }));
mkdirSync(join(dist, "docs"), { recursive: true });
for (const page of renderDocs({ dir: resolve(root, "docs"), version })) writeFileSync(join(dist, "docs", page.file), page.html);
console.log(`Site built in ${dist}`);

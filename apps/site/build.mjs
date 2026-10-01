// Builds the oaspect site into dist/: the landing page (landing.mjs), the
// docs (docs/*.md through docs.mjs), the server API reference (rendered by oaspect from specs/oaspect.yaml) and demo
// pages, each a prerendered, self-contained file from the CLI. public/ holds
// the screenshots (screenshots.mjs) and is copied as is.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  ["bookstore.json", "bookstore.html", "Bookstore", "OpenAPI 3.0: schemas, allOf/oneOf, code samples"],
  ["petstore-swagger2.yaml", "petstore.html", "Petstore", "Swagger 2.0 YAML, converted on load; multipart upload"],
  ["events.json", "events.html", "Events", "OpenAPI 3.1 webhooks, callbacks, links, server variables"],
  ["auth.json", "auth.html", "Auth", "API key, Basic and OAuth2 security schemes"],
];
for (const [spec, out] of demos) build(spec, `demo/${out}`, ...(spec === "roastery.yaml" ? ["--logo", "roastery-logo.svg"] : []));
if (existsSync(resolve(root, "public"))) cpSync(resolve(root, "public"), dist, { recursive: true });

const { version } = JSON.parse(readFileSync(require.resolve("oaspect/package.json"), "utf8"));
writeFileSync(join(dist, "index.html"), landing({ version, demos }));
mkdirSync(join(dist, "docs"), { recursive: true });
for (const page of renderDocs({ dir: resolve(root, "docs"), version })) writeFileSync(join(dist, "docs", page.file), page.html);
console.log(`Site built in ${dist}`);

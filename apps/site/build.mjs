// Builds the oaspect site into dist/: a landing page, the oaspect reference
// (rendered by oaspect from specs/oaspect.yaml) and demo pages. Every page is
// a prerendered, self-contained file from the CLI.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const root = import.meta.dirname;
const dist = resolve(root, "dist");
const require = createRequire(import.meta.url);
const cli = join(dirname(require.resolve("oaspect/package.json")), "bin/oaspect.mjs");

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "demo"), { recursive: true });

const build = (spec, out, ...args) => execFileSync(process.execPath, [cli, "build", join(root, "specs", spec), "-o", join(dist, out), ...args], { stdio: "inherit" });

build("oaspect.yaml", "reference.html", "--title", "oaspect reference");
const demos = [
  ["bookstore.json", "bookstore.html", "Bookstore", "OpenAPI 3.0: schemas, allOf/oneOf, code samples"],
  ["petstore-swagger2.yaml", "petstore.html", "Petstore", "Swagger 2.0 YAML, converted on load; multipart upload"],
  ["events.json", "events.html", "Events", "OpenAPI 3.1 webhooks, callbacks, links, server variables"],
  ["auth.json", "auth.html", "Auth", "API key, Basic and OAuth2 security schemes"],
];
for (const [spec, out] of demos) build(spec, `demo/${out}`);

const card = ([, out, name, note]) => `<a class="card" href="demo/${out}"><strong>${name}</strong><span>${note}</span></a>`;
writeFileSync(
  join(dist, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>oaspect — interactive API reference for OpenAPI</title>
  <meta name="description" content="A lightweight, translatable API reference for OpenAPI and Swagger documents: one script tag, a React component or a CLI." />
  <style>
    :root { color-scheme: light dark; --fg: #18181b; --muted: #52525b; --bg: #fff; --card: #f4f4f5; --accent: #15803d; }
    @media (prefers-color-scheme: dark) { :root { --fg: #fafafa; --muted: #a1a1aa; --bg: #09090b; --card: #18181b; --accent: #4ade80; } }
    body { margin: 0; font: 16px/1.6 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
    main { max-width: 56rem; margin: 0 auto; padding: 4rem 1.5rem; }
    h1 { font-size: 3rem; margin: 0 0 .5rem; letter-spacing: -.02em; }
    p.lead { font-size: 1.25rem; color: var(--muted); margin: 0 0 2rem; }
    pre { background: var(--card); padding: 1rem; border-radius: .75rem; overflow-x: auto; font-size: .875rem; }
    a { color: var(--accent); }
    .actions { display: flex; gap: .75rem; flex-wrap: wrap; margin-bottom: 3rem; }
    .button { padding: .6rem 1rem; border-radius: .6rem; background: var(--accent); color: var(--bg); text-decoration: none; font-weight: 600; }
    .button.secondary { background: var(--card); color: var(--fg); }
    .cards { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); }
    .card { display: flex; flex-direction: column; gap: .25rem; padding: 1rem; border-radius: .75rem; background: var(--card); color: var(--fg); text-decoration: none; }
    .card span { color: var(--muted); font-size: .875rem; }
    ul { padding-inline-start: 1.25rem; }
  </style>
</head>
<body>
  <main>
    <h1>oaspect</h1>
    <p class="lead">Interactive API reference for OpenAPI 3.x and Swagger 2.0 — one script tag, a React component or a CLI.</p>
    <div class="actions">
      <a class="button" href="reference.html">Read the docs</a>
      <a class="button secondary" href="demo/bookstore.html">See a demo</a>
      <a class="button secondary" href="https://github.com/oaspect/oaspect">GitHub</a>
    </div>
    <pre><code>&lt;script src="https://cdn.jsdelivr.net/npm/oaspect" data-spec-url="/openapi.yaml"&gt;&lt;/script&gt;</code></pre>
    <ul>
      <li>Try requests in place, with a CORS-free proxy, security schemes and file uploads</li>
      <li>Code samples in 16 languages, 30 clients</li>
      <li>Translatable UI and documentation (English, Turkish, Arabic RTL, or yours)</li>
      <li>Prerendered static HTML, lazy rendering for large documents, WCAG AA</li>
      <li>${"~"}140 KB gzipped with React included; styles scoped under <code>.oaspect</code></li>
    </ul>
    <h2>Demos</h2>
    <div class="cards">${demos.map(card).join("")}</div>
  </main>
</body>
</html>
`,
);
console.log(`Site built in ${dist}`);

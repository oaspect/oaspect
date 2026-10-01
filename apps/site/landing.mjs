// The oaspect.dev landing page. Screenshots come from public/images
// (screenshots.mjs); every image has a light and a dark variant that follows
// the reader's color scheme.
import { BASE_CSS, FAVICON, escapeHtml, footer, header, icon } from "./shared.mjs";


const shot = (name, alt, { width = 2880, height = 1800, eager = false } = {}) => `<picture>
          <source srcset="images/${name}-dark.webp" media="(prefers-color-scheme: dark)" />
          <img src="images/${name}-light.webp" alt="${escapeHtml(alt)}" width="${width}" height="${height}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} />
        </picture>`;

// Screenshots with a single variant (the locale ones).
const single = (name, alt) => `<img src="images/${name}.webp" alt="${escapeHtml(alt)}" width="2880" height="1800" loading="lazy" />`;

const frame = (content, url) => `<div class="frame">
        <div class="frame-bar" aria-hidden="true"><i></i><i></i><i></i><span>${escapeHtml(url)}</span></div>
        ${content}
      </div>`;

const INSTALL = [
  ["HTML", `<span class="t">&lt;script</span> <span class="a">src</span>=<span class="s">"https://cdn.jsdelivr.net/npm/oaspect"</span>
        <span class="a">data-spec-url</span>=<span class="s">"/openapi.yaml"</span><span class="t">&gt;&lt;/script&gt;</span>`],
  ["React", `<span class="k">import</span> { ApiReference } <span class="k">from</span> <span class="s">"@oaspect/react"</span>;
<span class="k">import</span> <span class="s">"@oaspect/react/styles.css"</span>;

<span class="t">&lt;ApiReference</span> <span class="a">specUrl</span>=<span class="s">"/openapi.yaml"</span> <span class="t">/&gt;</span>`],
  ["CLI", `<span class="c"># one self-contained, prerendered HTML file</span>
npx oaspect build openapi.yaml -o docs.html

<span class="c"># live preview with a "Try it" proxy</span>
npx oaspect serve openapi.yaml`],
];

const STACK = [
  ["Web component", `<span class="t">&lt;oaspect-reference</span>
  <span class="a">spec-url</span>=<span class="s">"/openapi.yaml"</span>
  <span class="a">locale</span>=<span class="s">"tr"</span><span class="t">&gt;&lt;/oaspect-reference&gt;</span>

<span class="t">&lt;script</span> <span class="a">src</span>=<span class="s">"https://cdn.jsdelivr.net/npm/oaspect"</span><span class="t">&gt;&lt;/script&gt;</span>`],
  ["JavaScript", `<span class="k">const</span> docs = Oaspect.init(<span class="s">"#docs"</span>, {
  specUrl: <span class="s">"/openapi.yaml"</span>,
  proxyUrl: <span class="s">"/api/proxy"</span>,
  logo: { light: <span class="s">"/logo.svg"</span>, dark: <span class="s">"/logo-dark.svg"</span> },
});
docs.update({ locale: <span class="s">"ar"</span> });`],
  ["Next.js", `<span class="c">// app/api/proxy/route.js — "Try it" for APIs without CORS</span>
<span class="k">import</span> { createProxyHandler } <span class="k">from</span> <span class="s">"oaspect/server"</span>;

<span class="k">export const</span> POST = createProxyHandler({
  allowedHosts: [<span class="s">"api.example.com"</span>],
});`],
  ["Node", `<span class="k">import</span> { readFile } <span class="k">from</span> <span class="s">"node:fs/promises"</span>;
<span class="k">import</span> { createSpecHandler } <span class="k">from</span> <span class="s">"oaspect/server"</span>;

<span class="c">// the live spec, server-side (no CORS), or the bundled copy</span>
<span class="k">export const</span> GET = createSpecHandler({
  url: process.env.SPEC_URL,
  fallback: () => readFile(<span class="s">"openapi.json"</span>, <span class="s">"utf8"</span>),
});`],
];

const tabs = (id, items) => `<div class="tabs" data-tabs>
        <div class="tab-list" role="tablist" aria-label="${escapeHtml(id)}">
          ${items.map(([name], index) => `<button role="tab" id="${id}-tab-${index}" aria-controls="${id}-panel-${index}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${escapeHtml(name)}</button>`).join("\n          ")}
          <button class="copy" type="button" aria-label="Copy code">${icon("copy", 16)}</button>
        </div>
        ${items.map(([, code], index) => `<pre role="tabpanel" id="${id}-panel-${index}" aria-labelledby="${id}-tab-${index}"${index === 0 ? "" : " hidden"}><code>${code}</code></pre>`).join("\n        ")}
      </div>`;

const FEATURES = [
  ["bolt", "Prerendered and lazy", "The CLI writes static HTML that search engines index and that reads without JavaScript; large documents render sections as you scroll."],
  ["layers", "Scoped styles", "Every rule lives under .oaspect, cascade layers unwrapped: drop it into any page or framework without CSS fights."],
  ["shield", "WCAG AA", "Contrast-checked themes, keyboard focus everywhere, landmarks and a skip link. Tested with axe-core."],
  ["hook", "Webhooks, callbacks, links", "OpenAPI 3.1 webhooks, callbacks under their operations, response links and server variables."],
  ["server", "Server helpers", "Web-standard Request/Response handlers for the Try proxy and the spec: Next.js, Hono, Bun, Workers or plain Node."],
  ["file", "Swagger 2.0, YAML, $ref", "Converts Swagger 2.0 on load, reads YAML, and resolves references split across files."],
];

export function landing({ version, demos }) {
  const demoCard = ([, out, name, note]) => `<a class="demo" href="demo/${out}">
          <img src="images/demo-${out.replace(".html", "")}.webp" alt="" width="1280" height="800" loading="lazy" />
          <span class="demo-text"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(note)}</span></span>
        </a>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>oaspect: interactive API reference for OpenAPI</title>
  <meta name="description" content="Turn any OpenAPI or Swagger document into a fast, translatable API reference with live requests and code samples in 30 clients. One script tag, a React component or a CLI." />
  <meta property="og:title" content="oaspect: API references people can actually try" />
  <meta property="og:description" content="Open-source OpenAPI reference: try requests in place, code in 30 clients, any language including RTL." />
  <meta property="og:image" content="https://oaspect.dev/images/hero-dark.webp" />
  <meta name="theme-color" content="#08090a" media="(prefers-color-scheme: dark)" />
  <link rel="icon" href="${FAVICON}" />
  <style>
${BASE_CSS}
    @media (max-width: 40rem) { .eyebrow .wide { display: none; } }

    .hero { position: relative; padding: 5.5rem 0 0; text-align: center; overflow: hidden; }
    .hero::before { content: ""; position: absolute; inset: -20% -10% auto; height: 46rem; background: radial-gradient(50% 50% at 50% 40%, var(--glow), transparent 70%); pointer-events: none; }
    .hero::after { content: ""; position: absolute; inset: 0; background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 56px 56px; mask-image: radial-gradient(60% 50% at 50% 30%, #000, transparent 75%); opacity: .55; pointer-events: none; }
    .hero > * { position: relative; z-index: 1; }
    .eyebrow { display: inline-flex; align-items: center; gap: .5rem; font-size: .8rem; color: var(--muted); border: 1px solid var(--border); background: var(--bg); border-radius: 999px; padding: .3rem .85rem .3rem .4rem; }
    .eyebrow b { color: var(--accent); background: var(--accent-soft); border-radius: 999px; padding: .1rem .55rem; font-weight: 600; }
    h1 { font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; letter-spacing: -.035em; margin: 1.25rem auto 1.25rem; max-width: 15ch; }
    h1 em { font-style: normal; background: linear-gradient(120deg, var(--accent-strong), var(--accent) 60%, #22d3ee); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .lead { font-size: clamp(1.05rem, 2vw, 1.25rem); color: var(--muted); max-width: 40rem; margin: 0 auto 2rem; }
    .actions { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }
    .button { display: inline-flex; align-items: center; gap: .5rem; padding: .7rem 1.2rem; border-radius: .7rem; font-weight: 600; text-decoration: none; border: 1px solid var(--border); background: var(--bg); transition: transform .15s, box-shadow .15s; }
    .button:hover { transform: translateY(-1px); box-shadow: var(--shadow); }
    .button.primary { background: var(--accent-strong); border-color: transparent; color: #fff; }
    .install { max-width: 40rem; margin: 2.5rem auto 0; text-align: start; }

    .tabs { background: var(--code-bg); color: var(--code-fg); border-radius: 1rem; border: 1px solid color-mix(in oklab, var(--code-bg) 70%, var(--border)); box-shadow: var(--shadow); overflow: hidden; }
    .tab-list { display: flex; gap: .25rem; padding: .5rem .5rem 0; border-bottom: 1px solid rgb(255 255 255 / .08); }
    .tab-list button { font: 500 .85rem/1 inherit; color: rgb(231 236 232 / .6); background: none; border: 0; padding: .6rem .8rem .7rem; cursor: pointer; border-bottom: 2px solid transparent; }
    .tab-list button[aria-selected="true"] { color: #fff; border-bottom-color: #4ade80; }
    .tab-list .copy { margin-inline-start: auto; color: rgb(231 236 232 / .6); display: inline-flex; align-items: center; }
    .tab-list .copy:hover { color: #fff; }
    .tabs pre { margin: 0; padding: 1.1rem 1.25rem 1.25rem; overflow-x: auto; font-size: .85rem; line-height: 1.7; }
    .tabs .k { color: #c084fc; } .tabs .s { color: #86efac; } .tabs .t { color: #7dd3fc; } .tabs .a { color: #fcd34d; } .tabs .c { color: #7c857e; }

    .showcase { position: relative; margin: 4rem auto 0; width: min(80rem, 100% - 2rem); }
    .frame { border-radius: 1rem; border: 1px solid var(--border); background: var(--bg); box-shadow: var(--shadow); overflow: hidden; }
    .frame-bar { display: flex; align-items: center; gap: .4rem; padding: .7rem 1rem; border-bottom: 1px solid var(--border); background: var(--bg-soft); }
    .frame-bar i { width: .7rem; height: .7rem; border-radius: 50%; background: var(--border); }
    .frame-bar span { margin-inline: auto; font: .75rem ui-monospace, monospace; color: var(--muted); background: var(--bg); border: 1px solid var(--border); border-radius: .4rem; padding: .2rem 1.5rem; }
    .float { position: absolute; z-index: 2; display: flex; align-items: center; gap: .5rem; font-size: .8rem; padding: .55rem .8rem; border-radius: .75rem; background: var(--bg); border: 1px solid var(--border); box-shadow: var(--shadow); white-space: nowrap; }
    .float code { font-size: .75rem; }
    .float .ok { color: #16a34a; font-weight: 700; font-family: ui-monospace, monospace; }
    .float .chip { font: 600 .7rem/1 ui-monospace, monospace; padding: .3rem .45rem; border-radius: .4rem; background: var(--bg-soft); border: 1px solid var(--border); }
    .f1 { top: 24%; inset-inline-start: -1.5rem; } .f2 { top: 46%; inset-inline-end: -1.5rem; } .f3 { bottom: 10%; inset-inline-start: 6%; }
    @media (max-width: 64rem) { .float { display: none; } }

    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: 1rem; overflow: hidden; margin: 5rem auto 0; }
    .stats div { background: var(--bg); padding: 1.5rem 1.25rem; }
    .stats strong { display: block; font-size: 2rem; letter-spacing: -.03em; line-height: 1.1; }
    .stats span { color: var(--muted); font-size: .9rem; }
    @media (max-width: 48rem) { .stats { grid-template-columns: 1fr 1fr; } }

    section { padding: 6rem 0 0; }
    .kicker { color: var(--accent); font: 600 .8rem/1 ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
    h2 { font-size: clamp(1.9rem, 4vw, 2.75rem); letter-spacing: -.03em; line-height: 1.1; margin: .75rem 0 1rem; }
    .section-lead { color: var(--muted); font-size: 1.1rem; max-width: 38rem; margin: 0; }
    .row { display: grid; grid-template-columns: 5fr 7fr; gap: 3.5rem; align-items: center; }
    .row.flip { grid-template-columns: 7fr 5fr; }
    .row.flip > :first-child { order: 2; }
    @media (max-width: 56rem) { .row, .row.flip { grid-template-columns: 1fr; gap: 2rem; } .row.flip > :first-child { order: 0; } }
    .points { list-style: none; padding: 0; margin: 1.5rem 0 0; display: grid; gap: .7rem; }
    .points li { display: flex; gap: .65rem; color: var(--muted); }
    .points li svg { flex: none; color: var(--accent); margin-top: .2rem; }
    .points b { color: var(--fg); font-weight: 600; }
    .stack { position: relative; padding-bottom: 12%; }
    .stack .frame + .frame { position: absolute; width: 62%; inset-inline-end: -1rem; bottom: 0; }
    .phone { border-radius: 2.25rem; border: 7px solid #1c1f1d; overflow: hidden; box-shadow: var(--shadow); background: #000; }
    .anywhere { display: grid; grid-template-columns: minmax(0, 1fr) 12.5rem; gap: 1.5rem; align-items: center; }
    @media (max-width: 36rem) { .anywhere { grid-template-columns: 1fr; } .anywhere .phone { width: 14rem; margin-inline: auto; } }

    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 2.5rem; }
    @media (max-width: 56rem) { .grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 36rem) { .grid { grid-template-columns: 1fr; } }
    .card { padding: 1.5rem; border: 1px solid var(--border); border-radius: 1rem; background: linear-gradient(180deg, var(--bg-soft), var(--bg)); }
    .card .icon { display: inline-grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: .7rem; background: var(--accent-soft); color: var(--accent); margin-bottom: 1rem; }
    .card h3 { margin: 0 0 .4rem; font-size: 1.05rem; }
    .card p { margin: 0; color: var(--muted); font-size: .95rem; }

    .demos { display: grid; grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr)); gap: 1rem; margin-top: 2.5rem; }
    .demo { display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: 1rem; overflow: hidden; text-decoration: none; background: var(--bg); transition: transform .15s, box-shadow .15s; }
    .demo:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
    .demo img { border-bottom: 1px solid var(--border); aspect-ratio: 16 / 10; object-fit: cover; object-position: top left; }
    .demo-text { display: flex; flex-direction: column; gap: .2rem; padding: 1rem 1.1rem 1.2rem; }
    .demo-text span { color: var(--muted); font-size: .9rem; }

    .cta { margin: 7rem auto 0; text-align: center; padding: 4rem 1.5rem; border-radius: 1.5rem; border: 1px solid var(--border); background: radial-gradient(60% 120% at 50% 0%, var(--glow), transparent 70%), var(--bg-soft); }
    .cta h2 { margin-top: 0; }
    .cta p { color: var(--muted); margin: 0 auto 2rem; max-width: 34rem; }
  </style>
</head>
<body>
  ${header({ version })}

  <main id="content">
    <div class="hero">
      <div class="wrap">
        <span class="eyebrow"><b>Open source</b> MIT<span class="wide">· OpenAPI 3.0, 3.1 and Swagger 2.0</span></span>
        <h1>API references people can <em>actually try</em></h1>
        <p class="lead">oaspect turns your OpenAPI document into a fast three-column reference: live requests, code in 30 clients, schemas you can read, and docs in your users' language.</p>
        <div class="actions">
          <a class="button primary" href="docs/">Get started ${icon("arrow", 18)}</a>
          <a class="button" href="demo/roastery.html">Open the live demo</a>
        </div>
        <div class="install">
      ${tabs("install", INSTALL)}
        </div>
      </div>

      <div class="showcase">
        <div class="float f1"><span class="chip">GET</span><code>/beans?origin=ET</code><span class="ok">200</span><span>8 ms</span></div>
        <div class="float f2"><span class="chip">cURL</span><span class="chip">Python</span><span class="chip">Go</span><span class="chip">Rust</span><span class="chip">C#</span><span>+25</span></div>
        <div class="float f3"><span class="chip">EN</span><span class="chip">TR</span><span class="chip">العربية</span><span>UI and docs, RTL included</span></div>
      ${frame(shot("hero", "The Roastery demo: navigation, the Place an order operation with its request body, and a cURL sample with the response.", { eager: true }), "oaspect.dev/demo/roastery")}
      </div>
    </div>

    <div class="wrap">
      <div class="stats">
        <div><strong>30</strong><span>clients in 16 languages</span></div>
        <div><strong>138 KB</strong><span>gzipped, React included</span></div>
        <div><strong>3</strong><span>UI languages, RTL included</span></div>
        <div><strong>AA</strong><span>WCAG contrast and keyboard</span></div>
      </div>
    </div>

    <section class="wrap">
      <div class="row">
        <div>
          <span class="kicker">Try it</span>
          <h2>Send real requests without leaving the docs</h2>
          <p class="section-lead">Every operation opens a request editor with its parameters, body and auth filled in from the spec.</p>
          <ul class="points">
            <li>${icon("check", 18)}<span><b>CORS-free proxy</b> when your API does not send CORS headers, with a host allowlist.</span></li>
            <li>${icon("check", 18)}<span><b>File uploads</b> for multipart/form-data, from the editor and in every code sample.</span></li>
            <li>${icon("check", 18)}<span><b>API key, Basic, Bearer and OAuth2</b>, including token requests for client credentials.</span></li>
            <li>${icon("check", 18)}<span><b>Write requests ask first</b>, so examples never overwrite real data by accident.</span></li>
          </ul>
        </div>
        ${frame(shot("try-it", "The Try it dialog sending GET /beans with origin=ET and showing a 200 response."), "Try it")}
      </div>
    </section>

    <section class="wrap">
      <div class="row flip">
        <div>
          <span class="kicker">Schemas</span>
          <h2>Request bodies you can actually read</h2>
          <p class="section-lead">$ref, allOf, oneOf and anyOf become a tree you expand field by field, with types, constraints, enums and examples beside each one.</p>
          <ul class="points">
            <li>${icon("check", 18)}<span><b>oneOf variants as tabs</b>, discriminators and titles respected.</span></li>
            <li>${icon("check", 18)}<span><b>Examples generated</b> from schemas when the spec has none.</span></li>
            <li>${icon("check", 18)}<span><b>GFM Markdown</b> in descriptions: tables, lists, code blocks; raw HTML never rendered.</span></li>
          </ul>
        </div>
        ${frame(shot("schema", "The Place an order request body with the items array and the oneOf payment expanded."), "Request body")}
      </div>
    </section>

    <section class="wrap">
      <div class="row">
        <div>
          <span class="kicker">Localization</span>
          <h2>Docs in your users' language, right to left included</h2>
          <p class="section-lead">The interface ships in English, Turkish and Arabic, and takes your own translations. Your spec can be translated too.</p>
          <ul class="points">
            <li>${icon("check", 18)}<span><b><code>x-i18n</code></b> for summaries, tag names and descriptions.</span></li>
            <li>${icon("check", 18)}<span><b><code>:::lang</code> blocks</b> for long Markdown, with English as the fallback.</span></li>
            <li>${icon("check", 18)}<span><b>Real RTL</b>: logical layout, code and URLs kept left to right.</span></li>
          </ul>
        </div>
        <div class="stack">
          ${frame(single("locale-tr", "The Roastery demo in Turkish."), "Türkçe")}
          ${frame(single("locale-ar", "The Roastery demo in Arabic, laid out right to left."), "العربية")}
        </div>
      </div>
    </section>

    <section class="wrap">
      <div class="row flip">
        <div>
          <span class="kicker">Anywhere</span>
          <h2>Fits your stack, not the other way around</h2>
          <p class="section-lead">Use the standalone script, a web component, the React component or the CLI. Server helpers cover the parts a static page cannot.</p>
          <ul class="points">
            <li>${icon("check", 18)}<span><b>Works on a phone</b>: the reference collapses to one column with a drawer.</span></li>
            <li>${icon("check", 18)}<span><b>Light and dark</b>, following the system or your choice.</span></li>
          </ul>
        </div>
        <div class="anywhere">
      ${tabs("stack", STACK)}
          <div class="phone">${shot("mobile", "The Roastery demo on a phone: List beans with its query parameters.", { width: 1170, height: 2532 })}</div>
        </div>
      </div>
    </section>

    <section class="wrap">
      <span class="kicker">And more</span>
      <h2>Small, complete, dependable</h2>
      <div class="grid">
        ${FEATURES.map(([name, title, text]) => `<div class="card"><span class="icon">${icon(name, 20)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`).join("\n        ")}
      </div>
    </section>

    <section class="wrap" id="demos">
      <span class="kicker">Demos</span>
      <h2>See it with real documents</h2>
      <p class="section-lead">Each demo is a single prerendered HTML file built by <code>oaspect build</code>.</p>
      <div class="demos">
        ${demos.map(demoCard).join("\n        ")}
      </div>
    </section>

    <div class="wrap">
      <div class="cta">
        <h2>Your API deserves docs people use</h2>
        <p>One script tag and your OpenAPI file. No account, no build, MIT licensed.</p>
        <div class="actions">
          <a class="button primary" href="docs/">Read the docs ${icon("arrow", 18)}</a>
          <a class="button" href="https://github.com/oaspect/oaspect">${icon("github", 18)} Star on GitHub</a>
        </div>
      </div>
    </div>
  </main>

  ${footer({})}

  <script>
    for (const tabs of document.querySelectorAll("[data-tabs]")) {
      const list = [...tabs.querySelectorAll('[role="tab"]')];
      const select = (tab) => {
        for (const item of list) {
          const selected = item === tab;
          item.setAttribute("aria-selected", selected);
          item.tabIndex = selected ? 0 : -1;
          document.getElementById(item.getAttribute("aria-controls")).hidden = !selected;
        }
      };
      list.forEach((tab, index) => {
        tab.addEventListener("click", () => select(tab));
        tab.addEventListener("keydown", (event) => {
          const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
          if (!step) return;
          const next = list[(index + step + list.length) % list.length];
          select(next);
          next.focus();
        });
      });
      const copy = tabs.querySelector(".copy");
      copy.addEventListener("click", async () => {
        const panel = tabs.querySelector('[role="tabpanel"]:not([hidden])');
        try {
          await navigator.clipboard.writeText(panel.textContent);
          copy.setAttribute("aria-label", "Copied");
          setTimeout(() => copy.setAttribute("aria-label", "Copy code"), 1500);
        } catch {}
      });
    }
  </script>
</body>
</html>
`;
}

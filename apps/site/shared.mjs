// Pieces shared by the landing page and the docs: color tokens, the header,
// the footer, the logo and icons. `base` is the path back to the site root
// ("" from the root, "../" from docs/), so pages also work from file://.

export const escapeHtml = (value) =>
  String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

const ICONS = {
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  hook: '<path d="M18 8a6 6 0 1 1-12 0"/><path d="M12 14v7"/><circle cx="12" cy="8" r="2"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M9 14l-2 2 2 2M15 14l2 2-2 2"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  github: '<path d="M9 19c-4 1.5-4-2-6-2.5m12 5v-3.5a3 3 0 0 0-.9-2.4c3-.3 6-1.4 6-6.5A5 5 0 0 0 19 5.6 4.7 4.7 0 0 0 19 2s-1.2-.3-3.8 1.4a13 13 0 0 0-6.4 0C6.2 1.7 5 2 5 2a4.7 4.7 0 0 0-.1 3.6A5 5 0 0 0 3.6 9c0 5 3 6.2 6 6.5a3 3 0 0 0-.9 2.4V22"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
};

export const icon = (name, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

export const LOGO = `<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#16a34a"/><path d="M12 9c-2 0-3 1-3 3v2c0 1-1 2-2 2 1 0 2 1 2 2v2c0 2 1 3 3 3M20 9c2 0 3 1 3 3v2c0 1 1 2 2 2-1 0-2 1-2 2v2c0 2-1 3-3 3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>`;

export const FAVICON = `data:image/svg+xml,${encodeURIComponent(LOGO)}`;

// Color tokens and the base rules every page uses.
export const BASE_CSS = `
    :root {
      color-scheme: light dark;
      --bg: #ffffff; --bg-soft: #f5f7f5; --fg: #0b0f0c; --muted: #545c56; --border: #e3e7e3;
      --accent: #15803d; --accent-strong: #16a34a; --accent-soft: rgb(22 163 74 / .1); --glow: rgb(22 163 74 / .18);
      --code-bg: #0f1311; --code-fg: #e7ece8; --inline-code: #eef1ee;
      --shadow: 0 1px 2px rgb(0 0 0 / .04), 0 12px 40px -12px rgb(0 0 0 / .18);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #08090a; --bg-soft: #101312; --fg: #f3f5f3; --muted: #9ba39d; --border: #222725;
        --accent: #4ade80; --accent-strong: #16a34a; --accent-soft: rgb(74 222 128 / .1); --glow: rgb(74 222 128 / .14);
        --code-bg: #0c0f0d; --inline-code: #161a18; --shadow: 0 1px 2px rgb(0 0 0 / .4), 0 24px 60px -16px rgb(0 0 0 / .7);
      }
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; scroll-padding-top: 5rem; }
    body { margin: 0; font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--fg); background: var(--bg); -webkit-font-smoothing: antialiased; }
    a { color: inherit; }
    img { display: block; max-width: 100%; height: auto; }
    code, pre { font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace; }
    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
    .wrap { width: min(72rem, 100% - 2rem); margin-inline: auto; }
    .skip { position: absolute; inset-inline-start: 1rem; top: -3rem; z-index: 20; background: var(--accent-strong); color: #fff; padding: .5rem .9rem; border-radius: .5rem; text-decoration: none; }
    .skip:focus { top: .75rem; }

    .site-header { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(12px); background: color-mix(in oklab, var(--bg) 80%, transparent); border-bottom: 1px solid var(--border); }
    .site-header .wrap { display: flex; align-items: center; gap: 1.5rem; height: 4rem; }
    .brand { display: flex; align-items: center; gap: .6rem; font-weight: 700; font-size: 1.15rem; text-decoration: none; letter-spacing: -.01em; }
    .brand small { font: 500 .7rem/1 ui-monospace, monospace; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: .25rem .5rem; }
    .site-nav { margin-inline-start: auto; display: flex; align-items: center; gap: .25rem; }
    .site-nav a { text-decoration: none; color: var(--muted); font-size: .925rem; padding: .45rem .7rem; border-radius: .5rem; display: inline-flex; align-items: center; gap: .4rem; }
    .site-nav a:hover, .site-nav a[aria-current="page"] { color: var(--fg); background: var(--bg-soft); }
    @media (max-width: 40rem) { .brand small, .site-nav .wide { display: none; } }

    .site-footer { margin-top: 5rem; border-top: 1px solid var(--border); padding: 2rem 0 3rem; color: var(--muted); font-size: .9rem; }
    .site-footer .wrap { display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: center; }
    .site-footer nav { margin-inline-start: auto; display: flex; gap: 1rem; }
    .site-footer a { text-decoration: none; }
    .site-footer a:hover { color: var(--fg); }
`;

export const header = ({ base = "", version, current }) => `<a class="skip" href="#content">Skip to content</a>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="${base || "./"}">${LOGO} oaspect <small>v${escapeHtml(version)}</small></a>
      <nav class="site-nav" aria-label="Main">
        <a href="${base}docs/"${current === "docs" ? ' aria-current="page"' : ""}>Docs</a>
        <a class="wide" href="${base}demo/roastery.html">Demo</a>
        <a class="wide" href="https://www.npmjs.com/package/oaspect">npm</a>
        <a href="https://github.com/oaspect/oaspect">${icon("github", 18)} GitHub</a>
      </nav>
    </div>
  </header>`;

export const footer = ({ base = "" }) => `<footer class="site-footer">
    <div class="wrap">
      <span>oaspect · MIT License</span>
      <nav aria-label="Footer">
        <a href="${base}docs/">Docs</a>
        <a href="https://github.com/oaspect/oaspect">GitHub</a>
        <a href="https://www.npmjs.com/package/oaspect">npm</a>
        <a href="https://github.com/oaspect/oaspect/issues">Issues</a>
      </nav>
    </div>
  </footer>`;

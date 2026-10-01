// HTML page around the standalone bundle, shared by `oaspect build` (inline
// script and spec: one self-contained file) and `oaspect serve`.

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Default page icon: braces on a rounded square, inline so the file stays self-contained.
const DEFAULT_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#16a34a"/><path d="M12 9c-2 0-3 1-3 3v2c0 1-1 2-2 2 1 0 2 1 2 2v2c0 2 1 3 3 3M20 9c2 0 3 1 3 3v2c0 1 1 2 2 2-1 0-2 1-2 2v2c0 2-1 3-3 3" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>',
  );

// JSON inside <script>: "<" escaped so "</script>" in the data cannot close it.
const scriptJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

// Sets <html data-theme> from the reader's stored or system preference before
// the first paint, so prerendered markup does not flash the wrong theme.
const themeScript = (storagePrefix) => `(() => {
  let theme;
  try { theme = localStorage.getItem(${scriptJson(`${storagePrefix}:theme`)}); } catch {}
  if (theme !== "light" && theme !== "dark") theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
})();`;

/**
 * @param {{
 *   title?: string,
 *   config?: object,            // Oaspect.init() config (specUrl, locale…)
 *   spec?: object,              // inlined OpenAPI document
 *   script?: { src?: string, inline?: string },
 *   icon?: string,              // favicon URL (default: built-in icon)
 *   markup?: string,            // prerendered viewer HTML (hydrated instead of rendered)
 *   css?: string,               // stylesheet to inline, needed with markup
 * }} options
 */
export function renderHtml({ title = "API Reference", config = {}, spec, script = {}, icon = DEFAULT_ICON, markup, css }) {
  const scriptTag = script.inline
    ? `<script>${script.inline.replace(/<\/script/gi, "<\\/script")}</script>`
    : `<script src="${escapeHtml(script.src ?? "oaspect.js")}"></script>`;
  const specTag = spec ? `\n    <script type="application/json" id="oaspect-spec">${scriptJson(spec)}</script>` : "";
  const configExpression = spec
    ? `Object.assign(${scriptJson(config)}, { spec: JSON.parse(document.getElementById("oaspect-spec").textContent) })`
    : scriptJson(config);
  const head = [
    css ? `<style id="oaspect-styles">${css.replace(/<\/style/gi, "<\\/style")}</style>` : "",
    config.theme ? "" : `<script>${themeScript(config.storagePrefix ?? "oaspect")}</script>`,
  ]
    .filter(Boolean)
    .join("\n    ");

  return `<!doctype html>
<html lang="${escapeHtml(config.locale ?? config.defaultLocale ?? "en")}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="oaspect" />
    <title>${escapeHtml(title)}</title>
    <link rel="icon" href="${escapeHtml(icon)}" />
    <style>body { margin: 0 }</style>${head ? `\n    ${head}` : ""}
  </head>
  <body>
    <div id="oaspect">${markup ?? ""}</div>${specTag}
    ${scriptTag}
    <script>Oaspect.${markup ? "hydrate" : "init"}("#oaspect", ${configExpression});</script>
  </body>
</html>
`;
}

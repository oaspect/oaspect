// HTML page around the standalone bundle, shared by `oaspect build` (inline
// script and spec: one self-contained file) and `oaspect serve`.

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// JSON inside <script>: "<" escaped so "</script>" in the data cannot close it.
const scriptJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

/**
 * @param {{
 *   title?: string,
 *   config?: object,            // Oaspect.init() config (specUrl, locale…)
 *   spec?: object,              // inlined OpenAPI document
 *   script?: { src?: string, inline?: string },
 * }} options
 */
export function renderHtml({ title = "API Reference", config = {}, spec, script = {} }) {
  const scriptTag = script.inline
    ? `<script>${script.inline.replace(/<\/script/gi, "<\\/script")}</script>`
    : `<script src="${escapeHtml(script.src ?? "oaspect.js")}"></script>`;
  const specTag = spec ? `\n    <script type="application/json" id="oaspect-spec">${scriptJson(spec)}</script>` : "";
  const configExpression = spec
    ? `Object.assign(${scriptJson(config)}, { spec: JSON.parse(document.getElementById("oaspect-spec").textContent) })`
    : scriptJson(config);

  return `<!doctype html>
<html lang="${escapeHtml(config.locale ?? config.defaultLocale ?? "en")}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="oaspect" />
    <title>${escapeHtml(title)}</title>
    <style>body { margin: 0 }</style>
  </head>
  <body>
    <div id="oaspect"></div>${specTag}
    ${scriptTag}
    <script>Oaspect.init("#oaspect", ${configExpression});</script>
  </body>
</html>
`;
}

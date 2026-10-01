// Builds dist/oaspect.css: the viewer's complete stylesheet, usable on any
// page without Tailwind.
//
// 1. Tailwind compiles every utility the components use (src/styles/input.css).
// 2. Every selector is scoped under .oaspect (":root"/"html"/"body" become
//    .oaspect itself), so nothing leaks onto the host page.
// 3. Cascade layers are unwrapped: host styles are usually unlayered, and
//    unlayered rules beat layered ones regardless of specificity, so a host
//    `a { color: red }` would otherwise restyle the viewer's links. Scoped and
//    unlayered, the viewer's rules win by specificity instead.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import postcss from "postcss";

const root = resolve(import.meta.dirname, "..");
const SCOPE = ".oaspect";
const raw = resolve(root, "dist/.oaspect.raw.css");
const output = resolve(root, "dist/oaspect.css");

mkdirSync(dirname(raw), { recursive: true });
execFileSync(resolve(root, "node_modules/.bin/tailwindcss"), ["-i", "src/styles/input.css", "-o", raw], {
  cwd: root,
  stdio: ["ignore", "ignore", "inherit"],
});

function scopeSelector(selector) {
  const trimmed = selector.trim();
  if (trimmed.includes(SCOPE)) return trimmed;
  if (/^(:root|:host|html|body)(?![\w-])/.test(trimmed)) return trimmed.replace(/^(:root|:host|html|body)/, SCOPE);
  return `${SCOPE} ${trimmed}`;
}

const scope = {
  postcssPlugin: "oaspect-scope",
  Once(css) {
    // Unwrap layers (statements like "@layer a, b;" carry no rules).
    css.walkAtRules("layer", (rule) => {
      if (rule.nodes) rule.replaceWith(rule.nodes);
      else rule.remove();
    });
    css.walkRules((rule) => {
      if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
      rule.selectors = [...new Set(rule.selectors.map(scopeSelector))];
    });
  },
};

const result = await postcss([scope]).process(readFileSync(raw, "utf8"), { from: raw, to: output });
const banner = "/* @oaspect/react — scoped under .oaspect; see https://github.com/oaspect/oaspect */\n";
writeFileSync(output, banner + result.css);
rmSync(raw);

const unscoped = [];
postcss.parse(result.css).walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
  for (const selector of rule.selectors) if (!selector.includes(SCOPE)) unscoped.push(selector);
});
if (unscoped.length) throw new Error(`Unscoped selectors: ${unscoped.slice(0, 5).join(", ")}`);
console.log(`dist/oaspect.css: ${(result.css.length / 1024).toFixed(1)} KB`);

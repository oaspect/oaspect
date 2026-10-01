// esbuild keeps extensionless relative imports ("./intro") when not bundling,
// but ESM consumers (Node, webpack with fullySpecified) need "./intro.js".
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const dist = resolve(import.meta.dirname, "../dist");
const IMPORT = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']+)\2/g;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith(".js")) fix(path);
  }
}

function fix(file) {
  const source = readFileSync(file, "utf8");
  const output = source.replace(IMPORT, (match, prefix, quote, specifier) => {
    if (/\.(m?js|json|css)$/.test(specifier)) return match;
    const target = resolve(dirname(file), specifier);
    const resolved = existsSync(`${target}.js`) ? `${specifier}.js` : existsSync(join(target, "index.js")) ? `${specifier}/index.js` : null;
    if (!resolved) throw new Error(`Cannot resolve ${specifier} from ${file}`);
    return `${prefix}${quote}${resolved}${quote}`;
  });
  if (output !== source) writeFileSync(file, output);
}

walk(dist);

// Builds the standalone bundle (dist/oaspect.js, IIFE exposing window.Oaspect)
// and the server helpers (dist/server.js, ESM).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const standalone = await build({
  entryPoints: [resolve(root, "src/standalone.jsx")],
  outfile: resolve(root, "dist/oaspect.js"),
  bundle: true,
  format: "iife",
  globalName: "Oaspect",
  platform: "browser",
  target: "es2020",
  jsx: "automatic",
  minify: true,
  sourcemap: true,
  legalComments: "eof",
  loader: { ".css": "text" },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.OASPECT_VERSION": JSON.stringify(version),
  },
  banner: { js: `/*! oaspect v${version} | MIT License */` },
  metafile: true,
  logLevel: "warning",
});

// Prerendering for the CLI (Node): React, react-dom/server and the viewer.
await build({
  entryPoints: [resolve(root, "src/ssr.jsx")],
  outfile: resolve(root, "dist/ssr.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  jsx: "automatic",
  loader: { ".css": "text" },
  define: { "process.env.NODE_ENV": '"production"' },
  // Bundled CommonJS dependencies (yaml) require Node built-ins at runtime.
  banner: { js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' },
  logLevel: "warning",
});

await build({
  entryPoints: [resolve(root, "src/server.js")],
  outfile: resolve(root, "dist/server.js"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  logLevel: "warning",
});

const bytes = Object.values(standalone.metafile.outputs).find((output) => output.entryPoint)?.bytes ?? 0;
console.log(`dist/oaspect.js: ${(bytes / 1024).toFixed(0)} KB`);

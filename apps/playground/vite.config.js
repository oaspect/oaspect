import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const source = (path) => fileURLToPath(new URL(`../../packages/${path}`, import.meta.url));

// Packages resolve to their sources, so edits reload instantly. Styles come
// from the built stylesheet: after adding new Tailwind classes to a
// component, run `pnpm --filter @oaspect/react build`.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@oaspect\/react$/, replacement: source("react/src/index.js") },
      { find: /^@oaspect\/core$/, replacement: source("core/src/index.ts") },
    ],
  },
  esbuild: { jsx: "automatic" },
  optimizeDeps: { esbuildOptions: { loader: { ".js": "jsx" } } },
});

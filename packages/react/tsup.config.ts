import { defineConfig } from "tsup";

// One output file per source file (no bundling) so each module keeps its
// "use client" directive for React Server Components frameworks.
export default defineConfig({
  entry: ["src/**/*.{js,jsx}"],
  bundle: false,
  format: ["esm"],
  outExtension: () => ({ js: ".js" }),
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  sourcemap: true,
  clean: true,
  target: "es2022",
});

// Fails when a published bundle grows past its gzip budget. Raise a budget
// deliberately (and say why in the commit), never to silence the check.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGETS = [
  { file: "packages/oaspect/dist/oaspect.js", gzipKB: 160, note: "standalone bundle, React included" },
  { file: "packages/react/dist/oaspect.css", gzipKB: 10, note: "scoped stylesheet" },
  { file: "packages/core/dist/index.js", gzipKB: 30, note: "core without dependencies" },
];

const root = resolve(import.meta.dirname, "..");
let failed = false;

for (const { file, gzipKB, note } of BUDGETS) {
  const size = gzipSync(readFileSync(resolve(root, file)), { level: 9 }).length / 1024;
  const ok = size <= gzipKB;
  failed ||= !ok;
  console.log(`${ok ? "ok  " : "FAIL"} ${file}: ${size.toFixed(1)} KB gzip (budget ${gzipKB} KB, ${note})`);
}

if (failed) process.exit(1);

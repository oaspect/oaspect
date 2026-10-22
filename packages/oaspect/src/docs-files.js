// Reads a folder of Markdown files into a docs bundle ({ title, editUrl,
// files: [{ path, content }] }) for `oaspect docs` and DocsReference.
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const SKIP = new Set(["node_modules", "vendor", "dist", "build"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else if (/\.(?:md|markdown)$/i.test(entry.name)) found.push(path);
  }
  return found;
}

/**
 * @param {string} dir
 * @param {{ title?: string, editUrl?: string }} [options]
 */
export async function readDocs(dir, { title, editUrl } = {}) {
  const root = resolve(dir);
  const paths = (await walk(root)).sort();
  if (paths.length === 0) throw new Error(`No Markdown files in ${dir}`);
  const files = await Promise.all(
    paths.map(async (path) => ({ path: relative(root, path).split(sep).join("/"), content: await readFile(path, "utf8") })),
  );
  return { ...(title ? { title } : {}), ...(editUrl ? { editUrl } : {}), files };
}

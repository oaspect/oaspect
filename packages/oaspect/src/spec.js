// Loads an OpenAPI document from a file path or URL for the CLI.
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export function isUrl(source) {
  return /^https?:\/\//i.test(source);
}

export async function readSpecText(source) {
  if (isUrl(source)) {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
    return response.text();
  }
  return readFile(resolve(source), "utf8");
}

export async function loadSpec(source) {
  const text = await readSpecText(source);
  let spec;
  try {
    spec = JSON.parse(text);
  } catch (error) {
    throw new Error(`${source} is not valid JSON: ${error.message}`);
  }
  if (!spec || typeof spec !== "object" || !(spec.openapi || spec.swagger) || !spec.paths) {
    throw new Error(`${source} is not an OpenAPI document (missing "openapi"/"swagger" or "paths").`);
  }
  return spec;
}

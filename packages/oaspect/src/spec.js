// Loads an OpenAPI document (JSON or YAML; Swagger 2.0 is converted) from a
// file path or URL for the CLI.
import { loadSpec as loadDocument } from "@oaspect/core";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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

// External $refs: file: URLs from disk, http(s) URLs over the network.
async function readUrl(url) {
  if (url.startsWith("file:")) return readFile(fileURLToPath(url), "utf8");
  return readSpecText(url);
}

export async function loadSpec(source) {
  const text = await readSpecText(source);
  const baseUrl = isUrl(source) ? source : pathToFileURL(resolve(source)).href;
  try {
    return await loadDocument(text, { baseUrl, read: readUrl });
  } catch (error) {
    throw new Error(`${source}: ${error.message}`);
  }
}

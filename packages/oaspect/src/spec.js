// Loads an OpenAPI document (JSON or YAML; Swagger 2.0 is converted) from a
// file path or URL for the CLI.
import { loadSpecText } from "@oaspect/core";
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
  try {
    return loadSpecText(text);
  } catch (error) {
    throw new Error(`${source}: ${error.message}`);
  }
}

// Turns spec text (JSON or YAML) into an OpenAPI 3.x document the viewer can
// render, converting Swagger 2.0 on the way.

import { parse as parseYaml } from "yaml";
import { convertSwagger2 } from "./convert";
import { resolveExternalRefs, type ExternalRefOptions } from "./external";
import type { OpenAPIDocument } from "./types";

/** Parses JSON, falling back to YAML. Throws with a readable message. */
export function parseSpec(text: string): unknown {
  const trimmed = text.trimStart();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON: ${(error as Error).message}`);
    }
  }
  try {
    return parseYaml(text, { maxAliasCount: 1000 });
  } catch (error) {
    throw new Error(`Invalid YAML: ${(error as Error).message}`);
  }
}

export function isOpenApiDocument(value: unknown): value is OpenAPIDocument {
  const doc = value as OpenAPIDocument | null;
  return Boolean(doc && typeof doc === "object" && (doc.openapi || doc.swagger) && doc.paths);
}

/** OpenAPI 3.x documents pass through; Swagger 2.0 documents are converted. */
export function normalizeSpec(doc: OpenAPIDocument): OpenAPIDocument {
  return String(doc.swagger ?? "").startsWith("2") ? convertSwagger2(doc) : doc;
}

/** parseSpec + validation + normalizeSpec. */
export function loadSpecText(text: string): OpenAPIDocument {
  const doc = parseSpec(text);
  if (!isOpenApiDocument(doc)) throw new Error('Not an OpenAPI document (missing "openapi"/"swagger" or "paths").');
  return normalizeSpec(doc);
}

/**
 * loadSpecText + external $ref resolution. Without `read`, external refs are
 * left as they are (the viewer shows them as unresolved).
 */
export async function loadSpec(text: string, options?: Partial<ExternalRefOptions>): Promise<OpenAPIDocument> {
  const doc = loadSpecText(text);
  if (!options?.read || !options.baseUrl) return doc;
  return resolveExternalRefs(doc, options as ExternalRefOptions);
}

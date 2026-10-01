import { deref } from "./refs";
import { inferType, resolveSchema } from "./schema";
import type { OpenAPIObject } from "./types";

const STRING_FORMATS: Record<string, string> = {
  "date-time": "2026-01-01T09:00:00Z",
  date: "2026-01-01",
  time: "09:00:00",
  email: "user@example.com",
  uri: "https://example.com",
  url: "https://example.com",
  uuid: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  ipv4: "192.168.0.1",
  ipv6: "::1",
  password: "********",
  byte: "U3dhZ2dlcg==",
};

// Builds a representative value from a schema. Explicit example/default/enum
// values win; otherwise a placeholder is generated per type.
export function exampleFromSchema(spec: OpenAPIObject, input: unknown, seen: Set<string> = new Set(), depth = 0): any {
  if (!input || depth > 8) return undefined;

  const { schema, name } = resolveSchema(spec, input);
  if (name && seen.has(name)) return {};
  const nextSeen = name ? new Set(seen).add(name) : seen;

  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.examples) && schema.examples.length) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (schema.const !== undefined) return schema.const;

  const variants = schema.oneOf ?? schema.anyOf;
  if (variants?.length) return exampleFromSchema(spec, variants[0], nextSeen, depth + 1);

  switch (inferType(schema)) {
    case "object": {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        if (resolveSchema(spec, value).schema.writeOnly) continue;
        result[key] = exampleFromSchema(spec, value, nextSeen, depth + 1);
      }
      if (!schema.properties && typeof schema.additionalProperties === "object") {
        result.key = exampleFromSchema(spec, schema.additionalProperties, nextSeen, depth + 1);
      }
      return result;
    }
    case "array":
      return schema.items ? [exampleFromSchema(spec, schema.items, nextSeen, depth + 1)] : [];
    case "integer":
      return schema.minimum ?? 0;
    case "number":
      return schema.minimum ?? 0;
    case "boolean":
      return true;
    case "string":
      return STRING_FORMATS[schema.format] ?? "string";
    default:
      return null;
  }
}

// Picks the example for a media type object: `example`, the first entry of
// `examples`, or one generated from its schema.
export function mediaExample(spec: OpenAPIObject, media: OpenAPIObject | undefined): any {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;

  const named = media.examples && Object.values(media.examples)[0];
  if (named) return deref(spec, named).node.value;

  return exampleFromSchema(spec, media.schema);
}

// Named examples of a media type, for the example switcher.
export function mediaExamples(spec: OpenAPIObject, media: OpenAPIObject | undefined): { key: string; summary: string; value: unknown }[] {
  if (!media?.examples) return [];

  return Object.entries(media.examples).map(([key, value]) => {
    const { node } = deref(spec, value);
    return { key, summary: node.summary ?? key, value: node.value };
  });
}

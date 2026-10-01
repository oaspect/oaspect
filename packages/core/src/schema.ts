import { deref, refName } from "./refs";
import type { OpenAPIObject, ResolvedSchema, SchemaChildren } from "./types";

function mergeInto(target: OpenAPIObject, source: OpenAPIObject) {
  for (const [key, value] of Object.entries(source)) {
    if (key === "properties") {
      target.properties = { ...target.properties, ...value };
    } else if (key === "required") {
      target.required = [...new Set([...(target.required ?? []), ...value])];
    } else {
      target[key] = value;
    }
  }
}

// Resolves $ref and flattens allOf so the renderer only deals with plain
// schemas. `name` is the component name when the schema came from a $ref,
// including the common `{ allOf: [{ $ref }], nullable: true }` wrapper.
export function resolveSchema(spec: OpenAPIObject, input: unknown): ResolvedSchema {
  const { node, ref } = deref(spec, input);
  let schema = node;
  let name = ref ? refName(ref) : undefined;

  if (Array.isArray(schema.allOf)) {
    const { allOf, ...rest } = schema;
    const merged: OpenAPIObject = {};

    for (const part of allOf) {
      mergeInto(merged, resolveSchema(spec, part).schema);
    }
    mergeInto(merged, rest);

    if (!name && allOf.length === 1 && allOf[0].$ref) {
      name = refName(allOf[0].$ref);
    }
    schema = merged;
  }

  return { schema, name };
}

export function inferType(schema: OpenAPIObject): string {
  if (schema.type) return Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type;
  if (schema.properties || schema.additionalProperties) return "object";
  if (schema.items) return "array";
  if (schema.oneOf) return "oneOf";
  if (schema.anyOf) return "anyOf";
  return "any";
}

// Short, human readable type such as "string<email>" or "array<DummyEntity>".
export function typeLabel(spec: OpenAPIObject, schema: OpenAPIObject, name?: string): string {
  const type = inferType(schema);

  if (type === "array" && schema.items) {
    const item = resolveSchema(spec, schema.items);
    return `array<${item.name ?? typeLabel(spec, item.schema)}>`;
  }
  if (type === "object" && name) return name;
  if (schema.format) return `${type}<${schema.format}>`;
  return type;
}

export function constraintsOf(schema: OpenAPIObject): string[] {
  const list: string[] = [];
  const add = (label: string, value: unknown) => value !== undefined && list.push(`${label} ${value}`);

  add("min length", schema.minLength);
  add("max length", schema.maxLength);
  add(schema.exclusiveMinimum === true ? ">" : "≥", schema.minimum);
  add(schema.exclusiveMaximum === true ? "<" : "≤", schema.maximum);
  // OpenAPI 3.1 uses numeric exclusive bounds.
  if (typeof schema.exclusiveMinimum === "number") add(">", schema.exclusiveMinimum);
  if (typeof schema.exclusiveMaximum === "number") add("<", schema.exclusiveMaximum);
  add("multiple of", schema.multipleOf);
  add("min items", schema.minItems);
  add("max items", schema.maxItems);
  if (schema.uniqueItems) list.push("unique items");

  return list;
}

// Returns child fields to render under a schema, or null when it is a leaf.
export function childrenOf(spec: OpenAPIObject, schema: OpenAPIObject): SchemaChildren {
  const type = inferType(schema);

  if (type === "array" && schema.items) {
    const item = resolveSchema(spec, schema.items);
    return childrenOf(spec, item.schema) ? { kind: "items", ...item } : null;
  }
  if (schema.oneOf || schema.anyOf) {
    const variants = (schema.oneOf ?? schema.anyOf).map((variant) => resolveSchema(spec, variant));
    return { kind: schema.oneOf ? "oneOf" : "anyOf", variants };
  }
  if (schema.properties && Object.keys(schema.properties).length > 0) {
    return { kind: "properties" };
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    const value = resolveSchema(spec, schema.additionalProperties);
    return childrenOf(spec, value.schema) ? { kind: "map", ...value } : null;
  }
  return null;
}

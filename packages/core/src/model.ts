import { deref } from "./refs";
import type { ApiModel, HttpMethod, OpenAPIDocument, OpenAPIObject, Operation, ResponseInfo, ServerObject } from "./types";

export const HTTP_METHODS: HttpMethod[] = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];

export function slugify(value: unknown): string {
  return String(value)
    .toLowerCase()
    .replace(/[{}]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const tagAnchor = (name: string): string => `tag/${slugify(name)}`;
export const modelAnchor = (name: string): string => `model/${name}`;

function operationAnchor(method: string, path: string, operationId?: string) {
  return `operation/${operationId ? slugify(operationId) : `${method}-${slugify(path)}`}`;
}

// Path-level parameters apply to every operation unless overridden by one
// with the same name + location.
function mergeParameters(spec: OpenAPIObject, pathParams: unknown[] = [], opParams: unknown[] = []) {
  const byKey = new Map<string, OpenAPIObject>();

  for (const raw of [...pathParams, ...opParams]) {
    const { node } = deref(spec, raw);
    if (node.name) byKey.set(`${node.in}:${node.name}`, node);
  }
  return [...byKey.values()];
}

function resolveResponses(spec: OpenAPIObject, responses: OpenAPIObject = {}): ResponseInfo[] {
  return Object.entries(responses).map(([status, raw]) => {
    const { node } = deref(spec, raw);
    return {
      status,
      description: node.description ?? "",
      "x-i18n": node["x-i18n"],
      content: node.content ?? {},
      headers: Object.fromEntries(
        Object.entries(node.headers ?? {}).map(([key, value]) => [key, deref(spec, value).node]),
      ),
    };
  });
}

// Turns a raw OpenAPI 3.x document into the structure the UI renders:
// tag groups with fully resolved operations plus the component schemas.
export function buildModel(spec: OpenAPIDocument): ApiModel {
  const tagMeta = new Map<string, OpenAPIObject>((spec.tags ?? []).map((tag) => [tag.name, tag]));
  const groups = new Map<string, Operation[]>([...tagMeta.keys()].map((name) => [name, []]));
  const operations: Operation[] = [];

  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    const pathItem = deref(spec, item).node;

    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;

      const requestBody = op.requestBody ? deref(spec, op.requestBody).node : null;
      const operation: Operation = {
        anchor: operationAnchor(method, path, op.operationId),
        method,
        path,
        summary: op.summary ?? "",
        description: op.description ?? "",
        "x-i18n": op["x-i18n"],
        operationId: op.operationId,
        deprecated: Boolean(op.deprecated),
        tags: op.tags?.length ? op.tags : ["Default"],
        parameters: mergeParameters(spec, pathItem.parameters, op.parameters),
        requestBody,
        responses: resolveResponses(spec, op.responses),
        security: op.security ?? spec.security ?? [],
        servers: op.servers ?? pathItem.servers ?? spec.servers ?? [],
      };

      operations.push(operation);
      for (const tag of operation.tags) {
        if (!groups.has(tag)) groups.set(tag, []);
        groups.get(tag)!.push(operation);
      }
    }
  }

  const tags = [...groups.entries()]
    .filter(([, list]) => list.length > 0)
    .map(([name, list]) => ({
      name,
      anchor: tagAnchor(name),
      description: tagMeta.get(name)?.description ?? "",
      // Display name translations go under x-i18n.<locale>.name; `name`
      // stays the grouping key operations refer to.
      "x-i18n": tagMeta.get(name)?.["x-i18n"],
      operations: list,
    }));

  const schemas = Object.entries<OpenAPIObject>(spec.components?.schemas ?? {}).map(([name, schema]) => ({
    name,
    anchor: modelAnchor(name),
    schema,
  }));

  return {
    openapi: spec.openapi ?? spec.swagger ?? "",
    info: spec.info ?? {},
    servers: spec.servers?.length ? spec.servers : [{ url: "/" }],
    securitySchemes: spec.components?.securitySchemes ?? {},
    tags,
    operations,
    schemas,
  };
}

// Replaces {variables} in a server URL with their defaults.
export function serverUrl(server: ServerObject): string {
  return server.url.replace(/\{([^}]+)\}/g, (match, key: string) => server.variables?.[key]?.default ?? match);
}

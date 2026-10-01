import { deref } from "./refs";
import type { ApiModel, CallbackInfo, HttpMethod, LinkInfo, OpenAPIDocument, OpenAPIObject, Operation, ResponseInfo, ServerObject } from "./types";

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

function resolveLinks(spec: OpenAPIObject, links: OpenAPIObject = {}): LinkInfo[] {
  return Object.entries(links).map(([name, raw]) => {
    const { node } = deref(spec, raw);
    return {
      name,
      operationId: node.operationId,
      operationRef: node.operationRef,
      parameters: node.parameters ?? {},
      requestBody: node.requestBody,
      description: node.description ?? "",
    };
  });
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
      links: resolveLinks(spec, node.links),
    };
  });
}

// One operation of a path item. Webhooks and callbacks use the same shape;
// `kind` tells them apart and `anchorPrefix` keeps their anchors unique.
function buildOperation(
  spec: OpenAPIDocument,
  method: HttpMethod,
  path: string,
  pathItem: OpenAPIObject,
  op: OpenAPIObject,
  kind: Operation["kind"],
  anchorPrefix: string,
): Operation {
  const requestBody = op.requestBody ? deref(spec, op.requestBody).node : null;
  const anchor = kind === "operation" ? operationAnchor(method, path, op.operationId) : `${anchorPrefix}/${slugify(op.operationId ?? `${path}-${method}`)}`;
  return {
    anchor,
    kind,
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
    callbacks: kind === "callback" ? [] : resolveCallbacks(spec, op.callbacks, anchor),
    security: op.security ?? spec.security ?? [],
    servers: op.servers ?? pathItem.servers ?? spec.servers ?? [],
  };
}

function operationsOf(spec: OpenAPIDocument, path: string, item: unknown, kind: Operation["kind"], anchorPrefix: string): Operation[] {
  const pathItem = deref(spec, item).node;
  return HTTP_METHODS.filter((method) => pathItem[method]).map((method) =>
    buildOperation(spec, method, path, pathItem, pathItem[method], kind, anchorPrefix),
  );
}

// callbacks: { name: { "{$request.body#/callbackUrl}": PathItem } }
function resolveCallbacks(spec: OpenAPIDocument, callbacks: OpenAPIObject = {}, parentAnchor: string): CallbackInfo[] {
  return Object.entries(callbacks).map(([name, raw]) => {
    const { node } = deref(spec, raw);
    const operations = Object.entries(node)
      .filter(([expression]) => !expression.startsWith("x-"))
      .flatMap(([expression, item]) => operationsOf(spec, expression, item, "callback", `${parentAnchor}/callback/${slugify(name)}`));
    return { name, operations };
  });
}

// Turns a raw OpenAPI 3.x document into the structure the UI renders:
// tag groups with fully resolved operations, webhooks and component schemas.
export function buildModel(spec: OpenAPIDocument): ApiModel {
  const tagMeta = new Map<string, OpenAPIObject>((spec.tags ?? []).map((tag) => [tag.name, tag]));
  const groups = new Map<string, Operation[]>([...tagMeta.keys()].map((name) => [name, []]));
  const operations: Operation[] = [];

  for (const [path, item] of Object.entries(spec.paths ?? {})) {
    for (const operation of operationsOf(spec, path, item, "operation", "operation")) {
      operations.push(operation);
      for (const tag of operation.tags) {
        if (!groups.has(tag)) groups.set(tag, []);
        groups.get(tag)!.push(operation);
      }
    }
  }

  // OpenAPI 3.1 webhooks: { name: PathItem }; the name stands in for the path.
  const webhooks = Object.entries<OpenAPIObject>(spec.webhooks ?? {}).flatMap(([name, item]) =>
    operationsOf(spec, name, item, "webhook", `webhook/${slugify(name)}`),
  );

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
    webhooks,
    schemas,
  };
}

// Replaces {variables} in a server URL with chosen values, then defaults.
export function serverUrl(server: ServerObject, values: Record<string, string> = {}): string {
  return server.url.replace(/\{([^}]+)\}/g, (match, key: string) => values[key] || server.variables?.[key]?.default || match);
}

/** Finds the operation a link points to (operationId, or a local operationRef). */
export function linkTarget(model: ApiModel, link: LinkInfo): Operation | undefined {
  if (link.operationId) return model.operations.find((operation) => operation.operationId === link.operationId);
  const match = /^#\/paths\/([^/]+)\/(\w+)$/.exec(link.operationRef ?? "");
  if (!match) return undefined;
  const path = match[1].replace(/~1/g, "/").replace(/~0/g, "~");
  return model.operations.find((operation) => operation.path === path && operation.method === match[2]);
}

import { mediaExample, exampleFromSchema } from "./example";
import { serverUrl } from "./model";
import type { HttpRequest, OpenAPIObject, Operation, ParameterValues, ServerObject } from "./types";

export function jsonMediaType(content: Record<string, unknown> = {}): string | undefined {
  const types = Object.keys(content);
  return types.find((type) => /json/i.test(type)) ?? types[0];
}

export function parameterExample(spec: OpenAPIObject, param: OpenAPIObject): any {
  if (param.example !== undefined) return param.example;
  const named = param.examples && Object.values(param.examples)[0];
  if (named?.value !== undefined) return named.value;
  return exampleFromSchema(spec, param.schema);
}

// Default form values for an operation: path params get examples so the URL
// is valid; optional query/header params start empty.
export function defaultValues(spec: OpenAPIObject, operation: Operation): ParameterValues {
  const values: ParameterValues = { path: {}, query: {}, header: {}, cookie: {} };

  for (const param of operation.parameters) {
    const example = parameterExample(spec, param);
    const include = param.in === "path" || param.required;
    values[param.in] ??= {};
    values[param.in][param.name] = include && example !== undefined && example !== null ? String(example) : "";
  }
  return values;
}

export function defaultBody(spec: OpenAPIObject, operation: Operation): { contentType: string | null; body: string } {
  const content = operation.requestBody?.content;
  const type = jsonMediaType(content);
  if (!type) return { contentType: null, body: "" };

  const example = mediaExample(spec, content[type]);
  return {
    contentType: type,
    body: example === undefined ? "" : JSON.stringify(example, null, 2),
  };
}

// Produces a concrete request description from form values.
export interface BuildRequestOptions {
  server?: ServerObject;
  values: Partial<ParameterValues>;
  body?: string;
  contentType?: string | null;
  headers?: Record<string, string>;
}

export function buildRequest(
  operation: Pick<Operation, "method" | "path">,
  { server, values, body, contentType, headers = {} }: BuildRequestOptions,
): HttpRequest {
  const base = (server ? serverUrl(server) : "").replace(/\/+$/, "");
  const path = operation.path.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = values.path?.[key];
    return value ? encodeURIComponent(value) : match;
  });

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values.query ?? {})) {
    if (value !== "") query.append(key, value);
  }
  const search = query.toString();

  const allHeaders: Record<string, string> = { ...headers };
  for (const [key, value] of Object.entries(values.header ?? {})) {
    if (value !== "") allHeaders[key] = value;
  }
  const cookies = Object.entries(values.cookie ?? {})
    .filter(([, value]) => value !== "")
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  if (cookies) allHeaders.Cookie = cookies;

  const hasBody = Boolean(body) && !["get", "head"].includes(operation.method);
  if (hasBody && contentType) allHeaders["Content-Type"] = contentType;

  return {
    method: operation.method.toUpperCase(),
    url: `${base}${path}${search ? `?${search.replace(/%5B/g, "[").replace(/%5D/g, "]")}` : ""}`,
    headers: allHeaders,
    body: hasBody ? body : undefined,
  };
}

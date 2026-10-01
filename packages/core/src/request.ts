import { mediaExample, exampleFromSchema } from "./example";
import { serverUrl } from "./model";
import { resolveSchema } from "./schema";
import type { FormField, HttpRequest, OpenAPIObject, Operation, ParameterValues, ServerObject } from "./types";

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

export interface DefaultBody {
  contentType: string | null;
  /** Text body for JSON and other text media types. */
  body: string;
  /** Parts for multipart/form-data. */
  form?: FormField[];
}

export const isMultipart = (contentType?: string | null) => /^multipart\/form-data/i.test(contentType ?? "");

const isBinary = (schema: OpenAPIObject) =>
  schema.type === "string" && (schema.format === "binary" || schema.format === "base64" || Boolean(schema.contentMediaType));

/**
 * Parts for a multipart/form-data body from its schema: binary properties
 * become file parts, everything else a text part with an example value.
 */
export function defaultForm(spec: OpenAPIObject, media: OpenAPIObject | undefined): FormField[] {
  const { schema } = resolveSchema(spec, media?.schema ?? {});
  const example = mediaExample(spec, media) ?? {};
  const fields: FormField[] = [];

  for (const [name, raw] of Object.entries<OpenAPIObject>(schema.properties ?? {})) {
    const property = resolveSchema(spec, raw).schema;
    const items = property.type === "array" && property.items ? resolveSchema(spec, property.items).schema : null;
    if (isBinary(property) || (items && isBinary(items))) {
      fields.push({ name, file: { name: `${name}.bin`, type: media?.encoding?.[name]?.contentType } });
      continue;
    }
    const value = (example as Record<string, unknown>)[name];
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry === undefined || entry === null) continue;
      fields.push({ name, value: typeof entry === "object" ? JSON.stringify(entry) : String(entry) });
    }
  }
  return fields;
}

export function defaultBody(spec: OpenAPIObject, operation: Operation): DefaultBody {
  const content = operation.requestBody?.content;
  const type = jsonMediaType(content);
  if (!type) return { contentType: null, body: "" };

  if (isMultipart(type)) return { contentType: type, body: "", form: defaultForm(spec, content[type]) };

  const example = mediaExample(spec, content[type]);
  if (example === undefined) return { contentType: type, body: "" };
  return { contentType: type, body: /x-www-form-urlencoded/i.test(type) ? formEncode(example) : JSON.stringify(example, null, 2) };
}

// application/x-www-form-urlencoded body from an example object: arrays
// repeat the key, nested objects are sent as JSON text.
export function formEncode(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const params = new URLSearchParams();
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    for (const entry of Array.isArray(item) ? item : [item]) {
      if (entry === undefined || entry === null) continue;
      params.append(key, typeof entry === "object" ? JSON.stringify(entry) : String(entry));
    }
  }
  return params.toString();
}

// Produces a concrete request description from form values.
export interface BuildRequestOptions {
  server?: ServerObject;
  values: Partial<ParameterValues>;
  body?: string;
  /** multipart/form-data parts; used instead of `body` when given. */
  form?: FormField[];
  contentType?: string | null;
  headers?: Record<string, string>;
}

export function buildRequest(
  operation: Pick<Operation, "method" | "path">,
  { server, values, body, form, contentType, headers = {} }: BuildRequestOptions,
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

  const canHaveBody = !["get", "head"].includes(operation.method);
  const multipart = canHaveBody && Boolean(form?.length) && isMultipart(contentType);
  const hasBody = !multipart && canHaveBody && Boolean(body);
  if (hasBody && contentType) allHeaders["Content-Type"] = contentType;

  const request: HttpRequest = {
    method: operation.method.toUpperCase(),
    url: `${base}${path}${search ? `?${search.replace(/%5B/g, "[").replace(/%5D/g, "]")}` : ""}`,
    headers: allHeaders,
    body: hasBody ? body : undefined,
  };
  if (multipart) request.form = form;
  return request;
}

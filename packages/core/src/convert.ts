// Swagger 2.0 → OpenAPI 3.0 conversion, so the viewer only deals with one
// document shape. Covers what real-world 2.0 documents use: servers from
// host/basePath/schemes, body and formData parameters → requestBody,
// definitions/parameters/responses → components, security definitions,
// $ref paths, collectionFormat, x-nullable and file uploads.

import type { OpenAPIDocument, OpenAPIObject } from "./types";

const REF_PREFIXES: [string, string][] = [
  ["#/definitions/", "#/components/schemas/"],
  ["#/responses/", "#/components/responses/"],
];

const SCHEMA_KEYS = [
  "format",
  "items",
  "enum",
  "default",
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "minLength",
  "maxLength",
  "pattern",
  "minItems",
  "maxItems",
  "uniqueItems",
  "multipleOf",
];

const FORM_TYPES = ["application/x-www-form-urlencoded", "multipart/form-data"];

function convertRef(ref: string, bodyParameters: Set<string>): string {
  if (ref.startsWith("#/parameters/")) {
    const name = ref.slice("#/parameters/".length);
    return bodyParameters.has(name) ? `#/components/requestBodies/${name}` : `#/components/parameters/${name}`;
  }
  for (const [from, to] of REF_PREFIXES) if (ref.startsWith(from)) return to + ref.slice(from.length);
  return ref;
}

export function convertSchema(schema: any): any {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(convertSchema);

  const result: OpenAPIObject = {};
  for (const [key, value] of Object.entries(schema)) {
    switch (key) {
      case "$ref":
        result.$ref = convertRef(String(value), new Set());
        break;
      case "x-nullable":
        if (value) result.nullable = true;
        break;
      case "discriminator":
        result.discriminator = typeof value === "string" ? { propertyName: value } : value;
        break;
      case "properties":
      case "patternProperties":
        result[key] = Object.fromEntries(Object.entries(value as object).map(([name, child]) => [name, convertSchema(child)]));
        break;
      case "items":
      case "additionalProperties":
      case "not":
        result[key] = typeof value === "object" ? convertSchema(value) : value;
        break;
      case "allOf":
      case "anyOf":
      case "oneOf":
        result[key] = (value as unknown[]).map(convertSchema);
        break;
      default:
        result[key] = value;
    }
  }
  if (result.type === "file") {
    result.type = "string";
    result.format = "binary";
  }
  return result;
}

// Non-body parameter: type/format/items… move into `schema`.
function convertParameter(parameter: OpenAPIObject): OpenAPIObject {
  const { type, collectionFormat, "x-example": example, allowEmptyValue, ...rest } = parameter;
  const schema: OpenAPIObject = type === "file" ? { type: "string", format: "binary" } : { type };
  const result: OpenAPIObject = {};

  for (const [key, value] of Object.entries(rest)) {
    if (SCHEMA_KEYS.includes(key)) schema[key] = key === "items" ? convertSchema(value) : value;
    else result[key] = value;
  }
  result.schema = convertSchema(schema);
  if (example !== undefined) result.example = example;
  if (allowEmptyValue) result.allowEmptyValue = true;

  if (type === "array") {
    const format = collectionFormat ?? "csv";
    if (format === "multi") Object.assign(result, { style: "form", explode: true });
    else if (format === "ssv") Object.assign(result, { style: "spaceDelimited", explode: false });
    else if (format === "pipes") Object.assign(result, { style: "pipeDelimited", explode: false });
    else Object.assign(result, { style: parameter.in === "query" || parameter.in === "cookie" ? "form" : "simple", explode: false });
  }
  return result;
}

function bodyContent(schema: unknown, types: string[], description?: string, required?: boolean) {
  const body: OpenAPIObject = { content: Object.fromEntries(types.map((type) => [type, { schema: convertSchema(schema) }])) };
  if (description) body.description = description;
  if (required) body.required = true;
  return body;
}

// formData parameters become one object schema in a form request body.
function formBody(parameters: OpenAPIObject[], consumes: string[]) {
  const types = consumes.filter((type) => FORM_TYPES.includes(type));
  const hasFile = parameters.some((parameter) => parameter.type === "file");
  const contentTypes = types.length ? types : [hasFile ? "multipart/form-data" : "application/x-www-form-urlencoded"];
  const schema: OpenAPIObject = { type: "object", properties: {} };
  const required: string[] = [];

  for (const parameter of parameters) {
    const { schema: propertySchema } = convertParameter({ ...parameter, in: "query" });
    if (parameter.description) propertySchema.description = parameter.description;
    schema.properties[parameter.name] = propertySchema;
    if (parameter.required) required.push(parameter.name);
  }
  if (required.length) schema.required = required;
  return { content: Object.fromEntries(contentTypes.map((type) => [type, { schema }])) };
}

function convertResponse(response: OpenAPIObject, produces: string[]): OpenAPIObject {
  if (response.$ref) return { $ref: convertRef(response.$ref, new Set()) };
  const { schema, examples, headers, ...rest } = response;
  const result: OpenAPIObject = { ...rest, description: rest.description ?? "" };

  if (headers) {
    result.headers = Object.fromEntries(
      Object.entries(headers as Record<string, OpenAPIObject>).map(([name, header]) => {
        const { schema: headerSchema, description } = convertParameter({ ...header, in: "header" });
        return [name, { ...(description ? { description } : {}), schema: headerSchema }];
      }),
    );
  }
  if (schema) {
    const types = produces.length ? produces : ["application/json"];
    result.content = Object.fromEntries(
      types.map((type) => [type, { schema: convertSchema(schema), ...(examples?.[type] !== undefined ? { example: examples[type] } : {}) }]),
    );
  }
  return result;
}

function convertSecurityScheme(scheme: OpenAPIObject): OpenAPIObject {
  const description = scheme.description ? { description: scheme.description } : {};
  if (scheme.type === "basic") return { type: "http", scheme: "basic", ...description };
  if (scheme.type === "apiKey") return { type: "apiKey", name: scheme.name, in: scheme.in, ...description };
  if (scheme.type === "oauth2") {
    const scopes = scheme.scopes ?? {};
    const flow =
      {
        implicit: { implicit: { authorizationUrl: scheme.authorizationUrl, scopes } },
        password: { password: { tokenUrl: scheme.tokenUrl, scopes } },
        application: { clientCredentials: { tokenUrl: scheme.tokenUrl, scopes } },
        accessCode: { authorizationCode: { authorizationUrl: scheme.authorizationUrl, tokenUrl: scheme.tokenUrl, scopes } },
      }[scheme.flow as string] ?? {};
    return { type: "oauth2", flows: flow, ...description };
  }
  return { ...scheme };
}

const resolveParameter = (doc: OpenAPIObject, parameter: OpenAPIObject): OpenAPIObject =>
  parameter.$ref?.startsWith("#/parameters/") ? doc.parameters?.[parameter.$ref.slice("#/parameters/".length)] ?? parameter : parameter;

/** Converts a Swagger 2.0 document to OpenAPI 3.0.3. */
export function convertSwagger2(doc: OpenAPIObject): OpenAPIDocument {
  const bodyParameters = new Set(
    Object.entries(doc.parameters ?? {})
      .filter(([, parameter]: [string, any]) => parameter.in === "body")
      .map(([name]) => name),
  );
  const globalConsumes: string[] = doc.consumes ?? ["application/json"];
  const globalProduces: string[] = doc.produces ?? ["application/json"];

  const schemes: string[] = doc.schemes?.length ? doc.schemes : ["https"];
  const servers = doc.host
    ? schemes.map((scheme) => ({ url: `${scheme}://${doc.host}${doc.basePath ?? ""}` }))
    : [{ url: doc.basePath ?? "/" }];

  const components: OpenAPIObject = {};
  if (doc.definitions) {
    components.schemas = Object.fromEntries(Object.entries(doc.definitions).map(([name, schema]) => [name, convertSchema(schema)]));
  }
  if (doc.parameters) {
    for (const [name, parameter] of Object.entries(doc.parameters as Record<string, OpenAPIObject>)) {
      if (parameter.in === "body") {
        (components.requestBodies ??= {})[name] = bodyContent(parameter.schema, globalConsumes, parameter.description, parameter.required);
      } else if (parameter.in !== "formData") {
        (components.parameters ??= {})[name] = convertParameter(parameter);
      }
    }
  }
  if (doc.responses) {
    components.responses = Object.fromEntries(
      Object.entries(doc.responses as Record<string, OpenAPIObject>).map(([name, response]) => [name, convertResponse(response, globalProduces)]),
    );
  }
  if (doc.securityDefinitions) {
    components.securitySchemes = Object.fromEntries(
      Object.entries(doc.securityDefinitions as Record<string, OpenAPIObject>).map(([name, scheme]) => [name, convertSecurityScheme(scheme)]),
    );
  }

  const paths: Record<string, OpenAPIObject> = {};
  for (const [path, item] of Object.entries((doc.paths ?? {}) as Record<string, OpenAPIObject>)) {
    const pathParameters: OpenAPIObject[] = item.parameters ?? [];
    const pathItem: OpenAPIObject = {};

    for (const [key, value] of Object.entries(item)) {
      if (key === "parameters" || typeof value !== "object" || !["get", "put", "post", "delete", "options", "head", "patch"].includes(key)) {
        if (key !== "parameters") pathItem[key] = value;
        continue;
      }
      const operation = value as OpenAPIObject;
      const { parameters = [], consumes, produces, responses = {}, ...rest } = operation;
      const opConsumes: string[] = consumes ?? globalConsumes;
      const opProduces: string[] = produces ?? globalProduces;
      const converted: OpenAPIObject = { ...rest };

      // Operation parameters override path-level ones with the same name + location.
      const merged = new Map<string, OpenAPIObject>();
      for (const raw of [...pathParameters, ...parameters]) {
        const resolved = resolveParameter(doc, raw);
        merged.set(`${resolved.in}:${resolved.name}`, raw);
      }

      const formData: OpenAPIObject[] = [];
      const outParameters: OpenAPIObject[] = [];
      for (const raw of merged.values()) {
        const resolved = resolveParameter(doc, raw);
        if (resolved.in === "body") {
          converted.requestBody = raw.$ref
            ? { $ref: convertRef(raw.$ref, bodyParameters) }
            : bodyContent(resolved.schema, opConsumes.filter((type) => !FORM_TYPES.includes(type)).length ? opConsumes.filter((type) => !FORM_TYPES.includes(type)) : ["application/json"], resolved.description, resolved.required);
        } else if (resolved.in === "formData") {
          formData.push(resolved);
        } else {
          outParameters.push(raw.$ref ? { $ref: convertRef(raw.$ref, bodyParameters) } : convertParameter(raw));
        }
      }
      if (formData.length) converted.requestBody = formBody(formData, opConsumes);
      if (outParameters.length) converted.parameters = outParameters;

      converted.responses = Object.fromEntries(
        Object.entries(responses as Record<string, OpenAPIObject>).map(([status, response]) => [status, convertResponse(response, opProduces)]),
      );
      pathItem[key] = converted;
    }
    paths[path] = pathItem;
  }

  const result: OpenAPIDocument = { openapi: "3.0.3", info: doc.info ?? { title: "API", version: "" }, servers, paths };
  for (const key of ["tags", "security", "externalDocs"]) if (doc[key] !== undefined) result[key] = doc[key];
  for (const [key, value] of Object.entries(doc)) if (key.startsWith("x-")) result[key] = value;
  if (Object.keys(components).length) result.components = components;
  return result;
}

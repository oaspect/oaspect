// Public types of @oaspect/core.
//
// OpenAPI objects are typed loosely on purpose: real-world documents carry
// vendor extensions and version differences (3.0 vs 3.1) everywhere, so the
// library reads them defensively instead of trusting a strict schema.

/** Any OpenAPI object (schema, parameter, response…), vendor extensions included. */
export type OpenAPIObject = Record<string, any>;

export interface OpenAPIDocument extends OpenAPIObject {
  openapi?: string;
  swagger?: string;
  info?: OpenAPIObject;
  servers?: ServerObject[];
  tags?: OpenAPIObject[];
  paths?: Record<string, OpenAPIObject>;
  components?: OpenAPIObject;
}

export interface ServerObject extends OpenAPIObject {
  url: string;
  description?: string;
  variables?: Record<string, { default?: string; enum?: string[]; description?: string }>;
}

export type HttpMethod = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace";

export interface ResolvedSchema {
  schema: OpenAPIObject;
  /** Component name when the schema came from a $ref. */
  name?: string;
}

export type SchemaChildren =
  | { kind: "properties" }
  | ({ kind: "items" | "map" } & ResolvedSchema)
  | { kind: "oneOf" | "anyOf"; variants: ResolvedSchema[] }
  | null;

export interface ResponseInfo {
  status: string;
  description: string;
  "x-i18n"?: OpenAPIObject;
  content: Record<string, OpenAPIObject>;
  headers: Record<string, OpenAPIObject>;
}

export interface Operation {
  /** Stable id for links: "operation/<operationId>" or "operation/<method>-<path>". */
  anchor: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  "x-i18n"?: OpenAPIObject;
  operationId?: string;
  deprecated: boolean;
  tags: string[];
  parameters: OpenAPIObject[];
  requestBody: OpenAPIObject | null;
  responses: ResponseInfo[];
  security: OpenAPIObject[];
  servers: ServerObject[];
}

export interface TagGroup {
  name: string;
  anchor: string;
  description: string;
  "x-i18n"?: OpenAPIObject;
  operations: Operation[];
}

export interface SchemaEntry {
  name: string;
  anchor: string;
  schema: OpenAPIObject;
}

export interface ApiModel {
  openapi: string;
  info: OpenAPIObject;
  servers: ServerObject[];
  securitySchemes: Record<string, OpenAPIObject>;
  tags: TagGroup[];
  operations: Operation[];
  schemas: SchemaEntry[];
}

/** Values entered for an operation's parameters, by location. */
export interface ParameterValues {
  path: Record<string, string>;
  query: Record<string, string>;
  header: Record<string, string>;
  cookie: Record<string, string>;
}

/** A concrete HTTP request, as produced by buildRequest(). */
export interface HttpRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface SnippetClient {
  key: string;
  label: string;
  build: (request: HttpRequest) => string;
}

export interface SnippetLanguage {
  key: string;
  label: string;
  /** Tokenizer language for tokenize(). */
  highlight: string;
  clients: SnippetClient[];
}

export interface Token {
  /** Token class ("string", "keyword"…), or null for plain text. */
  type: string | null;
  text: string;
}

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "br" }
  | { type: "code"; value: string }
  | { type: "strong" | "em" | "del"; children: InlineNode[] }
  | { type: "link"; href: string; title?: string; children: InlineNode[] }
  | { type: "image"; src: string; alt: string; title?: string };

export interface ListItem {
  checked: boolean | null;
  children: MarkdownBlock[];
}

export type MarkdownBlock =
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "heading"; level: number; children: InlineNode[] }
  | { type: "code"; language: string; text: string }
  | { type: "blockquote"; children: MarkdownBlock[] }
  | { type: "hr" }
  | { type: "list"; ordered: boolean; start: number | null; loose: boolean; items: ListItem[] }
  | { type: "table"; align: ("left" | "right" | "center" | null)[]; header: InlineNode[][]; rows: InlineNode[][][] }
  | { type: "lang"; locales: string[]; children: MarkdownBlock[] }
  | { type: "lang-selected"; locale: string; children: MarkdownBlock[] };

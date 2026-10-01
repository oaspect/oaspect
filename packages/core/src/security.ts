// Applying security schemes (components.securitySchemes) to requests.
//
// An operation's `security` is a list of alternatives; each alternative is a
// set of schemes that must all be present (OR of ANDs). `{}` makes auth
// optional. Credentials are what the reader entered, per scheme name.

import type { HttpRequest, OpenAPIObject, Operation } from "./types";

export interface Credential {
  /** Bearer / http token, API key or OAuth2 / OpenID Connect access token. */
  token?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  /** Space-separated OAuth2 scopes for token requests. */
  scopes?: string;
}

export type Credentials = Record<string, Credential>;

export interface AuthParts {
  headers: Record<string, string>;
  query: Record<string, string>;
  cookies: Record<string, string>;
}

export interface SecurityRequirement {
  /** Scheme names that must all be present. Empty: auth optional. */
  schemes: string[];
  scopes: Record<string, string[]>;
}

/** The operation's requirements (alternatives), from its own or the global `security`. */
export function securityRequirements(operation: Pick<Operation, "security">): SecurityRequirement[] {
  return (operation.security ?? []).map((requirement) => ({
    schemes: Object.keys(requirement),
    scopes: requirement as Record<string, string[]>,
  }));
}

function base64(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function hasCredential(scheme: OpenAPIObject | undefined, credential: Credential | undefined): boolean {
  if (!scheme || !credential) return false;
  if (scheme.type === "http" && String(scheme.scheme).toLowerCase() === "basic") return Boolean(credential.username || credential.password);
  return Boolean(credential.token);
}

function applyScheme(parts: AuthParts, scheme: OpenAPIObject, credential: Credential) {
  if (scheme.type === "http") {
    const kind = String(scheme.scheme ?? "").toLowerCase();
    if (kind === "basic") parts.headers.Authorization = `Basic ${base64(`${credential.username ?? ""}:${credential.password ?? ""}`)}`;
    else if (kind === "bearer") parts.headers.Authorization = `Bearer ${credential.token}`;
    else parts.headers.Authorization = `${scheme.scheme} ${credential.token}`;
  } else if (scheme.type === "apiKey") {
    const target = scheme.in === "query" ? parts.query : scheme.in === "cookie" ? parts.cookies : parts.headers;
    target[scheme.name] = credential.token ?? "";
  } else if (scheme.type === "oauth2" || scheme.type === "openIdConnect") {
    parts.headers.Authorization = `Bearer ${credential.token}`;
  }
}

/**
 * Headers, query parameters and cookies for an operation: the first
 * requirement whose schemes all have credentials wins. Nothing is applied
 * when no requirement can be met.
 */
export function applySecurity(
  schemes: Record<string, OpenAPIObject>,
  requirements: SecurityRequirement[],
  credentials: Credentials,
): AuthParts {
  const parts: AuthParts = { headers: {}, query: {}, cookies: {} };
  const usable = requirements.find(
    (requirement) => requirement.schemes.length > 0 && requirement.schemes.every((name) => hasCredential(schemes[name], credentials[name])),
  );
  for (const name of usable?.schemes ?? []) applyScheme(parts, schemes[name], credentials[name]);
  return parts;
}

/** Short description of a scheme for labels: "Bearer", "API key (header: X-Key)"… */
export function describeScheme(scheme: OpenAPIObject): string {
  if (scheme.type === "http") {
    const kind = String(scheme.scheme ?? "");
    return kind.toLowerCase() === "bearer" ? `Bearer${scheme.bearerFormat ? ` (${scheme.bearerFormat})` : ""}` : `HTTP ${kind}`;
  }
  if (scheme.type === "apiKey") return `API key (${scheme.in}: ${scheme.name})`;
  if (scheme.type === "oauth2") return `OAuth 2.0 (${Object.keys(scheme.flows ?? {}).join(", ")})`;
  if (scheme.type === "openIdConnect") return "OpenID Connect";
  if (scheme.type === "mutualTLS") return "Mutual TLS";
  return String(scheme.type ?? "");
}

/** OAuth2 flows a viewer can complete itself (no browser redirect). */
export const TOKEN_FLOWS = ["clientCredentials", "password"] as const;

/** Token request (RFC 6749 §4.3 / §4.4) for a clientCredentials or password flow. */
export function buildTokenRequest(flowName: (typeof TOKEN_FLOWS)[number], flow: OpenAPIObject, credential: Credential): HttpRequest {
  const params = new URLSearchParams({ grant_type: flowName === "password" ? "password" : "client_credentials" });
  if (flowName === "password") {
    params.set("username", credential.username ?? "");
    params.set("password", credential.password ?? "");
  }
  if (credential.scopes?.trim()) params.set("scope", credential.scopes.trim());

  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" };
  if (credential.clientId) headers.Authorization = `Basic ${base64(`${credential.clientId}:${credential.clientSecret ?? ""}`)}`;

  return { method: "POST", url: String(flow.tokenUrl ?? ""), headers, body: params.toString() };
}

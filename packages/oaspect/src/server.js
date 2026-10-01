// Server helpers built on Web-standard Request/Response, so the same code
// runs on Node, Next.js route handlers, Hono, Bun, Deno or Cloudflare Workers.

const DROPPED_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
  "accept-encoding",
]);

const json = (body, status = 200) => Response.json(body, { status });

function decodeBase64(data) {
  const binary = atob(String(data ?? ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

// multipart parts from the viewer: { name, value } or
// { name, file: { name, type, data: base64 } }.
export function formDataFromParts(parts) {
  const data = new FormData();
  for (const part of parts) {
    if (part?.file) {
      const blob = new Blob([decodeBase64(part.file.data)], { type: part.file.type || "application/octet-stream" });
      data.append(String(part.name), blob, String(part.file.name || "file"));
    } else {
      data.append(String(part?.name), String(part?.value ?? ""));
    }
  }
  return data;
}

function normalizeHosts(allowedHosts) {
  if (allowedHosts === "*") return "*";
  return (allowedHosts ?? []).map((host) => String(host).trim().toLowerCase()).filter(Boolean);
}

/**
 * Creates a handler that relays the viewer's "Try" requests server-side, so
 * APIs without CORS headers can be called. Mount it at the URL you pass to
 * the viewer as `proxyUrl` (POST).
 *
 * Restrict `allowedHosts` to your API: an open relay lets anyone reach
 * addresses your server can see (internal services, cloud metadata).
 *
 * @param {{
 *   allowedHosts: string[] | "*",
 *   timeoutMs?: number,
 *   rewriteHost?: (url: URL) => URL,
 * }} options
 * @returns {(request: Request) => Promise<Response>}
 */
export function createProxyHandler({ allowedHosts, timeoutMs = 30_000, rewriteHost } = {}) {
  const hosts = normalizeHosts(allowedHosts);
  if (hosts !== "*" && hosts.length === 0) {
    throw new Error('createProxyHandler: allowedHosts must list at least one host (or be "*")');
  }

  const allowed = (target) =>
    hosts === "*" || hosts.includes(target.host.toLowerCase()) || hosts.includes(target.hostname.toLowerCase());

  return async function proxy(request) {
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid request body." }, 400);
    }

    const { method = "GET", url, headers = {}, body, form } = payload ?? {};
    let target;
    try {
      target = new URL(url);
    } catch {
      return json({ error: `Invalid URL: ${url}` }, 400);
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      return json({ error: "Only http and https are supported." }, 400);
    }
    if (!allowed(target)) return json({ error: `${target.host} is not an allowed host.` }, 403);

    if (rewriteHost) target = rewriteHost(new URL(target));

    const upperMethod = String(method).toUpperCase();
    const multipart = Array.isArray(form);
    // For multipart, fetch sets Content-Type itself (with the boundary).
    const forwarded = Object.fromEntries(
      Object.entries(headers).filter(([key]) => !DROPPED_HEADERS.has(key.toLowerCase()) && !(multipart && key.toLowerCase() === "content-type")),
    );
    const started = Date.now();

    try {
      const response = await fetch(target, {
        method: upperMethod,
        headers: forwarded,
        body: upperMethod === "GET" || upperMethod === "HEAD" ? undefined : multipart ? formDataFromParts(form) : body,
        redirect: "manual",
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await response.text();
      return json({
        status: response.status,
        statusText: response.statusText,
        headers: [...response.headers.entries()],
        body: text,
        duration: Date.now() - started,
      });
    } catch (error) {
      const code = error.cause?.code ? ` (${error.cause.code})` : "";
      return json({ error: `Could not reach ${target.origin}: ${error.message}${code}` }, 502);
    }
  };
}

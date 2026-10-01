export interface ProxyHandlerOptions {
  /** Hosts ("api.example.com", "localhost:8080") the proxy may call, or "*" for any. */
  allowedHosts: string[] | "*";
  /** Upstream timeout. Default 30 s. */
  timeoutMs?: number;
  /** Adjusts the target URL before fetching (e.g. map localhost inside Docker). */
  rewriteHost?: (url: URL) => URL;
}

/** POST handler relaying the viewer's "Try" requests; mount it at `proxyUrl`. */
export declare function createProxyHandler(options: ProxyHandlerOptions): (request: Request) => Promise<Response>;

/** Builds FormData from the viewer's multipart parts ({ name, value } or { name, file: { name, type, data } }). */
export declare function formDataFromParts(parts: Array<{ name: string; value?: string; file?: { name?: string; type?: string; data: string } }>): FormData;

export interface SpecHandlerOptions {
  /** Live document URL, fetched server-side and cached. */
  url?: string;
  /** Document text (or a function returning it) used when `url` fails or is not set. */
  fallback?: string | (() => string | Promise<string>);
  /** Cache lifetime for the live document. Default 60. */
  cacheSeconds?: number;
  /** Upstream timeout. Default 10 s. */
  timeoutMs?: number;
  rewriteHost?: (url: URL) => URL;
}

/** GET handler serving the spec; sets x-oaspect-spec-source to remote, fallback or static. */
export declare function createSpecHandler(options: SpecHandlerOptions): (request?: Request) => Promise<Response>;

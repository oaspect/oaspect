// Resolves external $refs ("./schemas/pet.yaml#/Pet", "https://…/common.json#/x")
// by loading each referenced document once and hoisting every target into
// components["x-oaspect-external"], so the rest of the library only ever
// follows local "#/" references.
//
// Inside an external document, its own "#/…" refs point into that document;
// they are hoisted the same way. Cycles across files end on the already
// hoisted key.

import { parseSpec } from "./parse";
import { resolvePointer } from "./refs";
import type { OpenAPIDocument, OpenAPIObject } from "./types";

export const EXTERNAL_KEY = "x-oaspect-external";

export interface ExternalRefOptions {
  /** URL of the document itself; relative refs resolve against it. */
  baseUrl: string;
  /** Loads a referenced document's text (fetch, fs…). */
  read: (url: string) => Promise<string>;
  /** Upper bound on loaded documents. Default 100. */
  maxDocuments?: number;
}

const isExternal = (ref: string) => !ref.startsWith("#");

/** True when the document contains a $ref to another file or URL. */
export function hasExternalRefs(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some(hasExternalRefs);
  const ref = (node as OpenAPIObject).$ref;
  if (typeof ref === "string" && isExternal(ref)) return true;
  return Object.values(node).some(hasExternalRefs);
}

export async function resolveExternalRefs(doc: OpenAPIDocument, { baseUrl, read, maxDocuments = 100 }: ExternalRefOptions): Promise<OpenAPIDocument> {
  if (!hasExternalRefs(doc)) return doc;

  const documents = new Map<string, Promise<unknown>>();
  const hoisted = new Map<string, string>();
  const store: Record<string, unknown> = {};
  const usedKeys = new Set<string>();

  function load(url: string) {
    if (!documents.has(url)) {
      if (documents.size >= maxDocuments) throw new Error(`More than ${maxDocuments} external documents referenced`);
      documents.set(url, read(url).then((text) => parseSpec(text)));
    }
    return documents.get(url)!;
  }

  function keyFor(url: string, pointer: string) {
    const segment = pointer.split("/").filter(Boolean).pop() ?? url.split("/").pop()!.replace(/\.(ya?ml|json)$/i, "");
    const base = decodeURIComponent(segment.replace(/~1/g, "/").replace(/~0/g, "~")).replace(/[^\w.-]/g, "_") || "external";
    let key = base;
    for (let index = 2; usedKeys.has(key); index += 1) key = `${base}_${index}`;
    usedKeys.add(key);
    return key;
  }

  async function hoist(url: string, pointer: string): Promise<string> {
    const id = `${url}#${pointer}`;
    const existing = hoisted.get(id);
    if (existing) return existing;
    const key = keyFor(url, pointer);
    hoisted.set(id, key); // before walking, so cycles end here

    const target = pointer ? resolvePointer((await load(url)) as OpenAPIObject, `#${pointer}`) : await load(url);
    if (target === undefined) throw new Error(`${id} not found`);
    store[key] = await walk(target, url, false);
    return key;
  }

  async function walk(node: unknown, base: string, isRoot: boolean): Promise<unknown> {
    if (!node || typeof node !== "object") return node;
    if (Array.isArray(node)) return Promise.all(node.map((item) => walk(item, base, isRoot)));

    const object = node as OpenAPIObject;
    if (typeof object.$ref === "string" && (isExternal(object.$ref) || !isRoot)) {
      const [file, pointer = ""] = object.$ref.split("#");
      const url = file ? new URL(file, base).href : base;
      const key = await hoist(url, pointer.startsWith("/") ? pointer : pointer ? `/${pointer}` : "");
      const { $ref: _ref, ...siblings } = object;
      return { ...((await walk(siblings, base, isRoot)) as OpenAPIObject), $ref: `#/components/${EXTERNAL_KEY}/${key}` };
    }

    const result: OpenAPIObject = {};
    for (const [key, value] of Object.entries(object)) result[key] = await walk(value, base, isRoot);
    return result;
  }

  const resolved = (await walk(doc, baseUrl, true)) as OpenAPIDocument;
  resolved.components = { ...resolved.components, [EXTERNAL_KEY]: store };
  return resolved;
}

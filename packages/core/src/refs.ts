import type { OpenAPIObject } from "./types";

// JSON Pointer helpers for local "$ref"s ("#/components/schemas/Foo").

export function resolvePointer(spec: OpenAPIObject, ref: unknown): any {
  if (typeof ref !== "string" || !ref.startsWith("#/")) return undefined;

  return ref
    .slice(2)
    .split("/")
    .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    .reduce((node, key) => node?.[key], spec);
}

export function refName(ref: string): string {
  return ref.split("/").pop() ?? ref;
}

// Follows a (possibly chained) $ref and returns the target plus the last ref seen.
export function deref(spec: OpenAPIObject, node: any): { node: OpenAPIObject; ref?: string } {
  let ref: string | undefined;
  let hops = 0;

  while (node?.$ref && hops++ < 32) {
    ref = node.$ref;
    node = resolvePointer(spec, ref);
  }

  return { node: node ?? {}, ref };
}

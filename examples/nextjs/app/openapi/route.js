import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createSpecHandler } from "oaspect/server";

// Live document from SPEC_URL when set, else public/openapi.json.
export const GET = createSpecHandler({
  url: process.env.SPEC_URL,
  fallback: () => readFile(join(process.cwd(), "public/openapi.json"), "utf8"),
});

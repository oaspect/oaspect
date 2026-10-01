import assert from "node:assert/strict";
import { execFile, execFileSync, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, test } from "vitest";
import { SNIPPET_LANGUAGES, buildRequest, defaultBody, defaultForm, isMultipart, type HttpRequest } from "../src/index";

const spec = {
  components: { schemas: { Upload: { type: "object", properties: { caption: { type: "string", example: "hi" }, tags: { type: "array", items: { type: "string" }, example: ["a", "b"] }, photo: { type: "string", format: "binary" }, pages: { type: "array", items: { type: "string", format: "binary" } } } } } },
};
const media = { schema: { $ref: "#/components/schemas/Upload" }, encoding: { photo: { contentType: "image/png" } } };
const operation = { method: "post", path: "/upload", requestBody: { content: { "multipart/form-data": media } } } as any;

describe("multipart requests", () => {
  test("form parts come from the schema: files for binary, text otherwise", () => {
    assert.deepEqual(defaultForm(spec, media), [
      { name: "caption", value: "hi" },
      { name: "tags", value: "a" },
      { name: "tags", value: "b" },
      { name: "photo", file: { name: "photo.bin", type: "image/png" } },
      { name: "pages", file: { name: "pages.bin", type: undefined } },
    ]);
    assert.equal(defaultBody(spec, operation).form?.length, 5);
    assert.ok(isMultipart("multipart/form-data; boundary=x"));
  });

  test("buildRequest carries the parts and leaves Content-Type to the client", () => {
    const { form, contentType } = defaultBody(spec, operation);
    const request = buildRequest(operation, { values: {}, form, contentType, headers: { Authorization: "Bearer t" } });
    assert.equal(request.body, undefined);
    assert.equal(request.form?.length, 5);
    assert.deepEqual(request.headers, { Authorization: "Bearer t" });
  });

  test("every client builds multipart code (or a note pointing elsewhere)", () => {
    const request = buildRequest(operation, { values: {}, ...defaultBody(spec, operation) });
    for (const language of SNIPPET_LANGUAGES) {
      for (const client of language.clients) {
        const code = client.build(request);
        assert.ok(code.length > 0, `${language.key}:${client.key}`);
        assert.ok(!/"caption": "hi",\s*\n/.test(code), `${language.key}:${client.key} must not send the JSON body`);
      }
    }
  });

  test("repeated text fields stay repeated in clients that key by name", () => {
    const request = buildRequest(operation, { values: {}, ...defaultBody(spec, operation) });
    const build = (language: string, client: string) =>
      SNIPPET_LANGUAGES.find((item) => item.key === language)!.clients.find((item) => item.key === client)!.build(request);
    assert.match(build("python", "httpx"), /data = \{"caption": "hi", "tags": \["a", "b"\]\}/);
    assert.match(build("powershell", "restmethod"), /'tags' = @\('a', 'b'\)/);
    assert.equal(build("powershell", "restmethod").match(/'tags'/g)?.length, 1);
    assert.match(build("dart", "http"), /MultipartFile\.fromString\('tags', 'a'\)/);
  });

  test("JavaScript and Node multipart samples parse", () => {
    const dir = mkdtempSync(join(tmpdir(), "oaspect-mp-"));
    const request = buildRequest(operation, { values: {}, ...defaultBody(spec, operation) });
    for (const language of SNIPPET_LANGUAGES.filter((item) => ["javascript", "node"].includes(item.key))) {
      for (const client of language.clients) {
        if (client.key === "jquery" || client.key === "http") continue;
        const file = join(dir, `${language.key}-${client.key}.mjs`);
        writeFileSync(file, client.build(request));
        execFileSync(process.execPath, ["--check", file]);
      }
    }
  });
});

describe("multipart round trip (cURL)", () => {
  const hasCurl = spawnSync("sh", ["-c", "command -v curl && command -v bash"]).status === 0;
  let server: Server;
  let url = "";

  beforeAll(async () => {
    server = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const form = await new Request("http://x", { method: "POST", headers: req.headers as Record<string, string>, body: Buffer.concat(chunks) }).formData();
      const photo = form.get("photo") as File;
      res.end(JSON.stringify({ caption: form.get("caption"), tags: form.getAll("tags"), photo: await photo.text(), photoName: photo.name }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${(server.address() as { port: number }).port}/upload`;
  });

  afterAll(() => server?.close());

  // Async: the test server runs in this process, so a blocking exec would deadlock it.
  test.skipIf(!hasCurl)("special characters in text parts and file contents arrive intact", async () => {
    const dir = mkdtempSync(join(tmpdir(), "oaspect-curl-"));
    writeFileSync(join(dir, "photo.bin"), "file contents");
    const request: HttpRequest = {
      method: "POST",
      url,
      headers: {},
      form: [{ name: "caption", value: `@not-a-file <not-a-file 'quote' "dq" $HOME` }, { name: "tags", value: "a" }, { name: "tags", value: "b" }, { name: "photo", file: { name: "photo.bin" } }],
    };
    const curl = SNIPPET_LANGUAGES.find((item) => item.key === "shell")!.clients.find((item) => item.key === "curl")!;
    const { stdout: output } = await promisify(execFile)("bash", ["-c", `${curl.build(request)} --silent --max-time 10`], { cwd: dir, encoding: "utf8" });
    assert.deepEqual(JSON.parse(output), { caption: `@not-a-file <not-a-file 'quote' "dq" $HOME`, tags: ["a", "b"], photo: "file contents", photoName: "photo.bin" });
  });
});

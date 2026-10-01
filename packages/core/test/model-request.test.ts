import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildModel, buildRequest, defaultBody, defaultValues, serverUrl, slugify } from "../src/index";

const spec = {
  openapi: "3.1.0",
  info: { title: "T", version: "1" },
  servers: [{ url: "https://{env}.example.com/v1/", variables: { env: { default: "api" } } }],
  tags: [{ name: "Second" }, { name: "First", description: "first tag" }, { name: "Unused" }],
  paths: {
    "/items/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "integer", example: 7 } },
        { name: "trace", in: "header", schema: { type: "string" } },
      ],
      patch: {
        tags: ["First"],
        operationId: "items.update",
        parameters: [
          { name: "trace", in: "header", description: "override", schema: { type: "string" } },
          { $ref: "#/components/parameters/Filter" },
          { name: "session", in: "cookie", schema: { type: "string" } },
        ],
        requestBody: { $ref: "#/components/requestBodies/Item" },
        responses: { 200: { $ref: "#/components/responses/Ok" } },
      },
    },
    "/health": { get: { summary: "Health", responses: { 204: { description: "empty" } } } },
    "/a/b": { get: { tags: ["Second"], responses: {} } },
  },
  components: {
    parameters: { Filter: { name: "filter[status]", in: "query", required: true, schema: { type: "string", enum: ["on", "off"] } } },
    requestBodies: { Item: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" } } } } } } },
    responses: { Ok: { description: "fine", headers: { "X-Rate": { schema: { type: "integer" } } }, content: {} } },
    schemas: { A: { type: "string" } },
  },
};

describe("buildModel", () => {
  const model = buildModel(spec);

  test("keeps spec tag order, drops empty tags, adds Default for untagged", () => {
    assert.deepEqual(model.tags.map((tag) => tag.name), ["Second", "First", "Default"]);
    assert.equal(model.tags[1].description, "first tag");
  });

  test("resolves $ref'd parameters, bodies and responses; op params override path params", () => {
    const op = model.tags[1].operations[0];
    assert.equal(op.anchor, "operation/items-update");
    const trace = op.parameters.filter((param) => param.name === "trace");
    assert.equal(trace.length, 1);
    assert.equal(trace[0].description, "override");
    assert.ok(op.parameters.some((param) => param.name === "filter[status]"));
    assert.equal(op.requestBody.required, true);
    assert.equal(op.responses[0].description, "fine");
    assert.equal(op.responses[0].headers["X-Rate"].schema.type, "integer");
  });

  test("anchors fall back to method + path", () => {
    assert.equal(model.tags[2].operations[0].anchor, "operation/get-health");
    assert.equal(slugify("/items/{id}"), "items-id");
  });

  test("server variables use their defaults", () => {
    assert.equal(serverUrl(model.servers[0]), "https://api.example.com/v1/");
  });

  test("a realistic document builds with unique anchors", () => {
    const real = JSON.parse(readFileSync(new URL("./fixtures/bookstore.json", import.meta.url), "utf8"));
    const realModel = buildModel(real);
    assert.ok(realModel.operations.length > 0);
    assert.equal(new Set(realModel.operations.map((op) => op.anchor)).size, realModel.operations.length);
  });
});

describe("requests", () => {
  const op = buildModel(spec).tags[1].operations[0];

  test("defaults: path params get examples, required query uses enum, optional stay empty", () => {
    const values = defaultValues(spec, op);
    assert.equal(values.path.id, "7");
    assert.equal(values.query["filter[status]"], "on");
    assert.equal(values.header.trace, "");
    assert.deepEqual(defaultBody(spec, op), { contentType: "application/json", body: '{\n  "name": "string"\n}' });
  });

  test("buildRequest encodes path, keeps brackets in query, adds cookies and content type", () => {
    const request = buildRequest(op, {
      server: spec.servers[0],
      values: { path: { id: "a/b" }, query: { "filter[status]": "on", empty: "" }, header: { trace: "t1" }, cookie: { session: "s" } },
      body: "{}",
      contentType: "application/json",
      headers: { Authorization: "Bearer x" },
    });
    assert.equal(request.method, "PATCH");
    assert.equal(request.url, "https://api.example.com/v1/items/a%2Fb?filter[status]=on");
    assert.deepEqual(request.headers, { Authorization: "Bearer x", trace: "t1", Cookie: "session=s", "Content-Type": "application/json" });
    assert.equal(request.body, "{}");
  });

  test("GET never carries a body", () => {
    const get = { ...op, method: "get" };
    const request = buildRequest(get, { server: { url: "" }, values: {}, body: "{}", contentType: "application/json" });
    assert.equal(request.body, undefined);
    assert.equal(request.headers["Content-Type"], undefined);
  });
});

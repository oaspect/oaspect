import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildModel, convertSwagger2, isOpenApiDocument, loadSpecText, normalizeSpec, parseSpec, resolveSchema } from "../src/index";

const yaml = readFileSync(new URL("./fixtures/petstore-swagger2.yaml", import.meta.url), "utf8");
const doc = loadSpecText(yaml);
const op = (path: string, method: string) => doc.paths![path][method];

describe("parseSpec", () => {
  test("reads JSON and YAML", () => {
    assert.deepEqual(parseSpec('{"openapi":"3.0.0"}'), { openapi: "3.0.0" });
    assert.equal((parseSpec(yaml) as any).swagger, "2.0");
  });

  test("reports readable errors", () => {
    assert.throws(() => parseSpec("{ nope"), /Invalid JSON/);
    assert.throws(() => parseSpec("a: [unclosed"), /Invalid YAML/);
    assert.throws(() => loadSpecText("title: just yaml"), /Not an OpenAPI document/);
  });

  test("OpenAPI 3 documents pass through untouched", () => {
    const v3 = { openapi: "3.1.0", info: { title: "x", version: "1" }, paths: {} };
    assert.equal(normalizeSpec(v3), v3);
    assert.ok(isOpenApiDocument(v3));
    assert.ok(!isOpenApiDocument({ info: {} }));
  });
});

describe("convertSwagger2", () => {
  test("servers from schemes, host and basePath", () => {
    assert.equal(doc.openapi, "3.0.3");
    assert.deepEqual(doc.servers, [{ url: "https://petstore.example.com/v2" }, { url: "http://petstore.example.com/v2" }]);
    assert.deepEqual(convertSwagger2({ swagger: "2.0", paths: {} }).servers, [{ url: "/" }]);
  });

  test("definitions → components.schemas with rewritten refs, x-nullable and discriminator", () => {
    const pet = doc.components!.schemas.Pet;
    assert.equal(pet.properties.owner.$ref, "#/components/schemas/Owner");
    assert.equal(pet.properties.nickname.nullable, true);
    assert.equal(pet.properties.nickname["x-nullable"], undefined);
    assert.deepEqual(pet.discriminator, { propertyName: "kind" });
  });

  test("global parameters, body parameters and responses", () => {
    assert.deepEqual(doc.components!.parameters.limit, { name: "limit", in: "query", schema: { type: "integer", format: "int32", minimum: 1, default: 20 } });
    assert.deepEqual(doc.components!.requestBodies.petBody, {
      content: { "application/json": { schema: { $ref: "#/components/schemas/Pet" } } },
      required: true,
    });
    assert.equal(op("/pets", "post").requestBody.$ref, "#/components/requestBodies/petBody");
    assert.equal(op("/pets/{petId}", "get").responses["404"].$ref, "#/components/responses/NotFound");
    assert.equal(doc.components!.responses.NotFound.content["application/json"].schema.$ref, "#/components/schemas/Error");
  });

  test("query arrays keep their serialization; x-example becomes example", () => {
    const tags = op("/pets", "get").parameters.find((parameter: any) => parameter.name === "tags");
    assert.deepEqual(tags, { name: "tags", in: "query", schema: { type: "array", items: { type: "string" } }, example: ["cat"], style: "form", explode: true });
    assert.equal(op("/pets", "get").parameters[0].$ref, "#/components/parameters/limit");
  });

  test("responses get content per produces type, headers and examples", () => {
    const ok = op("/pets", "get").responses["200"];
    assert.deepEqual(ok.headers["X-Total"], { description: "Total count", schema: { type: "integer" } });
    assert.equal(ok.content["application/json"].schema.items.$ref, "#/components/schemas/Pet");
    assert.deepEqual(ok.content["application/json"].example, [{ id: 1, name: "Rex" }]);
    assert.equal(op("/pets/{petId}", "put").responses["200"].content, undefined);
  });

  test("inline body parameters become requestBody; path-level params stay on the path", () => {
    assert.deepEqual(op("/pets/{petId}", "put").requestBody, { content: { "application/json": { schema: { $ref: "#/components/schemas/Pet" } } } });
    assert.equal(op("/pets/{petId}", "put").parameters[0].name, "petId");
  });

  test("formData parameters become a multipart body with a binary file", () => {
    const body = op("/pets/{petId}/photo", "post").requestBody;
    const schema = body.content["multipart/form-data"].schema;
    assert.deepEqual(schema.properties.file, { type: "string", format: "binary", description: "Photo" });
    assert.deepEqual(schema.required, ["file"]);
    assert.deepEqual(op("/pets/{petId}/photo", "post").parameters.map((parameter: any) => parameter.name), ["petId"]);
  });

  test("security definitions → securitySchemes", () => {
    const schemes = doc.components!.securitySchemes;
    assert.deepEqual(schemes.basic, { type: "http", scheme: "basic" });
    assert.deepEqual(schemes.api_key, { type: "apiKey", name: "api_key", in: "header" });
    assert.equal(schemes.petstore_auth.flows.implicit.authorizationUrl, "https://petstore.example.com/oauth/authorize");
    assert.deepEqual(op("/pets", "post").security, [{ petstore_auth: ["write:pets"] }]);
  });

  test("the converted document renders like any OpenAPI 3 document", () => {
    const model = buildModel(doc);
    assert.deepEqual(model.tags.map((tag) => tag.name), ["pets"]);
    assert.equal(model.operations.length, 5);
    const create = model.operations.find((operation) => operation.operationId === "createPet")!;
    assert.equal(create.requestBody?.content["application/json"].schema.$ref, "#/components/schemas/Pet");
    assert.equal(resolveSchema(doc, { $ref: "#/components/schemas/Pet" }).name, "Pet");
  });
});

describe("form bodies", async () => {
  const { defaultBody, formEncode } = await import("../src/index");

  test("urlencoded examples are form-encoded, not JSON", () => {
    expect(formEncode({ a: 1, tags: ["x", "y"], skip: null, nested: { b: 2 } })).toBe("a=1&tags=x&tags=y&nested=%7B%22b%22%3A2%7D");
    const operation = {
      requestBody: { content: { "application/x-www-form-urlencoded": { schema: { type: "object", properties: { name: { type: "string" }, age: { type: "integer" } } } } } },
    } as any;
    expect(defaultBody({}, operation)).toEqual({ contentType: "application/x-www-form-urlencoded", body: "name=string&age=0" });
  });
});

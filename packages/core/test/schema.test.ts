import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { childrenOf, constraintsOf, deref, inferType, refName, resolvePointer, resolveSchema, typeLabel } from "../src/index";

const spec = {
  components: {
    schemas: {
      Date: { type: "string", pattern: "^\\d{4}$", example: "2026" },
      Alias: { $ref: "#/components/schemas/Date" },
      Base: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
      Named: { type: "object", required: ["name"], properties: { name: { type: "string" } } },
      Merged: { allOf: [{ $ref: "#/components/schemas/Base" }, { $ref: "#/components/schemas/Named" }], description: "both" },
      List: { type: "array", items: { $ref: "#/components/schemas/Base" } },
      Choice: { oneOf: [{ $ref: "#/components/schemas/Base" }, { type: "string" }] },
    },
    "a/b": { "c~d": 1 },
  },
};

describe("refs", () => {
  test("resolves pointers including ~0 / ~1 escapes", () => {
    assert.equal(resolvePointer(spec, "#/components/a~1b/c~0d"), 1);
    assert.equal(resolvePointer(spec, "#/missing/path"), undefined);
    assert.equal(resolvePointer(spec, "external.json#/x"), undefined);
  });

  test("follows chained refs and reports the last ref", () => {
    const { node, ref } = deref(spec, { $ref: "#/components/schemas/Alias" });
    assert.equal(node.type, "string");
    assert.equal(ref, "#/components/schemas/Date");
    assert.equal(refName(ref), "Date");
  });

  test("returns an empty node for unresolvable refs", () => {
    assert.deepEqual(deref(spec, { $ref: "#/nope" }).node, {});
  });
});

describe("schema", () => {
  test("allOf merges properties and required, siblings win", () => {
    const { schema } = resolveSchema(spec, { $ref: "#/components/schemas/Merged" });
    assert.deepEqual(Object.keys(schema.properties), ["id", "name"]);
    assert.deepEqual(schema.required, ["id", "name"]);
    assert.equal(schema.description, "both");
    assert.equal(schema.allOf, undefined);
  });

  test("single-ref allOf wrapper keeps the component name and nullable flag", () => {
    const { schema, name } = resolveSchema(spec, { allOf: [{ $ref: "#/components/schemas/Date" }], nullable: true });
    assert.equal(name, "Date");
    assert.equal(schema.nullable, true);
    assert.equal(schema.pattern, "^\\d{4}$");
  });

  test("type labels", () => {
    assert.equal(typeLabel(spec, spec.components.schemas.List), "array<Base>");
    assert.equal(typeLabel(spec, { type: "string", format: "email" }), "string<email>");
    assert.equal(typeLabel(spec, { type: "object", properties: {} }, "Base"), "Base");
    assert.equal(inferType({ properties: { a: {} } }), "object");
    assert.equal(inferType({ type: ["string", "null"] }), "string | null");
  });

  test("constraints cover 3.0 and 3.1 bounds", () => {
    assert.deepEqual(constraintsOf({ minLength: 1, maxLength: 5 }), ["min length 1", "max length 5"]);
    assert.deepEqual(constraintsOf({ minimum: 1, exclusiveMinimum: true }), ["> 1"]);
    assert.deepEqual(constraintsOf({ exclusiveMaximum: 10 }), ["< 10"]);
    assert.deepEqual(constraintsOf({ uniqueItems: true }), ["unique items"]);
  });

  test("childrenOf picks the right nested view", () => {
    assert.equal(childrenOf(spec, { type: "string" }), null);
    assert.equal(childrenOf(spec, spec.components.schemas.Base).kind, "properties");
    const items = childrenOf(spec, spec.components.schemas.List);
    assert.equal(items.kind, "items");
    assert.equal(items.name, "Base");
    const choice = childrenOf(spec, spec.components.schemas.Choice);
    assert.equal(choice.kind, "oneOf");
    assert.deepEqual(choice.variants.map((variant) => variant.name ?? variant.schema.type), ["Base", "string"]);
    assert.equal(childrenOf(spec, { type: "array", items: { type: "string" } }), null);
  });
});

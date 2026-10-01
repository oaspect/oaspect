import { test } from "vitest";
import assert from "node:assert/strict";
import { exampleFromSchema, mediaExample, mediaExamples } from "../src/index";

const spec = {
  components: {
    schemas: {
      Node: { type: "object", properties: { id: { type: "integer" }, parent: { $ref: "#/components/schemas/Node" } } },
      Secret: { type: "object", properties: { user: { type: "string" }, password: { type: "string", writeOnly: true } } },
    },
    examples: { Shared: { summary: "Shared one", value: { from: "ref" } } },
  },
};

test("explicit values win: example > default > enum", () => {
  assert.equal(exampleFromSchema(spec, { type: "string", example: "x", default: "y", enum: ["z"] }), "x");
  assert.equal(exampleFromSchema(spec, { type: "string", default: "y", enum: ["z"] }), "y");
  assert.equal(exampleFromSchema(spec, { type: "string", enum: ["z"] }), "z");
});

test("placeholders per type and format", () => {
  assert.equal(exampleFromSchema(spec, { type: "string", format: "email" }), "user@example.com");
  assert.equal(exampleFromSchema(spec, { type: "integer", minimum: 5 }), 5);
  assert.equal(exampleFromSchema(spec, { type: "boolean" }), true);
  assert.deepEqual(exampleFromSchema(spec, { type: "array", items: { type: "number" } }), [0]);
  assert.deepEqual(exampleFromSchema(spec, { type: "object", additionalProperties: { type: "string" } }), { key: "string" });
});

test("circular schemas terminate", () => {
  assert.deepEqual(exampleFromSchema(spec, { $ref: "#/components/schemas/Node" }), { id: 0, parent: {} });
});

test("writeOnly properties are left out of examples", () => {
  assert.deepEqual(exampleFromSchema(spec, { $ref: "#/components/schemas/Secret" }), { user: "string" });
});

test("oneOf uses the first variant", () => {
  assert.equal(exampleFromSchema(spec, { oneOf: [{ type: "integer" }, { type: "string" }] }), 0);
});

test("media examples: example, then examples (with $ref), then schema", () => {
  assert.deepEqual(mediaExample(spec, { example: { a: 1 }, schema: { type: "string" } }), { a: 1 });
  const media = { examples: { first: { $ref: "#/components/examples/Shared" }, second: { value: 2 } } };
  assert.deepEqual(mediaExample(spec, media), { from: "ref" });
  assert.deepEqual(mediaExamples(spec, media), [
    { key: "first", summary: "Shared one", value: { from: "ref" } },
    { key: "second", summary: "second", value: 2 },
  ]);
  assert.equal(mediaExample(spec, { schema: { type: "integer" } }), 0);
  assert.equal(mediaExample(spec, undefined), undefined);
});

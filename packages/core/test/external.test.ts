import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, test } from "vitest";
import { EXTERNAL_KEY, buildModel, exampleFromSchema, hasExternalRefs, loadSpec, resolveSchema, typeLabel } from "../src/index";

const mainUrl = new URL("./fixtures/split/main.yaml", import.meta.url);
const reads: string[] = [];
const read = async (url: string) => {
  reads.push(url);
  return readFile(fileURLToPath(url), "utf8");
};

describe("external $refs", async () => {
  const doc = await loadSpec(await readFile(mainUrl, "utf8"), { baseUrl: pathToFileURL(fileURLToPath(mainUrl)).href, read });
  const store = doc.components![EXTERNAL_KEY];

  test("every external target is hoisted once and refs point at it", () => {
    assert.deepEqual(Object.keys(store).sort(), ["Limit", "Pet", "Tag", "owner"]);
    assert.equal(doc.paths!["/pets"].get.parameters[0].$ref, `#/components/${EXTERNAL_KEY}/Limit`);
    assert.equal(new Set(reads).size, reads.length, "each document is read once");
    assert.ok(!hasExternalRefs(doc));
    assert.equal(doc.components!.schemas.Local.type, "string");
  });

  test("refs inside external documents resolve against that document, cycles included", () => {
    assert.equal(store.Pet.properties.tag.$ref, `#/components/${EXTERNAL_KEY}/Tag`);
    assert.equal(store.Pet.properties.owner.$ref, `#/components/${EXTERNAL_KEY}/owner`);
    assert.equal(store.owner.properties.pets.items.$ref, `#/components/${EXTERNAL_KEY}/Pet`);
  });

  test("the result renders: names, labels and examples work through the hoisted refs", () => {
    const model = buildModel(doc);
    const schema = model.operations[0].responses[0].content["application/json"].schema;
    assert.equal(typeLabel(doc, schema), "array<Pet>");
    assert.equal(resolveSchema(doc, store.Pet.properties.tag).name, "Tag");
    assert.deepEqual(exampleFromSchema(doc, schema), [{ name: "string", tag: "cat", owner: { name: "string", pets: [{}] } }]);
    assert.equal(model.operations[0].parameters[0].name, "limit");
  });

  test("without a reader, documents load unchanged", async () => {
    const plain = await loadSpec(await readFile(mainUrl, "utf8"));
    assert.ok(hasExternalRefs(plain));
  });

  test("missing targets and too many documents fail clearly", async () => {
    const broken = '{"openapi":"3.0.0","paths":{},"components":{"schemas":{"A":{"$ref":"./missing.json"}}}}';
    await assert.rejects(loadSpec(broken, { baseUrl: "https://x.test/api.json", read: async () => { throw new Error("404"); } }), /404/);
    const deep = '{"openapi":"3.0.0","paths":{},"components":{"schemas":{"A":{"$ref":"./a.json"}}}}';
    let n = 0;
    await assert.rejects(
      loadSpec(deep, { baseUrl: "https://x.test/api.json", maxDocuments: 3, read: async () => `{"$ref":"./${++n}.json"}` }),
      /More than 3 external documents/,
    );
  });
});

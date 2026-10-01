import { test } from "vitest";
import assert from "node:assert/strict";
import { buildModel, localize } from "../src/index";

const node = {
  summary: "List users",
  description: "All users.",
  "x-i18n": { tr: { summary: "Kullanıcıları listele" }, "pt_BR": { summary: "Listar usuários" } },
};

test("uses the locale's translation, else the authored field", () => {
  assert.equal(localize(node, "summary", "tr"), "Kullanıcıları listele");
  assert.equal(localize(node, "description", "tr"), "All users.");
  assert.equal(localize(node, "summary", "en"), "List users");
  assert.equal(localize(node, "summary", "pt-br"), "Listar usuários");
  assert.equal(localize({ summary: "x" }, "summary", "tr"), "x");
  assert.equal(localize(undefined, "summary", "tr"), undefined);
});

test("region locales fall back to the base language", () => {
  assert.equal(localize({ name: "A", "x-i18n": { tr: { name: "B" } } }, "name", "tr-TR"), "B");
});

test("the model keeps x-i18n on tags, operations and responses", () => {
  const model = buildModel({
    openapi: "3.0.0",
    tags: [{ name: "Users", "x-i18n": { tr: { name: "Kullanıcılar" } } }],
    paths: {
      "/users": {
        get: {
          tags: ["Users"],
          summary: "List users",
          "x-i18n": { tr: { summary: "Kullanıcıları listele" } },
          responses: { 200: { description: "OK", "x-i18n": { tr: { description: "Tamam" } } } },
        },
      },
    },
  });
  const [tag] = model.tags;
  assert.equal(localize(tag, "name", "tr"), "Kullanıcılar");
  assert.equal(tag.name, "Users");
  assert.equal(localize(tag.operations[0], "summary", "tr"), "Kullanıcıları listele");
  assert.equal(localize(tag.operations[0].responses[0], "description", "tr"), "Tamam");
});

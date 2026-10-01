import { test } from "vitest";
import assert from "node:assert/strict";
import { tokenize } from "../src/index";

const typed = (code, language) => tokenize(code, language).filter((token) => token.type).map((token) => `${token.type}:${token.text}`);

test("tokens always reassemble the original text", () => {
  const code = 'const a = { "k": [1, true, null] }; // done';
  for (const language of ["json", "javascript", "shell", "php", "python", "go", "rust", "http", "unknown"]) {
    assert.equal(tokenize(code, language).map((token) => token.text).join(""), code, language);
  }
});

test("json keys vs string values", () => {
  assert.deepEqual(typed('{"a": "b", "n": -1.5e3, "x": null}', "json"), ['key:"a"', 'string:"b"', 'key:"n"', "number:-1.5e3", 'key:"x"', "literal:null"]);
});

test("shell single quotes have no escapes ('\\'' closes and reopens)", () => {
  assert.deepEqual(typed("curl --data 'O'\\''Brien'", "shell"), ["keyword:curl", "attr:--data", "string:'O'", "string:\\'", "string:'Brien'"]);
});

test("language specifics", () => {
  assert.ok(typed("$curl = curl_init();", "php").includes("variable:$curl"));
  assert.ok(typed("import requests\nprint(x)", "python").includes("keyword:import"));
  assert.ok(typed('let body = r#"{"a": 1}"#;', "rust").includes('string:r#"{"a": 1}"#'));
  assert.ok(typed("PATCH /a HTTP/1.1\nHost: x", "http").includes("keyword:PATCH"));
  assert.ok(typed("PATCH /a HTTP/1.1\nHost: x", "http").includes("key:Host"));
});

test("identifiers are never split mid-word", () => {
  assert.deepEqual(typed("constant", "javascript"), []);
});

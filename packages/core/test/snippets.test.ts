import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SNIPPET_LANGUAGES, resolveSnippet, tokenize } from "../src/index";

// Deliberately hostile body: every quoting style's special characters.
const BODY = JSON.stringify({ name: "O'Brien \"x\" $HOME \\ `tick`", n: 1.5, ok: true, none: null, list: [1, { a: "b" }], empty: {} }, null, 2);
const REQUESTS = {
  withBody: { method: "PATCH", url: "https://api.example.com/items/12?a=1", headers: { Authorization: "Bearer t'o$k", "Content-Type": "application/json" }, body: BODY },
  withoutBody: { method: "GET", url: "http://localhost:8101/ping", headers: {}, body: undefined },
};
const clients = SNIPPET_LANGUAGES.flatMap((language) => language.clients.map((client) => ({ language, client })));
const hasCommand = (command) => spawnSync("sh", ["-c", `command -v ${command}`]).status === 0;
const scratch = mkdtempSync(join(tmpdir(), "pv-docs-snippets-"));

describe("snippets", () => {
  test("every client builds for requests with and without a body", () => {
    for (const { language, client } of clients) {
      for (const [name, request] of Object.entries(REQUESTS)) {
        const code = client.build(request);
        assert.equal(typeof code, "string", `${language.key}:${client.key} ${name}`);
        assert.ok(code.includes(request.method) || code.includes(request.method.toLowerCase()) || /Patch|Get/.test(code), `${language.key}:${client.key} mentions method`);
        assert.ok(tokenize(code, language.highlight).length > 0);
      }
    }
  });

  test("resolveSnippet falls back to the first language/client", () => {
    assert.equal(resolveSnippet("python:httpx").selection, "python:httpx");
    assert.equal(resolveSnippet("python:nope").selection, "python:requests");
    assert.equal(resolveSnippet("curl").selection, "shell:curl");
  });

  test("JavaScript and Node snippets parse", () => {
    for (const { language, client } of clients.filter(({ language }) => ["javascript", "node"].includes(language.key))) {
      if (client.key === "jquery") continue; // relies on a global $
      const file = join(scratch, `${language.key}-${client.key}.mjs`);
      writeFileSync(file, client.build(REQUESTS.withBody));
      execFileSync(process.execPath, ["--check", file]);
    }
  });

  test("shell snippets parse and the curl body survives quoting", { skip: !hasCommand("bash") }, () => {
    for (const client of SNIPPET_LANGUAGES.find((language) => language.key === "shell").clients) {
      const file = join(scratch, `${client.key}.sh`);
      writeFileSync(file, client.build(REQUESTS.withBody));
      execFileSync("bash", ["-n", file]);
    }
    // Replace curl with a stub that prints its --data argument.
    const curl = SNIPPET_LANGUAGES[0].clients[0].build(REQUESTS.withBody);
    const script = `curl() { while [ $# -gt 0 ]; do [ "$1" = --data ] && printf '%s' "$2"; shift; done; }\n${curl}`;
    const printed = execFileSync("bash", ["-c", script]).toString();
    assert.deepEqual(JSON.parse(printed), JSON.parse(BODY));
  });

  test("PHP snippets lint", { skip: !hasCommand("php") }, () => {
    for (const client of SNIPPET_LANGUAGES.find((language) => language.key === "php").clients) {
      const file = join(scratch, `${client.key}.php`);
      writeFileSync(file, client.build(REQUESTS.withBody));
      execFileSync("php", ["-l", file], { stdio: "pipe" });
    }
  });

  test("Python snippets compile", { skip: !hasCommand("python3") }, () => {
    for (const client of SNIPPET_LANGUAGES.find((language) => language.key === "python").clients) {
      const file = join(scratch, `${client.key.replace(".", "_")}.py`);
      writeFileSync(file, client.build(REQUESTS.withBody));
      execFileSync("python3", ["-m", "py_compile", file]);
    }
  });
});

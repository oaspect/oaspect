import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { BUILT_IN_MESSAGES, directionOf, mergeMessages, translate } from "../src/i18n/index";

const SRC = new URL("../src/", import.meta.url).pathname;

// Every t("…") id used in the components, plus ids passed indirectly.
function usedKeys() {
  const keys = new Set(["params.path", "params.query", "params.header", "params.cookie", "spec.unreadableFile"]);
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.jsx?$/.test(entry)) {
        for (const match of readFileSync(path, "utf8").matchAll(/\bt\("([\w.]+)"/g)) keys.add(match[1]);
      }
    }
  })(SRC);
  return keys;
}

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("built-in messages", () => {
  const keys = usedKeys();

  for (const [locale, messages] of Object.entries(BUILT_IN_MESSAGES)) {
    test(`${locale} covers every used key, with no stale keys`, () => {
      expect([...keys].filter((key) => !(key in messages))).toEqual([]);
      expect(Object.keys(messages).filter((key) => !keys.has(key))).toEqual([]);
    });

    test(`${locale} keeps the English placeholders`, () => {
      for (const [key, value] of Object.entries(messages)) {
        expect(placeholders(value), `${locale}:${key}`).toEqual(placeholders(BUILT_IN_MESSAGES.en[key]));
      }
    });
  }
});

describe("translate", () => {
  const messages = mergeMessages({ tr: { "sidebar.search": "Ara" }, de: { "copy.copy": "Kopieren" } });

  test("host overrides and new languages merge over built-ins", () => {
    expect(translate(messages, "tr", "sidebar.search")).toBe("Ara");
    expect(translate(messages, "tr", "copy.copy")).toBe("Kopyala");
    expect(translate(messages, "de", "copy.copy")).toBe("Kopieren");
  });

  test("falls back to the base language, then English, then the key", () => {
    expect(translate(messages, "tr-TR", "copy.copy")).toBe("Kopyala");
    expect(translate(messages, "de", "copy.copied")).toBe("Copied");
    expect(translate(messages, "en", "no.such.key")).toBe("no.such.key");
  });

  test("fills params", () => {
    expect(translate(messages, "en", "source.file", { name: "a.json" })).toBe("File: a.json");
  });

  test("direction", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("fa-IR")).toBe("rtl");
    expect(directionOf("tr")).toBe("ltr");
  });
});

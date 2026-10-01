// Runs the built browser bundle (dist/oaspect.js) in jsdom: the paths a page
// actually uses (init, hydrate, the web component) must work end to end.
import { readFileSync } from "node:fs";
import { JSDOM, VirtualConsole } from "jsdom";
import { describe, expect, test } from "vitest";

const bundle = readFileSync(new URL("../dist/oaspect.js", import.meta.url), "utf8");
const spec = JSON.parse(readFileSync(new URL("./bookstore.json", import.meta.url), "utf8"));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function browser(body = '<div id="docs"></div>') {
  const errors = [];
  // jsdom cannot parse modern CSS (oklch, @property); that is not an error of ours.
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => !/Could not parse CSS/.test(error.message) && errors.push(error.message));
  virtualConsole.on("error", (...args) => errors.push(args.map(String).join(" ")));
  const dom = new JSDOM(`<!doctype html><html><head></head><body>${body}</body></html>`, {
    runScripts: "outside-only",
    url: "https://docs.example.com/",
    virtualConsole,
  });
  const { window } = dom;
  // Browser APIs jsdom does not provide.
  window.IntersectionObserver = class {
    observe() {}
    disconnect() {}
  };
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.eval(bundle);
  return { window, document: window.document, errors };
}

describe("standalone bundle", () => {
  test("exposes init, hydrate and the version", () => {
    const { window } = browser();
    expect(typeof window.Oaspect.init).toBe("function");
    expect(typeof window.Oaspect.hydrate).toBe("function");
    expect(window.Oaspect.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("init renders an inline spec, update and destroy work", async () => {
    const { window, document, errors } = browser();
    const instance = window.Oaspect.init("#docs", { spec });
    await wait(50);
    expect(document.querySelector("#operation\\/books-list")).not.toBeNull();
    expect(document.getElementById("oaspect-styles")).not.toBeNull();
    instance.update({ locale: "tr" });
    await wait(50);
    expect(document.body.textContent).toContain("Kitaplar");
    instance.destroy();
    await wait(10);
    expect(document.querySelector(".oaspect")).toBeNull();
    expect(errors).toEqual([]);
  });

  test("the <oaspect-reference> element renders from its spec property", async () => {
    const { window, document, errors } = browser('<oaspect-reference locale="tr" hide="models"></oaspect-reference>');
    document.querySelector("oaspect-reference").spec = spec;
    await wait(50);
    expect(document.body.textContent).toContain("Kitaplar");
    expect(document.getElementById("model/Book")).toBeNull();
    expect(errors).toEqual([]);
  });

  test("hydrate attaches to prerendered markup without mismatches", async () => {
    const { renderToHtml } = await import("../dist/ssr.js");
    const config = { spec, lazy: false, urlParam: null, features: { sourceMenu: false } };
    const { window, document, errors } = browser(`<div id="docs">${renderToHtml(config)}</div>`);
    window.Oaspect.hydrate("#docs", config);
    await wait(50);
    expect(document.querySelector("#operation\\/books-destroy")).not.toBeNull();
    expect(errors).toEqual([]);
  });
});

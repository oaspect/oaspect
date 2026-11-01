import { describe, expect, test } from "vitest";
import { markdownOutline } from "../src/outline";
import { filterOutline, fold } from "../src/search";

const webhooks = [
  "PlayerVerify can call your server.",
  "## Setting up {#setup}",
  "Webhooks are set up in the Portal.",
  "## Verifying the signature {#signature}",
  "Every request carries an `X-Signature` header.",
  "## Responding and retries {#retries}",
  "A failed delivery is tried again: each retry waits longer.",
].join("\n\n");

const webhooksTr = [":::lang tr", "## İmzayı doğrulama {#signature}", "Her isteğin imzası başlıkta gelir.", ":::"].join("\n");

const titles = (entries) => entries.map((entry) => entry.text);

describe("sidebar search", () => {
  test("the outline carries the text under each heading", () => {
    const [setup] = markdownOutline(webhooks, "en", "tag/webhooks");
    expect(setup.body).toBe("Webhooks are set up in the Portal.");
  });

  test("finds a section by its text, not only its heading", () => {
    const outline = markdownOutline(webhooks, "en", "tag/webhooks");
    expect(titles(filterOutline(outline, fold("retry")))).toEqual(["Responding and retries"]);
    expect(titles(filterOutline(outline, fold("x-signature")))).toEqual(["Verifying the signature"]);
    expect(filterOutline(outline, fold("refund"))).toEqual([]);
  });

  test("ignores case and accents, Turkish İ and ı included", () => {
    const outline = markdownOutline(webhooksTr, "tr", "tag/webhooks");
    expect(titles(filterOutline(outline, fold("imza")))).toEqual(["İmzayı doğrulama"]);
    expect(titles(filterOutline(outline, fold("dogrulama")))).toEqual(["İmzayı doğrulama"]);
    expect(fold("IŞIK")).toBe(fold("ışık"));
  });
});

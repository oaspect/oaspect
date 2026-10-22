import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { buildDocs, docSlug, resolveDocLink, searchDocs } from "../src/index";

const files = [
  { path: "README.md", content: "# Acme API\n\nWelcome." },
  { path: "setup.md", content: "# Setup\n\n## Install {#install}\nRun `npm install`.\n\n## Configure\nSet `API_KEY`." },
  { path: "guides/README.md", content: "# Guides\n\nAll guides." },
  { path: "guides/testing.md", content: "# Testing\n\n## Database\nTests truncate the local database." },
  { path: "guides/deploy.md", content: ":::lang en\n# Deploying\nPush to main.\n:::\n\n:::lang tr\n# Yayına alma\nmain'e push edin.\n:::" },
  { path: "notes.txt", content: "not markdown" },
];

const nav = (model) => model.groups.map((group) => [group.label, group.pages.map((page) => page.slug)]);

describe("docs", () => {
  test("slugs drop .md and README/index", () => {
    assert.equal(docSlug("README.md"), "");
    assert.equal(docSlug("guides/index.md"), "guides");
    assert.equal(docSlug("guides/deploy.md"), "guides/deploy");
  });

  test("without a sidebar: folders as groups, README first, titles from the first heading", () => {
    const model = buildDocs({ files });
    assert.equal(model.title, "Acme API");
    assert.deepEqual(nav(model), [
      ["", ["", "setup"]],
      ["Guides", ["guides", "guides/deploy", "guides/testing"]],
    ]);
    assert.equal(model.pages.find((page) => page.slug === "guides/testing").title, "Testing");
  });

  test("a _sidebar.md sets the order and the group labels; unlisted files follow", () => {
    const sidebar = "- [Home](README.md)\n- Guides\n  - [Deploy](guides/deploy.md)\n  - [Testing](guides/testing.md)\n\n## Start\n\n- [Setup](setup.md)";
    const model = buildDocs({ files: [...files, { path: "_sidebar.md", content: sidebar }] });
    assert.deepEqual(nav(model), [
      ["", [""]],
      ["Guides", ["guides/deploy", "guides/testing", "guides"]],
      ["Start", ["setup"]],
    ]);
    assert.ok(model.pages.some((page) => page.slug === "guides"), "unlisted pages stay reachable");
  });

  test("language blocks pick the page title", () => {
    assert.equal(buildDocs({ files }, "tr").pages.find((page) => page.slug === "guides/deploy").title, "Yayına alma");
  });

  test("relative .md links resolve to routes", () => {
    assert.deepEqual(resolveDocLink("guides/testing.md", "../setup.md#install"), { slug: "setup", id: "install" });
    assert.deepEqual(resolveDocLink("guides/testing.md", "deploy.md"), { slug: "guides/deploy" });
    assert.deepEqual(resolveDocLink("guides/testing.md", "./README.md"), { slug: "guides" });
    assert.equal(resolveDocLink("setup.md", "https://example.com/a.md"), null);
    assert.equal(resolveDocLink("setup.md", "#install"), null);
    assert.equal(resolveDocLink("setup.md", "image.png"), null);
  });

  test("search finds sections, case and accent insensitive, headings first", () => {
    const model = buildDocs({ files });
    const [first] = searchDocs(model, "INSTALL");
    assert.equal(first.slug, "setup");
    assert.equal(first.heading, "Install");
    assert.equal(first.id, "install");
    assert.match(searchDocs(model, "local database")[0].snippet, /truncate the local database/);
    assert.equal(searchDocs(buildDocs({ files }, "tr"), "yayina")[0].slug, "guides/deploy");
    assert.deepEqual(searchDocs(model, "nothing like this"), []);
  });
});

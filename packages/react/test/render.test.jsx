import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { ApiReference } from "../src/index";

const spec = JSON.parse(readFileSync(new URL("./bookstore.json", import.meta.url), "utf8"));

describe("ApiReference (server render)", () => {
  test("renders an inline spec without browser APIs", () => {
    const html = renderToString(<ApiReference spec={spec} />);
    expect(html).toContain("Bookstore API");
    expect(html).toContain("List books");
    expect(html).toContain('id="operation/books-list"');
    expect(html).toContain('dir="ltr"');
  });

  test("uses the UI language for messages, x-i18n and :::lang blocks", () => {
    const html = renderToString(<ApiReference spec={spec} locale="tr" />);
    expect(html).toContain("Kitaplar");
    expect(html).toContain("Test için kullanılan küçük bir kitapçı.");
    expect(html).toContain("Yanıtlar");
    expect(html).not.toContain(":::lang");
  });

  test("RTL languages set dir on the root", () => {
    expect(renderToString(<ApiReference spec={spec} locale="ar" />)).toContain('dir="rtl"');
  });

  test("features can be turned off", () => {
    const html = renderToString(<ApiReference spec={spec} features={{ tryIt: false, models: false }} />);
    expect(html).not.toContain(">Try");
    expect(html).not.toContain('id="model/Book"');
  });

  test("a logo replaces the text title in the header", () => {
    const html = renderToString(<ApiReference spec={spec} logo={<img src="/logo.svg" alt="ACME" />} />);
    expect(html).toContain('alt="ACME"');
  });
});

describe("Logo", async () => {
  const { Logo } = await import("../src/index");

  test("renders light and dark variants with a label", () => {
    const html = renderToString(<ApiReference spec={spec} logo={<Logo light="/l.svg" dark="/d.svg" alt="ACME" label="API Docs" />} />);
    expect(html).toContain('src="/l.svg"');
    expect(html).toContain('src="/d.svg"');
    expect(html).toContain("API Docs");
  });
});

describe("Swagger 2.0 input", async () => {
  const { parseSpec } = await import("@oaspect/core");
  const swagger = parseSpec(readFileSync(new URL("./petstore-swagger2.yaml", import.meta.url), "utf8"));

  test("an inline Swagger 2.0 document is converted and rendered", () => {
    const html = renderToString(<ApiReference spec={swagger} />);
    expect(html).toContain("Petstore (Swagger 2.0)");
    expect(html).toContain("Upload photo");
    expect(html).toContain("https://petstore.example.com/v2");
  });
});

describe("webhooks, callbacks, links and server variables", () => {
  const events = {
    openapi: "3.1.0",
    info: { title: "Events", version: "1" },
    servers: [{ url: "https://{region}.example.com", variables: { region: { default: "eu", enum: ["eu", "us"] } } }],
    paths: {
      "/subscriptions": {
        post: {
          operationId: "subscribe",
          summary: "Subscribe",
          callbacks: { onEvent: { "{$request.body#/callbackUrl}": { post: { summary: "Event delivery", responses: { 200: { description: "Ack" } } } } } },
          responses: { 201: { description: "Created", links: { Read: { operationId: "getSubscription", parameters: { id: "$response.body#/id" } } } } },
        },
      },
      "/subscriptions/{id}": { get: { operationId: "getSubscription", summary: "Get subscription", responses: { 200: { description: "OK" } } } },
    },
    webhooks: { newPet: { post: { summary: "New pet", requestBody: { content: { "application/json": { schema: { type: "object", properties: { id: { type: "integer" } } } } } }, responses: { 200: { description: "Received" } } } } },
  };

  test("renders the webhooks section with a payload sample and no Try button", () => {
    const html = renderToString(<ApiReference spec={events} />);
    expect(html).toContain('id="webhooks"');
    expect(html).toContain("New pet");
    expect(html).toContain("Payload");
    expect(html).toContain("Callbacks");
    expect(html).toContain("{$request.body#/callbackUrl}");
    expect(html).toContain("{region}");
    expect(html).toContain("https://eu.example.com/subscriptions");
  });
});

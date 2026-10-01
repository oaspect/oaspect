import assert from "node:assert/strict";
import { describe, test } from "vitest";
import { buildModel, linkTarget, serverUrl } from "../src/index";

const spec = {
  openapi: "3.1.0",
  info: { title: "Events", version: "1" },
  servers: [{ url: "https://{region}.example.com/{version}", variables: { region: { default: "eu", enum: ["eu", "us"] }, version: { default: "v1" } } }],
  paths: {
    "/subscriptions": {
      post: {
        operationId: "subscribe",
        summary: "Subscribe",
        callbacks: {
          onEvent: {
            "{$request.body#/callbackUrl}": {
              post: { summary: "Event delivery", requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Ack" } } },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            links: {
              GetSubscription: { operationId: "getSubscription", parameters: { id: "$response.body#/id" }, description: "Read it back" },
              ByRef: { operationRef: "#/paths/~1subscriptions~1{id}/get" },
            },
          },
        },
      },
    },
    "/subscriptions/{id}": { get: { operationId: "getSubscription", responses: { 200: { description: "OK" } } } },
  },
  webhooks: {
    newPet: { post: { summary: "New pet", requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { 200: { description: "Received" } } } },
  },
};

describe("webhooks, callbacks and links", () => {
  const model = buildModel(spec);

  test("webhooks are their own operations", () => {
    assert.equal(model.webhooks.length, 1);
    const [hook] = model.webhooks;
    assert.equal(hook.kind, "webhook");
    assert.equal(hook.path, "newPet");
    assert.equal(hook.anchor, "webhook/newpet/newpet-post");
    assert.equal(model.operations.every((operation) => operation.kind === "operation"), true);
  });

  test("callbacks are resolved under their operation", () => {
    const subscribe = model.operations.find((operation) => operation.operationId === "subscribe")!;
    assert.equal(subscribe.callbacks.length, 1);
    const [callback] = subscribe.callbacks;
    assert.equal(callback.name, "onEvent");
    assert.equal(callback.operations[0].kind, "callback");
    assert.equal(callback.operations[0].path, "{$request.body#/callbackUrl}");
    assert.equal(callback.operations[0].summary, "Event delivery");
    assert.ok(callback.operations[0].anchor.startsWith("operation/subscribe/callback/onevent/"));
  });

  test("links resolve to their target operation by operationId or operationRef", () => {
    const subscribe = model.operations.find((operation) => operation.operationId === "subscribe")!;
    const links = subscribe.responses[0].links;
    assert.deepEqual(links.map((link) => link.name), ["GetSubscription", "ByRef"]);
    assert.deepEqual(links[0].parameters, { id: "$response.body#/id" });
    assert.equal(linkTarget(model, links[0])?.operationId, "getSubscription");
    assert.equal(linkTarget(model, links[1])?.operationId, "getSubscription");
  });

  test("server variables use chosen values, then defaults", () => {
    assert.equal(serverUrl(model.servers[0]), "https://eu.example.com/v1");
    assert.equal(serverUrl(model.servers[0], { region: "us" }), "https://us.example.com/v1");
    assert.equal(serverUrl(model.servers[0], { region: "" }), "https://eu.example.com/v1");
  });
});

import assert from "node:assert/strict";
import { describe, test } from "vitest";
import { applySecurity, buildTokenRequest, describeScheme, securityRequirements } from "../src/index";

const schemes = {
  bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
  basic: { type: "http", scheme: "basic" },
  headerKey: { type: "apiKey", in: "header", name: "X-Api-Key" },
  queryKey: { type: "apiKey", in: "query", name: "api_key" },
  cookieKey: { type: "apiKey", in: "cookie", name: "session" },
  oauth: { type: "oauth2", flows: { clientCredentials: { tokenUrl: "https://auth.example.com/token", scopes: { read: "Read" } } } },
};

describe("applySecurity", () => {
  test("each scheme type lands in the right place", () => {
    const all = (name: string, credential: object) => applySecurity(schemes, [{ schemes: [name], scopes: {} }], { [name]: credential });
    assert.deepEqual(all("bearer", { token: "t" }).headers, { Authorization: "Bearer t" });
    assert.deepEqual(all("basic", { username: "ü", password: "p:w" }).headers, { Authorization: `Basic ${Buffer.from("ü:p:w").toString("base64")}` });
    assert.deepEqual(all("headerKey", { token: "k" }).headers, { "X-Api-Key": "k" });
    assert.deepEqual(all("queryKey", { token: "k" }).query, { api_key: "k" });
    assert.deepEqual(all("cookieKey", { token: "k" }).cookies, { session: "k" });
    assert.deepEqual(all("oauth", { token: "a" }).headers, { Authorization: "Bearer a" });
  });

  test("the first requirement with every credential present wins (OR of ANDs)", () => {
    const requirements = [
      { schemes: ["headerKey", "queryKey"], scopes: {} },
      { schemes: ["bearer"], scopes: {} },
    ];
    const onlyBearer = applySecurity(schemes, requirements, { headerKey: { token: "k" }, bearer: { token: "t" } });
    assert.deepEqual(onlyBearer, { headers: { Authorization: "Bearer t" }, query: {}, cookies: {} });
    const both = applySecurity(schemes, requirements, { headerKey: { token: "k" }, queryKey: { token: "q" } });
    assert.deepEqual(both, { headers: { "X-Api-Key": "k" }, query: { api_key: "q" }, cookies: {} });
  });

  test("nothing is applied without credentials or for optional auth", () => {
    assert.deepEqual(applySecurity(schemes, [{ schemes: ["bearer"], scopes: {} }], {}), { headers: {}, query: {}, cookies: {} });
    assert.deepEqual(applySecurity(schemes, [{ schemes: [], scopes: {} }], { bearer: { token: "t" } }).headers, {});
  });
});

test("securityRequirements and describeScheme", () => {
  assert.deepEqual(securityRequirements({ security: [{ oauth: ["read"] }, {}] }), [
    { schemes: ["oauth"], scopes: { oauth: ["read"] } },
    { schemes: [], scopes: {} },
  ]);
  assert.equal(describeScheme(schemes.bearer), "Bearer (JWT)");
  assert.equal(describeScheme(schemes.queryKey), "API key (query: api_key)");
  assert.equal(describeScheme(schemes.oauth), "OAuth 2.0 (clientCredentials)");
});

test("buildTokenRequest follows RFC 6749", () => {
  const request = buildTokenRequest("clientCredentials", schemes.oauth.flows.clientCredentials, { clientId: "id", clientSecret: "secret", scopes: "read write" });
  assert.equal(request.url, "https://auth.example.com/token");
  assert.equal(request.body, "grant_type=client_credentials&scope=read+write");
  assert.equal(request.headers.Authorization, `Basic ${Buffer.from("id:secret").toString("base64")}`);
  const password = buildTokenRequest("password", { tokenUrl: "/t" }, { username: "u", password: "p" });
  assert.equal(password.body, "grant_type=password&username=u&password=p");
});

import { createProxyHandler } from "oaspect/server";

// Keep this to your API's hosts: an open relay lets anyone reach what the
// server can reach.
export const POST = createProxyHandler({
  allowedHosts: (process.env.ALLOWED_HOSTS ?? "api.example.com").split(","),
});

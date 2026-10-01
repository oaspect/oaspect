#!/usr/bin/env node
// oaspect CLI: build a self-contained HTML reference or serve a live preview.
import { readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { renderHtml } from "../src/html.js";
import { serve } from "../src/serve.js";
import { isUrl, loadSpec } from "../src/spec.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = resolve(root, "dist/oaspect.js");

const HELP = `oaspect — interactive API reference for OpenAPI documents

Usage:
  oaspect build <spec> [-o docs.html] [options]   Write a self-contained HTML file
  oaspect serve <spec> [--port 8080] [options]    Live preview with a "Try" proxy

<spec> is a JSON file path or an http(s) URL.

Options:
  -o, --output <file>       build: output file (default: <spec name>.html)
      --title <text>        page and header title (default: info.title)
      --locale <code>       UI language: en, tr, ar… (default: en)
      --theme <light|dark>  force a theme
      --logo <url>          header logo image
      --port <number>       serve: port (default: 8080)
      --host <address>      serve: bind address (default: 127.0.0.1)
      --proxy-hosts <list>  serve: hosts the proxy may call (default: any, loopback only)
      --no-proxy            serve: disable the "Try" proxy
  -h, --help                show this help
  -v, --version             show the version
`;

function fail(message) {
  console.error(`oaspect: ${message}`);
  process.exit(1);
}

const { values, positionals } = (() => {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        output: { type: "string", short: "o" },
        title: { type: "string" },
        locale: { type: "string" },
        theme: { type: "string" },
        logo: { type: "string" },
        port: { type: "string" },
        host: { type: "string" },
        "proxy-hosts": { type: "string" },
        "no-proxy": { type: "boolean" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
      },
    });
  } catch (error) {
    fail(error.message);
  }
})();

if (values.version) {
  const { version } = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  console.log(version);
  process.exit(0);
}

const [command, source] = positionals;
if (values.help || !command) {
  console.log(HELP);
  process.exit(values.help ? 0 : 1);
}
if (!["build", "serve"].includes(command)) fail(`unknown command "${command}". Run oaspect --help.`);
if (!source) fail(`${command} needs a spec file or URL.`);
if (values.theme && !["light", "dark"].includes(values.theme)) fail("--theme must be light or dark.");

const config = {
  ...(values.title ? { title: values.title } : {}),
  ...(values.locale ? { defaultLocale: values.locale } : {}),
  ...(values.theme ? { theme: values.theme } : {}),
  ...(values.logo ? { logo: values.logo } : {}),
};

try {
  if (command === "build") {
    const spec = await loadSpec(source);
    const output = resolve(values.output ?? `${basename(isUrl(source) ? new URL(source).pathname : source, extname(source)) || "openapi"}.html`);
    const html = renderHtml({
      title: values.title ?? spec.info?.title ?? "API Reference",
      // No "Source" menu or ?url= loading in a static file; there is no proxy either.
      config: { ...config, urlParam: null, features: { sourceMenu: false } },
      spec,
      script: { inline: await readFile(bundlePath, "utf8") },
    });
    await writeFile(output, html);
    console.log(`Wrote ${output} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
  } else {
    const proxyHosts = values["proxy-hosts"]?.split(",").map((host) => host.trim()).filter(Boolean);
    const port = values.port ? Number.parseInt(values.port, 10) : 8080;
    if (!Number.isInteger(port) || port < 0 || port > 65535) fail("--port must be a number between 0 and 65535.");
    const { url } = await serve({
      source,
      port,
      host: values.host ?? "127.0.0.1",
      proxy: values["no-proxy"] ? false : proxyHosts?.length ? proxyHosts : true,
      bundlePath,
      config,
    });
    console.log(`oaspect serving ${source} at ${url}`);
  }
} catch (error) {
  fail(error.message);
}

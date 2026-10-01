import { MULTIPART_BUILDERS } from "./multipart";
import type { HttpRequest, SnippetLanguage } from "./types";

// Code sample generators, grouped by language and client library. Each
// client's build() takes the output of buildRequest():
// { method, url, headers, body } where body is a string or undefined.

// ---------------------------------------------------------------------------
// String literal helpers per quoting style.

const dq = (value) => JSON.stringify(String(value));
const sq = (value) => `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const shellQuote = (value) => `'${String(value).replace(/'/g, "'\\''")}'`;
const psQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const dartQuote = (value) => sq(value).replace(/\$/g, "\\$");
const kotlinQuote = (value) => dq(value).replace(/\$/g, "\\$");

const indent = (text, prefix) => text.split("\n").join(`\n${prefix}`);

function parseJson(body) {
  if (body === undefined) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}

// Single-line form of the body, for languages without multi-line literals.
const compact = (body) => {
  const json = parseJson(body);
  return json === undefined ? body : JSON.stringify(json);
};

const contentTypeOf = (headers) =>
  Object.entries(headers).find(([key]) => key.toLowerCase() === "content-type")?.[1];

const withoutContentType = (headers) =>
  Object.fromEntries(Object.entries(headers).filter(([key]) => key.toLowerCase() !== "content-type"));

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return new URL(url, "http://localhost");
  }
}

const capitalize = (method) => method.charAt(0) + method.slice(1).toLowerCase();

// Literal converters for languages whose idiomatic clients take native data.
function toPython(value, pad = "") {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value !== "object") return JSON.stringify(value);
  const next = `${pad}    `;
  if (Array.isArray(value)) {
    return value.length ? `[\n${value.map((item) => next + toPython(item, next)).join(",\n")},\n${pad}]` : "[]";
  }
  const entries = Object.entries(value);
  return entries.length
    ? `{\n${entries.map(([key, item]) => `${next}${JSON.stringify(key)}: ${toPython(item, next)}`).join(",\n")},\n${pad}}`
    : "{}";
}

function toPhp(value, pad = "") {
  if (value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") return sq(value);
  // `[]` would encode as a JSON array, so empty objects need an explicit cast.
  if (!Array.isArray(value) && Object.keys(value).length === 0) return "(object) []";
  const next = `${pad}    `;
  const items = Array.isArray(value)
    ? value.map((item) => next + toPhp(item, next))
    : Object.entries(value).map(([key, item]) => `${next}${sq(key)} => ${toPhp(item, next)}`);
  return items.length ? `[\n${items.join(",\n")},\n${pad}]` : "[]";
}

function toRuby(value, pad = "") {
  if (value === null) return "nil";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") return sq(value);
  const next = `${pad}  `;
  if (Array.isArray(value)) {
    return value.length ? `[\n${value.map((item) => next + toRuby(item, next)).join(",\n")}\n${pad}]` : "[]";
  }
  const entries = Object.entries(value);
  return entries.length
    ? `{\n${entries.map(([key, item]) => `${next}${sq(key)} => ${toRuby(item, next)}`).join(",\n")}\n${pad}}`
    : "{}";
}

const jsObject = (value, pad) => indent(JSON.stringify(value, null, 2), pad);

// JS body expression: JSON.stringify(<literal>) for JSON, a string otherwise.
function jsBody(body, pad) {
  const json = parseJson(body);
  return json === undefined ? dq(body) : `JSON.stringify(${jsObject(json, pad)})`;
}

// ---------------------------------------------------------------------------
// Shell

function curl({ method, url, headers, body }: HttpRequest) {
  const parts = [`curl --request ${method}`, `--url ${shellQuote(url)}`];
  for (const [key, value] of Object.entries(headers)) parts.push(`--header ${shellQuote(`${key}: ${value}`)}`);
  if (body !== undefined) parts.push(`--data ${shellQuote(body)}`);
  return parts.join(" \\\n  ");
}

function wget({ method, url, headers, body }: HttpRequest) {
  const parts = ["wget --quiet", `--method=${method}`];
  for (const [key, value] of Object.entries(headers)) parts.push(`--header=${shellQuote(`${key}: ${value}`)}`);
  if (body !== undefined) parts.push(`--body-data=${shellQuote(body)}`);
  parts.push("--output-document=-", shellQuote(url));
  return parts.join(" \\\n  ");
}

function httpie({ method, url, headers, body }: HttpRequest) {
  const command = `http ${method} ${shellQuote(url)}`;
  const parts = [body !== undefined ? `printf '%s' ${shellQuote(body)} | ${command}` : command];
  for (const [key, value] of Object.entries(headers)) parts.push(shellQuote(`${key}:${value}`));
  return parts.join(" \\\n  ");
}

// ---------------------------------------------------------------------------
// JavaScript / Node.js

function fetchClient({ method, url, headers, body }: HttpRequest) {
  const options = [`  method: ${dq(method)},`];
  if (Object.keys(headers).length) options.push(`  headers: ${jsObject(headers, "  ")},`);
  if (body !== undefined) options.push(`  body: ${jsBody(body, "  ")},`);
  return [`const response = await fetch(${dq(url)}, {`, ...options, "});", "", "const data = await response.json();", "console.log(data);"].join("\n");
}

function axios({ method, url, headers, body }: HttpRequest) {
  const options = [`  method: ${dq(method)},`, `  url: ${dq(url)},`];
  if (Object.keys(headers).length) options.push(`  headers: ${jsObject(headers, "  ")},`);
  if (body !== undefined) {
    const json = parseJson(body);
    options.push(`  data: ${json === undefined ? dq(body) : jsObject(json, "  ")},`);
  }
  return ['import axios from "axios";', "", "const { data } = await axios.request({", ...options, "});", "", "console.log(data);"].join("\n");
}

function jquery({ method, url, headers, body }: HttpRequest) {
  const options = [`  url: ${dq(url)},`, `  method: ${dq(method)},`];
  if (Object.keys(headers).length) options.push(`  headers: ${jsObject(headers, "  ")},`);
  if (body !== undefined) options.push(`  data: ${jsBody(body, "  ")},`);
  return ["$.ajax({", ...options, "}).done((response) => {", "  console.log(response);", "});"].join("\n");
}

function xhr({ method, url, headers, body }: HttpRequest) {
  return [
    "const xhr = new XMLHttpRequest();",
    `xhr.open(${dq(method)}, ${dq(url)});`,
    ...Object.entries(headers).map(([key, value]) => `xhr.setRequestHeader(${dq(key)}, ${dq(value)});`),
    "",
    'xhr.addEventListener("load", () => {',
    "  console.log(xhr.responseText);",
    "});",
    "",
    body !== undefined ? `xhr.send(${jsBody(body, "")});` : "xhr.send();",
  ].join("\n");
}

function undici({ method, url, headers, body }: HttpRequest) {
  const options = [`  method: ${dq(method)},`];
  if (Object.keys(headers).length) options.push(`  headers: ${jsObject(headers, "  ")},`);
  if (body !== undefined) options.push(`  body: ${jsBody(body, "  ")},`);
  return [
    'import { request } from "undici";',
    "",
    `const { statusCode, body } = await request(${dq(url)}, {`,
    ...options,
    "});",
    "",
    "console.log(statusCode, await body.json());",
  ].join("\n");
}

function nodeHttp({ method, url, headers, body }: HttpRequest) {
  const lib = parseUrl(url).protocol === "https:" ? "https" : "http";
  const options = [`  method: ${dq(method)},`];
  if (Object.keys(headers).length) options.push(`  headers: ${jsObject(headers, "  ")},`);
  return [
    `import ${lib} from "node:${lib}";`,
    "",
    `const req = ${lib}.request(${dq(url)}, {`,
    ...options,
    "}, (res) => {",
    '  let data = "";',
    '  res.on("data", (chunk) => (data += chunk));',
    '  res.on("end", () => console.log(data));',
    "});",
    "",
    ...(body !== undefined ? [`req.write(${jsBody(body, "")});`] : []),
    "req.end();",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Python

function pythonClient(library) {
  return ({ method, url, headers, body }: HttpRequest) => {
    const json = parseJson(body);
    const lines = [`import ${library}`, "", `url = ${dq(url)}`];
    const args = [dq(method), "url"];

    if (Object.keys(headers).length) {
      lines.push(`headers = ${toPython(headers)}`);
      args.push("headers=headers");
    }
    if (json !== undefined) {
      lines.push(`payload = ${toPython(json)}`);
      args.push("json=payload");
    } else if (body !== undefined) {
      lines.push(`payload = ${dq(body)}`);
      args.push("data=payload");
    }
    lines.push("", `response = ${library}.request(${args.join(", ")})`, "", "print(response.json())");
    return lines.join("\n");
  };
}

function pythonHttpClient({ method, url, headers, body }: HttpRequest) {
  const target = parseUrl(url);
  const connection = target.protocol === "https:" ? "HTTPSConnection" : "HTTPConnection";
  const json = parseJson(body);
  const lines = ["import http.client"];
  if (json !== undefined) lines.push("import json");
  lines.push("", `conn = http.client.${connection}(${dq(target.host)})`);

  let payload = "None";
  if (json !== undefined) {
    lines.push(`payload = json.dumps(${toPython(json)})`);
    payload = "payload";
  } else if (body !== undefined) {
    lines.push(`payload = ${dq(body)}`);
    payload = "payload";
  }
  lines.push(`headers = ${toPython(headers)}`);
  lines.push(
    "",
    `conn.request(${dq(method)}, ${dq(target.pathname + target.search)}, ${payload}, headers)`,
    "res = conn.getresponse()",
    "",
    'print(res.read().decode("utf-8"))',
  );
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// PHP

function phpCurl({ method, url, headers, body }: HttpRequest) {
  const json = parseJson(body);
  const lines = [
    "<?php",
    "",
    "$curl = curl_init();",
    "",
    "curl_setopt_array($curl, [",
    `    CURLOPT_URL => ${sq(url)},`,
    "    CURLOPT_RETURNTRANSFER => true,",
    `    CURLOPT_CUSTOMREQUEST => ${sq(method)},`,
  ];
  const headerLines = Object.entries(headers).map(([key, value]) => `        ${sq(`${key}: ${value}`)},`);
  if (headerLines.length) lines.push("    CURLOPT_HTTPHEADER => [", ...headerLines, "    ],");
  if (json !== undefined) lines.push(`    CURLOPT_POSTFIELDS => json_encode(${toPhp(json, "    ")}),`);
  else if (body !== undefined) lines.push(`    CURLOPT_POSTFIELDS => ${sq(body)},`);
  lines.push("]);", "", "$response = curl_exec($curl);", "curl_close($curl);", "", "echo $response;");
  return lines.join("\n");
}

function guzzle({ method, url, headers, body }: HttpRequest) {
  const json = parseJson(body);
  const options: string[] = [];
  const sentHeaders = json !== undefined ? withoutContentType(headers) : headers;
  if (Object.keys(sentHeaders).length) options.push(`    'headers' => ${toPhp(sentHeaders, "    ")},`);
  if (json !== undefined) options.push(`    'json' => ${toPhp(json, "    ")},`);
  else if (body !== undefined) options.push(`    'body' => ${sq(body)},`);

  return [
    "<?php",
    "",
    "require 'vendor/autoload.php';",
    "",
    "$client = new \\GuzzleHttp\\Client();",
    "",
    options.length
      ? `$response = $client->request(${sq(method)}, ${sq(url)}, [\n${options.join("\n")}\n]);`
      : `$response = $client->request(${sq(method)}, ${sq(url)});`,
    "",
    "echo $response->getBody();",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Compiled / other languages

function go({ method, url, headers, body }: HttpRequest) {
  const hasBody = body !== undefined;
  const literal = hasBody && !body.includes("`") ? `\`${body}\`` : hasBody ? dq(body) : "";
  const imports = ['"fmt"', '"io"', '"net/http"', ...(hasBody ? ['"strings"'] : [])];

  return [
    "package main",
    "",
    "import (",
    ...imports.map((item) => `\t${item}`),
    ")",
    "",
    "func main() {",
    ...(hasBody ? [`\tpayload := strings.NewReader(${literal})`, ""] : []),
    `\treq, _ := http.NewRequest(${dq(method)}, ${dq(url)}, ${hasBody ? "payload" : "nil"})`,
    ...(Object.keys(headers).length ? ["", ...Object.entries(headers).map(([key, value]) => `\treq.Header.Add(${dq(key)}, ${dq(value)})`)] : []),
    "",
    "\tres, err := http.DefaultClient.Do(req)",
    "\tif err != nil {",
    "\t\tpanic(err)",
    "\t}",
    "\tdefer res.Body.Close()",
    "",
    "\tdata, _ := io.ReadAll(res.Body)",
    "\tfmt.Println(string(data))",
    "}",
  ].join("\n");
}

// Java/C# text blocks: body lines share the closing delimiter's indentation.
const textBlock = (body, pad) => `"""\n${pad}${indent(body, pad)}\n${pad}"""`;

function javaHttpClient({ method, url, headers, body }: HttpRequest) {
  const publisher =
    body !== undefined
      ? `HttpRequest.BodyPublishers.ofString(${textBlock(body.replace(/\\/g, "\\\\"), "        ")})`
      : "HttpRequest.BodyPublishers.noBody()";
  return [
    "import java.net.URI;",
    "import java.net.http.HttpClient;",
    "import java.net.http.HttpRequest;",
    "import java.net.http.HttpResponse;",
    "",
    "HttpRequest request = HttpRequest.newBuilder()",
    `    .uri(URI.create(${dq(url)}))`,
    ...Object.entries(headers).map(([key, value]) => `    .header(${dq(key)}, ${dq(value)})`),
    `    .method(${dq(method)}, ${publisher})`,
    "    .build();",
    "",
    "HttpResponse<String> response = HttpClient.newHttpClient()",
    "    .send(request, HttpResponse.BodyHandlers.ofString());",
    "",
    "System.out.println(response.body());",
  ].join("\n");
}

function javaOkHttp({ method, url, headers, body }: HttpRequest) {
  const hasBody = body !== undefined;
  return [
    "OkHttpClient client = new OkHttpClient();",
    "",
    ...(hasBody
      ? [
          `MediaType mediaType = MediaType.parse(${dq(contentTypeOf(headers) ?? "text/plain")});`,
          `RequestBody body = RequestBody.create(${dq(compact(body))}, mediaType);`,
        ]
      : []),
    "Request request = new Request.Builder()",
    `    .url(${dq(url)})`,
    `    .method(${dq(method)}, ${hasBody ? "body" : "null"})`,
    ...Object.entries(headers).map(([key, value]) => `    .addHeader(${dq(key)}, ${dq(value)})`),
    "    .build();",
    "",
    "Response response = client.newCall(request).execute();",
    "System.out.println(response.body().string());",
  ].join("\n");
}

function kotlinOkHttp({ method, url, headers, body }: HttpRequest) {
  const hasBody = body !== undefined;
  return [
    "val client = OkHttpClient()",
    "",
    ...(hasBody
      ? [
          `val mediaType = ${kotlinQuote(contentTypeOf(headers) ?? "text/plain")}.toMediaType()`,
          `val body = """\n${body.replace(/\$/g, "${'$'}")}\n""".trimIndent().toRequestBody(mediaType)`,
        ]
      : []),
    "val request = Request.Builder()",
    `    .url(${kotlinQuote(url)})`,
    `    .method(${kotlinQuote(method)}, ${hasBody ? "body" : "null"})`,
    ...Object.entries(headers).map(([key, value]) => `    .addHeader(${kotlinQuote(key)}, ${kotlinQuote(value)})`),
    "    .build()",
    "",
    "val response = client.newCall(request).execute()",
    "println(response.body?.string())",
  ].join("\n");
}

function csharpHttpClient({ method, url, headers, body }: HttpRequest) {
  const requestHeaders = Object.entries(withoutContentType(headers));
  const contentType = contentTypeOf(headers);
  const lines = [
    "using System.Net.Http.Headers;",
    "",
    "var client = new HttpClient();",
    "var request = new HttpRequestMessage",
    "{",
    `    Method = new HttpMethod(${dq(method)}),`,
    `    RequestUri = new Uri(${dq(url)}),`,
  ];
  if (requestHeaders.length) {
    lines.push("    Headers =", "    {", ...requestHeaders.map(([key, value]) => `        { ${dq(key)}, ${dq(value)} },`), "    },");
  }
  if (body !== undefined) {
    lines.push(`    Content = new StringContent(${textBlock(body, "        ")})`);
    if (contentType) {
      lines.push(
        "    {",
        "        Headers =",
        "        {",
        `            ContentType = new MediaTypeHeaderValue(${dq(contentType)})`,
        "        }",
        "    }",
      );
    }
  }
  lines.push(
    "};",
    "",
    "using var response = await client.SendAsync(request);",
    "Console.WriteLine(await response.Content.ReadAsStringAsync());",
  );
  return lines.join("\n");
}

function restSharp({ method, url, headers, body }: HttpRequest) {
  const contentType = contentTypeOf(headers) ?? "application/json";
  return [
    "using RestSharp;",
    "",
    `var client = new RestClient(${dq(url)});`,
    `var request = new RestRequest("", Method.${capitalize(method)});`,
    ...Object.entries(withoutContentType(headers)).map(([key, value]) => `request.AddHeader(${dq(key)}, ${dq(value)});`),
    ...(body !== undefined ? [`request.AddStringBody(${dq(compact(body))}, ${dq(contentType)});`] : []),
    "",
    "var response = await client.ExecuteAsync(request);",
    "Console.WriteLine(response.Content);",
  ].join("\n");
}

function ruby({ method, url, headers, body }: HttpRequest) {
  const json = parseJson(body);
  const lines = ['require "uri"', 'require "net/http"'];
  if (json !== undefined) lines.push('require "json"');
  lines.push("", `url = URI(${sq(url)})`, "", "http = Net::HTTP.new(url.host, url.port)");
  if (parseUrl(url).protocol === "https:") lines.push("http.use_ssl = true");
  lines.push("", `request = Net::HTTP::${capitalize(method)}.new(url)`);
  for (const [key, value] of Object.entries(headers)) lines.push(`request[${sq(key)}] = ${sq(value)}`);
  if (json !== undefined) lines.push(`request.body = JSON.dump(${toRuby(json)})`);
  else if (body !== undefined) lines.push(`request.body = ${sq(body)}`);
  lines.push("", "response = http.request(request)", "puts response.read_body");
  return lines.join("\n");
}

function swift({ method, url, headers, body }: HttpRequest) {
  const lines = ["import Foundation", "", `let url = URL(string: ${dq(url)})!`, "var request = URLRequest(url: url)", `request.httpMethod = ${dq(method)}`];
  const entries = Object.entries(headers);
  if (entries.length) {
    lines.push("request.allHTTPHeaderFields = [", ...entries.map(([key, value]) => `    ${dq(key)}: ${dq(value)},`), "]");
  }
  if (body !== undefined) lines.push(`request.httpBody = """\n${body.replace(/\\/g, "\\\\")}\n""".data(using: .utf8)`);
  lines.push("", "let (data, _) = try await URLSession.shared.data(for: request)", "print(String(decoding: data, as: UTF8.self))");
  return lines.join("\n");
}

function dart({ method, url, headers, body }: HttpRequest) {
  const entries = Object.entries(headers);
  const lines = ["import 'package:http/http.dart' as http;", "", "void main() async {"];
  lines.push(`  final request = http.Request(${dartQuote(method)}, Uri.parse(${dartQuote(url)}));`);
  if (entries.length) {
    lines.push("  request.headers.addAll({", ...entries.map(([key, value]) => `    ${dartQuote(key)}: ${dartQuote(value)},`), "  });");
  }
  if (body !== undefined) lines.push(`  request.body = r'''\n${body}\n''';`);
  lines.push("", "  final response = await request.send();", "  print(await response.stream.bytesToString());", "}");
  return lines.join("\n");
}

function rust({ method, url, headers, body }: HttpRequest) {
  const standard = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH", "TRACE"];
  const methodExpr = standard.includes(method)
    ? `reqwest::Method::${method}`
    : `reqwest::Method::from_bytes(b${dq(method)}).unwrap()`;
  let hashes = "#";
  while (body !== undefined && body.includes(`"${hashes}`)) hashes += "#";

  return [
    "#[tokio::main]",
    "async fn main() -> Result<(), reqwest::Error> {",
    "    let client = reqwest::Client::new();",
    "",
    "    let response = client",
    `        .request(${methodExpr}, ${dq(url)})`,
    ...Object.entries(headers).map(([key, value]) => `        .header(${dq(key)}, ${dq(value)})`),
    ...(body !== undefined ? [`        .body(r${hashes}"${body}"${hashes})`] : []),
    "        .send()",
    "        .await?;",
    "",
    '    println!("{}", response.text().await?);',
    "    Ok(())",
    "}",
  ].join("\n");
}

function libcurl({ method, url, headers, body }: HttpRequest) {
  const entries = Object.entries(headers);
  return [
    "#include <curl/curl.h>",
    "",
    "int main(void) {",
    "  CURL *curl = curl_easy_init();",
    "",
    `  curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, ${dq(method)});`,
    `  curl_easy_setopt(curl, CURLOPT_URL, ${dq(url)});`,
    "",
    "  struct curl_slist *headers = NULL;",
    ...entries.map(([key, value]) => `  headers = curl_slist_append(headers, ${dq(`${key}: ${value}`)});`),
    "  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);",
    ...(body !== undefined ? ["", `  curl_easy_setopt(curl, CURLOPT_POSTFIELDS, ${dq(compact(body))});`] : []),
    "",
    "  CURLcode ret = curl_easy_perform(curl);",
    "",
    "  curl_slist_free_all(headers);",
    "  curl_easy_cleanup(curl);",
    "  return (int) ret;",
    "}",
  ].join("\n");
}

function powershell({ method, url, headers, body }: HttpRequest) {
  const entries = Object.entries(withoutContentType(headers));
  const contentType = contentTypeOf(headers);
  const lines: string[] = [];
  const args = [`-Uri ${psQuote(url)}`, `-Method ${method}`];

  if (entries.length) {
    lines.push("$headers = @{", ...entries.map(([key, value]) => `    ${psQuote(key)} = ${psQuote(value)}`), "}");
    args.push("-Headers $headers");
  }
  if (contentType) args.push(`-ContentType ${psQuote(contentType)}`);
  if (body !== undefined) {
    lines.push(`$body = @'\n${body}\n'@`);
    args.push("-Body $body");
  }
  if (lines.length) lines.push("");
  lines.push(`$response = Invoke-RestMethod ${args.join(" ")}`, "$response | ConvertTo-Json -Depth 10");
  return lines.join("\n");
}

function rawHttp({ method, url, headers, body }: HttpRequest) {
  const target = parseUrl(url);
  const lines = [`${method} ${target.pathname}${target.search} HTTP/1.1`, `Host: ${target.host}`];
  for (const [key, value] of Object.entries(headers)) lines.push(`${key}: ${value}`);
  if (body !== undefined) lines.push(`Content-Length: ${new TextEncoder().encode(body).length}`, "", body);
  return lines.join("\n");
}

// ---------------------------------------------------------------------------

// `highlight` is the tokenizer language in src/lib/highlight.js.
const LANGUAGES: SnippetLanguage[] = [
  {
    key: "shell",
    label: "Shell",
    highlight: "shell",
    clients: [
      { key: "curl", label: "cURL", build: curl },
      { key: "wget", label: "Wget", build: wget },
      { key: "httpie", label: "HTTPie", build: httpie },
    ],
  },
  {
    key: "javascript",
    label: "JavaScript",
    highlight: "javascript",
    clients: [
      { key: "fetch", label: "fetch", build: fetchClient },
      { key: "axios", label: "Axios", build: axios },
      { key: "jquery", label: "jQuery", build: jquery },
      { key: "xhr", label: "XHR", build: xhr },
    ],
  },
  {
    key: "node",
    label: "Node.js",
    highlight: "javascript",
    clients: [
      { key: "fetch", label: "fetch", build: fetchClient },
      { key: "axios", label: "Axios", build: axios },
      { key: "undici", label: "undici", build: undici },
      { key: "http", label: "http", build: nodeHttp },
    ],
  },
  {
    key: "python",
    label: "Python",
    highlight: "python",
    clients: [
      { key: "requests", label: "requests", build: pythonClient("requests") },
      { key: "httpx", label: "httpx", build: pythonClient("httpx") },
      { key: "http.client", label: "http.client", build: pythonHttpClient },
    ],
  },
  {
    key: "php",
    label: "PHP",
    highlight: "php",
    clients: [
      { key: "curl", label: "cURL", build: phpCurl },
      { key: "guzzle", label: "Guzzle", build: guzzle },
    ],
  },
  { key: "go", label: "Go", highlight: "go", clients: [{ key: "native", label: "net/http", build: go }] },
  {
    key: "java",
    label: "Java",
    highlight: "java",
    clients: [
      { key: "httpclient", label: "HttpClient", build: javaHttpClient },
      { key: "okhttp", label: "OkHttp", build: javaOkHttp },
    ],
  },
  { key: "kotlin", label: "Kotlin", highlight: "kotlin", clients: [{ key: "okhttp", label: "OkHttp", build: kotlinOkHttp }] },
  {
    key: "csharp",
    label: "C#",
    highlight: "csharp",
    clients: [
      { key: "httpclient", label: "HttpClient", build: csharpHttpClient },
      { key: "restsharp", label: "RestSharp", build: restSharp },
    ],
  },
  { key: "ruby", label: "Ruby", highlight: "ruby", clients: [{ key: "native", label: "net/http", build: ruby }] },
  { key: "swift", label: "Swift", highlight: "swift", clients: [{ key: "urlsession", label: "URLSession", build: swift }] },
  { key: "dart", label: "Dart", highlight: "dart", clients: [{ key: "http", label: "http", build: dart }] },
  { key: "rust", label: "Rust", highlight: "rust", clients: [{ key: "reqwest", label: "reqwest", build: rust }] },
  { key: "c", label: "C", highlight: "c", clients: [{ key: "libcurl", label: "libcurl", build: libcurl }] },
  {
    key: "powershell",
    label: "PowerShell",
    highlight: "powershell",
    clients: [{ key: "restmethod", label: "Invoke-RestMethod", build: powershell }],
  },
  { key: "http", label: "HTTP", highlight: "http", clients: [{ key: "raw", label: "HTTP/1.1", build: rawHttp }] },
];

// Requests with multipart parts (HttpRequest.form) use the multipart builders.
export const SNIPPET_LANGUAGES: SnippetLanguage[] = LANGUAGES.map((language) => ({
  ...language,
  clients: language.clients.map((client) => {
    const multipart = MULTIPART_BUILDERS[`${language.key}:${client.key}`];
    return { ...client, build: (request: HttpRequest) => (request.form && multipart ? multipart(request) : client.build(request)) };
  }),
}));

// Selection is stored as "language:client" (e.g. "python:httpx").
export function resolveSnippet(selection: unknown): { language: SnippetLanguage; client: SnippetLanguage["clients"][number]; selection: string } {
  const [languageKey, clientKey] = String(selection ?? "").split(":");
  const language = SNIPPET_LANGUAGES.find((item) => item.key === languageKey) ?? SNIPPET_LANGUAGES[0];
  const client = language.clients.find((item) => item.key === clientKey) ?? language.clients[0];
  return { language, client, selection: `${language.key}:${client.key}` };
}

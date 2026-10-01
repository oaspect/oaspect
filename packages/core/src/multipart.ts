// Code samples for multipart/form-data requests (HttpRequest.form). Each
// client uses its own multipart API; clients without one get a note that
// points to another client of the same language instead of wrong code.
//
// File parts read a local file named after the part (./photo.bin); in the
// browser they come from an <input type="file">.

import type { FormField, HttpRequest } from "./types";

const dq = (value: unknown) => JSON.stringify(String(value));
const sq = (value: unknown) => `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
const shellQuote = (value: unknown) => `'${String(value).replace(/'/g, "'\\''")}'`;
const psQuote = (value: unknown) => `'${String(value).replace(/'/g, "''")}'`;
const dartQuote = (value: unknown) => sq(value).replace(/\$/g, "\\$");
const kotlinQuote = (value: unknown) => dq(value).replace(/\$/g, "\\$");
const indent = (text: string, prefix: string) => text.split("\n").join(`\n${prefix}`);
const capitalize = (method: string) => method.charAt(0) + method.slice(1).toLowerCase();
const path = (field: FormField) => `./${field.file!.name}`;
const fileType = (field: FormField) => field.file!.type ?? "application/octet-stream";
const files = (form: FormField[]) => form.filter((field) => field.file);
const texts = (form: FormField[]) => form.filter((field) => !field.file);
const headerList = (headers: Record<string, string>) => Object.entries(headers);
const jsObject = (value: unknown, pad: string) => indent(JSON.stringify(value, null, 2), pad);

function parseUrl(url: string) {
  try {
    return new URL(url);
  } catch {
    return new URL(url, "http://localhost");
  }
}

const note = (comment: string, text: string) => `${comment} ${text}`;

// ---------------------------------------------------------------------------
// Shell

function curl({ method, url, headers, form = [] }: HttpRequest) {
  const parts = [`curl --request ${method}`, `--url ${shellQuote(url)}`];
  for (const [key, value] of headerList(headers)) parts.push(`--header ${shellQuote(`${key}: ${value}`)}`);
  // --form-string sends text literally (no @file / <file interpretation).
  for (const field of form) {
    parts.push(field.file ? `--form ${shellQuote(`${field.name}=@${path(field)}`)}` : `--form-string ${shellQuote(`${field.name}=${field.value ?? ""}`)}`);
  }
  return parts.join(" \\\n  ");
}

function httpie({ method, url, headers, form = [] }: HttpRequest) {
  const parts = [`http --multipart ${method} ${shellQuote(url)}`];
  for (const [key, value] of headerList(headers)) parts.push(shellQuote(`${key}:${value}`));
  for (const field of form) parts.push(shellQuote(field.file ? `${field.name}@${path(field)}` : `${field.name}=${field.value ?? ""}`));
  return parts.join(" \\\n  ");
}

// ---------------------------------------------------------------------------
// JavaScript / Node.js

function formData(form: FormField[], node: boolean) {
  const lines = ["const form = new FormData();"];
  for (const field of form) {
    if (!field.file) lines.push(`form.append(${dq(field.name)}, ${dq(field.value ?? "")});`);
    else if (node) lines.push(`form.append(${dq(field.name)}, await openAsBlob(${dq(path(field))}), ${dq(field.file.name)});`);
    else lines.push(`form.append(${dq(field.name)}, fileInput.files[0]); // <input type="file" id="fileInput">`);
  }
  return lines;
}

const nodeImports = (form: FormField[]) => (files(form).length ? ['import { openAsBlob } from "node:fs";', ""] : []);

function fetchClient(node: boolean) {
  return ({ method, url, headers, form = [] }: HttpRequest) => {
    const options = [`  method: ${dq(method)},`];
    if (headerList(headers).length) options.push(`  headers: ${jsObject(headers, "  ")},`);
    options.push("  body: form,");
    return [
      ...(node ? nodeImports(form) : []),
      ...formData(form, node),
      "",
      `const response = await fetch(${dq(url)}, {`,
      ...options,
      "});",
      "",
      "const data = await response.json();",
      "console.log(data);",
    ].join("\n");
  };
}

function axios(node: boolean) {
  return ({ method, url, headers, form = [] }: HttpRequest) => {
    const options = [`  method: ${dq(method)},`, `  url: ${dq(url)},`];
    if (headerList(headers).length) options.push(`  headers: ${jsObject(headers, "  ")},`);
    options.push("  data: form,");
    return [
      'import axios from "axios";',
      ...(node && files(form).length ? ['import { openAsBlob } from "node:fs";'] : []),
      "",
      ...formData(form, node),
      "",
      "const { data } = await axios.request({",
      ...options,
      "});",
      "",
      "console.log(data);",
    ].join("\n");
  };
}

function jquery({ method, url, headers, form = [] }: HttpRequest) {
  const options = [`  url: ${dq(url)},`, `  method: ${dq(method)},`];
  if (headerList(headers).length) options.push(`  headers: ${jsObject(headers, "  ")},`);
  options.push("  data: form,", "  processData: false,", "  contentType: false,");
  return [...formData(form, false), "", "$.ajax({", ...options, "}).done((response) => {", "  console.log(response);", "});"].join("\n");
}

function xhr({ method, url, headers, form = [] }: HttpRequest) {
  return [
    ...formData(form, false),
    "",
    "const xhr = new XMLHttpRequest();",
    `xhr.open(${dq(method)}, ${dq(url)});`,
    ...headerList(headers).map(([key, value]) => `xhr.setRequestHeader(${dq(key)}, ${dq(value)});`),
    "",
    'xhr.addEventListener("load", () => {',
    "  console.log(xhr.responseText);",
    "});",
    "",
    "xhr.send(form);",
  ].join("\n");
}

function undici({ method, url, headers, form = [] }: HttpRequest) {
  const options = [`  method: ${dq(method)},`];
  if (headerList(headers).length) options.push(`  headers: ${jsObject(headers, "  ")},`);
  options.push("  body: form,");
  return [
    'import { request, FormData } from "undici";',
    ...(files(form).length ? ['import { openAsBlob } from "node:fs";'] : []),
    "",
    ...formData(form, true),
    "",
    `const { statusCode, body } = await request(${dq(url)}, {`,
    ...options,
    "});",
    "",
    "console.log(statusCode, await body.json());",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Python

const pyString = (value: unknown) => JSON.stringify(String(value));

function pythonClient(library: string) {
  return ({ method, url, headers, form = [] }: HttpRequest) => {
    const lines = [`import ${library}`, "", `url = ${pyString(url)}`];
    const args = [pyString(method), "url"];
    if (headerList(headers).length) {
      lines.push(`headers = {${headerList(headers).map(([key, value]) => `${pyString(key)}: ${pyString(value)}`).join(", ")}}`);
      args.push("headers=headers");
    }
    // A dict, with a list for repeated names: httpx rejects a list of tuples
    // next to files, and requests accepts both.
    const grouped = new Map<string, string[]>();
    for (const field of texts(form)) grouped.set(field.name, [...(grouped.get(field.name) ?? []), field.value ?? ""]);
    if (grouped.size) {
      const entries = [...grouped].map(([name, values]) => `${pyString(name)}: ${values.length > 1 ? `[${values.map(pyString).join(", ")}]` : pyString(values[0])}`);
      lines.push(`data = {${entries.join(", ")}}`);
      args.push("data=data");
    }
    const fileFields = files(form);
    lines.push(
      `files = [${fileFields.map((field) => `(${pyString(field.name)}, (${pyString(field.file!.name)}, open(${pyString(path(field))}, "rb"), ${pyString(fileType(field))}))`).join(", ")}]`,
    );
    args.push("files=files");
    lines.push("", `response = ${library}.request(${args.join(", ")})`, "", "print(response.json())");
    return lines.join("\n");
  };
}

// ---------------------------------------------------------------------------
// PHP

function phpCurl({ method, url, headers, form = [] }: HttpRequest) {
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
  const headerLines = headerList(headers).map(([key, value]) => `        ${sq(`${key}: ${value}`)},`);
  if (headerLines.length) lines.push("    CURLOPT_HTTPHEADER => [", ...headerLines, "    ],");
  const names = form.map((field) => field.name);
  if (new Set(names).size !== names.length) {
    lines.splice(1, 0, "", "// PHP arrays cannot repeat a key, so repeated fields keep only their last value; use the Guzzle example for those.");
  }
  lines.push(
    "    CURLOPT_POSTFIELDS => [",
    ...form.map((field) =>
      field.file
        ? `        ${sq(field.name)} => new CURLFile(${sq(path(field))}, ${sq(fileType(field))}, ${sq(field.file.name)}),`
        : `        ${sq(field.name)} => ${sq(field.value ?? "")},`,
    ),
    "    ],",
    "]);",
    "",
    "$response = curl_exec($curl);",
    "curl_close($curl);",
    "",
    "echo $response;",
  );
  return lines.join("\n");
}

function guzzle({ method, url, headers, form = [] }: HttpRequest) {
  const options: string[] = [];
  if (headerList(headers).length) {
    options.push("    'headers' => [", ...headerList(headers).map(([key, value]) => `        ${sq(key)} => ${sq(value)},`), "    ],");
  }
  options.push(
    "    'multipart' => [",
    ...form.map((field) =>
      field.file
        ? `        ['name' => ${sq(field.name)}, 'contents' => fopen(${sq(path(field))}, 'r'), 'filename' => ${sq(field.file.name)}],`
        : `        ['name' => ${sq(field.name)}, 'contents' => ${sq(field.value ?? "")}],`,
    ),
    "    ],",
  );
  return [
    "<?php",
    "",
    "require 'vendor/autoload.php';",
    "",
    "$client = new \\GuzzleHttp\\Client();",
    "",
    `$response = $client->request(${sq(method)}, ${sq(url)}, [\n${options.join("\n")}\n]);`,
    "",
    "echo $response->getBody();",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Compiled / other languages

function go({ method, url, headers, form = [] }: HttpRequest) {
  const fileFields = files(form);
  const body: string[] = ["\tbody := &bytes.Buffer{}", "\twriter := multipart.NewWriter(body)"];
  for (const field of form) {
    if (!field.file) {
      body.push(`\twriter.WriteField(${dq(field.name)}, ${dq(field.value ?? "")})`);
      continue;
    }
    const variable = `file${body.length}`;
    body.push(
      "",
      `\t${variable}, err := os.Open(${dq(path(field))})`,
      "\tif err != nil {",
      "\t\tpanic(err)",
      "\t}",
      `\tdefer ${variable}.Close()`,
      `\tpart${variable}, _ := writer.CreateFormFile(${dq(field.name)}, ${dq(field.file.name)})`,
      `\tio.Copy(part${variable}, ${variable})`,
    );
  }
  body.push("\twriter.Close()");
  const imports = ['"bytes"', '"fmt"', '"io"', '"mime/multipart"', '"net/http"', ...(fileFields.length ? ['"os"'] : [])];

  return [
    "package main",
    "",
    "import (",
    ...imports.map((item) => `\t${item}`),
    ")",
    "",
    "func main() {",
    ...body,
    "",
    `\treq, _ := http.NewRequest(${dq(method)}, ${dq(url)}, body)`,
    "\treq.Header.Set(\"Content-Type\", writer.FormDataContentType())",
    ...headerList(headers).map(([key, value]) => `\treq.Header.Add(${dq(key)}, ${dq(value)})`),
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

function javaOkHttp({ method, url, headers, form = [] }: HttpRequest) {
  return [
    "OkHttpClient client = new OkHttpClient();",
    "",
    "RequestBody body = new MultipartBody.Builder()",
    "    .setType(MultipartBody.FORM)",
    ...form.map((field) =>
      field.file
        ? `    .addFormDataPart(${dq(field.name)}, ${dq(field.file.name)}, RequestBody.create(new File(${dq(path(field))}), MediaType.parse(${dq(fileType(field))})))`
        : `    .addFormDataPart(${dq(field.name)}, ${dq(field.value ?? "")})`,
    ),
    "    .build();",
    "Request request = new Request.Builder()",
    `    .url(${dq(url)})`,
    `    .method(${dq(method)}, body)`,
    ...headerList(headers).map(([key, value]) => `    .addHeader(${dq(key)}, ${dq(value)})`),
    "    .build();",
    "",
    "Response response = client.newCall(request).execute();",
    "System.out.println(response.body().string());",
  ].join("\n");
}

function kotlinOkHttp({ method, url, headers, form = [] }: HttpRequest) {
  return [
    "val client = OkHttpClient()",
    "",
    "val body = MultipartBody.Builder()",
    "    .setType(MultipartBody.FORM)",
    ...form.map((field) =>
      field.file
        ? `    .addFormDataPart(${kotlinQuote(field.name)}, ${kotlinQuote(field.file.name)}, File(${kotlinQuote(path(field))}).asRequestBody(${kotlinQuote(fileType(field))}.toMediaType()))`
        : `    .addFormDataPart(${kotlinQuote(field.name)}, ${kotlinQuote(field.value ?? "")})`,
    ),
    "    .build()",
    "val request = Request.Builder()",
    `    .url(${kotlinQuote(url)})`,
    `    .method(${kotlinQuote(method)}, body)`,
    ...headerList(headers).map(([key, value]) => `    .addHeader(${kotlinQuote(key)}, ${kotlinQuote(value)})`),
    "    .build()",
    "",
    "val response = client.newCall(request).execute()",
    "println(response.body?.string())",
  ].join("\n");
}

function csharpHttpClient({ method, url, headers, form = [] }: HttpRequest) {
  const lines = ["var client = new HttpClient();", "using var form = new MultipartFormDataContent();"];
  for (const field of form) {
    lines.push(
      field.file
        ? `form.Add(new StreamContent(File.OpenRead(${dq(path(field))})), ${dq(field.name)}, ${dq(field.file.name)});`
        : `form.Add(new StringContent(${dq(field.value ?? "")}), ${dq(field.name)});`,
    );
  }
  lines.push("", "var request = new HttpRequestMessage", "{", `    Method = new HttpMethod(${dq(method)}),`, `    RequestUri = new Uri(${dq(url)}),`);
  if (headerList(headers).length) {
    lines.push("    Headers =", "    {", ...headerList(headers).map(([key, value]) => `        { ${dq(key)}, ${dq(value)} },`), "    },");
  }
  lines.push(
    "    Content = form,",
    "};",
    "",
    "using var response = await client.SendAsync(request);",
    "Console.WriteLine(await response.Content.ReadAsStringAsync());",
  );
  return lines.join("\n");
}

function restSharp({ method, url, headers, form = [] }: HttpRequest) {
  return [
    "using RestSharp;",
    "",
    `var client = new RestClient(${dq(url)});`,
    `var request = new RestRequest("", Method.${capitalize(method)});`,
    "request.AlwaysMultipartFormData = true;",
    ...headerList(headers).map(([key, value]) => `request.AddHeader(${dq(key)}, ${dq(value)});`),
    ...form.map((field) =>
      field.file ? `request.AddFile(${dq(field.name)}, ${dq(path(field))});` : `request.AddParameter(${dq(field.name)}, ${dq(field.value ?? "")});`,
    ),
    "",
    "var response = await client.ExecuteAsync(request);",
    "Console.WriteLine(response.Content);",
  ].join("\n");
}

function ruby({ method, url, headers, form = [] }: HttpRequest) {
  const lines = ['require "uri"', 'require "net/http"', "", `url = URI(${sq(url)})`, "", "http = Net::HTTP.new(url.host, url.port)"];
  if (parseUrl(url).protocol === "https:") lines.push("http.use_ssl = true");
  lines.push("", `request = Net::HTTP::${capitalize(method)}.new(url)`);
  for (const [key, value] of headerList(headers)) lines.push(`request[${sq(key)}] = ${sq(value)}`);
  const parts = form.map((field) => (field.file ? `[${sq(field.name)}, File.open(${sq(path(field))})]` : `[${sq(field.name)}, ${sq(field.value ?? "")}]`));
  lines.push(`request.set_form([${parts.join(", ")}], "multipart/form-data")`, "", "response = http.request(request)", "puts response.read_body");
  return lines.join("\n");
}

function swift({ method, url, headers, form = [] }: HttpRequest) {
  const lines = [
    "import Foundation",
    "",
    `let url = URL(string: ${dq(url)})!`,
    "var request = URLRequest(url: url)",
    `request.httpMethod = ${dq(method)}`,
  ];
  for (const [key, value] of headerList(headers)) lines.push(`request.setValue(${dq(value)}, forHTTPHeaderField: ${dq(key)})`);
  lines.push(
    "",
    'let boundary = "Boundary-\\(UUID().uuidString)"',
    'request.setValue("multipart/form-data; boundary=\\(boundary)", forHTTPHeaderField: "Content-Type")',
    "",
    "var body = Data()",
  );
  for (const field of form) {
    const name = JSON.stringify(field.name).slice(1, -1);
    if (field.file) {
      const fileName = JSON.stringify(field.file.name).slice(1, -1);
      lines.push(
        `body.append("--\\(boundary)\\r\\nContent-Disposition: form-data; name=\\"${name}\\"; filename=\\"${fileName}\\"\\r\\nContent-Type: ${fileType(field)}\\r\\n\\r\\n".data(using: .utf8)!)`,
        `body.append(try Data(contentsOf: URL(fileURLWithPath: ${dq(path(field))})))`,
        'body.append("\\r\\n".data(using: .utf8)!)',
      );
    } else {
      const value = JSON.stringify(field.value ?? "").slice(1, -1);
      lines.push(`body.append("--\\(boundary)\\r\\nContent-Disposition: form-data; name=\\"${name}\\"\\r\\n\\r\\n${value}\\r\\n".data(using: .utf8)!)`);
    }
  }
  lines.push(
    'body.append("--\\(boundary)--\\r\\n".data(using: .utf8)!)',
    "request.httpBody = body",
    "",
    "let (data, _) = try await URLSession.shared.data(for: request)",
    "print(String(decoding: data, as: UTF8.self))",
  );
  return lines.join("\n");
}

function dart({ method, url, headers, form = [] }: HttpRequest) {
  const lines = ["import 'package:http/http.dart' as http;", "", "void main() async {"];
  lines.push(`  final request = http.MultipartRequest(${dartQuote(method)}, Uri.parse(${dartQuote(url)}));`);
  if (headerList(headers).length) {
    lines.push("  request.headers.addAll({", ...headerList(headers).map(([key, value]) => `    ${dartQuote(key)}: ${dartQuote(value)},`), "  });");
  }
  // `fields` is a Map, so repeated names go in as filename-less parts instead.
  const counts = new Map<string, number>();
  for (const field of texts(form)) counts.set(field.name, (counts.get(field.name) ?? 0) + 1);
  for (const field of form) {
    if (field.file) lines.push(`  request.files.add(await http.MultipartFile.fromPath(${dartQuote(field.name)}, ${dartQuote(path(field))}));`);
    else if (counts.get(field.name)! > 1) lines.push(`  request.files.add(http.MultipartFile.fromString(${dartQuote(field.name)}, ${dartQuote(field.value ?? "")}));`);
    else lines.push(`  request.fields[${dartQuote(field.name)}] = ${dartQuote(field.value ?? "")};`);
  }
  lines.push("", "  final response = await request.send();", "  print(await response.stream.bytesToString());", "}");
  return lines.join("\n");
}

function rust({ method, url, headers, form = [] }: HttpRequest) {
  const standard = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH", "TRACE"];
  const methodExpr = standard.includes(method) ? `reqwest::Method::${method}` : `reqwest::Method::from_bytes(b${dq(method)})?`;
  return [
    '// reqwest with the "multipart" feature',
    "#[tokio::main]",
    "async fn main() -> Result<(), Box<dyn std::error::Error>> {",
    "    let client = reqwest::Client::new();",
    "",
    "    let form = reqwest::multipart::Form::new()",
    ...form.map((field) =>
      field.file
        ? `        .part(${dq(field.name)}, reqwest::multipart::Part::bytes(std::fs::read(${dq(path(field))})?).file_name(${dq(field.file.name)}))`
        : `        .text(${dq(field.name)}, ${dq(field.value ?? "")})`,
    ),
    "        ;",
    "",
    "    let response = client",
    `        .request(${methodExpr}, ${dq(url)})`,
    ...headerList(headers).map(([key, value]) => `        .header(${dq(key)}, ${dq(value)})`),
    "        .multipart(form)",
    "        .send()",
    "        .await?;",
    "",
    '    println!("{}", response.text().await?);',
    "    Ok(())",
    "}",
  ].join("\n");
}

function libcurl({ method, url, headers, form = [] }: HttpRequest) {
  const lines = [
    "#include <curl/curl.h>",
    "",
    "int main(void) {",
    "  CURL *curl = curl_easy_init();",
    "",
    `  curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, ${dq(method)});`,
    `  curl_easy_setopt(curl, CURLOPT_URL, ${dq(url)});`,
    "",
    "  struct curl_slist *headers = NULL;",
    ...headerList(headers).map(([key, value]) => `  headers = curl_slist_append(headers, ${dq(`${key}: ${value}`)});`),
    "  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);",
    "",
    "  curl_mime *mime = curl_mime_init(curl);",
    "  curl_mimepart *part;",
  ];
  for (const field of form) {
    lines.push("  part = curl_mime_addpart(mime);", `  curl_mime_name(part, ${dq(field.name)});`);
    lines.push(field.file ? `  curl_mime_filedata(part, ${dq(path(field))});` : `  curl_mime_data(part, ${dq(field.value ?? "")}, CURL_ZERO_TERMINATED);`);
  }
  lines.push(
    "  curl_easy_setopt(curl, CURLOPT_MIMEPOST, mime);",
    "",
    "  CURLcode ret = curl_easy_perform(curl);",
    "",
    "  curl_mime_free(mime);",
    "  curl_slist_free_all(headers);",
    "  curl_easy_cleanup(curl);",
    "  return (int) ret;",
    "}",
  );
  return lines.join("\n");
}

function powershell({ method, url, headers, form = [] }: HttpRequest) {
  const lines: string[] = ["# PowerShell 7+ (-Form)"];
  const args = [`-Uri ${psQuote(url)}`, `-Method ${method}`];
  if (headerList(headers).length) {
    lines.push("$headers = @{", ...headerList(headers).map(([key, value]) => `    ${psQuote(key)} = ${psQuote(value)}`), "}");
    args.push("-Headers $headers");
  }
  // Hash literals reject duplicate keys; -Form sends an array value as repeated parts.
  const grouped = new Map<string, string[]>();
  for (const field of form) {
    const value = field.file ? `(Get-Item -Path ${psQuote(path(field))})` : psQuote(field.value ?? "");
    grouped.set(field.name, [...(grouped.get(field.name) ?? []), value]);
  }
  lines.push(
    "$form = @{",
    ...[...grouped].map(([name, values]) => `    ${psQuote(name)} = ${values.length > 1 ? `@(${values.join(", ")})` : values[0]}`),
    "}",
    "",
  );
  args.push("-Form $form");
  lines.push(`$response = Invoke-RestMethod ${args.join(" ")}`, "$response | ConvertTo-Json -Depth 10");
  return lines.join("\n");
}

const BOUNDARY = "oaspect-boundary";

function rawHttp({ method, url, headers, form = [] }: HttpRequest) {
  const target = parseUrl(url);
  const lines = [`${method} ${target.pathname}${target.search} HTTP/1.1`, `Host: ${target.host}`];
  for (const [key, value] of headerList(headers)) lines.push(`${key}: ${value}`);
  lines.push(`Content-Type: multipart/form-data; boundary=${BOUNDARY}`, "");
  for (const field of form) {
    lines.push(`--${BOUNDARY}`);
    if (field.file) {
      lines.push(`Content-Disposition: form-data; name="${field.name}"; filename="${field.file.name}"`, `Content-Type: ${fileType(field)}`, "", `(contents of ${field.file.name})`);
    } else {
      lines.push(`Content-Disposition: form-data; name="${field.name}"`, "", field.value ?? "");
    }
  }
  lines.push(`--${BOUNDARY}--`);
  return lines.join("\n");
}

// "language:client" → multipart builder. Missing entries get a note.
export const MULTIPART_BUILDERS: Record<string, (request: HttpRequest) => string> = {
  "shell:curl": curl,
  "shell:wget": () => note("#", "wget cannot send multipart/form-data; use the cURL or HTTPie example."),
  "shell:httpie": httpie,
  "javascript:fetch": fetchClient(false),
  "javascript:axios": axios(false),
  "javascript:jquery": jquery,
  "javascript:xhr": xhr,
  "node:fetch": fetchClient(true),
  "node:axios": axios(true),
  "node:undici": undici,
  "node:http": () => note("//", "node:http has no multipart/form-data encoder; use the fetch or undici example."),
  "python:requests": pythonClient("requests"),
  "python:httpx": pythonClient("httpx"),
  "python:http.client": () => note("#", "http.client has no multipart/form-data encoder; use the requests or httpx example."),
  "php:curl": phpCurl,
  "php:guzzle": guzzle,
  "go:native": go,
  "java:httpclient": () => note("//", "java.net.http has no multipart/form-data encoder; use the OkHttp example."),
  "java:okhttp": javaOkHttp,
  "kotlin:okhttp": kotlinOkHttp,
  "csharp:httpclient": csharpHttpClient,
  "csharp:restsharp": restSharp,
  "ruby:native": ruby,
  "swift:urlsession": swift,
  "dart:http": dart,
  "rust:reqwest": rust,
  "c:libcurl": libcurl,
  "powershell:restmethod": powershell,
  "http:raw": rawHttp,
};

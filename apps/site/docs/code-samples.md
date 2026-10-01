# Code samples

Every operation has a ready-to-run sample in 16 languages and 30 clients, built from the same request the Try dialog sends: the selected server, parameters, body, files and credentials.

## Languages and clients

Pick the starting sample with `defaultSnippet: "language:client"`. Readers change it in the code panel; their choice is remembered.

| Language | Clients (`defaultSnippet` value) |
| --- | --- |
| Shell | cURL `shell:curl`, Wget `shell:wget`, HTTPie `shell:httpie` |
| JavaScript | fetch `javascript:fetch`, Axios `javascript:axios`, jQuery `javascript:jquery`, XHR `javascript:xhr` |
| Node.js | fetch `node:fetch`, Axios `node:axios`, undici `node:undici`, http `node:http` |
| Python | requests `python:requests`, httpx `python:httpx`, http.client `python:http.client` |
| PHP | cURL `php:curl`, Guzzle `php:guzzle` |
| Go | net/http `go:native` |
| Java | HttpClient `java:httpclient`, OkHttp `java:okhttp` |
| Kotlin | OkHttp `kotlin:okhttp` |
| C# | HttpClient `csharp:httpclient`, RestSharp `csharp:restsharp` |
| Ruby | net/http `ruby:native` |
| Swift | URLSession `swift:urlsession` |
| Dart | http `dart:http` |
| Rust | reqwest `rust:reqwest` |
| C | libcurl `c:libcurl` |
| PowerShell | Invoke-RestMethod `powershell:restmethod` |
| HTTP | Raw HTTP/1.1 `http:raw` |

The default is `shell:curl`. An unknown value falls back to the first client of the language, then to cURL.

```js
Oaspect.init("#docs", { specUrl: "/openapi.yaml", defaultSnippet: "python:requests" });
```

## What the samples contain

- The full URL with the selected server, server variables, path parameters and query string.
- Headers from parameters and from the reader's credentials (`Authorization`, API keys in headers, query or cookies).
- The body: JSON pretty-printed, form-urlencoded encoded, or `multipart/form-data` written with each client's own multipart API, with file fields pointing at a local path.

Strings are quoted for each language, so values with quotes, dollar signs, backslashes or newlines survive copy and paste. The samples are tested: JSON and multipart requests from every client are run against a live echo server.

## Clients without multipart support

Wget, Node's `http`, Python's `http.client` and Java's `java.net.http` have no multipart encoder. For multipart bodies their samples explain that and point to another client of the same language (cURL, fetch, requests, OkHttp). PHP's cURL extension cannot repeat a field name in an array; use Guzzle for repeated fields.

## Response examples

Beside the samples, each response status has its example body: from `example`, from a named entry in `examples` (with a picker when there are several), or generated from the schema.

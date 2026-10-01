// Sending requests from the viewer: straight from the browser (needs CORS on
// the API) or through the host's proxy endpoint (proxyUrl). Used by the Try
// dialog and by OAuth2 token requests.

// FormData for multipart requests: text parts plus the chosen File objects
// (aligned with request.form).
function toFormData(form, files) {
  const data = new FormData();
  form.forEach((field, index) => {
    if (field.file) data.append(field.name, files[index], field.file.name);
    else data.append(field.name, field.value ?? "");
  });
  return data;
}

async function toBase64(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

// Sends the request straight from the browser (needs CORS on the API).
export async function sendDirect(request, files) {
  const started = performance.now();
  const response = await fetch(request.url, {
    method: request.method,
    headers: request.headers,
    body: request.form ? toFormData(request.form, files) : request.body,
  });
  return {
    status: response.status,
    statusText: response.statusText,
    duration: Math.round(performance.now() - started),
    headers: [...response.headers.entries()],
    body: await response.text(),
  };
}

// Relays the request through the host's proxy endpoint (see proxyUrl).
// Multipart files travel base64-encoded inside the JSON payload.
export async function sendViaProxy(proxyUrl, request, files) {
  const payload = { ...request };
  if (request.form) {
    payload.form = await Promise.all(
      request.form.map(async (field, index) =>
        field.file ? { name: field.name, file: { ...field.file, data: await toBase64(files[index]) } } : field,
      ),
    );
  }
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (result.error) throw new Error(result.error);
  return result;
}

/** Sends `request` through the proxy when `proxyUrl` is set, else directly. */
export function sendRequest(request, { proxyUrl, files = [] } = {}) {
  return proxyUrl ? sendViaProxy(proxyUrl, request, files) : sendDirect(request, files);
}

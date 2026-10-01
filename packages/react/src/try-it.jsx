"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "./i18n/context";
import { buildRequest, defaultBody, defaultValues, isMultipart } from "@oaspect/core";
import CodeBlock, { CodeEditor } from "./code-block";
import MethodBadge, { statusTone } from "./method-badge";
import { useSettings, useSpec } from "./spec-context";
import { CloseIcon } from "./icons";


// Methods that never change server state; everything else asks first,
// because the prefilled example values would overwrite real records.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);


const LOCATIONS = [
  ["path", "Path"],
  ["query", "Query"],
  ["header", "Header"],
  ["cookie", "Cookie"],
];

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
async function sendDirect(request, files) {
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
async function sendViaProxy(proxyUrl, request, files) {
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

function prettyBody(text) {
  try {
    return { code: JSON.stringify(JSON.parse(text), null, 2), language: "json" };
  } catch {
    return { code: text, language: "text" };
  }
}

// Modal request runner: edit parameters/body and send the request from the browser.
export default function TryIt({ operation, onClose }) {
  const spec = useSpec();
  const { server, authHeaders, proxyUrl, storage } = useSettings();
  const proxyEnabled = Boolean(proxyUrl);
  const dialog = useRef(null);
  const t = useT();
  const [values, setValues] = useState(() => defaultValues(spec, operation));
  const [{ contentType, body, form = [] }, setBody] = useState(() => defaultBody(spec, operation));
  // multipart: chosen File per form part index (file parts without one are left out).
  const [chosen, setChosen] = useState({});
  const multipart = isMultipart(contentType);
  const [state, setState] = useState({ status: "idle" });
  const [skipConfirm, setSkipConfirm] = useState(() => storage.get("skip-write-confirm", null, "session") === "1");
  // "proxy" relays through proxyUrl (no CORS needed); "direct" calls from the browser.
  // When the server has the proxy disabled only "direct" is available.
  const [preferredMode, setMode] = useState(() => (storage.get("request-mode") === "direct" ? "direct" : "proxy"));
  const mode = proxyEnabled ? preferredMode : "direct";

  function changeMode(next) {
    setMode(next);
    storage.set("request-mode", next);
  }

  // No close() in cleanup: it fires the "close" event, which would call
  // onClose and immediately unmount the dialog under StrictMode's double
  // effect run. Unmounting removes the dialog anyway.
  useEffect(() => {
    const node = dialog.current;
    if (node && !node.open) node.showModal();
  }, []);

  const sent = form
    .map((field, index) => ({ field, file: chosen[index] }))
    .filter(({ field, file }) => !field.file || file)
    .map(({ field, file }) => ({ field: file ? { name: field.name, file: { name: file.name, type: file.type || undefined } } : field, file }));
  const request = buildRequest(operation, { server, values, body, form: sent.map((item) => item.field), contentType, headers: authHeaders });
  const files = sent.map((item) => item.file ?? null);

  function setFormValue(index, value) {
    setBody((current) => ({ ...current, form: current.form.map((field, i) => (i === index ? { ...field, value } : field)) }));
  }

  function setValue(location, name, value) {
    setValues((current) => ({ ...current, [location]: { ...current[location], [name]: value } }));
  }

  function send(event) {
    event.preventDefault();
    if (!SAFE_METHODS.has(request.method) && storage.get("skip-write-confirm", null, "session") !== "1") {
      setState({ status: "confirm" });
      return;
    }
    execute();
  }

  function confirmSend() {
    if (skipConfirm) storage.set("skip-write-confirm", "1", "session");
    execute();
  }

  async function execute() {
    setState({ status: "loading" });

    try {
      const result = mode === "proxy" ? await sendViaProxy(proxyUrl, request, files) : await sendDirect(request, files);
      setState({ ...result, code: result.status, status: "done" });
    } catch (error) {
      setState({ status: "error", message: error.message });
    }
  }

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(event) => event.target === dialog.current && onClose()}
      className="m-auto h-[min(90dvh,56rem)] w-[min(96vw,72rem)] overflow-hidden rounded-2xl border border-border bg-background p-0 text-foreground backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={send} className="flex h-full flex-col">
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <MethodBadge method={operation.method} />
          <code dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-sm" title={request.url}>
            {request.url}
          </code>
          <button
            type="submit"
            disabled={state.status === "loading"}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {state.status === "loading" ? t("tryIt.sending") : t("tryIt.send")}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("dialog.close")}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CloseIcon className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-2">
          <div className="min-h-0 space-y-6 overflow-y-auto border-border p-5 lg:border-e">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {t("tryIt.settingsHint")}
              </p>
              <div className="flex rounded-lg border border-border p-0.5 text-xs" role="group" aria-label={t("tryIt.mode.label")}>
                {[
                  ["proxy", "Proxy"],
                  ["direct", t("tryIt.mode.direct")],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeMode(key)}
                    disabled={key === "proxy" && !proxyEnabled}
                    aria-pressed={mode === key}
                    title={
                      key === "direct"
                        ? t("tryIt.mode.directHint")
                        : proxyEnabled
                          ? t("tryIt.mode.proxyHint")
                          : t("tryIt.mode.proxyDisabled")
                    }
                    className={`rounded-md px-2 py-1 font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      mode === key ? "bg-foreground text-background" : "text-muted-foreground enabled:hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {LOCATIONS.map(([location, label]) => {
              const params = operation.parameters.filter((param) => param.in === location);
              if (params.length === 0) return null;
              return (
                <fieldset key={location} className="space-y-2">
                  <legend className="mb-2 text-sm font-semibold">{label}</legend>
                  {params.map((param) => (
                    <label key={param.name} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-3">
                      <span className="truncate font-mono text-xs" title={param.name}>
                        {param.name}
                        {param.required && <span className="text-rose-600"> *</span>}
                      </span>
                      {param.schema?.enum ? (
                        <select
                          value={values[location]?.[param.name] ?? ""}
                          onChange={(event) => setValue(location, param.name, event.target.value)}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {param.schema.enum.map((option) => (
                            <option key={String(option)} value={String(option)}>
                              {String(option)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={values[location]?.[param.name] ?? ""}
                          required={param.required}
                          onChange={(event) => setValue(location, param.name, event.target.value)}
                          dir="ltr"
                          className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:border-primary"
                        />
                      )}
                    </label>
                  ))}
                </fieldset>
              );
            })}

            {contentType && multipart && (
              <fieldset className="space-y-2">
                <legend className="mb-2 flex w-full items-center justify-between text-sm font-semibold">
                  Body <span className="font-mono text-[11px] font-normal text-muted-foreground">{contentType}</span>
                </legend>
                {form.map((field, index) => (
                  <label key={`${field.name}-${index}`} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-3">
                    <span className="truncate font-mono text-xs" title={field.name}>
                      {field.name}
                      {field.file && <span className="ms-1 rounded bg-muted px-1 text-[10px] text-muted-foreground">file</span>}
                    </span>
                    {field.file ? (
                      <input
                        type="file"
                        onChange={(event) => setChosen((current) => ({ ...current, [index]: event.target.files?.[0] }))}
                        className="text-xs file:me-2 file:rounded-md file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-xs"
                      />
                    ) : (
                      <input
                        value={field.value ?? ""}
                        onChange={(event) => setFormValue(index, event.target.value)}
                        dir="ltr"
                        className="rounded-md border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:border-primary"
                      />
                    )}
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">{t("tryIt.fileHint")}</p>
              </fieldset>
            )}

            {contentType && !multipart && (
              <label className="block space-y-2">
                <span className="flex items-center justify-between text-sm font-semibold">
                  Body <span className="font-mono text-[11px] font-normal text-muted-foreground">{contentType}</span>
                </span>
                <CodeEditor value={body} onChange={(value) => setBody((current) => ({ ...current, body: value }))} />
              </label>
            )}
          </div>

          <div className="min-h-0 space-y-4 overflow-y-auto p-5">
            {state.status === "confirm" && (
              <div role="alertdialog" aria-labelledby="write-confirm-title" className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                <p id="write-confirm-title" className="font-semibold text-amber-800 dark:text-amber-200">
                  {t("tryIt.confirm.title")}
                </p>
                <p className="text-amber-900/80 dark:text-amber-100/80">
                  {t("tryIt.confirm.body", {
                    method: request.method,
                    host: (() => {
                      try {
                        return new URL(request.url).host;
                      } catch {
                        return request.url;
                      }
                    })(),
                  })}
                </p>
                <label className="flex items-center gap-2 text-xs text-amber-900/80 dark:text-amber-100/80">
                  <input type="checkbox" checked={skipConfirm} onChange={(event) => setSkipConfirm(event.target.checked)} />
                  {t("tryIt.confirm.skip")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={confirmSend}
                    autoFocus
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    {t("tryIt.confirm.send")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setState({ status: "idle" })}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    {t("tryIt.confirm.cancel")}
                  </button>
                </div>
              </div>
            )}
            {state.status === "idle" && (
              <p className="text-sm text-muted-foreground">{t("tryIt.idle")}</p>
            )}
            {state.status === "loading" && <p className="text-sm text-muted-foreground">{t("tryIt.waiting")}</p>}
            {state.status === "error" && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">
                {t("tryIt.failed", { message: state.message })}
                {mode === "direct" && ` — ${t("tryIt.corsHint")}`}
              </div>
            )}
            {state.status === "done" && (
              <>
                <div className="flex items-baseline gap-3">
                  <span className={`font-mono text-lg font-bold ${statusTone(String(state.code))}`}>{state.code}</span>
                  <span className="text-sm text-muted-foreground">{state.statusText}</span>
                  <span dir="ltr" className="ms-auto text-xs text-muted-foreground">{state.duration} ms</span>
                </div>
                <CodeBlock maxHeight="none" {...prettyBody(state.body)} toolbar={<span className="px-2 text-xs text-white/60">Body</span>} />
                <details className="text-xs">
                  <summary className="cursor-pointer font-semibold">Headers ({state.headers.length})</summary>
                  <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 font-mono">
                    {state.headers.map(([key, value]) => (
                      <div key={key} className="contents">
                        <dt className="text-muted-foreground">{key}</dt>
                        <dd className="break-all">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              </>
            )}
          </div>
        </div>
      </form>
    </dialog>
  );
}

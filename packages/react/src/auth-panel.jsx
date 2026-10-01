"use client";

import { useState } from "react";
import { TOKEN_FLOWS, buildTokenRequest, describeScheme } from "@oaspect/core";
import { useT } from "./i18n/context";
import Markdown from "./markdown";
import { sendRequest } from "./send";
import { useSettings } from "./spec-context";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-primary";

function Field({ label, value, onChange, secret = false, placeholder }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type={secret ? "password" : "text"}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        dir="ltr"
        className={inputClass}
      />
    </label>
  );
}

// clientCredentials / password flows: request a token from tokenUrl, through
// the proxy when there is one (token endpoints rarely allow CORS).
function TokenRequest({ name, scheme, credential }) {
  const { setCredential, proxyUrl } = useSettings();
  const t = useT();
  const flows = TOKEN_FLOWS.filter((flow) => scheme.flows?.[flow]);
  const [flow, setFlow] = useState(flows[0]);
  const [state, setState] = useState({ status: "idle" });
  if (!flow) return null;

  async function requestToken() {
    setState({ status: "loading" });
    try {
      const result = await sendRequest(buildTokenRequest(flow, scheme.flows[flow], credential ?? {}), { proxyUrl });
      const body = JSON.parse(result.body || "{}");
      if (result.status >= 400 || !body.access_token) throw new Error(body.error_description ?? body.error ?? `HTTP ${result.status}`);
      setCredential(name, { token: body.access_token });
      setState({ status: "done" });
    } catch (error) {
      setState({ status: "error", message: error.message });
    }
  }

  const set = (key) => (value) => setCredential(name, { [key]: value });
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-2">
      {flows.length > 1 && (
        <select value={flow} onChange={(event) => setFlow(event.target.value)} className={inputClass}>
          {flows.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      )}
      <Field label="client_id" value={credential?.clientId} onChange={set("clientId")} />
      <Field label="client_secret" value={credential?.clientSecret} onChange={set("clientSecret")} secret />
      {flow === "password" && (
        <>
          <Field label={t("auth.username")} value={credential?.username} onChange={set("username")} />
          <Field label={t("auth.password")} value={credential?.password} onChange={set("password")} secret />
        </>
      )}
      <Field
        label={t("auth.scopes")}
        value={credential?.scopes}
        onChange={set("scopes")}
        placeholder={Object.keys(scheme.flows[flow].scopes ?? {}).join(" ")}
      />
      <button
        type="button"
        onClick={requestToken}
        disabled={state.status === "loading"}
        className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:border-primary hover:text-primary disabled:opacity-60"
      >
        {state.status === "loading" ? t("auth.gettingToken") : t("auth.getToken")}
      </button>
      {state.status === "error" && <p className="text-xs text-rose-700 dark:text-rose-400">{t("auth.tokenFailed", { error: state.message })}</p>}
    </div>
  );
}

function SchemeFields({ name, scheme }) {
  const { credentials, setCredential } = useSettings();
  const t = useT();
  const credential = credentials[name];
  const set = (key) => (value) => setCredential(name, { [key]: value });

  if (scheme.type === "http" && String(scheme.scheme).toLowerCase() === "basic") {
    return (
      <>
        <Field label={t("auth.username")} value={credential?.username} onChange={set("username")} />
        <Field label={t("auth.password")} value={credential?.password} onChange={set("password")} secret />
      </>
    );
  }
  if (scheme.type === "apiKey") return <Field label={scheme.name} value={credential?.token} onChange={set("token")} secret />;
  if (scheme.type === "oauth2" || scheme.type === "openIdConnect") {
    return (
      <>
        <Field label={t("auth.accessToken")} value={credential?.token} onChange={set("token")} secret />
        {scheme.type === "oauth2" && <TokenRequest name={name} scheme={scheme} credential={credential} />}
        {scheme.type === "oauth2" && !TOKEN_FLOWS.some((flow) => scheme.flows?.[flow]) && (
          <p className="text-xs text-muted-foreground">{t("auth.redirectFlows")}</p>
        )}
      </>
    );
  }
  if (scheme.type === "mutualTLS") return <p className="text-xs text-muted-foreground">{t("auth.mutualTls")}</p>;
  return <Field label="Token" value={credential?.token} onChange={set("token")} secret />;
}

/** Credential inputs for every security scheme in the document. */
export default function AuthPanel({ schemes }) {
  const t = useT();
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground">{t("auth.title")}</h3>
      {Object.entries(schemes).map(([name, scheme]) => (
        <fieldset key={name} className="space-y-2 border-t border-border pt-3 first-of-type:border-t-0 first-of-type:pt-0">
          <legend className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-xs font-semibold">{name}</span>
            <span className="text-[11px] text-muted-foreground">{describeScheme(scheme)}</span>
          </legend>
          <Markdown source={scheme.description} className="text-xs text-muted-foreground" />
          <SchemeFields name={name} scheme={scheme} />
        </fieldset>
      ))}
    </div>
  );
}

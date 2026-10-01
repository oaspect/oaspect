"use client";

import { useLocalized, useT } from "./i18n/context";
import Markdown from "./markdown";
import { useSettings } from "./spec-context";
import AuthPanel from "./auth-panel";

function downloadSpec(spec) {
  const blob = new Blob([JSON.stringify(spec, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "openapi.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

export default function Intro({ spec, model }) {
  const { servers, serverIndex, setServerIndex, customServer, setCustomServer, token, setToken, selectedServer, variableValues, setVariable, securitySchemes } = useSettings();
  const hasSchemes = Object.keys(securitySchemes ?? {}).length > 0;
  const variables = Object.entries(selectedServer?.variables ?? {});
  const { info } = model;
  const t = useT();
  const localized = useLocalized();

  return (
    <section id="introduction" data-anchor className="border-b border-border pb-14 pt-10">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            {info.version && (
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium text-primary">v{info.version}</span>
            )}
            {model.openapi && (
              <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">OpenAPI {model.openapi}</span>
            )}
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight">{localized(info, "title") ?? "API"}</h1>

          {/* Stats and actions sit right under the title so a long
              description never pushes them out of sight. */}
          <dl className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md">
            {[
              [t("intro.endpoints"), model.operations.length],
              [t("intro.groups"), model.tags.length],
              [t("intro.models"), model.schemas.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-card p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <button
              type="button"
              onClick={() => downloadSpec(spec)}
              className="rounded-lg border border-border px-3 py-1.5 font-medium hover:border-primary hover:text-primary"
            >
              {t("intro.download")}
            </button>
            {info.contact?.email && (
              <a href={`mailto:${info.contact.email}`} className="rounded-lg border border-border px-3 py-1.5 hover:border-primary hover:text-primary">
                {info.contact.name ?? info.contact.email}
              </a>
            )}
          </div>

          <Markdown source={localized(info, "description")} className="mt-8 text-base text-muted-foreground" />
        </div>

        <aside className="min-w-0 space-y-4 self-start rounded-2xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">{t("connection.title")}</h2>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">{t("connection.server")}</span>
            <select
              value={serverIndex}
              onChange={(event) => setServerIndex(Number(event.target.value))}
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs"
            >
              {servers.map((server, index) => (
                <option key={server.url} value={index}>
                  {server.url}
                  {server.description ? ` — ${server.description}` : ""}
                </option>
              ))}
              <option value={-1}>{t("connection.customServer")}</option>
            </select>
          </label>
          {variables.map(([name, variable]) => (
            <label key={name} className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] items-center gap-2">
              <span className="truncate font-mono text-xs text-muted-foreground" title={variable.description ?? name}>
                {`{${name}}`}
              </span>
              {variable.enum?.length ? (
                <select
                  value={variableValues[name] ?? variable.default ?? ""}
                  onChange={(event) => setVariable(name, event.target.value)}
                  dir="ltr"
                  className="rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs"
                >
                  {variable.enum.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={variableValues[name] ?? ""}
                  placeholder={variable.default ?? ""}
                  onChange={(event) => setVariable(name, event.target.value)}
                  dir="ltr"
                  className="rounded-lg border border-border bg-background px-2 py-1 font-mono text-xs outline-none focus:border-primary"
                />
              )}
            </label>
          ))}
          {serverIndex === -1 && (
            <input
              type="url"
              value={customServer}
              onChange={(event) => setCustomServer(event.target.value)}
              placeholder="https://api.example.com"
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-primary"
            />
          )}
          {hasSchemes ? (
            <AuthPanel schemes={securitySchemes} />
          ) : (
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Bearer token</span>
            <input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder={t("connection.tokenPlaceholder")}
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-primary"
            />
          </label>
          )}
          <p className="text-xs text-muted-foreground">
            {t("connection.tokenNote")}
          </p>
        </aside>
      </div>
    </section>
  );
}

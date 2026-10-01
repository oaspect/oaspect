"use client";

import { memo, useState } from "react";
import { jsonMediaType, resolveSchema } from "@oaspect/core";
import { CopyButton } from "./code-block";
import { useLocalized, useT } from "./i18n/context";
import Markdown from "./markdown";
import MethodBadge, { statusTone } from "./method-badge";
import { RequestSample, ResponseSample } from "./samples";
import SchemaTree, { FieldDetails } from "./schema-tree";
import { useSpec } from "./spec-context";

// Titles are translation keys.
const PARAM_GROUPS = [
  ["path", "params.path"],
  ["query", "params.query"],
  ["header", "params.header"],
  ["cookie", "params.cookie"],
];

function SectionTitle({ children, aside }) {
  return (
    <div className="mb-2 mt-8 flex items-center justify-between gap-2 border-b border-border pb-2">
      <h4 className="text-sm font-semibold">{children}</h4>
      {aside}
    </div>
  );
}

function Parameters({ parameters }) {
  const spec = useSpec();
  const t = useT();
  const localized = useLocalized();

  return PARAM_GROUPS.map(([location, title]) => {
    const list = parameters.filter((param) => param.in === location);
    if (list.length === 0) return null;

    return (
      <div key={location}>
        <SectionTitle>{t(title)}</SectionTitle>
        {list.map((param) => {
          const { schema, name } = resolveSchema(spec, param.schema ?? {});
          return (
            <div key={param.name} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border py-3 first:border-t-0">
              <span className="font-mono text-sm font-semibold">{param.name}</span>
              <FieldDetails
                schema={param.example !== undefined ? { ...schema, example: param.example } : schema}
                name={name}
                description={localized(param, "description")}
                required={param.required}
                deprecated={param.deprecated}
              />
            </div>
          );
        })}
      </div>
    );
  });
}

function MediaSchema({ content }) {
  const types = Object.keys(content);
  const [type, setType] = useState(jsonMediaType(content));
  const t = useT();
  const media = content[type];

  return (
    <div>
      {types.length > 1 && (
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="mb-2 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
        >
          {types.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      )}
      {media?.schema ? <SchemaTree schema={media.schema} /> : <p className="text-sm text-muted-foreground">{t("schema.none")}</p>}
    </div>
  );
}

function ResponseRow({ response, defaultOpen }) {
  const localized = useLocalized();
  const [open, setOpen] = useState(defaultOpen);
  const hasBody = Object.keys(response.content).length > 0;
  const headers = Object.entries(response.headers);
  const expandable = hasBody || headers.length > 0;

  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        disabled={!expandable}
        onClick={() => setOpen(!open)}
        className="flex w-full items-baseline gap-3 py-3 text-start enabled:hover:text-primary"
      >
        <span className={`w-4 text-[10px] transition ${expandable ? "" : "invisible"} ${open ? "rotate-90" : "rtl:-scale-x-100"}`}>▶</span>
        <span className={`font-mono text-sm font-bold ${statusTone(response.status)}`}>{response.status}</span>
        <span dir="auto" className="text-sm text-muted-foreground">{localized(response, "description")}</span>
      </button>
      {open && expandable && (
        <div className="mb-4 ms-7 space-y-4">
          {headers.length > 0 && (
            <div>
              <p className="pb-1 text-xs font-semibold text-muted-foreground">Headers</p>
              {headers.map(([name, header]) => (
                <div key={name} className="flex flex-wrap items-baseline gap-2 py-1">
                  <span className="font-mono text-sm font-semibold">{name}</span>
                  <FieldDetails schema={header.schema ?? {}} description={localized(header, "description")} />
                </div>
              ))}
            </div>
          )}
          {hasBody && <MediaSchema content={response.content} />}
        </div>
      )}
    </div>
  );
}

function Operation({ operation, onTry }) {
  const t = useT();
  const localized = useLocalized();
  return (
    <section id={operation.anchor} data-anchor className="border-b border-border py-14">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
            <a href={`#${operation.anchor}`} className="hover:text-primary">
              {localized(operation, "summary") || operation.path}
            </a>
            {operation.deprecated && (
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                deprecated
              </span>
            )}
          </h3>
          <div dir="ltr" className="mt-3 flex items-center gap-2 overflow-hidden rounded-lg border border-border bg-card px-2 py-1.5">
            <MethodBadge method={operation.method} />
            <code className="min-w-0 flex-1 truncate font-mono text-sm">{operation.path}</code>
            <CopyButton text={operation.path} className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          </div>
          {operation.operationId && (
            <p dir="ltr" className="mt-2 text-start font-mono text-[11px] text-muted-foreground [unicode-bidi:plaintext]">operationId: {operation.operationId}</p>
          )}
          <Markdown source={localized(operation, "description")} className="mt-4" />

          <Parameters parameters={operation.parameters} />

          {operation.requestBody?.content && (
            <div>
              <SectionTitle
                aside={
                  operation.requestBody.required && (
                    <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">required</span>
                  )
                }
              >
                {t("operation.requestBody")}
              </SectionTitle>
              <Markdown source={localized(operation.requestBody, "description")} className="pb-2 text-muted-foreground" />
              <MediaSchema content={operation.requestBody.content} />
            </div>
          )}

          {operation.responses.length > 0 && (
            <div>
              <SectionTitle>{t("operation.responses")}</SectionTitle>
              {operation.responses.map((response, index) => (
                <ResponseRow key={response.status} response={response} defaultOpen={index === 0 && /^2/.test(response.status)} />
              ))}
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
          <RequestSample operation={operation} onTry={onTry ? () => onTry(operation) : null} />
          <ResponseSample operation={operation} />
        </aside>
      </div>
    </section>
  );
}

export default memo(Operation);

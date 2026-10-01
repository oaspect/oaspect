"use client";

import { memo, useState } from "react";
import { jsonMediaType, linkTarget, mediaExample, resolveSchema, securityRequirements } from "@oaspect/core";
import CodeBlock, { CopyButton } from "./code-block";
import { useLocalized, useT } from "./i18n/context";
import Markdown from "./markdown";
import MethodBadge, { statusTone } from "./method-badge";
import { RequestSample, ResponseSample } from "./samples";
import SchemaTree, { FieldDetails } from "./schema-tree";
import { useModel, useSpec } from "./spec-context";
import { ChevronIcon, LockIcon } from "./icons";

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

// Response links: where a value from this response can be used next.
function Links({ links }) {
  const t = useT();
  const model = useModel();
  const localized = useLocalized();

  return (
    <div>
      <p className="pb-1 text-xs font-semibold text-muted-foreground">{t("operation.links")}</p>
      {links.map((link) => {
        const target = model ? linkTarget(model, link) : undefined;
        const parameters = Object.entries(link.parameters);
        return (
          <div key={link.name} className="space-y-1 border-t border-border py-2 first:border-t-0">
            <div className="flex flex-wrap items-baseline gap-2 text-sm">
              <span className="font-mono font-semibold">{link.name}</span>
              <span className="text-muted-foreground">→</span>
              {target ? (
                <a href={`#${target.anchor}`} className="text-primary underline underline-offset-2">
                  {localized(target, "summary") || target.operationId || `${target.method.toUpperCase()} ${target.path}`}
                </a>
              ) : (
                <code dir="ltr" className="font-mono text-xs text-muted-foreground">{link.operationId ?? link.operationRef}</code>
              )}
            </div>
            <Markdown source={link.description} className="text-muted-foreground" />
            {parameters.length > 0 && (
              <dl dir="ltr" className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono text-xs">
                {parameters.map(([name, expression]) => (
                  <div key={name} className="contents">
                    <dt className="font-semibold">{name}</dt>
                    <dd className="break-all text-muted-foreground">{typeof expression === "string" ? expression : JSON.stringify(expression)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ResponseRow({ response, defaultOpen }) {
  const localized = useLocalized();
  const [open, setOpen] = useState(defaultOpen);
  const hasBody = Object.keys(response.content).length > 0;
  const headers = Object.entries(response.headers);
  const links = response.links ?? [];
  const expandable = hasBody || headers.length > 0 || links.length > 0;

  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        disabled={!expandable}
        onClick={() => setOpen(!open)}
        className="flex w-full items-baseline gap-3 py-3 text-start enabled:hover:text-primary"
      >
        <span className={`flex w-4 shrink-0 self-center transition ${expandable ? "" : "invisible"} ${open ? "rotate-90" : "rtl:-scale-x-100"}`}>
          <ChevronIcon />
        </span>
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
          {links.length > 0 && <Links links={links} />}
        </div>
      )}
    </div>
  );
}

// Callback requests the API makes after this operation, per runtime expression.
function Callback({ operation }) {
  const [open, setOpen] = useState(false);
  const localized = useLocalized();
  const t = useT();

  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 py-3 text-start hover:text-primary"
      >
        <span className={`flex w-4 shrink-0 transition ${open ? "rotate-90" : "rtl:-scale-x-100"}`}>
          <ChevronIcon />
        </span>
        <MethodBadge method={operation.method} size="sm" />
        <code dir="ltr" className="min-w-0 truncate font-mono text-xs">{operation.path}</code>
        <span dir="auto" className="truncate text-sm text-muted-foreground">{localized(operation, "summary")}</span>
      </button>
      {open && (
        <div className="mb-4 ms-7 space-y-3">
          <Markdown source={localized(operation, "description")} />
          {operation.requestBody?.content && (
            <div>
              <p className="pb-1 text-xs font-semibold text-muted-foreground">{t("operation.requestBody")}</p>
              <MediaSchema content={operation.requestBody.content} />
            </div>
          )}
          {operation.responses.length > 0 && (
            <div>
              <p className="pb-1 text-xs font-semibold text-muted-foreground">{t("operation.responses")}</p>
              {operation.responses.map((response) => (
                <ResponseRow key={response.status} response={response} defaultOpen={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Webhooks: the payload the API sends, in place of request samples.
function PayloadSample({ operation }) {
  const spec = useSpec();
  const t = useT();
  const content = operation.requestBody?.content;
  const type = jsonMediaType(content);
  if (!type) return null;
  const example = mediaExample(spec, content[type]);
  if (example === undefined) return null;

  return (
    <CodeBlock
      code={typeof example === "string" ? example : JSON.stringify(example, null, 2)}
      toolbar={<span className="px-1 text-xs font-medium text-white/60">{t("webhooks.payload")}</span>}
    />
  );
}

// "Requires: a or b + c" from the operation's security requirements.
function SecurityLine({ operation }) {
  const t = useT();
  const requirements = securityRequirements(operation);
  if (!requirements.length) return null;
  const optional = requirements.some((requirement) => requirement.schemes.length === 0);
  const alternatives = requirements.filter((requirement) => requirement.schemes.length);

  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <LockIcon className="size-3.5" />
      <span>{t("operation.security")}</span>
      {alternatives.map((requirement, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span>{t("operation.securityOr")}</span>}
          <code dir="ltr" className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
            {requirement.schemes.map((name) => (requirement.scopes[name]?.length ? `${name} (${requirement.scopes[name].join(", ")})` : name)).join(" + ")}
          </code>
        </span>
      ))}
      {optional && <span>({t("operation.securityOptional")})</span>}
    </p>
  );
}

function Operation({ operation, onTry }) {
  const t = useT();
  const localized = useLocalized();
  const webhook = operation.kind === "webhook";
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
          <SecurityLine operation={operation} />
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

          {operation.callbacks?.length > 0 && (
            <div>
              <SectionTitle>{t("operation.callbacks")}</SectionTitle>
              {operation.callbacks.map((callback) => (
                <div key={callback.name}>
                  <p className="pt-2 font-mono text-xs font-semibold text-muted-foreground">{callback.name}</p>
                  {callback.operations.map((item) => (
                    <Callback key={item.anchor} operation={item} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-20 xl:self-start">
          {webhook ? (
            <PayloadSample operation={operation} />
          ) : (
            <>
              <RequestSample operation={operation} onTry={onTry ? () => onTry(operation) : null} />
              <ResponseSample operation={operation} />
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

export default memo(Operation);

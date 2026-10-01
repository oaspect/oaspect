"use client";

import { useMemo, useState } from "react";
import { buildRequest, defaultBody, defaultValues, jsonMediaType, mediaExample, mediaExamples, resolveSnippet, SNIPPET_LANGUAGES } from "@oaspect/core";
import { useT } from "./i18n/context";
import CodeBlock, { ToolbarTab } from "./code-block";
import { statusTone } from "./method-badge";
import { useSettings, useSpec } from "./spec-context";

// Compact <select> styled to sit in the dark code toolbar.
function ToolbarSelect({ label, value, options, onChange }) {
  return (
    <select
      aria-label={label}
      title={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="shrink-0 cursor-pointer rounded-md border border-white/10 bg-white/5 py-1 ps-2 pe-7 text-xs font-medium text-white outline-none transition hover:bg-white/10 focus:border-white/30 [&>option]:bg-neutral-900"
    >
      {options.map(([key, text]) => (
        <option key={key} value={key}>
          {text}
        </option>
      ))}
    </select>
  );
}

export function RequestSample({ operation, onTry }) {
  const spec = useSpec();
  const { server, authHeaders, language, setLanguage } = useSettings();
  const t = useT();

  const request = useMemo(
    () =>
      buildRequest(operation, {
        server,
        values: defaultValues(spec, operation),
        ...defaultBody(spec, operation),
        headers: authHeaders,
      }),
    [spec, operation, server, authHeaders],
  );

  const { language: current, client } = resolveSnippet(language);
  const selectLanguage = (key) => setLanguage(resolveSnippet(key).selection);

  return (
    <CodeBlock
      language={current.highlight}
      code={client.build(request)}
      toolbar={
        <>
          <ToolbarSelect
            label={t("snippets.language")}
            value={current.key}
            onChange={selectLanguage}
            options={SNIPPET_LANGUAGES.map((item) => [item.key, item.label])}
          />
          {current.clients.length > 1 && (
            <ToolbarSelect
              label={t("snippets.client")}
              value={client.key}
              onChange={(key) => setLanguage(`${current.key}:${key}`)}
              options={current.clients.map((item) => [item.key, item.label])}
            />
          )}
        </>
      }
      actions={
        onTry && (
        <button
          type="button"
          onClick={onTry}
          className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          {t("tryIt.open")} ▶
        </button>
        )
      }
    />
  );
}

export function ResponseSample({ operation }) {
  const spec = useSpec();
  const withBody = operation.responses.filter((response) => jsonMediaType(response.content));
  const [status, setStatus] = useState(withBody[0]?.status);
  const [exampleKey, setExampleKey] = useState(null);

  if (withBody.length === 0) return null;

  const response = withBody.find((item) => item.status === status) ?? withBody[0];
  const media = response.content[jsonMediaType(response.content)];
  const named = mediaExamples(spec, media);
  const selected = named.find((item) => item.key === exampleKey) ?? named[0];
  const value = selected ? selected.value : mediaExample(spec, media);

  return (
    <div className="space-y-2">
      <CodeBlock
        code={value === undefined ? "" : JSON.stringify(value, null, 2)}
        toolbar={withBody.map((item) => (
          <ToolbarTab
            key={item.status}
            active={item.status === response.status}
            onClick={() => {
              setStatus(item.status);
              setExampleKey(null);
            }}
          >
            <span className={item.status === response.status ? "" : statusTone(item.status)}>{item.status}</span>
          </ToolbarTab>
        ))}
      />
      {named.length > 1 && (
        <select
          value={selected?.key}
          onChange={(event) => setExampleKey(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        >
          {named.map((item) => (
            <option key={item.key} value={item.key}>
              {item.summary}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

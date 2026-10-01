"use client";

import { useState } from "react";
import { childrenOf, constraintsOf, modelAnchor, resolveSchema, typeLabel } from "@oaspect/core";
import { useLocalized, useT } from "./i18n/context";
import Markdown from "./markdown";
import { useSpec } from "./spec-context";
import { ChevronIcon } from "./icons";

// Chips hold technical values (patterns, dates, enums): always LTR and
// isolated so an RTL UI does not reorder their characters.
function Chip({ children, className = "" }) {
  return (
    <span dir="ltr" className={`rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground ${className}`}>
      {children}
    </span>
  );
}

const formatValue = (value) => (typeof value === "string" ? `"${value}"` : JSON.stringify(value));

// Type line, flags, description, enum and constraints for one field.
export function FieldDetails({ schema, name, description, required, deprecated, extra }) {
  const spec = useSpec();
  const t = useT();
  const localized = useLocalized();
  const constraints = constraintsOf(schema);
  const text = description ?? localized(schema, "description");

  return (
    <>
      <span dir="ltr" className="font-mono text-xs text-muted-foreground">
        {name && schema.properties ? (
          <a href={`#${modelAnchor(name)}`} className="hover:text-primary">
            {typeLabel(spec, schema, name)}
          </a>
        ) : (
          typeLabel(spec, schema, name)
        )}
      </span>
      {required && <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400">required</span>}
      {schema.nullable && <Chip>nullable</Chip>}
      {schema.readOnly && <Chip>read-only</Chip>}
      {schema.writeOnly && <Chip>write-only</Chip>}
      {(deprecated || schema.deprecated) && (
        <Chip className="!bg-amber-500/15 !text-amber-700 dark:!text-amber-300">deprecated</Chip>
      )}
      {extra}

      {(text || schema.enum || constraints.length > 0 || schema.pattern || schema.default !== undefined || schema.example !== undefined) && (
        <div className="basis-full space-y-2 pt-1">
          <Markdown source={text} className="text-muted-foreground" />
          {schema.enum && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>{t("schema.values")}</span>
              {schema.enum.map((value) => (
                <Chip key={String(value)}>{formatValue(value)}</Chip>
              ))}
            </div>
          )}
          {(constraints.length > 0 || schema.pattern) && (
            <div className="flex flex-wrap gap-1">
              {constraints.map((item) => (
                <Chip key={item}>{item}</Chip>
              ))}
              {schema.pattern && <Chip>pattern: {schema.pattern}</Chip>}
            </div>
          )}
          {schema.default !== undefined && (
            <div className="text-xs text-muted-foreground">
              {t("schema.default")} <Chip>{formatValue(schema.default)}</Chip>
            </div>
          )}
          {schema.example !== undefined && (
            <div className="text-xs text-muted-foreground">
              {t("schema.example")} <Chip>{formatValue(schema.example)}</Chip>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function PropertyRow({ name, raw, required, depth, seen }) {
  const spec = useSpec();
  const { schema, name: refName } = resolveSchema(spec, raw);
  const circular = refName && seen.has(refName);
  const nested = circular ? null : childrenOf(spec, schema);
  const [open, setOpen] = useState(false);
  const t = useT();

  return (
    <div className="border-t border-border py-3 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {nested ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="flex items-baseline gap-1 font-mono text-sm font-semibold hover:text-primary"
          >
            <span className={`inline-flex self-center transition ${open ? "rotate-90" : "rtl:-scale-x-100"}`}>
              <ChevronIcon className="size-3" />
            </span>
            {name}
          </button>
        ) : (
          <span className="font-mono text-sm font-semibold">{name}</span>
        )}
        <FieldDetails
          schema={schema}
          name={refName}
          required={required}
          extra={circular && <Chip>↻ {t("schema.circular")}</Chip>}
        />
      </div>
      {nested && open && (
        <div className="ms-1 mt-3 border-s-2 border-border ps-4">
          <SchemaBody schema={schema} nested={nested} depth={depth + 1} seen={refName ? new Set(seen).add(refName) : seen} />
        </div>
      )}
    </div>
  );
}

function SchemaBody({ schema, nested, depth, seen }) {
  const spec = useSpec();
  const [variant, setVariant] = useState(0);
  const t = useT();

  if (nested.kind === "properties") {
    const required = new Set(schema.required ?? []);
    return (
      <div>
        {Object.entries(schema.properties).map(([key, value]) => (
          <PropertyRow key={key} name={key} raw={value} required={required.has(key)} depth={depth} seen={seen} />
        ))}
      </div>
    );
  }

  if (nested.kind === "items" || nested.kind === "map") {
    const inner = childrenOf(spec, nested.schema);
    return (
      <div>
        <p className="pb-2 text-xs text-muted-foreground">
          {nested.kind === "items" ? t("schema.arrayItem") : t("schema.mapValue")}: <span dir="ltr" className="font-mono">{nested.name ?? typeLabel(spec, nested.schema)}</span>
        </p>
        <SchemaBody
          schema={nested.schema}
          nested={inner}
          depth={depth}
          seen={nested.name ? new Set(seen).add(nested.name) : seen}
        />
      </div>
    );
  }

  // oneOf / anyOf
  const current = nested.variants[variant] ?? nested.variants[0];
  const inner = childrenOf(spec, current.schema);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 pb-2">
        <span className="text-xs text-muted-foreground">{nested.kind}:</span>
        {nested.variants.map((item, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setVariant(index)}
            className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition ${
              index === variant ? "border-primary text-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.name ?? item.schema.title ?? typeLabel(spec, item.schema)}
          </button>
        ))}
      </div>
      {inner ? (
        <SchemaBody schema={current.schema} nested={inner} depth={depth} seen={seen} />
      ) : (
        <div className="flex flex-wrap items-baseline gap-2 py-2">
          <FieldDetails schema={current.schema} name={current.name} />
        </div>
      )}
    </div>
  );
}

// Renders a schema as an expandable field tree (objects, arrays, oneOf...).
// `modelName` seeds cycle detection when rendering a component schema directly.
export default function SchemaTree({ schema: raw, modelName }) {
  const spec = useSpec();
  const localized = useLocalized();
  const resolved = resolveSchema(spec, raw);
  const { schema } = resolved;
  const name = resolved.name ?? modelName;
  const nested = childrenOf(spec, schema);
  const seen = name ? new Set([name]) : new Set();

  if (!nested) {
    return (
      <div className="flex flex-wrap items-baseline gap-2 py-2">
        <FieldDetails schema={schema} name={name} />
      </div>
    );
  }

  return (
    <div>
      {schema.description && <Markdown source={localized(schema, "description")} className="pb-2 text-muted-foreground" />}
      <SchemaBody schema={schema} nested={nested} depth={0} seen={seen} />
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useLocalized, useT } from "./i18n/context";
import MethodBadge from "./method-badge";
import { ChevronIcon } from "./icons";
import { markdownOutline } from "./outline";

// Matches the translated and the authored text (so English search terms
// keep working in another UI language), descriptions and parameter names.
// Descriptions are searched as plain text; ":::lang" markers do not matter.
function matches(operation, query, localized) {
  return [
    localized(operation, "summary"),
    operation.summary,
    localized(operation, "description"),
    operation.description,
    operation.path,
    operation.method,
    operation.operationId,
    tagNames(operation),
    ...operation.parameters.map((parameter) => parameter.name),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

const tagNames = (operation) => operation.tags.join(" ");

// CSS.escape where available (not in every DOM implementation).
const cssEscape = (value) => (globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&"));

function matchesSchema(item, query, localized) {
  return [item.name, localized(item.schema, "description"), item.schema.description, item.schema.title]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

// Outline entries whose heading (or one of its sections) contains the query.
function filterOutline(entries, query) {
  return entries
    .map((entry) => {
      if (entry.text.toLowerCase().includes(query)) return entry;
      const sections = entry.sections.filter((section) => section.text.toLowerCase().includes(query));
      return sections.length ? { ...entry, sections } : null;
    })
    .filter(Boolean);
}

const anchorsOf = (entry) => [entry.anchor, ...entry.sections.map((section) => section.anchor)];

export default function Sidebar({ model, activeAnchor, searchRef, onNavigate, showModels = true }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [modelsOpen, setModelsOpen] = useState(false);
  const listRef = useRef(null);
  const t = useT();
  const locale = useLocale();
  const localized = useLocalized();
  const normalized = query.trim().toLowerCase();

  // Headings of the introduction: entries of their own after "Introduction".
  const introSource = localized(model.info, "description");
  const introOutline = useMemo(() => markdownOutline(introSource, locale, "introduction"), [introSource, locale]);

  // Tags with the headings of their descriptions (guide tags have only
  // those), then webhooks as one more group.
  const groups = useMemo(() => {
    const tags = model.tags.map((tag) => ({ ...tag, sections: markdownOutline(localized(tag, "description"), locale, tag.anchor) }));
    return model.webhooks?.length
      ? [...tags, { name: "webhooks", label: t("webhooks.title"), anchor: "webhooks", operations: model.webhooks, sections: [] }]
      : tags;
  }, [model.tags, model.webhooks, locale, localized, t]);

  const intro = useMemo(() => (normalized ? filterOutline(introOutline, normalized) : introOutline), [introOutline, normalized]);

  const tags = useMemo(() => {
    if (!normalized) return groups;
    return groups
      .map((tag) => ({
        ...tag,
        operations: tag.operations.filter((op) => matches(op, normalized, localized)),
        sections: filterOutline(tag.sections, normalized),
      }))
      .filter((tag) => tag.operations.length > 0 || tag.sections.length > 0);
  }, [groups, normalized, localized]);

  const schemas = useMemo(
    () => (normalized ? model.schemas.filter((item) => matchesSchema(item, normalized, localized)) : model.schemas),
    [model.schemas, normalized, localized],
  );

  const activeTag = groups.find(
    (tag) =>
      tag.anchor === activeAnchor ||
      tag.sections.some((entry) => anchorsOf(entry).includes(activeAnchor)) ||
      tag.operations.some((op) => op.anchor === activeAnchor),
  )?.name;
  const inModels = activeAnchor?.startsWith("model/");

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-nav="${cssEscape(activeAnchor ?? "")}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeAnchor]);

  function toggle(name) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const linkClass = (anchor) =>
    `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
      anchor === activeAnchor ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  const headerClass = (anchor) =>
    `flex min-w-0 flex-1 items-center rounded-md px-2 py-1.5 text-start text-sm font-medium transition ${
      anchor === activeAnchor ? "bg-primary/10 text-primary" : "hover:bg-muted"
    }`;

  // A sidebar group: a header that links to its section, a chevron that
  // shows or hides the entries under it. A plain render function, not a
  // component, so its entries are not remounted on every render.
  function group({ key, id, anchor, label, open, children }) {
    return (
      <div key={key}>
        <div className="flex items-center gap-0.5">
          <a href={`#${anchor}`} data-nav={anchor} onClick={onNavigate} className={headerClass(anchor)}>
            <span dir="auto" className="truncate">{label}</span>
          </a>
          {children && (
            <button
              type="button"
              onClick={() => toggle(id)}
              aria-expanded={open}
              aria-label={label}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
            >
              <span className={`block transition ${open ? "rotate-90" : "rtl:-scale-x-100"}`}>
                <ChevronIcon />
              </span>
            </button>
          )}
        </div>
        {children && open && <div className="mb-2 ms-2 space-y-0.5 border-s border-border ps-2">{children}</div>}
      </div>
    );
  }

  const sectionLinks = (entries, nested = false) =>
    entries.map((entry) => (
      <div key={entry.anchor}>
        <a href={`#${entry.anchor}`} data-nav={entry.anchor} onClick={onNavigate} className={linkClass(entry.anchor)}>
          <span dir="auto" className="truncate">{entry.text}</span>
        </a>
        {!nested && entry.sections?.length > 0 && <div className="ms-2 space-y-0.5 border-s border-border ps-2">{sectionLinks(entry.sections, true)}</div>}
      </div>
    ));

  return (
    <nav className="flex h-full flex-col" aria-label={t("sidebar.label")}>
      <div className="p-3">
        <div className="relative">
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("sidebar.search")}
            className="w-full rounded-lg border border-border bg-background py-1.5 ps-3 pe-12 text-sm outline-none focus:border-primary"
          />
          <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
        {!normalized && (
          <a href="#introduction" data-nav="introduction" onClick={onNavigate} className={linkClass("introduction")}>
            {t("sidebar.introduction")}
          </a>
        )}

        {intro.map((entry) => {
          const open = Boolean(normalized) || expanded.has(entry.anchor) || anchorsOf(entry).includes(activeAnchor);
          return group({ key: entry.anchor, id: entry.anchor, anchor: entry.anchor, label: entry.text, open, children: entry.sections.length > 0 && sectionLinks(entry.sections, true) });
        })}

        {tags.map((tag) => {
          const open = Boolean(normalized) || expanded.has(tag.name) || tag.name === activeTag;
          const hasEntries = tag.sections.length > 0 || tag.operations.length > 0;
          return group({
            key: tag.name,
            id: tag.name,
            anchor: tag.anchor,
            label: tag.label ?? localized(tag, "name"),
            open,
            children: hasEntries && (
              <>
                {sectionLinks(tag.sections)}
                {tag.operations.map((op) => (
                  <a key={op.anchor} href={`#${op.anchor}`} data-nav={op.anchor} onClick={onNavigate} className={linkClass(op.anchor)}>
                    <MethodBadge method={op.method} size="sm" />
                    <span dir="auto" title={localized(op, "summary") || op.path} className={`truncate text-start ${op.deprecated ? "line-through" : ""}`}>{localized(op, "summary") || op.path}</span>
                  </a>
                ))}
              </>
            ),
          });
        })}

        {showModels && schemas.length > 0 && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setModelsOpen(!modelsOpen)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
            >
              {t("models.title")} ({schemas.length})
              <span className={`transition ${modelsOpen || normalized || inModels ? "rotate-90" : "rtl:-scale-x-100"}`}>
                <ChevronIcon />
              </span>
            </button>
            {(modelsOpen || normalized || inModels) && (
              <div className="ms-2 space-y-0.5 border-s border-border ps-2">
                {schemas.map((item) => (
                  <a key={item.name} href={`#${item.anchor}`} data-nav={item.anchor} onClick={onNavigate} className={linkClass(item.anchor)}>
                    <span dir="ltr" className="truncate font-mono text-xs">{item.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {normalized && intro.length === 0 && tags.length === 0 && schemas.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">{t("sidebar.noResults")}</p>
        )}
      </div>
    </nav>
  );
}

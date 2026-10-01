"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalized, useT } from "./i18n/context";
import MethodBadge from "./method-badge";

// Matches both the translated and the authored summary, so English search
// terms keep working in another UI language.
function matches(operation, query, localized) {
  return [localized(operation, "summary"), operation.summary, operation.path, operation.method, operation.operationId]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

export default function Sidebar({ model, activeAnchor, searchRef, onNavigate, showModels = true }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [modelsOpen, setModelsOpen] = useState(false);
  const listRef = useRef(null);
  const t = useT();
  const localized = useLocalized();
  const normalized = query.trim().toLowerCase();

  const tags = useMemo(() => {
    if (!normalized) return model.tags;
    return model.tags
      .map((tag) => ({ ...tag, operations: tag.operations.filter((op) => matches(op, normalized, localized)) }))
      .filter((tag) => tag.operations.length > 0);
  }, [model.tags, normalized, localized]);

  const schemas = useMemo(
    () => (normalized ? model.schemas.filter((item) => item.name.toLowerCase().includes(normalized)) : model.schemas),
    [model.schemas, normalized],
  );

  const activeTag = model.tags.find(
    (tag) => tag.anchor === activeAnchor || tag.operations.some((op) => op.anchor === activeAnchor),
  )?.name;
  const inModels = activeAnchor?.startsWith("model/");

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-nav="${CSS.escape(activeAnchor ?? "")}"]`)
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

        {tags.map((tag) => {
          const open = Boolean(normalized) || expanded.has(tag.name) || tag.name === activeTag;
          return (
            <div key={tag.name}>
              <button
                type="button"
                onClick={() => toggle(tag.name)}
                aria-expanded={open}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-sm font-medium hover:bg-muted"
              >
                {localized(tag, "name")}
                <span className={`text-[10px] text-muted-foreground transition ${open ? "rotate-90" : "rtl:-scale-x-100"}`}>▶</span>
              </button>
              {open && (
                <div className="mb-2 ms-2 space-y-0.5 border-s border-border ps-2">
                  {tag.operations.map((op) => (
                    <a key={op.anchor} href={`#${op.anchor}`} data-nav={op.anchor} onClick={onNavigate} className={linkClass(op.anchor)}>
                      <MethodBadge method={op.method} size="sm" />
                      <span dir="auto" title={localized(op, "summary") || op.path} className={`truncate text-start ${op.deprecated ? "line-through" : ""}`}>{localized(op, "summary") || op.path}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {showModels && schemas.length > 0 && (
          <div className="pt-4">
            <button
              type="button"
              onClick={() => setModelsOpen(!modelsOpen)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted"
            >
              {t("models.title")} ({schemas.length})
              <span className={`text-[10px] transition ${modelsOpen || normalized || inModels ? "rotate-90" : "rtl:-scale-x-100"}`}>▶</span>
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

        {normalized && tags.length === 0 && schemas.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">{t("sidebar.noResults")}</p>
        )}
      </div>
    </nav>
  );
}

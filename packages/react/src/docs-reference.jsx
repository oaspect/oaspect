"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { anchorHeadings, buildDocs, headingsOf, resolveDocLink, searchDocs } from "@oaspect/core";
import { LocaleProvider, useLocale, useT } from "./i18n/context";
import { directionOf, mergeMessages } from "./i18n/index";
import { LanguageToggle, ThemeToggle } from "./header-controls";
import { MenuIcon } from "./icons";
import { scrollToAnchor } from "./lazy";
import Markdown, { LinkResolverContext } from "./markdown";
import { createStorage } from "./storage";

// Developer docs viewer: a folder of Markdown files (bundled as
// { files: [{ path, content }] }) shown like Docsify: one page at a time,
// navigation from _sidebar.md or the folders, search across every page.
//
// Routes live in the hash so any static host works: #/<slug>, and
// #/<slug>?id=<heading> for a heading. Heading elements get "doc/<id>".

const HEADING_PREFIX = "doc";

const DEFAULT_FEATURES = { search: true, languageSwitcher: true, themeToggle: true };

function parseRoute(hash) {
  const value = decodeURIComponent(String(hash ?? "").replace(/^#/, ""));
  if (!value.startsWith("/")) return { slug: "" };
  const [path, query = ""] = value.slice(1).split("?");
  const id = new URLSearchParams(query).get("id") ?? undefined;
  return { slug: path.replace(/\/+$/, ""), ...(id ? { id } : {}) };
}

export const docRoute = (slug, id) => `#/${slug}${id ? `?id=${encodeURIComponent(id)}` : ""}`;

function systemTheme() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

// h2/h3 of a page, for the "On this page" list and the sidebar.
function pageOutline(page) {
  if (!page) return [];
  return headingsOf(anchorHeadings(page.blocks, HEADING_PREFIX, 3))
    .filter((heading) => heading.level === 2 || heading.level === 3)
    .map((heading) => ({ ...heading, id: heading.anchor.slice(HEADING_PREFIX.length + 1) }));
}

function DocsViewer({ docs, docsUrl, title, logo, storagePrefix, editUrl, features: featureProps, theme: themeProp }) {
  const t = useT();
  const locale = useLocale();
  const features = { ...DEFAULT_FEATURES, ...featureProps };
  const storage = useMemo(() => createStorage(storagePrefix), [storagePrefix]);

  const [bundle, setBundle] = useState(docs ?? null);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState({ slug: "" });
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(themeProp ?? null);
  const [activeId, setActiveId] = useState(null);
  const searchRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (docs) {
      setBundle(docs);
      return;
    }
    if (!docsUrl) return;
    let cancelled = false;
    setError(null);
    fetch(docsUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`${docsUrl} → HTTP ${response.status}`);
        return response.json();
      })
      .then((value) => !cancelled && setBundle(value))
      .catch((reason) => !cancelled && setError(reason.message));
    return () => {
      cancelled = true;
    };
  }, [docs, docsUrl]);

  // Theme: forced by the host, else the reader's stored choice, the page's
  // own data-theme, or the system setting.
  useEffect(() => {
    if (!themeProp) setTheme(storage.get("theme") ?? document.documentElement.dataset.theme ?? systemTheme());
  }, [storage, themeProp]);
  const changeTheme = useCallback(
    (next) => {
      setTheme(next);
      storage.set("theme", next);
      if (document.documentElement.hasAttribute("data-theme")) document.documentElement.dataset.theme = next;
    },
    [storage],
  );

  // Hash routing.
  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash));
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // ⌘K / Ctrl+K focuses the search.
  useEffect(() => {
    function onKey(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSidebarOpen(true);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const model = useMemo(() => (bundle ? buildDocs(bundle, locale) : null), [bundle, locale]);
  const page = model ? (model.pages.find((item) => item.slug === route.slug) ?? (route.slug === "" ? model.pages[0] : null)) : null;
  const outline = useMemo(() => pageOutline(page), [page]);
  const results = useMemo(() => (model && query.trim() ? searchDocs(model, query) : []), [model, query]);
  const index = page ? model.pages.indexOf(page) : -1;
  const previous = index > 0 ? model.pages[index - 1] : null;
  const next = index >= 0 && index < model.pages.length - 1 ? model.pages[index + 1] : null;
  const edit = page && (editUrl ?? model?.editUrl) ? (editUrl ?? model.editUrl).replace("{path}", page.path) : null;
  const heading = title ?? model?.title ?? "";

  // A new page starts at its top, or at the heading in the route.
  useEffect(() => {
    if (!page) return;
    if (route.id) scrollToAnchor(`${HEADING_PREFIX}/${route.id}`);
    else window.scrollTo(0, 0);
    setActiveId(route.id ?? null);
  }, [page, route.id]);

  useEffect(() => {
    if (page) document.title = page.title === heading ? heading : `${page.title} · ${heading}`;
  }, [page, heading]);

  // "On this page" follows the scroll: the last heading above the header line.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || outline.length === 0) return;
    const nodes = outline.map((item) => document.getElementById(item.anchor)).filter(Boolean);
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = null;
      for (const node of nodes) {
        if (node.getBoundingClientRect().top > 96) break;
        current = node.id.slice(HEADING_PREFIX.length + 1);
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [outline]);

  // Links between pages: "setup.md#install" → #/setup?id=install; "#install" stays on the page.
  const resolveLink = useCallback(
    (href) => {
      if (!page) return undefined;
      if (/^#[^/]/.test(href)) return docRoute(page.slug, href.slice(1));
      const target = resolveDocLink(page.path, href);
      return target ? docRoute(target.slug, target.id) : undefined;
    },
    [page],
  );

  const navigate = useCallback(() => {
    setSidebarOpen(false);
    setQuery("");
  }, []);

  const linkClass = (active) =>
    `flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition ${
      active ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <div className="oaspect" data-theme={theme ?? undefined} dir={directionOf(locale)} lang={locale}>
      <div className="min-h-dvh bg-background text-foreground">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
          <a
            href="#oaspect-content"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById("oaspect-content")?.focus();
            }}
            className="absolute start-2 top-2 z-50 -translate-y-20 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground focus:translate-y-0"
          >
            {t("header.skip")}
          </a>
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={t("header.menu")} className="rounded-lg border border-border p-2 lg:hidden">
            <MenuIcon className="size-4" />
          </button>
          <a href="#/" className="flex min-w-0 items-center gap-2">
            {logo ?? <span className="truncate text-sm font-semibold">{heading}</span>}
          </a>
          {logo && heading && <span className="hidden truncate text-sm text-muted-foreground md:inline">{heading}</span>}
          <div className="ms-auto flex items-center gap-2">
            {features.languageSwitcher && <LanguageToggle />}
            {features.themeToggle && <ThemeToggle theme={theme} onChange={changeTheme} />}
          </div>
        </header>

        {error ? (
          <p className="p-8 text-sm text-red-700 dark:text-red-400">{t("docs.loadFailed", { error })}</p>
        ) : !model ? (
          <p className="p-8 text-sm text-muted-foreground">{t("spec.loading")}</p>
        ) : (
          <div className="flex">
            <aside
              className={`${sidebarOpen ? "fixed inset-y-0 start-0 top-14 z-20 w-80 max-w-[85vw]" : "hidden"} border-e border-border bg-background lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:w-72 lg:shrink-0`}
            >
              <nav className="flex h-full flex-col" aria-label={t("sidebar.label")}>
                {features.search && (
                  <div className="p-3">
                    <div className="relative">
                      <input
                        ref={searchRef}
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={t("docs.search")}
                        className="w-full rounded-lg border border-border bg-background py-1.5 ps-3 pe-12 text-sm outline-none focus:border-primary"
                      />
                      {!query && <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 text-[10px] text-muted-foreground">⌘K</kbd>}
                    </div>
                  </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
                  {query.trim() ? (
                    results.length ? (
                      <ul className="space-y-1">
                        {results.map((result) => (
                          <li key={`${result.slug}:${result.id ?? ""}`}>
                            <a href={docRoute(result.slug, result.id)} onClick={navigate} className="block rounded-md px-2 py-2 hover:bg-muted">
                              <span dir="auto" className="block text-sm font-medium">
                                {result.title}
                                {result.heading && <span className="text-muted-foreground"> › {result.heading}</span>}
                              </span>
                              {result.snippet && <span dir="auto" className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{result.snippet}</span>}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="px-2 py-4 text-sm text-muted-foreground">{t("sidebar.noResults")}</p>
                    )
                  ) : (
                    model.groups.map((group) => (
                      <div key={group.label || "top"} className="mb-4">
                        {group.label && <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>}
                        <ul className="space-y-0.5">
                          {group.pages.map((item) => (
                            <li key={item.path}>
                              <a href={docRoute(item.slug)} onClick={navigate} className={linkClass(item === page)} aria-current={item === page ? "page" : undefined}>
                                <span dir="auto" className="truncate">{item.title}</span>
                              </a>
                              {item === page && outline.some((entry) => entry.level === 2) && (
                                <ul className="mb-1 ms-2 mt-0.5 space-y-0.5 border-s border-border ps-2">
                                  {outline
                                    .filter((entry) => entry.level === 2)
                                    .map((entry) => (
                                      <li key={entry.id}>
                                        <a href={docRoute(item.slug, entry.id)} onClick={navigate} className={linkClass(entry.id === activeId)}>
                                          <span dir="auto" className="truncate">{entry.text}</span>
                                        </a>
                                      </li>
                                    ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </nav>
            </aside>
            {sidebarOpen && <div className="fixed inset-0 top-14 z-10 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

            <main id="oaspect-content" tabIndex={-1} ref={contentRef} className="min-w-0 flex-1 px-4 py-10 outline-none sm:px-8 xl:px-12">
              <div className="mx-auto flex max-w-6xl gap-12">
                <article className="min-w-0 max-w-3xl flex-1">
                  {page ? (
                    <LinkResolverContext.Provider value={resolveLink}>
                      <Markdown key={page.path} blocks={page.blocks} anchorPrefix={HEADING_PREFIX} page />
                    </LinkResolverContext.Provider>
                  ) : (
                    <p className="text-muted-foreground">{t("docs.notFound")}</p>
                  )}

                  {page && (
                    <div className="mt-14 space-y-6 border-t border-border pt-6">
                      {edit && (
                        <a href={edit} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-primary">
                          {t("docs.edit")}
                        </a>
                      )}
                      <nav className="grid gap-3 sm:grid-cols-2" aria-label={t("docs.pages")}>
                        {previous && (
                          <a href={docRoute(previous.slug)} className="rounded-xl border border-border px-4 py-3 hover:border-primary">
                            <span className="block text-xs text-muted-foreground">{t("docs.previous")}</span>
                            <span dir="auto" className="font-medium">{previous.title}</span>
                          </a>
                        )}
                        {next && (
                          <a href={docRoute(next.slug)} className="rounded-xl border border-border px-4 py-3 text-end hover:border-primary sm:col-start-2">
                            <span className="block text-xs text-muted-foreground">{t("docs.next")}</span>
                            <span dir="auto" className="font-medium">{next.title}</span>
                          </a>
                        )}
                      </nav>
                    </div>
                  )}
                </article>

                {outline.length > 1 && (
                  <aside className="hidden w-56 shrink-0 xl:block" aria-label={t("docs.onThisPage")}>
                    <div className="sticky top-24">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("docs.onThisPage")}</p>
                      <ul className="space-y-1 border-s border-border">
                        {outline.map((entry) => (
                          <li key={entry.id}>
                            <a
                              href={docRoute(page.slug, entry.id)}
                              dir="auto"
                              className={`-ms-px block border-s py-0.5 text-sm transition ${entry.level === 3 ? "ps-6" : "ps-3"} ${
                                entry.id === activeId ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {entry.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </aside>
                )}
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Developer docs: a folder of Markdown files as a small documentation site.
 *
 * @param {import("./index").DocsReferenceProps} props
 */
export function DocsReference({
  docs,
  docsUrl,
  title,
  logo,
  locale,
  defaultLocale = "en",
  onLocaleChange,
  messages,
  storagePrefix = "oaspect-docs",
  editUrl,
  features,
  theme,
}) {
  const merged = useMemo(() => mergeMessages(messages), [messages]);
  return (
    <LocaleProvider locale={locale} defaultLocale={defaultLocale} onLocaleChange={onLocaleChange} messages={merged}>
      <DocsViewer docs={docs} docsUrl={docsUrl} title={title} logo={logo} storagePrefix={storagePrefix} editUrl={editUrl} features={features} theme={theme} />
    </LocaleProvider>
  );
}

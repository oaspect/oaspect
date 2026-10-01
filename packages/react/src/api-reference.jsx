"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applySecurity, buildModel, loadSpecText, normalizeSpec, securityRequirements, serverUrl } from "@oaspect/core";
import { LocaleProvider, useAvailableLocales, useLocale, useLocalized, useSetLocale, useT } from "./i18n/context";
import { LOCALE_NAMES, directionOf, mergeMessages } from "./i18n/index";
import { createStorage } from "./storage";
import Intro from "./intro";
import Markdown from "./markdown";
import Models from "./models";
import Operation from "./operation";
import Sidebar from "./sidebar";
import { ModelContext, SettingsContext, SpecContext } from "./spec-context";
import TryIt from "./try-it";
import { MenuIcon, MoonIcon, SunIcon } from "./icons";

// Header a spec endpoint can send to say it served a fallback copy, e.g.
// when the live document was unreachable. The viewer then shows a notice.
export const SPEC_SOURCE_HEADER = "x-oaspect-spec-source";

// Errors are kept as translation keys (or { key, params }) and translated
// when rendered, so they follow later language switches too.

function LanguageToggle() {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const locales = useAvailableLocales();
  const t = useT();

  return (
    // The native select sits invisibly on top: the button shows the short
    // code ("TR"), the opened list shows full language names.
    <label
      title={t("header.language")}
      className="relative flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span className="uppercase">{locale}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
        aria-label={t("header.language")}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {LOCALE_NAMES[item] ?? item}
          </option>
        ))}
      </select>
    </label>
  );
}

function ThemeToggle({ theme, onChange }) {
  const t = useT();

  return (
    <button
      type="button"
      onClick={() => onChange(theme === "dark" ? "light" : "dark")}
      aria-label={t("header.theme")}
      title={t("header.theme")}
      className="rounded-lg border border-border p-2 text-muted-foreground hover:text-foreground"
    >
      <MoonIcon className="size-4 dark:hidden" />
      <SunIcon className="hidden size-4 dark:block" />
    </button>
  );
}

function SourceMenu({ source, defaultLabel, onUrl, onFile, onDefault }) {
  const [draft, setDraft] = useState(source.type === "url" ? source.url : "");
  const fileInput = useRef(null);
  const menu = useRef(null);
  const close = () => menu.current?.removeAttribute("open");
  const t = useT();

  return (
    <details ref={menu} className="relative">
      <summary
        title={t("source.title")}
        className="flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M10 13l-2 2 2 2M14 13l2 2-2 2" />
        </svg>
        <span className="hidden sm:inline">{t("source.title")}</span>
      </summary>
      <div className="absolute end-0 z-40 mt-2 w-80 space-y-3 rounded-xl border border-border bg-background p-4 shadow-xl">
        <button
          type="button"
          onClick={() => {
            onDefault();
            close();
          }}
          className={`block w-full rounded-lg border px-3 py-2 text-start text-sm ${
            source.type === "default" ? "border-primary text-primary" : "border-border hover:border-primary"
          }`}
        >
          {t("source.default")}
          {defaultLabel && <span className="block truncate font-mono text-[11px] text-muted-foreground">{defaultLabel}</span>}
        </button>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.trim()) {
              onUrl(draft.trim());
              close();
            }
          }}
          className="space-y-2"
        >
          <input
            type="url"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="https://…/swagger.json"
            dir="ltr"
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs outline-none focus:border-primary"
          />
          <button type="submit" className="w-full rounded-lg border border-border px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
            {t("source.loadUrl")}
          </button>
        </form>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-sm hover:border-primary hover:text-primary"
        >
          {source.type === "file" ? t("source.file", { name: source.name }) : t("source.chooseFile")}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,.yaml,.yml,application/json,application/yaml,text/yaml"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              onFile(file);
              close();
            }
          }}
        />
      </div>
    </details>
  );
}

function systemTheme() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

const DEFAULT_FEATURES = {
  sourceMenu: true,
  languageSwitcher: true,
  themeToggle: true,
  tryIt: true,
  models: true,
};

function Viewer({
  spec: inlineSpec,
  specUrl,
  title,
  logo,
  storagePrefix,
  proxyUrl,
  features: featureOverrides,
  defaultSnippet,
  urlParam,
  theme: themeProp,
}) {
  const features = { ...DEFAULT_FEATURES, ...featureOverrides };
  const storage = useMemo(() => createStorage(storagePrefix), [storagePrefix]);
  const rootRef = useRef(null);
  const locale = useLocale();

  const [source, setSource] = useState({ type: "pending" });
  // Inline documents are normalized too (Swagger 2.0 → OpenAPI 3).
  const normalizedInline = useMemo(() => (inlineSpec ? normalizeSpec(inlineSpec) : null), [inlineSpec]);
  const [spec, setSpec] = useState(normalizedInline);
  const [error, setError] = useState("");
  // True when the spec endpoint answered with SPEC_SOURCE_HEADER: fallback.
  const [usingFallback, setUsingFallback] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState("introduction");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tryOperation, setTryOperation] = useState(null);
  const searchRef = useRef(null);
  const t = useT();
  const localized = useLocalized();

  const [serverIndex, setServerIndex] = useState(0);
  const [customServer, setCustomServer] = useState("");
  // Server variable values per server index: { 0: { region: "us" } }.
  const [serverVariables, setServerVariables] = useState({});
  const [token, setToken] = useState("");
  // Credentials per security scheme name (components.securitySchemes).
  const [credentials, setCredentials] = useState({});
  const [language, setLanguage] = useState(defaultSnippet);
  // null until mounted: the host's own data-theme (if any) applies meanwhile,
  // so a server-rendered page does not flash the wrong theme.
  const [theme, setTheme] = useState(themeProp ?? null);

  // Restore per-browser preferences and the ?url= source after hydration.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from browser-only state */
    setToken(storage.get("token", ""));
    try {
      setCredentials(JSON.parse(storage.get("credentials", "{}")) ?? {});
    } catch {
      // Ignore unreadable stored credentials.
    }
    setLanguage(storage.get("language", defaultSnippet));
    if (!themeProp) setTheme(storage.get("theme") ?? document.documentElement.dataset.theme ?? systemTheme());
    const url = urlParam ? new URLSearchParams(window.location.search).get(urlParam) : null;
    setSource(url ? { type: "url", url } : { type: "default" });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storage, defaultSnippet, urlParam, themeProp]);

  useEffect(() => storage.set("token", token), [storage, token]);
  useEffect(() => storage.set("credentials", Object.keys(credentials).length ? JSON.stringify(credentials) : null), [storage, credentials]);
  useEffect(() => storage.set("language", language), [storage, language]);

  function changeTheme(next) {
    setTheme(next);
    storage.set("theme", next);
    // Hosts that theme <html data-theme> (e.g. with a no-flash script) stay in
    // sync, otherwise their attribute would keep matching the dark: variant.
    if (document.documentElement.hasAttribute("data-theme")) document.documentElement.dataset.theme = next;
  }

  // Inline specs need no fetching; specUrl and ?url= sources do. File
  // sources are loaded directly in loadFile().
  useEffect(() => {
    if (source.type === "default" && normalizedInline) {
      /* eslint-disable react-hooks/set-state-in-effect -- adopting a new inline spec */
      setSpec(normalizedInline);
      setUsingFallback(false);
      setError("");
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    if (source.type !== "default" && source.type !== "url") return;
    const url = source.type === "url" ? source.url : specUrl;
    if (!url) return;
    let cancelled = false;

    if (urlParam) {
      const params = new URLSearchParams(window.location.search);
      if (source.type === "url") params.set(urlParam, url);
      else params.delete(urlParam);
      const search = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
    }

    fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
        return { text: await response.text(), fallback: response.headers.get(SPEC_SOURCE_HEADER) === "fallback" };
      })
      .then(({ text, fallback }) => {
        // JSON or YAML; Swagger 2.0 is converted to OpenAPI 3.
        const json = loadSpecText(text);
        if (!cancelled) {
          setSpec(json);
          setUsingFallback(fallback);
          setError("");
        }
      })
      .catch((err) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
    };
  }, [source, specUrl, normalizedInline, urlParam]);

  async function loadFile(file) {
    try {
      const json = loadSpecText(await file.text());
      setSource({ type: "file", name: file.name });
      setSpec(json);
      setUsingFallback(false);
      setError("");
    } catch (err) {
      setError({ key: "spec.unreadableFile", params: { name: file.name, error: err.message } });
    }
  }

  const model = useMemo(() => (spec ? buildModel(spec) : null), [spec]);

  // Reset the server choice whenever a new spec is loaded.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived reset on spec change
    setServerIndex(0);
  }, [model]);

  const schemes = useMemo(() => model?.securitySchemes ?? {}, [model]);

  const settings = useMemo(() => {
    const servers = model?.servers ?? [];
    const selected = serverIndex === -1 ? { url: customServer } : servers[serverIndex] ?? servers[0];
    const variableValues = serverVariables[serverIndex] ?? {};
    // Variables are resolved here so requests and samples see a plain URL.
    const server = selected ? { url: serverUrl(selected, variableValues) } : undefined;
    return {
      servers,
      server,
      selectedServer: selected,
      variableValues,
      setVariable: (name, value) =>
        setServerVariables((current) => ({ ...current, [serverIndex]: { ...current[serverIndex], [name]: value } })),
      serverIndex,
      setServerIndex,
      customServer,
      setCustomServer,
      token,
      setToken,
      credentials,
      setCredential: (name, patch) => setCredentials((current) => ({ ...current, [name]: { ...current[name], ...patch } })),
      securitySchemes: schemes,
      // Headers, query parameters and cookies an operation needs. Without
      // securitySchemes in the document, the generic Bearer token applies.
      authFor: (operation) =>
        Object.keys(schemes).length
          ? applySecurity(schemes, securityRequirements(operation), credentials)
          : { headers: token ? { Authorization: `Bearer ${token}` } : {}, query: {}, cookies: {} },
      language,
      setLanguage,
      proxyUrl,
      storage,
      features,
    };
    // features is rebuilt each render from props; its fields are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, schemes, serverIndex, customServer, serverVariables, token, credentials, language, proxyUrl, storage, features.tryIt]);

  // Scroll spy: the section crossing the band under the header is active.
  useEffect(() => {
    if (!model || !rootRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length) setActiveAnchor(visible[visible.length - 1].target.id);
      },
      { rootMargin: "-72px 0px -70% 0px" },
    );
    rootRef.current.querySelectorAll("[data-anchor]").forEach((node) => observer.observe(node));

    const target = decodeURIComponent(window.location.hash.slice(1));
    if (target) document.getElementById(target)?.scrollIntoView();

    return () => observer.disconnect();
  }, [model]);

  // ⌘K / Ctrl+K focuses the sidebar search.
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

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openTry = useCallback((operation) => setTryOperation(operation), []);
  const heading = title ?? (model ? localized(model.info, "title") : "");

  return (
    <SpecContext.Provider value={spec}>
      <ModelContext.Provider value={model}>
      <SettingsContext.Provider value={settings}>
        {/* .oaspect scopes the stylesheet and carries theme, direction and
            language; layout utilities live on the inner element because
            scoped selectors only match descendants. */}
        <div ref={rootRef} className="oaspect" data-theme={theme ?? undefined} dir={directionOf(locale)} lang={locale}>
        <div className="min-h-dvh bg-background text-foreground">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={t("header.menu")}
              className="rounded-lg border border-border p-2 lg:hidden"
            >
              <MenuIcon className="size-4" />
            </button>
            <a href="#introduction" className="flex min-w-0 items-center gap-2">
              {logo ?? <span className="truncate text-sm font-semibold">{heading}</span>}
            </a>
            {model && logo && (
              <span className="hidden truncate text-sm text-muted-foreground md:inline">
                {heading} <span className="font-mono text-xs">v{model.info.version}</span>
              </span>
            )}
            <div className="ms-auto flex items-center gap-2">
              {features.sourceMenu && source.type !== "pending" && (
                <SourceMenu
                  key={`${source.type}:${source.url ?? source.name ?? ""}`}
                  source={source}
                  defaultLabel={specUrl}
                  onDefault={() => setSource({ type: "default" })}
                  onUrl={(url) => setSource({ type: "url", url })}
                  onFile={loadFile}
                />
              )}
              {features.languageSwitcher && <LanguageToggle />}
              {features.themeToggle && <ThemeToggle theme={theme} onChange={changeTheme} />}
            </div>
          </header>

          {error && (
            <div className="border-b border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-700 dark:text-rose-300">
              {t("spec.loadFailed", { error: typeof error === "string" ? t(error) : t(error.key, error.params) })}
            </div>
          )}

          {usingFallback && source.type === "default" && (
            <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
              {t("spec.fallback")}
            </div>
          )}

          {!model ? (
            !error && <p className="p-10 text-center text-sm text-muted-foreground">{t("spec.loading")}</p>
          ) : (
            <div className="flex">
              <aside
                className={`fixed inset-y-0 start-0 top-14 z-20 w-72 shrink-0 border-e border-border bg-card transition-transform lg:sticky lg:h-[calc(100dvh-3.5rem)] lg:translate-x-0 lg:rtl:translate-x-0 ${
                  sidebarOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full"
                }`}
              >
                <Sidebar model={model} activeAnchor={activeAnchor} searchRef={searchRef} onNavigate={closeSidebar} showModels={features.models} />
              </aside>
              {sidebarOpen && (
                <div className="fixed inset-0 top-14 z-10 bg-black/30 lg:hidden" onClick={closeSidebar} aria-hidden="true" />
              )}

              <main className="min-w-0 flex-1 px-4 sm:px-8 xl:px-12">
                <div className="mx-auto max-w-[88rem]">
                  <Intro spec={spec} model={model} />
                  {model.tags.map((tag) => (
                    <section key={tag.name} id={tag.anchor} data-anchor className="pt-14">
                      <h2 className="text-3xl font-bold tracking-tight [overflow-wrap:anywhere]">{localized(tag, "name")}</h2>
                      <Markdown source={localized(tag, "description")} className="mt-3 max-w-3xl text-muted-foreground" />
                      {tag.operations.map((operation) => (
                        <Operation key={operation.anchor} operation={operation} onTry={features.tryIt ? openTry : null} />
                      ))}
                    </section>
                  ))}
                  {model.webhooks.length > 0 && (
                    <section id="webhooks" data-anchor className="pt-14">
                      <h2 className="text-3xl font-bold tracking-tight">{t("webhooks.title")}</h2>
                      <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{t("webhooks.hint")}</p>
                      {model.webhooks.map((operation) => (
                        <Operation key={operation.anchor} operation={operation} onTry={null} />
                      ))}
                    </section>
                  )}
                  {features.models && <Models schemas={model.schemas} />}
                </div>
              </main>
            </div>
          )}

          {tryOperation && <TryIt key={tryOperation.anchor} operation={tryOperation} onClose={() => setTryOperation(null)} />}
        </div>
        </div>
      </SettingsContext.Provider>
      </ModelContext.Provider>
    </SpecContext.Provider>
  );
}

/**
 * Interactive API reference for an OpenAPI 3.x document.
 *
 * @param {import("./index").ApiReferenceProps} props
 */
export function ApiReference({
  spec,
  specUrl,
  title,
  logo,
  locale,
  defaultLocale = "en",
  onLocaleChange,
  messages,
  storagePrefix = "oaspect",
  proxyUrl = null,
  features,
  defaultSnippet = "shell:curl",
  urlParam = "url",
  theme,
}) {
  const merged = useMemo(() => mergeMessages(messages), [messages]);

  return (
    <LocaleProvider locale={locale} defaultLocale={defaultLocale} onLocaleChange={onLocaleChange} messages={merged}>
      <Viewer
        spec={spec}
        specUrl={specUrl}
        title={title}
        logo={logo}
        storagePrefix={storagePrefix}
        proxyUrl={proxyUrl}
        features={features}
        defaultSnippet={defaultSnippet}
        urlParam={urlParam}
        theme={theme}
      />
    </LocaleProvider>
  );
}

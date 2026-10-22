// Standalone build: React and the viewer in one script for any web page.
//
//   <div id="docs"></div>
//   <script src="https://cdn.jsdelivr.net/npm/oaspect"></script>
//   <script>Oaspect.init("#docs", { specUrl: "/openapi.json" })</script>
//
// or declaratively:
//
//   <oaspect-reference spec-url="/openapi.json"></oaspect-reference>
//   <script src="https://cdn.jsdelivr.net/npm/oaspect" data-spec-url="/openapi.json"></script>
//
// Developer docs (Markdown) the same ways: Oaspect.docs("#docs", { docsUrl }),
// <oaspect-docs docs-url="/dev-docs.json">, or data-docs-url on the script.
import { ApiReference, DocsReference } from "@oaspect/react";
import css from "@oaspect/react/styles.css";
import { createRoot, hydrateRoot } from "react-dom/client";
import { toProps } from "./props";

const VERSION = process.env.OASPECT_VERSION;
const STYLE_ID = "oaspect-styles";

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  // First in <head>: the page's own stylesheets come later, so its overrides
  // (.oaspect { --oaspect-primary: … }) win at equal specificity.
  document.head.prepend(style);
}

/**
 * Mounts the viewer into `target` (element or selector).
 * @returns {{ update(config: object): void, destroy(): void }}
 */
function mount(Component, name, target, config) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) throw new Error(`Oaspect.${name}: ${target} not found`);

  injectStyles();
  const root = createRoot(element);
  root.render(<Component {...toProps(config)} />);

  return controls(root, config, Component);
}

export function init(target, config) {
  return mount(ApiReference, "init", target, config);
}

/**
 * Mounts the developer docs viewer: { docsUrl } (a JSON bundle, e.g. from
 * `oaspect docs bundle`) or { docs: { files: [{ path, content }] } }.
 * @returns {{ update(config: object): void, destroy(): void }}
 */
export function docs(target, config) {
  return mount(DocsReference, "docs", target, config);
}

function controls(root, initial, Component = ApiReference) {
  let current = initial;
  return {
    update(next) {
      current = { ...current, ...next };
      root.render(<Component {...toProps(current)} />);
    },
    destroy() {
      root.unmount();
    },
  };
}

/**
 * Attaches to markup prerendered by `oaspect build` (renderToHtml) instead of
 * rendering from scratch. `config` must match the one used for prerendering.
 */
export function hydrate(target, config) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) throw new Error(`Oaspect.hydrate: ${target} not found`);
  injectStyles();
  const props = toProps(config);
  return controls(hydrateRoot(element, <ApiReference {...props} />), config);
}

// Attribute (kebab-case) → config key. Booleans for features use
// hide="try-it,models,source-menu,language-switcher,theme-toggle".
const ATTRIBUTES = {
  "spec-url": "specUrl",
  title: "title",
  locale: "locale",
  "default-locale": "defaultLocale",
  "proxy-url": "proxyUrl",
  "storage-prefix": "storagePrefix",
  "default-snippet": "defaultSnippet",
  "docs-url": "docsUrl",
  "edit-url": "editUrl",
  theme: "theme",
};
const FEATURES = {
  "try-it": "tryIt",
  models: "models",
  "source-menu": "sourceMenu",
  "language-switcher": "languageSwitcher",
  "theme-toggle": "themeToggle",
  search: "search",
};

function configFrom(get) {
  const config = {};
  for (const [attribute, key] of Object.entries(ATTRIBUTES)) {
    const value = get(attribute);
    if (value !== null && value !== undefined) config[key] = value;
  }
  const logo = get("logo");
  if (logo) config.logo = { light: logo, dark: get("logo-dark") ?? undefined, alt: get("logo-alt") ?? "", label: get("logo-label") ?? undefined };
  const hide = get("hide");
  if (hide) {
    config.features = {};
    for (const name of hide.split(",").map((item) => item.trim())) if (FEATURES[name]) config.features[FEATURES[name]] = false;
  }
  return config;
}

// <oaspect-reference> (property `spec`) and <oaspect-docs> (property `docs`):
// attributes are the kebab-case options; changing one re-renders.
function defineElement(tag, mountFn, dataKey) {
  if (typeof customElements === "undefined" || customElements.get(tag)) return;
  customElements.define(
    tag,
    class extends HTMLElement {
      static get observedAttributes() {
        return [...Object.keys(ATTRIBUTES), "logo", "logo-dark", "logo-alt", "logo-label", "hide"];
      }

      #instance = null;
      #data = undefined;

      set [dataKey](value) {
        this.#data = value;
        this.#render();
      }

      get [dataKey]() {
        return this.#data;
      }

      connectedCallback() {
        this.#render();
      }

      disconnectedCallback() {
        this.#instance?.destroy();
        this.#instance = null;
      }

      attributeChangedCallback() {
        if (this.#instance) this.#render();
      }

      #render() {
        if (!this.isConnected) return;
        const config = { ...configFrom((name) => this.getAttribute(name)), ...(this.#data ? { [dataKey]: this.#data } : {}) };
        if (this.#instance) this.#instance.update(config);
        else this.#instance = mountFn(this, config);
      }
    },
  );
}

defineElement("oaspect-reference", init, "spec");
defineElement("oaspect-docs", docs, "docs");

// <script src="oaspect.js" data-spec-url="…"> (or data-docs-url="…") mounts
// itself into #oaspect, or into a new element after the script.
const script = typeof document !== "undefined" ? document.currentScript : null;
if (script?.dataset.specUrl || script?.dataset.docsUrl) {
  const auto = () => {
    let target = document.getElementById("oaspect");
    if (!target) {
      target = document.createElement("div");
      script.after(target);
    }
    (script.dataset.docsUrl ? docs : init)(target, configFrom((name) => script.getAttribute(`data-${name}`)));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto);
  else auto();
}

export { VERSION as version };

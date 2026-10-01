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
import { ApiReference } from "@oaspect/react";
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
  document.head.append(style);
}

/**
 * Mounts the viewer into `target` (element or selector).
 * @returns {{ update(config: object): void, destroy(): void }}
 */
export function init(target, config) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) throw new Error(`Oaspect.init: ${target} not found`);

  injectStyles();
  const root = createRoot(element);
  root.render(<ApiReference {...toProps(config)} />);

  return controls(root, config);
}

function controls(root, initial) {
  let current = initial;
  return {
    update(next) {
      current = { ...current, ...next };
      root.render(<ApiReference {...toProps(current)} />);
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
  theme: "theme",
};
const FEATURES = {
  "try-it": "tryIt",
  models: "models",
  "source-menu": "sourceMenu",
  "language-switcher": "languageSwitcher",
  "theme-toggle": "themeToggle",
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

class OaspectReference extends HTMLElement {
  static get observedAttributes() {
    return [...Object.keys(ATTRIBUTES), "logo", "logo-dark", "logo-alt", "logo-label", "hide"];
  }

  #instance = null;
  #spec = undefined;

  /** OpenAPI document object (alternative to the spec-url attribute). */
  set spec(value) {
    this.#spec = value;
    this.#render();
  }

  get spec() {
    return this.#spec;
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
    const config = { ...configFrom((name) => this.getAttribute(name)), ...(this.#spec ? { spec: this.#spec } : {}) };
    if (this.#instance) this.#instance.update(config);
    else this.#instance = init(this, config);
  }
}

if (typeof customElements !== "undefined" && !customElements.get("oaspect-reference")) {
  customElements.define("oaspect-reference", OaspectReference);
}

// <script src="oaspect.js" data-spec-url="…"> mounts itself into #oaspect,
// or into a new element after the script.
const script = typeof document !== "undefined" ? document.currentScript : null;
if (script?.dataset.specUrl) {
  const mount = () => {
    let target = document.getElementById("oaspect");
    if (!target) {
      target = document.createElement("div");
      script.after(target);
    }
    init(target, configFrom((name) => script.getAttribute(`data-${name}`)));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
}

export { VERSION as version };

import type { ReactNode } from "react";
import type { OpenAPIDocument } from "@oaspect/core";

/** Message overrides or additional languages: { tr: { "sidebar.search": "…" } }. */
export type Messages = Record<string, Record<string, string>>;

export interface ApiReferenceFeatures {
  /** "Source" menu: switch to another URL or a local file. Default true. */
  sourceMenu?: boolean;
  /** UI language switcher. Default true. */
  languageSwitcher?: boolean;
  /** Light/dark toggle. Default true. */
  themeToggle?: boolean;
  /** "Try" request runner. Default true. */
  tryIt?: boolean;
  /** Models section and sidebar entries. Default true. */
  models?: boolean;
}

export interface ApiReferenceProps {
  /** OpenAPI document as an object. Takes precedence over specUrl. */
  spec?: OpenAPIDocument;
  /** URL of the OpenAPI JSON document. */
  specUrl?: string;
  /** Title shown in the header; defaults to info.title (localized). */
  title?: string;
  /** Logo shown in the header instead of the title. */
  logo?: ReactNode;
  /** UI language (controlled). Use with onLocaleChange. */
  locale?: string;
  /** Initial UI language when uncontrolled. Default "en". */
  defaultLocale?: string;
  /** Called when the reader picks another language. */
  onLocaleChange?: (locale: string) => void;
  /** Extra languages or overrides of built-in messages. */
  messages?: Messages;
  /** Prefix for localStorage/sessionStorage keys. Default "oaspect". */
  storagePrefix?: string;
  /**
   * Endpoint that relays "Try" requests server-side (no CORS needed).
   * null (default) offers only direct browser requests.
   */
  proxyUrl?: string | null;
  features?: ApiReferenceFeatures;
  /** Initial code sample as "language:client", e.g. "python:requests". Default "shell:curl". */
  defaultSnippet?: string;
  /** Query parameter that loads a spec URL (?url=…). null disables it. Default "url". */
  urlParam?: string | null;
  /** Force a theme instead of the reader's stored or system preference. */
  theme?: "light" | "dark";
}

export declare function ApiReference(props: ApiReferenceProps): ReactNode;

/** Response header a spec endpoint sets to "fallback" when it served a fallback copy. */
export declare const SPEC_SOURCE_HEADER: "x-oaspect-spec-source";

export interface LogoProps {
  /** Logo image URL (light theme, or both themes when `dark` is omitted). */
  light: string;
  /** Logo image URL for the dark theme. */
  dark?: string;
  alt?: string;
  /** Text shown next to the logo on wider screens, e.g. "API Docs". */
  label?: string;
}

/** Header logo with an optional dark-theme variant; pass it as `logo`. */
export declare function Logo(props: LogoProps): ReactNode;

export declare const BUILT_IN_MESSAGES: Messages;
export declare const LOCALE_NAMES: Record<string, string>;
export declare function directionOf(locale: string): "ltr" | "rtl";

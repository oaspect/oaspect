"use client";

import { LOCALE_NAMES } from "./i18n/index";
import { useAvailableLocales, useLocale, useSetLocale, useT } from "./i18n/context";
import { MoonIcon, SunIcon } from "./icons";

// Header controls shared by the API reference and the docs viewer.

export function LanguageToggle() {
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

export function ThemeToggle({ theme, onChange }) {
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

"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { localize } from "@oaspect/core";
import { translate } from "./index";

const LocaleContext = createContext({
  locale: "en",
  setLocale: () => {},
  messages: {},
});

// Controlled when `locale` is given (the host owns it and listens to
// onLocaleChange), uncontrolled otherwise.
export function LocaleProvider({ locale: controlled, defaultLocale = "en", onLocaleChange, messages, children }) {
  const [uncontrolled, setUncontrolled] = useState(defaultLocale);
  const locale = controlled ?? uncontrolled;

  const setLocale = useCallback(
    (next) => {
      if (controlled === undefined) setUncontrolled(next);
      onLocaleChange?.(next);
    },
    [controlled, onLocaleChange],
  );

  const value = useMemo(() => ({ locale, setLocale, messages }), [locale, setLocale, messages]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext).locale;
}

export function useSetLocale() {
  return useContext(LocaleContext).setLocale;
}

export function useAvailableLocales() {
  return Object.keys(useContext(LocaleContext).messages);
}

export function useT() {
  const { locale, messages } = useContext(LocaleContext);
  return useCallback((key, params) => translate(messages, locale, key, params), [locale, messages]);
}

// Spec text for the UI locale: localized(node, "summary") reads x-i18n first.
export function useLocalized() {
  const locale = useLocale();
  return useCallback((node, field) => localize(node, field, locale), [locale]);
}

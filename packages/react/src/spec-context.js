"use client";

import { createContext, useContext } from "react";

export const SpecContext = createContext(null);

export function useSpec() {
  return useContext(SpecContext);
}

// Viewer-wide request settings (selected server, auth token) shared by the
// code samples and the request runner.
export const SettingsContext = createContext(null);

export function useSettings() {
  return useContext(SettingsContext);
}

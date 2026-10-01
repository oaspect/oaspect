import { ApiReference } from "@oaspect/react";
import "@oaspect/react/styles.css";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

// Sample documents covering the viewer's features.
const SPECS = {
  "Bookstore (OpenAPI 3.0)": "/specs/bookstore.json",
  "Petstore (Swagger 2.0, YAML)": "/specs/petstore-swagger2.yaml",
  "Events (3.1: webhooks, callbacks, links)": "/specs/events.json",
  "Auth (security schemes)": "/specs/auth.json",
  "Split files (external $refs)": "/specs/split/main.yaml",
  "Swagger Petstore (live)": "https://petstore.swagger.io/v2/swagger.json",
};

function Playground() {
  const [specUrl, setSpecUrl] = useState(Object.values(SPECS)[0]);
  const [locale, setLocale] = useState("en");

  return (
    <>
      <div style={{ display: "flex", gap: 8, padding: 8, font: "13px system-ui", background: "#111", color: "#eee" }}>
        <strong>playground</strong>
        <select value={specUrl} onChange={(event) => setSpecUrl(event.target.value)}>
          {Object.entries(SPECS).map(([label, url]) => (
            <option key={url} value={url}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <ApiReference key={specUrl} specUrl={specUrl} locale={locale} onLocaleChange={setLocale} storagePrefix="oaspect-playground" urlParam={null} />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Playground />
  </StrictMode>,
);

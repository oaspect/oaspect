"use client";

import { useEffect, useId, useRef, useState } from "react";
import CodeBlock from "./code-block";

// Mermaid diagrams (```mermaid blocks). Mermaid is large, so it is loaded from
// jsDelivr only when a page has a diagram. Until then, and if it fails, the
// source shows as a code block, which is also what prerendered HTML holds.
const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

let loading = null;
function loadMermaid() {
  loading ??= import(/* @vite-ignore */ /* webpackIgnore: true */ MERMAID_URL).then((module) => module.default);
  return loading;
}

export default function Mermaid({ code }) {
  const [svg, setSvg] = useState(null);
  const ref = useRef(null);
  const id = `oaspect-mermaid-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    let cancelled = false;
    const dark = ref.current?.closest("[data-theme]")?.getAttribute("data-theme") === "dark";
    loadMermaid()
      .then(async (mermaid) => {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: dark ? "dark" : "default" });
        const result = await mermaid.render(id, code);
        if (!cancelled) setSvg(result.svg);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  return (
    <div ref={ref}>
      {svg ? (
        // Mermaid's own sanitized output (securityLevel "strict").
        <div className="overflow-x-auto rounded-xl border border-border bg-background p-4 [&_svg]:mx-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <CodeBlock code={code} language="text" />
      )}
    </div>
  );
}

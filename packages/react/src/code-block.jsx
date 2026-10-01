"use client";

import { useRef, useState } from "react";
import { useT } from "./i18n/context";
import { tokenize } from "@oaspect/core";

export function Highlighted({ code, language }) {
  return tokenize(code, language).map((token, index) =>
    token.type ? (
      <span key={index} className={`syntax-${token.type}`}>
        {token.text}
      </span>
    ) : (
      token.text
    ),
  );
}

export function CopyButton({ text, className = "" }) {
  const [copied, setCopied] = useState(false);
  const t = useT();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable (insecure context); nothing to do.
    }
  }

  const label = copied ? t("copy.copied") : t("copy.copy");

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md transition ${className} ${
        copied ? "!text-emerald-500" : ""
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {copied ? (
          <path d="M20 6 9 17l-5-5" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
    </button>
  );
}

// `toolbar` sits on the left and scrolls sideways if it ever gets too wide;
// `actions` stay pinned on the right next to the copy button.
export default function CodeBlock({ code, language = "json", toolbar, actions, maxHeight = "28rem" }) {
  return (
    // Code reads left-to-right even when the UI is RTL.
    <div dir="ltr" className="overflow-hidden rounded-xl border border-border bg-code text-code-foreground">
      <div className="flex items-center gap-2 border-b border-white/10 px-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
          {toolbar}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <CopyButton text={code} className="text-white/60 hover:bg-white/10 hover:text-white" />
        </div>
      </div>
      <pre className="overflow-auto p-4 font-mono text-xs leading-relaxed" style={{ maxHeight }}>
        <code>
          <Highlighted code={code} language={language} />
        </code>
      </pre>
    </div>
  );
}

export function ToolbarTab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2 py-1 text-xs font-medium transition ${
        active ? "bg-white/15 text-white" : "text-white/55 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

// Textarea with a highlighted <pre> layered underneath it. The textarea text
// is transparent so only the caret and selection come from it.
export function CodeEditor({ value, onChange, language = "json", rows = 14 }) {
  const layer = useRef(null);
  const shared = "m-0 whitespace-pre-wrap break-words p-3 font-mono text-xs leading-relaxed";

  return (
    <div dir="ltr" className="relative overflow-hidden rounded-lg border border-border bg-code text-code-foreground focus-within:border-primary">
      <pre ref={layer} aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${shared}`}>
        <Highlighted code={`${value}\n`} language={language} />
      </pre>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          layer.current.scrollTop = event.target.scrollTop;
        }}
        spellCheck={false}
        rows={rows}
        className={`relative block w-full resize-y bg-transparent text-transparent caret-white outline-none selection:bg-white/25 ${shared}`}
      />
    </div>
  );
}

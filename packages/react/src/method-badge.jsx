const METHOD_STYLES = {
  get: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  post: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  put: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  patch: "bg-violet-500/15 text-violet-800 dark:text-violet-300",
  delete: "bg-rose-500/15 text-rose-800 dark:text-rose-300",
};

export default function MethodBadge({ method, size = "md" }) {
  const sizing = size === "sm" ? "w-12 text-[10px] py-0.5" : "px-2 py-1 text-xs";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-mono font-bold uppercase ${sizing} ${
        METHOD_STYLES[method] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {method === "delete" && size === "sm" ? "del" : method}
    </span>
  );
}

// Status code colors. `onDark` is for the always-dark code blocks, where the
// light-theme shades would not reach WCAG AA contrast.
export function statusTone(status, { onDark = false } = {}) {
  if (onDark) {
    if (/^2/.test(status)) return "text-emerald-400";
    if (/^3/.test(status)) return "text-sky-400";
    if (/^4/.test(status)) return "text-amber-400";
    if (/^5/.test(status)) return "text-rose-400";
    return "text-white/60";
  }
  if (/^2/.test(status)) return "text-emerald-700 dark:text-emerald-400";
  if (/^3/.test(status)) return "text-sky-700 dark:text-sky-400";
  if (/^4/.test(status)) return "text-amber-700 dark:text-amber-400";
  if (/^5/.test(status)) return "text-rose-700 dark:text-rose-400";
  return "text-muted-foreground";
}

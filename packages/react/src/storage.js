// Per-browser preferences under a host-chosen prefix ("oaspect:token").
// Storage can be unavailable (private mode, blocked cookies); every access is
// guarded and settings then simply last for the session.

function access(kind) {
  try {
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function createStorage(prefix = "oaspect") {
  const key = (name) => `${prefix}:${name}`;

  return {
    get(name, fallback = null, kind = "local") {
      try {
        return access(kind)?.getItem(key(name)) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(name, value, kind = "local") {
      try {
        if (value === null || value === undefined || value === "") access(kind)?.removeItem(key(name));
        else access(kind)?.setItem(key(name), value);
      } catch {
        // Not persisted; nothing else to do.
      }
    },
  };
}

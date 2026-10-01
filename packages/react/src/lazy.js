"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Whether sections render lazily (set by <ApiReference lazy>).
export const LazyContext = createContext(false);

/**
 * True once `ref` comes within ~1.5 screens of the viewport, and from then
 * on. Always true when lazy rendering is off or `eager` is set, so server
 * rendering and the first client render agree.
 */
export function useNearViewport(ref, eager = false) {
  const lazy = useContext(LazyContext);
  const [near, setNear] = useState(!lazy || eager);

  useEffect(() => {
    if (near || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "1500px 0px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near, ref]);

  return near;
}

/**
 * Scrolls to the element with `id` and keeps it in place while sections
 * above it render and change height.
 */
export function scrollToAnchor(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView();
  let last = target.getBoundingClientRect().top;
  for (const delay of [50, 150, 350, 700]) {
    setTimeout(() => {
      const top = target.getBoundingClientRect().top;
      if (Math.abs(top - last) > 2) target.scrollIntoView();
      last = target.getBoundingClientRect().top;
    }, delay);
  }
}

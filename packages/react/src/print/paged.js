// Paged.js (https://pagedjs.org) lays the book out in real pages in the
// browser: @page sizes and margins, running headers, page numbers and the
// contents' page references. It is loaded from jsDelivr, pinned with an SRI
// hash, only when someone opens the print view.
const PAGED_URL = "https://cdn.jsdelivr.net/npm/pagedjs@0.4.3/dist/paged.min.js";
const PAGED_INTEGRITY = "sha384-SwZmajT9Dz2Y0WjQKp5vcmM0ubuG+svDcvAxhp7Pz/7qIbtBr00fqHx3Uug3yYZe";

let loading = null;

export function loadPaged() {
  if (typeof window !== "undefined" && window.PagedModule) return Promise.resolve(window.PagedModule);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PAGED_URL;
    script.integrity = PAGED_INTEGRITY;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve(window.PagedModule);
    script.onerror = () => {
      loading = null;
      reject(new Error("Paged.js could not be loaded"));
    };
    document.head.append(script);
  });
  return loading;
}

---
"oaspect": patch
---

The standalone script inserts its stylesheet first in `<head>`, so the page's own CSS overrides the viewer's variables (`.oaspect { --oaspect-primary: … }`) without extra specificity.

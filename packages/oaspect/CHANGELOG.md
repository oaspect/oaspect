# oaspect

## 0.1.1

### Patch Changes

- 60e508c: The standalone script inserts its stylesheet first in `<head>`, so the page's own CSS overrides the viewer's variables (`.oaspect { --oaspect-primary: … }`) without extra specificity.
  - @oaspect/core@0.1.1

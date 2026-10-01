# Static HTML

One script tag; no build step. Serve the folder with any static server
(the spec is fetched, so `file://` will not do):

```bash
npx serve .
```

To work offline, copy `node_modules/oaspect/dist/oaspect.js` next to the page
and point the script at it.

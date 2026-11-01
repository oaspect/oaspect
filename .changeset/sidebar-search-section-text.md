---
"@oaspect/core": patch
"@oaspect/react": patch
"oaspect": patch
---

Sidebar search finds a guide section by the text under its heading, and a tag by its name (a guide tag without operations, such as Webhooks, was not found). Search ignores case and accents, so "imza" finds "İmza" and "dogrulama" finds "Doğrulama".

# Localization

oaspect translates two things separately: its own interface (buttons, headings, messages) and the text in your OpenAPI document. Both follow the reader's UI language.

## Interface languages

Built in: English (`en`), Turkish (`tr`) and Arabic (`ar`). The header menu lists every language you provide; readers switch without reloading.

```js
Oaspect.init("#docs", { specUrl: "/openapi.yaml", defaultLocale: "tr" });
```

- `defaultLocale` sets the starting language and lets the reader change it.
- `locale` with `onLocaleChange` makes it controlled: you store the choice (a cookie, your user settings) and pass it back. See [Frameworks](frameworks.md#remembering-the-language) for a cookie example.
- Turn the menu off with `features: { languageSwitcher: false }`.

### Change or add interface languages

`messages` merges with the built-in strings. Override a few keys, or add a whole language:

```js
Oaspect.init("#docs", {
  specUrl: "/openapi.yaml",
  defaultLocale: "de",
  messages: {
    en: { "tryIt.open": "Run" },
    de: {
      "header.source": "Quelle",
      "sidebar.search": "Endpunkte oder Modelle suchen",
      "tryIt.open": "Ausprobieren",
      "tryIt.send": "Senden",
      // …
    },
  },
});
```

A new language appears in the menu as soon as it has messages. Keys you leave out fall back to English. The full list (about 80 keys) is in [`packages/react/src/i18n/en.js`](https://github.com/oaspect/oaspect/blob/main/packages/react/src/i18n/en.js); `BUILT_IN_MESSAGES` exports them from `@oaspect/react`.

Some OpenAPI terms stay as they are in every language (`required`, `nullable`, type names, `min length`): readers search for them in the spec and in their code.

## Right-to-left languages

Arabic, Persian, Hebrew, Urdu and other right-to-left languages switch the whole layout: the navigation moves to the right, arrows turn around and text aligns to the start. Code, URLs, paths and technical values (patterns, enums, dates, types) stay left to right. Descriptions from your document pick their own direction, so English text inside an Arabic interface still reads correctly.

When you control the language, set `dir` on `<html>` too; `directionOf(locale)` from `@oaspect/react` returns `"rtl"` or `"ltr"`.

## Translating your document

### Short fields: `x-i18n`

Add an `x-i18n` object next to the fields you translate, keyed by language:

```yaml
paths:
  /users:
    get:
      summary: List users
      description: Returns users, newest first.
      x-i18n:
        tr:
          summary: Kullanıcıları listele
          description: Kullanıcıları en yeniden başlayarak döner.
        ar:
          summary: عرض المستخدمين
```

`x-i18n` is read on:

| Object | Fields |
| --- | --- |
| `info` | `title`, `description` |
| Tag | `name` (the name shown; the tag keeps its key), `description` |
| Operation and webhook | `summary`, `description` |
| Parameter, header | `description` |
| Request body, response | `description` |
| Schema and property | `description` |

A field without a translation shows the original. A language tag matches its region variants: `pt` translations serve a `pt-BR` interface.

### Long Markdown: `:::lang` blocks

For `info.description` and other Markdown, write every language in the same field and wrap each in a language block:

```markdown
:::lang en
## Authentication
Send your token in the `Authorization` header.
:::

:::lang tr
## Kimlik doğrulama
Token'ınızı `Authorization` header'ında gönderin.
:::
```

- Blocks that follow each other are alternatives of the same content. The reader sees the block matching the UI language, else English, else the first block, so an untranslated language still gets something.
- One block can serve several languages: `:::lang tr, az`. Region tags work as above.
- Text outside blocks shows in every language, so you can translate only some sections.
- Tools that do not know the syntax (Redoc, Swagger UI) show every language one after the other with the `:::lang` lines; nothing breaks.

## Search

The sidebar search looks in the translated and the original text, so readers find `Kullanıcıları listele` by typing "list users" too.

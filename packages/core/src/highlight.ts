import type { Token } from "./types";

type Rule = [string, RegExp];

// Small regex tokenizer for the languages the docs render. Returns a list of
// { type, text } tokens; `type` null means plain text. Rules are tried in
// order at each position, so earlier rules win (e.g. comments before strings).

const STRING_DOUBLE = /"(?:\\.|[^"\\\n])*"/y;
const STRING_SINGLE = /'(?:\\.|[^'\\])*'/y;
const NUMBER = /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y;

const words = (list: string[]) => new RegExp(`\\b(?:${list.join("|")})\\b`, "y");

const LANGUAGES: Record<string, Rule[]> = {
  json: [
    ["key", /"(?:\\.|[^"\\\n])*"(?=\s*:)/y],
    ["string", STRING_DOUBLE],
    ["number", NUMBER],
    ["literal", words(["true", "false", "null"])],
  ],
  shell: [
    ["comment", /#[^\n]*/y],
    // No escapes inside single quotes in shell; '\'' closes the string, adds
    // an escaped quote and reopens, so the backslash escape is its own token.
    ["string", /\\./y],
    ["string", /'[^']*'/y],
    ["string", STRING_DOUBLE],
    ["keyword", /(?<![\w-])(?:curl|wget|http|printf)\b/y],
    ["attr", /(?<![\w-])--?[a-zA-Z][\w-]*/y],
    ["variable", /\$\{?\w+\}?/y],
  ],
  javascript: [
    ["comment", /\/\/[^\n]*|\/\*[\s\S]*?\*\//y],
    ["string", /`(?:\\.|[^`\\])*`/y],
    ["key", /"(?:\\.|[^"\\\n])*"(?=\s*:)/y],
    ["string", STRING_DOUBLE],
    ["string", STRING_SINGLE],
    ["key", /\b[A-Za-z_$][\w$]*(?=\s*:(?!:))/y],
    ["keyword", words(["const", "let", "var", "await", "async", "function", "return", "new", "if", "else", "import", "from", "export"])],
    ["literal", words(["true", "false", "null", "undefined"])],
    ["function", /\b[A-Za-z_$][\w$]*(?=\s*\()/y],
    ["number", NUMBER],
  ],
  php: [
    ["comment", /\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\//y],
    ["keyword", /<\?php|\?>/y],
    ["string", STRING_DOUBLE],
    ["string", STRING_SINGLE],
    ["variable", /\$\w+/y],
    ["constant", /\b[A-Z][A-Z0-9_]{2,}\b/y],
    ["keyword", words(["echo", "return", "new", "function", "if", "else", "use", "array"])],
    ["literal", words(["true", "false", "null"])],
    ["function", /\b[A-Za-z_]\w*(?=\s*\()/y],
    ["number", NUMBER],
  ],
  python: [
    ["comment", /#[^\n]*/y],
    ["string", STRING_DOUBLE],
    ["string", STRING_SINGLE],
    ["keyword", words(["import", "from", "as", "def", "return", "if", "else", "for", "in", "print", "with"])],
    ["literal", words(["True", "False", "None"])],
    ["attr", /\b[a-z_]\w*(?==)/y],
    ["function", /\b[A-Za-z_]\w*(?=\s*\()/y],
    ["number", NUMBER],
  ],
};

const C_COMMENT = /\/\/[^\n]*|\/\*[\s\S]*?\*\//y;
const TRIPLE_DOUBLE = /"""[\s\S]*?"""/y;
const TYPE = /\b[A-Z][a-z]\w*\b/y;
const CALL = /\b[A-Za-z_]\w*(?=\s*\()/y;

// Shared shape for C-family languages; `strings` go first so raw/multi-line
// literals win over the plain double-quoted rule.
function cFamily({
  keywords,
  literals = ["true", "false", "null"],
  strings = [],
  extra = [],
}: {
  keywords: string[];
  literals?: string[];
  strings?: RegExp[];
  extra?: Rule[];
}): Rule[] {
  return [
    ["comment", C_COMMENT],
    ...strings.map((regex): Rule => ["string", regex]),
    ["string", STRING_DOUBLE],
    ["string", STRING_SINGLE],
    ...extra,
    ["keyword", words(keywords)],
    ["literal", words(literals)],
    ["function", CALL],
    ["type", TYPE],
    ["number", NUMBER],
  ];
}

Object.assign(LANGUAGES, {
  go: cFamily({
    keywords: ["package", "import", "func", "var", "const", "if", "else", "return", "defer", "for", "range", "type", "struct", "go", "map", "chan"],
    literals: ["true", "false", "nil"],
    strings: [/`[^`]*`/y],
  }),
  java: cFamily({
    keywords: ["import", "package", "new", "public", "private", "class", "static", "void", "final", "var", "return", "throws", "try", "catch"],
    strings: [TRIPLE_DOUBLE],
  }),
  kotlin: cFamily({
    keywords: ["import", "val", "var", "fun", "return", "if", "else", "class", "object"],
    strings: [TRIPLE_DOUBLE],
  }),
  csharp: cFamily({
    keywords: ["using", "var", "new", "await", "async", "return", "public", "class", "static", "void"],
    strings: [TRIPLE_DOUBLE],
  }),
  swift: cFamily({
    keywords: ["import", "let", "var", "try", "await", "func", "return", "if", "else"],
    literals: ["true", "false", "nil"],
    strings: [TRIPLE_DOUBLE],
  }),
  dart: cFamily({
    keywords: ["import", "as", "final", "var", "void", "async", "await", "return"],
    strings: [/r?'''[\s\S]*?'''/y],
  }),
  rust: cFamily({
    keywords: ["use", "let", "mut", "fn", "async", "await", "pub", "struct", "impl", "match", "return"],
    strings: [/r(#+)"[\s\S]*?"\1/y],
    extra: [
      ["attr", /#\[[^\]]*\]/y],
      ["function", /\b[a-z_]\w*!/y],
    ],
  }),
  c: cFamily({
    keywords: ["int", "char", "void", "struct", "return", "if", "else", "const", "static"],
    literals: ["NULL"],
    extra: [
      ["keyword", /#\w+(?:\s+<[^>\n]*>)?/y],
      ["constant", /\b[A-Z][A-Z0-9_]{2,}\b/y],
    ],
  }),
  ruby: [
    ["comment", /#[^\n]*/y],
    ["string", STRING_DOUBLE],
    ["string", STRING_SINGLE],
    ["literal", /:\w+/y],
    ["keyword", words(["require", "def", "end", "do", "if", "else", "puts", "return", "new"])],
    ["literal", words(["true", "false", "nil"])],
    ["type", TYPE],
    ["number", NUMBER],
  ],
  powershell: [
    ["comment", /#[^\n]*/y],
    ["string", /@'[\s\S]*?'@|@"[\s\S]*?"@/y],
    ["string", /'(?:''|[^'])*'/y],
    ["string", STRING_DOUBLE],
    ["literal", /\$(?:true|false|null)\b/y],
    ["variable", /\$\w+/y],
    ["function", /\b[A-Z][a-z]+-[A-Z][A-Za-z]+\b/y],
    ["attr", /(?<![\w-])-[A-Za-z]+/y],
    ["number", NUMBER],
  ],
  // Request line, header names, then JSON-ish body tokens.
  http: [
    ["keyword", /^[A-Z]+(?= \S+ HTTP\/)/my],
    ["attr", /HTTP\/\d(?:\.\d)?/y],
    ["key", /^[\w-]+(?=:)/my],
    ["key", /"(?:\\.|[^"\\\n])*"(?=\s*:)/y],
    ["string", STRING_DOUBLE],
    ["literal", words(["true", "false", "null"])],
    ["number", NUMBER],
  ],
});

LANGUAGES.curl = LANGUAGES.shell;

export function tokenize(code: string, language: string): Token[] {
  const rules = LANGUAGES[language];
  if (!rules) return [{ type: null, text: code }];

  const tokens: Token[] = [];
  let plain = "";
  let index = 0;

  outer: while (index < code.length) {
    for (const [type, regex] of rules) {
      regex.lastIndex = index;
      const match = regex.exec(code);
      if (match && match[0].length > 0) {
        if (plain) {
          tokens.push({ type: null, text: plain });
          plain = "";
        }
        tokens.push({ type, text: match[0] });
        index += match[0].length;
        continue outer;
      }
    }
    // Skip whole identifiers at once so rules never match mid-word.
    const word = /[\w$]+|[^\w$]/y;
    word.lastIndex = index;
    const chunk = word.exec(code)![0];
    plain += chunk;
    index += chunk.length;
  }
  if (plain) tokens.push({ type: null, text: plain });
  return tokens;
}

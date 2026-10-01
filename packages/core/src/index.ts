// @oaspect/core: framework-free OpenAPI processing for documentation UIs.

export * from "./types";
export { deref, refName, resolvePointer } from "./refs";
export { childrenOf, constraintsOf, inferType, resolveSchema, typeLabel } from "./schema";
export { exampleFromSchema, mediaExample, mediaExamples } from "./example";
export { HTTP_METHODS, buildModel, linkTarget, modelAnchor, serverUrl, slugify, tagAnchor } from "./model";
export { buildRequest, defaultBody, defaultForm, defaultValues, formEncode, isMultipart, jsonMediaType, parameterExample } from "./request";
export type { BuildRequestOptions, DefaultBody } from "./request";
export { SNIPPET_LANGUAGES, resolveSnippet } from "./snippets";
export { localize } from "./i18n";
export { parseBlocks, parseInline, parseMarkdown, safeUrl, selectLocale } from "./markdown";
export { tokenize } from "./highlight";
export { TOKEN_FLOWS, applySecurity, buildTokenRequest, describeScheme, hasCredential, securityRequirements } from "./security";
export type { AuthParts, Credential, Credentials, SecurityRequirement } from "./security";
export { convertSchema, convertSwagger2 } from "./convert";
export { isOpenApiDocument, loadSpec, loadSpecText, normalizeSpec, parseSpec } from "./parse";
export { EXTERNAL_KEY, hasExternalRefs, resolveExternalRefs } from "./external";
export type { ExternalRefOptions } from "./external";

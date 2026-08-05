// Minimal server lint — deliberately just the crash-class rules.
//
// The server had no lint config at all, which is how `resolvedPreviewPageTexts is not defined`
// shipped: a `let` declared in one block was read from a sibling block, so every updateScript call
// 500'd and viewable-script previews could never be saved. `no-undef` catches exactly that, and
// costs nothing to run.
//
//   npm run lint         (server/)
//
// Scoped to no-undef/no-unsafe-negation rather than a full style pass so it stays signal, not noise.

const NODE_GLOBALS = [
  "process", "console", "Buffer", "__dirname", "__filename", "URL", "URLSearchParams",
  "fetch", "Headers", "Request", "Response", "FormData", "Blob", "AbortController",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "queueMicrotask",
  "TextEncoder", "TextDecoder", "structuredClone", "global", "globalThis",
];

export default [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/**", "uploads/**"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: Object.fromEntries(NODE_GLOBALS.map((name) => [name, "readonly"])),
    },
    rules: {
      "no-undef": "error",
      "no-unsafe-negation": "error",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
    },
  },
];

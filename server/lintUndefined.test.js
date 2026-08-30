import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

/**
 * No server file may reference an identifier that does not exist.
 *
 * This exists because the class of bug has now shipped to production twice, and neither the build
 * nor the test suite could see either one:
 *
 *   - scriptController's verifyScriptPurchase and verifyScriptTrailerPayment both called
 *     `verifyRazorpaySignature`, which was never imported. Every Razorpay verification threw a
 *     ReferenceError inside its try/catch and answered 500 — a buyer paid and the purchase was never
 *     granted. It reached master and sat there.
 *   - adminController's getTrailerRequests used `pageNumber` and `pageLimit` without deriving them,
 *     so the AI Trailer Approvals list 500'd on every load.
 *
 * Why nothing caught them: a dangling identifier is legal JavaScript until the line runs. A bundler
 * does not resolve it, `node --check` only parses, and the suite never exercised those handlers.
 * Only static analysis sees it — and lint was something you had to remember to run by hand.
 *
 * So it runs HERE, as an ordinary test. `no-undef` only: this is a correctness gate, not a style
 * one, and it must never fail over formatting or a rule someone is mid-argument about.
 *
 * eslint is resolved from client/node_modules because the server has no lint dependency of its own,
 * and adding one would mean a second install of a large package to check a single rule. If the
 * client's dependencies are not installed the test says so and skips rather than failing — a red
 * suite on a missing devDependency teaches people to ignore it.
 */

const loadESLint = () => {
  try {
    const require = createRequire(new URL("../client/package.json", import.meta.url));
    return require("eslint").ESLint;
  } catch {
    return null;
  }
};

describe("no server file references an undefined identifier", () => {
  test("eslint no-undef is clean across server/", async (t) => {
    const ESLint = loadESLint();
    if (!ESLint) {
      t.skip("eslint is not installed — run `npm install` in client/ to enable this check");
      return;
    }

    const eslint = new ESLint({
      // fileURLToPath, not .pathname — on Windows the latter yields "/C:/...", which eslint cannot glob.
      cwd: fileURLToPath(new URL("./", import.meta.url)),
      // Judge on ONE rule. overrideConfigFile:true ignores any repo config so this cannot start
      // failing because someone changed a style preference somewhere above us.
      // An empty or absent directory must not fail the guard — eslint throws on an unmatched glob
      // by default, which would turn "this folder has no .js files" into a red suite.
      errorOnUnmatchedPattern: false,
      overrideConfigFile: true,
      overrideConfig: {
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
          globals: {
            process: "readonly", console: "readonly", Buffer: "readonly", URL: "readonly",
            URLSearchParams: "readonly", TextEncoder: "readonly", TextDecoder: "readonly",
            setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly",
            clearInterval: "readonly", setImmediate: "readonly", fetch: "readonly",
            AbortController: "readonly", __dirname: "readonly", __filename: "readonly",
            global: "readonly", structuredClone: "readonly", crypto: "readonly",
            // Web APIs Node has had as globals since 18. Test files use them freely and they are
            // genuinely defined — omitting them here would report false positives and train people
            // to ignore this test, which is the one outcome that would make it worthless.
            FormData: "readonly", Blob: "readonly", Response: "readonly", Request: "readonly",
            Headers: "readonly", File: "readonly", ReadableStream: "readonly", queueMicrotask: "readonly",
            performance: "readonly", AbortSignal: "readonly", Event: "readonly", EventTarget: "readonly",
          },
        },
        rules: { "no-undef": "error" },
      },
    });

    const results = await eslint.lintFiles([
      "controllers/**/*.js", "routes/**/*.js", "utils/**/*.js", "models/**/*.js", "middleware/**/*.js",
      // services/ and the rest were NOT scanned originally, which is exactly the sort of gap that
      // lets the next one through — the AI integrations live in services/, and a guard that skips
      // them is a guard with a hole in the shape of the thing it exists to catch.
      "services/**/*.js", "api/**/*.js", "config/**/*.js", "socket/**/*.js", "scripts/**/*.js",
    ]);

    const undef = results.flatMap((result) =>
      result.messages
        .filter((m) => m.ruleId === "no-undef")
        .map((m) => `${result.filePath.split(/[\\/]/).slice(-2).join("/")}:${m.line}  ${m.message}`)
    );

    assert.deepEqual(
      undef,
      [],
      `${undef.length} undefined reference(s) — each is a ReferenceError waiting for that line to run:\n  ${undef.join("\n  ")}`
    );
  });
});

// Every admin screen must talk to the server as the admin.
//
// This has now shipped broken twice, the same way both times. Signing in with the console access
// code stores the token in sessionStorage, deliberately apart from the ordinary localStorage login.
// `services/api` only ever reads localStorage, so any admin screen that imports it sends whoever is
// signed in normally — which the server answers with 403, and which looks to the user like the page
// is broken rather than like it asked the wrong question.
//
// It happened in /finance (fixed with services/financeApi) and again in the third-party entries
// queue, which was the one admin section that fetches its own data instead of reading the dashboard
// context. Both were invisible in review: `import api from ".../services/api"` is exactly what you
// would expect to see. So this asserts the rule against the source rather than trusting a reviewer
// to spot the wrong import a third time.
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sectionsDir = join(here, "sections");

/** Importing the default client is the mistake; `adminApi` and the shared context are both fine. */
const IMPORTS_PLAIN_API = /^\s*import\s+(?:api|\{[^}]*\bapi\b[^}]*\})\s+from\s+["'][^"']*services\/api["']/m;

const sectionFiles = readdirSync(sectionsDir).filter((f) => f.endsWith(".jsx") && !f.endsWith(".test.jsx"));

describe("admin sections authenticate as the admin", () => {
  it("finds the section files at all, so a moved directory fails loudly", () => {
    // Without this, renaming the folder would leave the suite green over an empty list.
    expect(sectionFiles.length).toBeGreaterThan(10);
  });

  for (const file of sectionFiles) {
    it(`${file} does not import the localStorage-backed client`, () => {
      const source = readFileSync(join(sectionsDir, file), "utf8");
      const offending = IMPORTS_PLAIN_API.exec(source);
      expect(
        offending?.[0],
        `${file} imports services/api, so its requests carry the ordinary user's token and the `
          + `server answers 403. Use { adminApi } from "../dashboardShared", or read the data from `
          + `useAdminDashboard() like the other sections do.`,
      ).toBeUndefined();
    });
  }
});

describe("the section that fetches its own data uses adminApi", () => {
  // ExternalRegistrationsSection is the only self-fetching section, which is why it was the one that
  // got this wrong. Assert the positive too — the rule above only says what not to do, and a section
  // that imported nothing and used bare `fetch` would slip through it.
  const source = readFileSync(join(sectionsDir, "ExternalRegistrationsSection.jsx"), "utf8");

  it("imports adminApi", () => {
    expect(source).toMatch(/import\s+\{[^}]*\badminApi\b[^}]*\}\s+from\s+["']\.\.\/dashboardShared["']/);
  });

  it("routes every request through it", () => {
    const calls = source.match(/\b(?:admin)?[Aa]pi\.(get|put|post|delete|patch)\b/g) || [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).toMatch(/^adminApi\./);
  });

  it("never falls back to fetch, which would carry no token at all", () => {
    expect(source).not.toMatch(/\bfetch\s*\(/);
  });
});

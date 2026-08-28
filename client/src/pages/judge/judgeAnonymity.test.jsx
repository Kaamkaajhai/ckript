// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The client half of the blind-judging guarantee.
 *
 * The server's projection is the real boundary and is proved in server/utils/judgeEntryView.test.js.
 * This file guards the other direction: a future change that reads a field the API does not send
 * today, or adds a Writer column "because the admin table has one". Those are source-level mistakes,
 * so they are caught with source-level assertions — no rendering needed, and nothing to keep in step
 * with the component's internals.
 */

// fileURLToPath, not a hand-rolled pathname fix: this repo lives under a directory with a space in
// it, which arrives percent-encoded in a file: URL and turns into a path that does not exist.
const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (file) => fs.readFileSync(path.join(dir, file), "utf8");

const JUDGE_SOURCES = fs
  .readdirSync(dir)
  .filter((f) => (f.endsWith(".jsx") || f.endsWith(".js")) && !f.includes(".test."));

/** Fields that identify a writer. None of these may be referenced anywhere in the judge console. */
const FORBIDDEN = [
  { pattern: /\buserId\b/, why: "userId is the entry's link to the writer" },
  { pattern: /\bwriter\s*[.?[]/, why: "a writer object has no business in the judge console" },
  { pattern: /\.email\b/, why: "a writer's email must never render for a judge" },
  { pattern: /\bcreator\b/, why: "Script.creator identifies the writer" },
  { pattern: /\bregistration\b/, why: "registration answers carry country, language and experience" },
  { pattern: /\bai\.evaluation\b/, why: "an AI score would anchor the judge's own" },
  { pattern: /\blogline\b/, why: "logline is writer-authored free text and may be signed" },
  { pattern: /\bsynopsis\b/, why: "synopsis is writer-authored free text and may be signed" },
  { pattern: /\bleaderboard\b/, why: "a judge must not see the panel's aggregate" },
  { pattern: /\bsubmittedAt\b/, why: "submission order maps back to the registration list" },
];

describe("the judge console cannot render a writer's identity", () => {
  it("finds the judge sources it is supposed to be guarding", () => {
    // Without this, deleting or renaming every file would make the suite below vacuously pass.
    expect(JUDGE_SOURCES).toContain("JudgeHome.jsx");
    expect(JUDGE_SOURCES).toContain("JudgeScoreSheet.jsx");
    expect(JUDGE_SOURCES.length).toBeGreaterThanOrEqual(3);
  });

  it.each(JUDGE_SOURCES)("%s references no identifying field", (file) => {
    const source = read(file)
      // Comments are stripped first: this file's own explanations say "userId" and "writer" a lot,
      // and so do the components' — a rule that forbids explaining itself is a rule people delete.
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1")
      // The SIGNED-IN JUDGE's own account is not a leak. The refusal panel says "you are signed in
      // as name (role)", and that address is the single most useful thing on the screen for someone
      // who signed in with the wrong account — which is the only reason that panel exists. Removed
      // before the scan so the rule below still means "no OTHER person's email".
      .replace(/\buser\??\.(name|email)\b/g, "");

    for (const { pattern, why } of FORBIDDEN) {
      expect(pattern.test(source), `${file} references ${pattern} — ${why}`).toBe(false);
    }
  });

  it("reaches the API only through judgeApi", () => {
    for (const file of JUDGE_SOURCES) {
      const source = read(file);
      // services/api hard-redirects a 401 to the marketing homepage, which would throw a judge off
      // mid-score with their draft gone. adminApi would send a session that must never score.
      expect(source.includes('from "../../services/api"'), `${file} imports the global api client`).toBe(false);
      expect(source.includes("adminApi"), `${file} imports adminApi`).toBe(false);
      expect(/\bfetch\(/.test(source), `${file} calls fetch directly`).toBe(false);
    }
  });

  it("requests only /judge endpoints", () => {
    for (const file of JUDGE_SOURCES) {
      const urls = [...read(file).matchAll(/judgeApi\.(?:get|put|post|delete)\(\s*[`"']([^`"']+)/g)].map((m) => m[1]);
      for (const url of urls) {
        expect(
          url.startsWith("/judge/") || url === "/auth/login",
          `${file} calls ${url} — the judge console may only reach /judge (plus the shared login)`
        ).toBe(true);
      }
    }
  });
});

describe("the entry queue has no writer column", () => {
  it("labels entries by code, never by person", () => {
    const source = read("JudgeHome.jsx");

    // The positive half: the queue must actually show the entry code, or "no writer column" is
    // satisfied by a table that shows nothing useful at all.
    expect(source).toMatch(/header:\s*"Entry"/);
    expect(source).toMatch(/eventId/);

    for (const header of ["Writer", "Author", "Name", "Email", "Submitted by"]) {
      expect(
        new RegExp(`header:\\s*"${header}"`).test(source),
        `the judge's queue defines a ${header} column`
      ).toBe(false);
    }
  });
});

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MOBILE_CSS_PREFIXES,
  MOBILE_CSS_UNSCOPED_ALLOWLIST,
  isRegisteredMobileCssPrefix,
  mobileCssPrefixOf,
} from "./cssPrefixRegistry";

/*
 * Enforces the two CSS rules from the canonical plan §7.1–7.2 across every
 * mobile stylesheet, so a new page cannot silently leak styles into the
 * desktop document or squat on another page's prefix.
 */

const MOBILE_ROOT = fileURLToPath(new URL("..", import.meta.url));

function cssFiles(dir = MOBILE_ROOT, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) cssFiles(full, found);
    else if (entry.name.endsWith(".css")) found.push(full);
  }
  return found;
}

/* Selector lists, with comments removed and @keyframes bodies skipped. */
function selectorsOf(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const selectors = [];
  let depth = 0;
  let keyframeDepth = null;
  let buffer = "";

  for (const ch of stripped) {
    if (ch === "{") {
      const header = buffer.trim();
      if (keyframeDepth === null && header && !header.startsWith("@")) {
        for (const sel of header.split(",")) {
          const trimmed = sel.trim();
          if (trimmed) selectors.push(trimmed);
        }
      }
      if (header.startsWith("@keyframes") && keyframeDepth === null) keyframeDepth = depth;
      buffer = "";
      depth += 1;
    } else if (ch === "}") {
      buffer = "";
      depth -= 1;
      if (keyframeDepth !== null && depth <= keyframeDepth) keyframeDepth = null;
    } else {
      buffer += ch;
    }
  }

  return selectors;
}

const isScoped = (selector) => (
  MOBILE_CSS_UNSCOPED_ALLOWLIST.includes(selector)
  || /(^|[\s>+~])\.ckm(?=[\s>+~:.,]|$)/.test(selector)
);

const files = cssFiles();
const rel = (file) => relative(MOBILE_ROOT, file).replace(/\\/g, "/");

describe("mobile CSS contract", () => {
  it("finds the mobile stylesheets", () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it("scopes every selector under .ckm", () => {
    const offenders = [];
    for (const file of files) {
      for (const selector of selectorsOf(readFileSync(file, "utf8"))) {
        if (!isScoped(selector)) offenders.push(`${rel(file)}: ${selector}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses only registered ckm-* prefixes", () => {
    const offenders = [];
    for (const file of files) {
      const css = readFileSync(file, "utf8");
      for (const selector of selectorsOf(css)) {
        for (const cls of selector.match(/\.ckm-[a-z0-9-]+/g) || []) {
          const prefix = mobileCssPrefixOf(cls);
          if (!isRegisteredMobileCssPrefix(prefix)) offenders.push(`${rel(file)}: ${cls} (prefix ${prefix})`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the registry free of prefixes nothing uses", () => {
    const used = new Set();
    for (const file of files) {
      for (const selector of selectorsOf(readFileSync(file, "utf8"))) {
        for (const cls of selector.match(/\.ckm-[a-z0-9-]+/g) || []) used.add(mobileCssPrefixOf(cls));
      }
    }
    const stale = Object.keys(MOBILE_CSS_PREFIXES).filter((prefix) => !used.has(prefix));
    expect(stale).toEqual([]);
  });

  it("names an owning file for every registered prefix", () => {
    const undocumented = Object.entries(MOBILE_CSS_PREFIXES)
      .filter(([, meta]) => !String(meta.owner || "").trim())
      .map(([prefix]) => prefix);
    expect(undocumented).toEqual([]);
  });

  it("derives a prefix from element and modifier classes alike", () => {
    expect(mobileCssPrefixOf(".ckm-ov__hero-title")).toBe("ckm-ov");
    expect(mobileCssPrefixOf(".ckm-chip--gold")).toBe("ckm-chip");
    expect(mobileCssPrefixOf(".ckm-dashboard")).toBe("ckm-dashboard");
    expect(mobileCssPrefixOf(".ckm-top-scripts__row")).toBe("ckm-top-scripts");
    expect(mobileCssPrefixOf(".is-active")).toBeNull();
  });
});

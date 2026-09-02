// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The Email Builder preview and the server's injected footer must say the same thing.
 *
 * An admin reported "Unsubscribe" and "Preferences" visible in the preview but missing from the
 * actual mail. The preview drew them as decorative spans outside the compiled document, while the
 * server injected a different footer with no Preferences link at all — so the one screen whose job
 * is to show what the recipient gets showed a footer no recipient ever received.
 *
 * The footer cannot live in the compiled document: the Unsubscribe link is signed per recipient and
 * only exists at send time. So the server owns it, and this test pins the preview's copy to the
 * server's, across the package boundary, so the two cannot drift apart silently again.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const preview = fs.readFileSync(path.join(here, "EmailBuilder.jsx"), "utf8");
const server = fs.readFileSync(path.resolve(here, "../../../../../server/utils/emailService.js"), "utf8");

const SENTENCE = "You are receiving this because you subscribed to our updates.";

describe("the builder preview footer matches what the server sends", () => {
  it("both sides carry the same sentence, word for word", () => {
    expect(preview).toContain(SENTENCE);
    expect(server).toContain(SENTENCE);
  });

  it("both sides offer Unsubscribe and Preferences", () => {
    for (const label of ["Unsubscribe", "Preferences"]) {
      expect(preview, `preview is missing ${label}`).toMatch(new RegExp(`>${label}</a>`));
      expect(server, `server footer is missing ${label}`).toMatch(new RegExp(`>${label}</a>`));
    }
  });

  it("renders the preview links as links, not decorative spans", () => {
    // A span with cursor-pointer LOOKS clickable and goes nowhere — which is exactly the mismatch
    // that produced the report. Anchors that preventDefault are honest: they look like the real
    // thing and the caption explains why they do not navigate here.
    const footer = preview.slice(preview.indexOf("Footer Preview"), preview.indexOf("Footer Preview") + 1800);
    expect(footer).not.toMatch(/<span[^>]*cursor-pointer[^>]*>Unsubscribe/);
    expect(footer).not.toMatch(/<span[^>]*cursor-pointer[^>]*>Preferences/);
    expect(footer).toMatch(/<a href="#" onClick=\{\(e\) => e\.preventDefault\(\)\}[^>]*>Unsubscribe<\/a>/);
    expect(footer).toMatch(/<a href="#" onClick=\{\(e\) => e\.preventDefault\(\)\}[^>]*>Preferences<\/a>/);
  });

  it("tells the admin the footer is added at send time and personalised", () => {
    expect(preview).toMatch(/Added automatically to every send/);
    expect(preview).toMatch(/personalised per recipient/);
  });

  it("the server's Preferences link targets the profile Settings tab", () => {
    expect(server).toMatch(/buildClientUrl\("\/profile\?tab=settings", clientBaseUrl\)/);
  });
});

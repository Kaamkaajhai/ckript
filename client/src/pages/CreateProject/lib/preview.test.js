// @vitest-environment happy-dom
//
// The publish preview turns a writer's rich text into plain snippets. Two ways that goes wrong, both
// of which have actually shipped in this file:
//
//   1. Stripping tags in ONE pass — "<<script>script>" reassembles out of the leftovers.
//   2. Decoding entities with a CHAIN of .replace() calls. That is not one pass, whatever the comment
//      says, and mine said it was: `.replace(/&amp;/g, "&")` runs first and turns "&amp;lt;" into
//      "&lt;", which the very next replace turns into "<". Text the author typed becomes markup.
//      CodeQL caught this one after I had already "fixed" the equivalent bug on the server.
import { describe, it, expect } from "vitest";
import { normalizePreviewContent } from "./preview";

describe("entities are decoded exactly once", () => {
  it("does not double-unescape an escaped ampersand", () => {
    // "&amp;lt;" is how you write the literal text "&lt;". It must come out as "&lt;", not "<".
    expect(normalizePreviewContent("&amp;lt;")).toBe("&lt;");
    expect(normalizePreviewContent("&amp;amp;")).toBe("&amp;");
    expect(normalizePreviewContent("&amp;gt;")).toBe("&gt;");
  });

  it("still decodes real entities", () => {
    expect(normalizePreviewContent("Rowan &amp; Co.")).toBe("Rowan & Co.");
    expect(normalizePreviewContent("&quot;quoted&quot;")).toBe('"quoted"');
    expect(normalizePreviewContent("a&nbsp;b")).toBe("a b");
    expect(normalizePreviewContent("it&#39;s")).toBe("it's");
  });

  it("cannot be made to produce a tag through a doubly-escaped payload", () => {
    // The attack the double-unescape enables: the first decode manufactures the entity that the
    // second decode turns into a live element.
    for (const payload of [
      "&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;",
      "&amp;lt;img src=x onerror=alert(1)&amp;gt;",
    ]) {
      expect(normalizePreviewContent(payload)).not.toMatch(/<[a-z/]/i);
    }
  });
});

describe("tags are stripped completely", () => {
  it("removes markup and keeps the words", () => {
    expect(normalizePreviewContent("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("a nested tag cannot reassemble", () => {
    expect(normalizePreviewContent("<<script>script>alert(1)<</script>/script>")).not.toMatch(/<[a-z/]/i);
  });

  it("an encoded tag is decoded in time to be stripped, not on the way out", () => {
    expect(normalizePreviewContent("&lt;img src=x onerror=alert(1)&gt;")).not.toMatch(/<[a-z/]/i);
  });

  it("block tags become line breaks", () => {
    // One break, not two: only the CLOSING tag maps to a newline here. (The server's htmlToPlainText
    // maps both the opening and closing tag and so yields a blank line — a deliberate difference,
    // since this produces a short snippet rather than a readable document.)
    expect(normalizePreviewContent("<p>one</p><p>two</p>")).toBe("one\ntwo");
    expect(normalizePreviewContent("a<br>b")).toBe("a\nb");
  });
});

describe("prose survives", () => {
  it("keeps a lone angle bracket, which is ordinary in screenplay text", () => {
    expect(normalizePreviewContent("5 < 7 and 9 > 3")).toBe("5 < 7 and 9 > 3");
    expect(normalizePreviewContent(">CENTERED<")).toBe(">CENTERED<");
  });

  it("collapses runs of whitespace without eating content", () => {
    expect(normalizePreviewContent("a   b\n\n\n\nc")).toBe("a b\n\nc");
  });

  it("handles empty and non-string input", () => {
    for (const value of ["", null, undefined, 0, false]) {
      expect(typeof normalizePreviewContent(value)).toBe("string");
    }
  });

  it("does not hang on a long unterminated tag run", () => {
    const started = Date.now();
    normalizePreviewContent("<a".repeat(100000));
    expect(Date.now() - started).toBeLessThan(2000);
  });
});

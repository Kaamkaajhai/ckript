// Can the sanitiser be made to produce the markup it exists to remove?
//
// Two bypasses were live in the previous implementations, and both are invisible on inspection:
// stripping tags in a single pass lets a nested tag reassemble out of the leftovers, and decoding
// entities AFTER stripping means an encoded tag is turned into a real one on the way out. The second
// is the dangerous one — the sanitiser was the thing building the payload.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { decodeEntitiesOnce, stripTagsCompletely, htmlToPlainText, looksLikeHtml } from "./htmlText.js";

/** Nothing tag-shaped may survive. This is the property the whole file is about. */
const assertNoMarkup = (output, label) => {
  assert.doesNotMatch(output, /<[a-z/!]/i, `${label} left markup behind: ${JSON.stringify(output)}`);
};

describe("a tag cannot reassemble out of what one pass leaves behind", () => {
  for (const [name, input] of [
    ["a nested script tag", "<<script>script>alert(1)<</script>/script>"],
    ["a nested img tag", "<<img>img src=x onerror=alert(1)>"],
    ["doubled brackets", "<<div>div>text<</div>/div>"],
    ["a tag split by another", "<sc<div>ript>alert(1)</sc<div>ript>"],
  ]) {
    test(name, () => {
      assertNoMarkup(stripTagsCompletely(input), name);
      assertNoMarkup(htmlToPlainText(input), name);
    });
  }
});

describe("an encoded tag is decoded in time to be stripped, not on the way out", () => {
  for (const [name, input] of [
    ["the onerror payload", "&lt;img src=x onerror=alert(1)&gt;"],
    ["an encoded script tag", "&lt;script&gt;alert(1)&lt;/script&gt;"],
    ["uppercase entities", "&LT;script&GT;alert(1)&LT;/script&GT;"],
    ["numeric entities", "&#60;script&#62;alert(1)&#60;/script&#62;"],
    ["hex entities", "&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;"],
  ]) {
    test(name, () => {
      // The old order produced a live element here. Nothing tag-shaped may come out.
      assertNoMarkup(htmlToPlainText(input), name);
    });
  }

  test("entities are decoded exactly once", () => {
    // "&amp;lt;" is the encoding of the literal text "&lt;". Decoding twice would turn text the
    // author typed into markup — the same bug from the other direction.
    assert.equal(decodeEntitiesOnce("&amp;lt;"), "&lt;");
    assert.equal(decodeEntitiesOnce("&amp;amp;"), "&amp;");
  });
});

describe("ordinary content survives intact", () => {
  test("plain screenplay text is untouched", () => {
    const text = "INT. HOUSE - DAY\n\nRHEA crosses the room.";
    assert.equal(htmlToPlainText(text), text);
  });

  test("block tags become line breaks", () => {
    assert.equal(htmlToPlainText("<p>one</p><p>two</p>").trim(), "one\n\ntwo".trim());
    assert.equal(htmlToPlainText("a<br>b"), "a\nb");
  });

  test("real entities decode to their characters", () => {
    assert.equal(htmlToPlainText("Rowan &amp; Co."), "Rowan & Co.");
    assert.equal(htmlToPlainText("&quot;quoted&quot;"), '"quoted"');
    assert.equal(htmlToPlainText("a&nbsp;b"), "a b");
  });

  test("a lone angle bracket in prose is not treated as a tag", () => {
    // Screenplays use ">" for centred text — it must not be eaten.
    assert.equal(htmlToPlainText(">CENTERED<"), ">CENTERED<");
    assert.equal(htmlToPlainText("5 < 7 and 9 > 3"), "5 < 7 and 9 > 3");
  });

  test("empty and non-string inputs are safe", () => {
    for (const value of ["", null, undefined, 0, false]) {
      assert.equal(typeof htmlToPlainText(value), "string");
    }
  });

  test("a long document does not hang", () => {
    const big = "<p>line</p>".repeat(20000);
    const started = Date.now();
    const out = htmlToPlainText(big);
    assert.ok(Date.now() - started < 3000, "stripping took too long");
    assertNoMarkup(out, "long document");
  });
});

describe("the scan is linear, not just narrower", () => {
  // The regex these replaced — /<\/?[a-zA-Z][^>]*>/ — LOOKS linear because [^>]* cannot cross a ">".
  // It is not: on "<a<a<a…" with no ">" anywhere, the engine restarts at every "<a" and scans to the
  // end each time. I shipped that as a "fix" for the [\s\S]* version and CodeQL kept flagging it,
  // correctly. These sizes take minutes with a backtracking pattern.
  const attack = (n) => "<a".repeat(n);

  test("200k tag openings with no closing bracket finish immediately", () => {
    const started = Date.now();
    stripTagsCompletely(attack(200000));
    looksLikeHtml(attack(200000));
    htmlToPlainText(attack(200000));
    assert.ok(Date.now() - started < 2000, "still backtracking");
  });

  test("cost grows linearly, not quadratically", () => {
    const time = (n) => {
      const input = attack(n);
      const t = Date.now();
      for (let i = 0; i < 5; i += 1) stripTagsCompletely(input);
      return Math.max(1, Date.now() - t);
    };
    // Quadratic would be ~16x for 4x the input. Generous bound: this is about ruling out n², not
    // measuring a constant on a loaded machine.
    assert.ok(time(80000) / time(20000) < 8, "growth looks quadratic");
  });
});

describe("looksLikeHtml agrees with the stripper about what a tag is", () => {
  for (const [input, expected] of [
    ["<p>hello</p>", true],
    ["<br/>", true],
    ["</div>", true],
    ["<!DOCTYPE html>", false],
    ["plain text", false],
    ["INT. HOUSE - DAY", false],
    ["5 < 7 and 9 > 3", false],
    [">CENTERED<", false],
    ["<a", false],
    ["<a href", false],
    ["", false],
  ]) {
    test(`${JSON.stringify(input)} -> ${expected}`, () => {
      assert.equal(looksLikeHtml(input), expected);
    });
  }
});

// @vitest-environment happy-dom
/* global process */
//
// Reproduce the live cascade: the CodeMirror THEME (injected by createScreenplayExtensions) sets
// line-level font-weight/style on .cm-sp-* lines; index.css sets the emphasis-span classes. We check
// the COMPUTED style on a bold/italic span as it actually sits in the DOM, to see whether a
// line-level rule overrides the emphasis (the "underline works, bold/italic don't" symptom).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createScreenplayExtensions } from "./screenplayMode";

beforeAll(() => {
  // Load the FULL index.css (scope-stripped), so every .screenplay-editor rule participates — not
  // just the emphasis snippet. This is what was missing from the earlier isolated check.
  const css = readFileSync(path.resolve(process.cwd(), "src/index.css"), "utf8");
  const style = document.createElement("style");
  style.textContent = css.replace(/\.screenplay-editor--dark /g, "").replace(/\.screenplay-editor /g, "");
  document.head.appendChild(style);
});

let view;
const mount = (doc) => {
  const parent = document.createElement("div");
  parent.className = "screenplay-editor";
  document.body.appendChild(parent);
  view = new EditorView({
    state: EditorState.create({ doc, extensions: createScreenplayExtensions({ getEntities: () => ({}), dark: false }) }),
    parent,
  });
  return view;
};
afterEach(() => { view?.destroy(); view = undefined; document.body.innerHTML = ""; });

describe("emphasis survives the line-level cascade", () => {
  it("bold span computes 700 even on an action line", () => {
    const v = mount("**word**");
    const span = v.dom.querySelector(".cm-sp-em-bold");
    expect(span).toBeTruthy();
    expect(getComputedStyle(span).fontWeight).toBe("700");
  });

  it("italic span computes italic on an action line", () => {
    const v = mount("*word*");
    const span = v.dom.querySelector(".cm-sp-em-italic");
    expect(span).toBeTruthy();
    expect(getComputedStyle(span).fontStyle).toBe("italic");
  });

  it("underline span computes underline (the one that already works)", () => {
    const v = mount("_word_");
    const span = v.dom.querySelector(".cm-sp-em-underline");
    expect(getComputedStyle(span).textDecoration).toContain("underline");
  });

  // Regression: `body { font-synthesis: none }` inherits to the editor. If it reaches the emphasis
  // spans, a missing Courier Prime bold/italic face renders plain text (bold/italic silently fail
  // while underline still works). The emphasis CSS must re-enable synthesis so bold/italic render.
  it("bold/italic spans do NOT inherit font-synthesis: none", () => {
    const bold = getComputedStyle(mount("**word**").dom.querySelector(".cm-sp-em-bold")).fontSynthesis;
    const italic = getComputedStyle(mount("*word*").dom.querySelector(".cm-sp-em-italic")).fontSynthesis;
    // jsdom/happy-dom may return "" for unsupported props; the real assertion is "not none".
    expect(bold).not.toBe("none");
    expect(italic).not.toBe("none");
  });
});

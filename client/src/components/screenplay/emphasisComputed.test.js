// @vitest-environment happy-dom
/* global process */
//
// End-to-end self-verification: mount the REAL editor, inject the REAL index.css emphasis rules,
// drive formatting through the REAL applyEmphasis command (what the toolbar button calls), and
// assert the COMPUTED styles — actual bold/italic/underline, and that the * / _ markers are
// visually collapsed. This goes past "the class is present" to "the browser would render it styled".
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createScreenplayExtensions, applyEmphasis } from "./screenplayMode";

// Pull just the emphasis + marker rules out of the real index.css and strip the ".screenplay-editor "
// scope prefix (the editor DOM is mounted bare here, without the wrapper class).
beforeAll(() => {
  // vitest runs with cwd = client/, so index.css is at src/index.css.
  const css = readFileSync(path.resolve(process.cwd(), "src/index.css"), "utf8");
  const rules = (css.match(/\.screenplay-editor \.cm-sp-(?:em[^{]*|marker)\{[^}]*\}/g) || [])
    .concat(css.match(/\.screenplay-editor \.cm-sp-(?:em-\w+|marker) \{[^}]*\}/g) || []);
  const style = document.createElement("style");
  style.textContent = rules.join("\n").replace(/\.screenplay-editor /g, "");
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

// Select [from,to), run the toolbar command, return the styled inner span + a hidden marker span.
const formatAndQuery = (kind, doc, from, to, innerClass) => {
  const v = mount(doc);
  v.dispatch({ selection: { anchor: from, head: to } });
  applyEmphasis(v, kind);
  const inner = v.dom.querySelector(`.${innerClass}`);
  const marker = v.dom.querySelector(".cm-sp-marker");
  return { inner, marker, text: v.state.doc.toString() };
};

describe("formatting renders styled (computed styles, real CSS, real command)", () => {
  it("Bold → wraps **word** and the inner span computes font-weight 700", () => {
    const { inner, marker, text } = formatAndQuery("bold", "word", 0, 4, "cm-sp-em-bold");
    expect(text).toBe("**word**");
    expect(inner).toBeTruthy();
    expect(getComputedStyle(inner).fontWeight).toBe("700");
    expect(getComputedStyle(marker).fontSize).toBe("0px"); // ** is collapsed, not shown
  });

  it("Italic → inner span computes font-style italic", () => {
    const { inner } = formatAndQuery("italic", "word", 0, 4, "cm-sp-em-italic");
    expect(getComputedStyle(inner).fontStyle).toBe("italic");
  });

  it("Underline → inner span computes underline", () => {
    const { inner } = formatAndQuery("underline", "word", 0, 4, "cm-sp-em-underline");
    expect(getComputedStyle(inner).textDecoration).toContain("underline");
  });

  it("Bold-Italic → inner span computes both", () => {
    const { inner } = formatAndQuery("bolditalic", "word", 0, 4, "cm-sp-em-bolditalic");
    const cs = getComputedStyle(inner);
    expect(cs.fontWeight).toBe("700");
    expect(cs.fontStyle).toBe("italic");
  });
});

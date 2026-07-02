// @vitest-environment happy-dom
//
// DOM-level proof that inline emphasis actually RENDERS in the live editor: the * / _ markers get
// the hide class (.cm-sp-marker) and the inner text gets the styling class (.cm-sp-em-bold etc.).
// This is what the unit logic tests can't see — it mounts a real EditorView and inspects the DOM.
import { describe, it, expect, afterEach } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createScreenplayExtensions } from "./screenplayMode";

let view;
const mount = (doc) => {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  view = new EditorView({
    state: EditorState.create({ doc, extensions: createScreenplayExtensions({ getEntities: () => ({}), dark: false }) }),
    parent,
  });
  return view;
};

afterEach(() => { view?.destroy(); view = undefined; document.body.innerHTML = ""; });

const classesIn = (v) => Array.from(v.dom.querySelectorAll("*")).flatMap((el) => Array.from(el.classList));

describe("inline emphasis renders in the live editor DOM", () => {
  it("**bold** produces a .cm-sp-em-bold span and hides the ** markers", () => {
    const cls = classesIn(mount("**hello**"));
    expect(cls).toContain("cm-sp-em-bold");
    expect(cls).toContain("cm-sp-marker"); // the ** are hidden, not shown as literal text
  });

  it("*italic* produces .cm-sp-em-italic", () => {
    expect(classesIn(mount("*hello*"))).toContain("cm-sp-em-italic");
  });

  it("_underline_ produces .cm-sp-em-underline", () => {
    expect(classesIn(mount("_hello_"))).toContain("cm-sp-em-underline");
  });

  it("***both*** produces .cm-sp-em-bolditalic", () => {
    expect(classesIn(mount("***hello***"))).toContain("cm-sp-em-bolditalic");
  });

  it("a centered line elsewhere does NOT disable emphasis decorations (the two-line-deco bug)", () => {
    // Before the fix, a >centered< line threw inside Decoration.set and wiped ALL decorations,
    // so the bold on another line silently stopped rendering. Guard against that regression.
    const cls = classesIn(mount(">THE END<\n\n**hello**"));
    expect(cls).toContain("cm-sp-centered");
    expect(cls).toContain("cm-sp-em-bold");
  });
});

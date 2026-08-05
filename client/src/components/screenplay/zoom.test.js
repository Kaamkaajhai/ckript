// @vitest-environment happy-dom
//
// Editor zoom is purely visual: it sets a --sp-font-size CSS var on the .screenplay-editor host, and
// the CodeMirror theme reads `font-size: var(--sp-font-size, 15px)`. Verify the computed font size on
// .cm-content actually scales with the var (and that the underlying doc text is untouched).
import { describe, it, expect, afterEach } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createScreenplayExtensions } from "./screenplayMode";

let view;
const mountAtZoom = (zoom) => {
  const host = document.createElement("div");
  host.className = "screenplay-editor";
  host.style.setProperty("--sp-font-size", `${15 * zoom}px`); // mirrors ScreenplayEditor's host style
  document.body.appendChild(host);
  view = new EditorView({
    state: EditorState.create({ doc: "INT. ROOM - DAY", extensions: createScreenplayExtensions({ getEntities: () => ({}), dark: false }) }),
    parent: host,
  });
  return view;
};
afterEach(() => { view?.destroy(); view = undefined; document.body.innerHTML = ""; });

const fontPx = (v) => parseFloat(getComputedStyle(v.dom.querySelector(".cm-content")).fontSize);

describe("editor zoom scales the rendered font size", () => {
  it("100% → 15px base", () => {
    expect(fontPx(mountAtZoom(1))).toBeCloseTo(15, 1);
  });

  it("zooming in (1.5×) enlarges the text", () => {
    expect(fontPx(mountAtZoom(1.5))).toBeCloseTo(22.5, 1);
  });

  it("zooming out (0.8×) shrinks the text", () => {
    expect(fontPx(mountAtZoom(0.8))).toBeCloseTo(12, 1);
  });

  it("zoom never rewrites the document text", () => {
    const v = mountAtZoom(2);
    expect(v.state.doc.toString()).toBe("INT. ROOM - DAY");
  });
});

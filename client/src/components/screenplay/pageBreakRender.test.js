// @vitest-environment happy-dom
//
// The page-break plugin measures real geometry to fill pages. happy-dom has no real layout engine,
// so we can't assert pixel heights here — but we CAN assert the editor mounts with a "===" page break
// without throwing, the === line classifies as a page break, and a block-widget spacer gets inserted
// after it (the StateField produces a .cm-sp-pagebreak-gap element). Pixel sizing is verified by hand
// in the browser; this guards the wiring + that the measure/dispatch loop doesn't crash.
import { describe, it, expect, afterEach } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { createScreenplayExtensions } from "./screenplayMode";
import { classifyText } from "./classify";

let view;
const mount = (doc) => {
  const host = document.createElement("div");
  host.style.setProperty("--sp-page-height", "1056px");
  document.body.appendChild(host);
  view = new EditorView({
    state: EditorState.create({ doc, extensions: createScreenplayExtensions({ getEntities: () => ({}), dark: false }) }),
    parent: host,
  });
  return view;
};
afterEach(() => { view?.destroy(); view = undefined; document.body.innerHTML = ""; });

describe("page break renders as a real spacer (wiring)", () => {
  it("=== classifies as a page break", () => {
    expect(classifyText("INT. A - DAY\n\n===\n\nINT. B - DAY")).toContain("pagebreak");
  });

  it("mounting a doc with === shows a visible PAGE BREAK divider on the line", () => {
    // happy-dom has no layout engine, so the rAF measure cycle that SIZES the spacer won't run
    // headlessly — but the LINE itself must always show the divider (.cm-sp-pagebreak), so a break
    // is visible even without the measured fill.
    const v = mount("INT. ROOM - DAY\n\nMary enters.\n\n===\n\nEXT. STREET - DAY\n\nShe leaves.");
    expect(v.state.doc.toString()).toContain("===");
    expect(v.dom.querySelector(".cm-sp-pagebreak")).toBeTruthy();
  });

  it("dispatching the spacer effect renders a page-gap widget (the rendering path)", async () => {
    const { setPageSpacers } = await import("./screenplayMode");
    const v = mount("INT. ROOM - DAY\n\n===\n\nEXT. STREET - DAY");
    const breakPos = v.state.doc.toString().indexOf("===") + 3; // end of the === line
    v.dispatch({ effects: setPageSpacers.of([{ pos: breakPos, height: 600 }]) });
    const gap = v.dom.querySelector(".cm-sp-pagebreak-gap");
    expect(gap).toBeTruthy();
    expect(gap.style.height).toBe("600px");
    expect(v.dom.querySelector(".cm-sp-pagebreak-rule")).toBeTruthy();
  });
});

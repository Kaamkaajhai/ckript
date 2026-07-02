import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { applyEmphasis, activeEmphasis, applyCase, applyCentered, isCenteredLine, insertPageBreak } from "./screenplayMode";
import { classifyText, textToBlocks } from "./classify";

// applyEmphasis/activeEmphasis only touch view.state, view.dispatch, view.focus — never the DOM —
// so a tiny state-backed stub lets us test the logic headlessly (a real EditorView needs `document`).
const mkView = (doc, from, to = from) => {
  let state = EditorState.create({ doc, selection: { anchor: from, head: to } });
  return {
    get state() { return state; },
    focus() {},
    dispatch(spec) { state = state.update(spec).state; },
  };
};

describe("applyEmphasis — Fountain inline emphasis (in-sync rich text)", () => {
  it("wraps a selection with the correct marker", () => {
    const v = mkView("hello world", 0, 5); // selects "hello"
    applyEmphasis(v, "bold");
    expect(v.state.doc.toString()).toBe("**hello** world");
  });

  it("italic uses single *, bold uses **, bolditalic uses ***, underline uses _", () => {
    const cases = [
      ["italic", "*hello*"],
      ["bold", "**hello**"],
      ["bolditalic", "***hello***"],
      ["underline", "_hello_"],
    ];
    for (const [kind, expected] of cases) {
      const v = mkView("hello", 0, 5);
      applyEmphasis(v, kind);
      expect(v.state.doc.toString()).toBe(expected);
    }
  });

  it("toggles OFF when the selection is already exactly wrapped", () => {
    const v = mkView("**hello**", 0, 9);
    applyEmphasis(v, "bold");
    expect(v.state.doc.toString()).toBe("hello");
  });

  it("inserts an empty marker pair and parks the caret inside when nothing is selected", () => {
    const v = mkView("", 0);
    applyEmphasis(v, "bold");
    expect(v.state.doc.toString()).toBe("****");
    expect(v.state.selection.main.head).toBe(2); // between ** and **
  });

  it("returns false for an unknown kind (no change)", () => {
    const v = mkView("hello", 0, 5);
    expect(applyEmphasis(v, "rainbow")).toBe(false);
    expect(v.state.doc.toString()).toBe("hello");
  });
});

describe("activeEmphasis — which emphasis wraps the selection", () => {
  it("reports nothing without a selection", () => {
    expect(activeEmphasis(mkView("**hello**", 4))).toEqual([]);
  });

  it("detects bold but not italic for **x**", () => {
    expect(activeEmphasis(mkView("**hello**", 0, 9))).toEqual(["bold"]);
  });

  it("detects italic for *x* and does NOT misread it as bold", () => {
    expect(activeEmphasis(mkView("*hello*", 0, 7))).toEqual(["italic"]);
  });

  it("treats ***x*** as bold AND italic", () => {
    const a = activeEmphasis(mkView("***hello***", 0, 11));
    expect(a).toContain("bolditalic");
    expect(a).toContain("bold");
    expect(a).toContain("italic");
  });

  it("detects underline for _x_", () => {
    expect(activeEmphasis(mkView("_hello_", 0, 7))).toEqual(["underline"]);
  });
});

describe("applyCase — UPPER/lower transform (rewrites characters, persists)", () => {
  it("uppercases the selection", () => {
    const v = mkView("hello world", 0, 5);
    applyCase(v, "upper");
    expect(v.state.doc.toString()).toBe("HELLO world");
  });

  it("lowercases the selection", () => {
    const v = mkView("HELLO WORLD", 0, 5);
    applyCase(v, "lower");
    expect(v.state.doc.toString()).toBe("hello WORLD");
  });

  it("no-ops without a selection", () => {
    const v = mkView("hello", 2);
    expect(applyCase(v, "upper")).toBe(false);
    expect(v.state.doc.toString()).toBe("hello");
  });
});

describe("applyCentered — Fountain >centered< (line-level, export-safe)", () => {
  it("wraps the caret's line as >text<", () => {
    const v = mkView("THE END", 0);
    applyCentered(v);
    expect(v.state.doc.toString()).toBe(">THE END<");
  });

  it("toggles centering off when already centered", () => {
    const v = mkView(">THE END<", 0);
    applyCentered(v);
    expect(v.state.doc.toString()).toBe("THE END");
  });

  it("centers every non-blank line in a multi-line selection", () => {
    const v = mkView("ONE\nTWO", 0, 7);
    applyCentered(v);
    expect(v.state.doc.toString()).toBe(">ONE<\n>TWO<");
  });

  it("isCenteredLine reflects the caret line", () => {
    expect(isCenteredLine(mkView(">x<", 1))).toBe(true);
    expect(isCenteredLine(mkView("x", 0))).toBe(false);
  });
});

describe("centered text stays in sync with the classifier", () => {
  it(">text< classifies as action (not transition) and strips markers for display", () => {
    expect(classifyText(">THE END<")).toEqual(["action"]);
    expect(textToBlocks(">THE END<")).toEqual([{ type: "action", text: "THE END" }]);
  });

  it("a leading > WITHOUT a trailing < is still a transition (no collision)", () => {
    expect(classifyText("> FADE OUT")).toEqual(["transition"]);
  });
});

describe("insertPageBreak — Fountain forced page break (===)", () => {
  it("inserts === on an empty line and the result classifies as pagebreak", () => {
    const v = mkView("", 0);
    insertPageBreak(v);
    const doc = v.state.doc.toString();
    expect(doc.includes("===")).toBe(true);
    // The === line classifies as a page break.
    expect(classifyText(doc).includes("pagebreak")).toBe(true);
  });

  it("separates the break from surrounding text with blank lines", () => {
    const v = mkView("Action line.", 12); // caret at end
    insertPageBreak(v);
    expect(v.state.doc.toString()).toBe("Action line.\n\n===\n\n");
  });
});

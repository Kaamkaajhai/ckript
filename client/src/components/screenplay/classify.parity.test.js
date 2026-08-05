import { describe, it, expect } from "vitest";
import { classifyText as clientClassify, textToBlocks as clientBlocks, parseTitlePage as clientParseTP, serializeTitlePage as clientSerTP, parseInlineEmphasis as clientEmph } from "./classify";
// The server keeps a lockstep COPY of the classifier (separate Vercel deploys can't share one
// file). THIS test is what makes them one behavior: if anyone edits one classify.js without the
// other, these assertions fail. classify.js is pure ESM, so the Node test runner imports both.
import { classifyText as serverClassify, textToBlocks as serverBlocks, parseTitlePage as serverParseTP, serializeTitlePage as serverSerTP, parseInlineEmphasis as serverEmph } from "../../../../server/utils/classify.js";
import { formatScreenplayLikeText } from "../../../../server/utils/screenplayParser.js";

const FIXTURES = {
  core: ["INT. KITCHEN - DAY", "", "Mary stirs a pot.", "", "MARY", "(quietly)", "We need to talk.", "", "CUT TO:"].join("\n"),
  multiWordCues: ["INT. OFFICE - DAY", "", "A phone rings.", "", "DETECTIVE RAO", "Nobody moves.", "", "MRS. SMITH", "You heard him."].join("\n"),
  dual: ["INT. BAR - NIGHT", "", "MARY", "Hi.", "", "JOHN ^", "Hey."].join("\n"),
  acts: ["ACT TWO", "", "INT. ROOM - DAY", "", "Stuff.", "", "END ACT"].join("\n"),
  markers: ["INT. SET - DAY", "", "CLOSE ON: the note.", "", "~ a song", "", "# Sequence: Chase"].join("\n"),
  // Fountain forced elements: a plain word manually tagged scene/character/transition carries a
  // leading "."/"@"/">" so the one classifier recognizes it (the bug fix). "..literal" is an
  // ESCAPED dot — must stay action, not a forced scene.
  forced: [".LOCATION", "", "@NARRATOR", "I begin.", "", "> WE ARE OUT", "", "..a literal dot line"].join("\n"),
  // Page breaks were removed: a legacy "===" line is dropped from display; a single "=" stays action.
  legacyEquals: ["INT. ROOM - DAY", "", "Action.", "", "===", "", "EXT. STREET - DAY", "", "= a synopsis"].join("\n"),
  // Inline emphasis + centered are stripped/flagged identically on both sides.
  emphasis: ["INT. ROOM - DAY", "", "A **bold** and *italic* and _under_ mix.", "", ">THE END<"].join("\n"),
};

describe("Classifier parity — client classify.js === server classify.js (the one classifier)", () => {
  for (const [name, text] of Object.entries(FIXTURES)) {
    it(`classifyText agrees on: ${name}`, () => {
      expect(serverClassify(text)).toEqual(clientClassify(text));
    });
    it(`textToBlocks agrees on: ${name}`, () => {
      expect(serverBlocks(text)).toEqual(clientBlocks(text));
    });
  }

  it("title-page parse/serialize agree (client === server)", () => {
    const fields = { title: "THE HEIST", credit: "Written by", author: "Jane Doe", source: "Based on real events", draftDate: "2026-06-30" };
    const block = clientSerTP(fields);
    expect(serverSerTP(fields)).toBe(block);
    const doc = block + "INT. ROOM - DAY\nAction.";
    expect(serverParseTP(doc)).toEqual(clientParseTP(doc));
    expect(clientParseTP(doc)).toEqual(fields);
  });

  it("inline emphasis parses identically (client === server) so viewer + PDF match the editor", () => {
    for (const s of ["A **bold** and *italic* and _under_ mix.", "***both*** styles", "no markers here"]) {
      expect(serverEmph(s)).toEqual(clientEmph(s));
    }
    // Sanity: the styled runs are what the renderers consume.
    expect(clientEmph("say **hi**")).toEqual([
      { text: "say ", bold: false, italic: false, underline: false },
      { text: "hi", bold: true, italic: false, underline: false },
    ]);
  });

  it("legacy === is dropped from display (no page breaks), on both sides", () => {
    for (const fn of [clientBlocks, serverBlocks]) {
      const blocks = fn("A\n\n===\n\nB");
      expect(blocks.some((b) => b.type === "pagebreak")).toBe(false);
      expect(blocks.some((b) => String(b.text).includes("==="))).toBe(false);
    }
  });
});

describe("Server PDF block stream (formatScreenplayLikeText + classify) — the actual PDF input", () => {
  const pdfBlocks = (text) => serverBlocks(formatScreenplayLikeText(text)).filter((b) => b.type !== "spacer");

  it("multi-word cues feed the PDF as CHARACTER (the buyer-facing bug, now fixed)", () => {
    const types = pdfBlocks(FIXTURES.multiWordCues).map((b) => b.type);
    // scene, action, character(RAO), dialogue, character(MRS. SMITH), dialogue
    expect(types).toEqual(["scene", "action", "character", "dialogue", "character", "dialogue"]);
  });

  it("regression guard — a single-word-cue script keeps its known-good typing", () => {
    const types = pdfBlocks(FIXTURES.core).map((b) => b.type);
    expect(types).toEqual(["scene", "action", "character", "parenthetical", "dialogue", "transition"]);
  });

  it("dual cue reaches the PDF as a dual block with the ^ stripped", () => {
    const dualBlock = pdfBlocks(FIXTURES.dual).find((b) => b.type === "dual");
    expect(dualBlock).toBeTruthy();
    expect(dualBlock.text).toBe("JOHN");
  });

  it("forced elements survive the formatter and reach the PDF typed + marker-stripped", () => {
    const blocks = pdfBlocks(FIXTURES.forced);
    const byType = Object.fromEntries(blocks.map((b) => [b.type, b.text]));
    expect(byType.scene).toBe("LOCATION");
    expect(byType.character).toBe("NARRATOR");
    expect(byType.transition).toBe("WE ARE OUT");
  });
});

describe("Fountain forced elements — manual tags persist into the text and round-trip", () => {
  it("classifies leading .@> markers as scene/character/transition (escaped .. stays action)", () => {
    const types = clientClassify(FIXTURES.forced);
    // .LOCATION, blank, @NARRATOR, dialogue, blank, >transition, blank, ..literal
    expect(types).toEqual(["scene", "blank", "character", "dialogue", "blank", "transition", "blank", "action"]);
  });

  it("strips the forcing marker from the displayed text (viewer/PDF show clean words)", () => {
    const blocks = clientBlocks(FIXTURES.forced).filter((b) => b.type !== "spacer");
    const byType = Object.fromEntries(blocks.map((b) => [b.type, b.text]));
    expect(byType.scene).toBe("LOCATION");
    expect(byType.character).toBe("NARRATOR");
    expect(byType.transition).toBe("WE ARE OUT");
  });
});

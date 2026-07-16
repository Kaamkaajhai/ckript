import { describe, it, expect } from "vitest";
import { fountainToFdx, fdxToFountain } from "./fdx";
import { classifyText } from "./classify";

// The meaningful round-trip invariant (§0): the editor's ONE classifier must re-read the result
// identically. So we compare ELEMENT BLOCKS (type + trimmed text) produced by classifyText —
// spacing differences don't matter, but a flattened dual or a dropped act break does.
const blocks = (fountain) => {
  const lines = String(fountain).split("\n");
  return classifyText(fountain)
    .map((type, i) => ({ type, text: lines[i].trim() }))
    .filter((b) => b.type !== "blank");
};

const roundTripFromFountain = (f) => fdxToFountain(fountainToFdx(f)).fountain;

describe("FDX round-trip — core six elements (§7.1)", () => {
  const CORE = [
    "INT. KITCHEN - DAY",
    "",
    "Mary stirs a pot.",
    "",
    "MARY",
    "(quietly)",
    "We need to talk.",
    "",
    "CUT TO:",
  ].join("\n");

  it("Fountain → FDX → Fountain preserves scene/action/character/parenthetical/dialogue/transition", () => {
    expect(blocks(roundTripFromFountain(CORE))).toEqual(blocks(CORE));
  });

  it("emits one Paragraph per element with the right FDX Type", () => {
    const xml = fountainToFdx(CORE);
    expect(xml).toContain('<Paragraph Type="Scene Heading">');
    expect(xml).toContain('<Paragraph Type="Action">');
    expect(xml).toContain('<Paragraph Type="Character">');
    expect(xml).toContain('<Paragraph Type="Parenthetical">');
    expect(xml).toContain('<Paragraph Type="Dialogue">');
    expect(xml).toContain('<Paragraph Type="Transition">');
  });

  it("escapes XML special characters in text", () => {
    const xml = fountainToFdx(["INT. LAB - DAY", "", "Tom & Jerry <fight> \"hard\"."].join("\n"));
    expect(xml).toContain("Tom &amp; Jerry &lt;fight&gt;");
    // and it round-trips back to the literal characters
    expect(roundTripFromFountain(["INT. LAB - DAY", "", "Tom & Jerry <fight>."].join("\n")))
      .toContain("Tom & Jerry <fight>.");
  });
});

describe("FDX round-trip — act breaks (§7.2)", () => {
  const ACTS = ["ACT TWO", "", "INT. ROOM - DAY", "", "Stuff happens.", "", "END ACT"].join("\n");

  it("ACT / END ACT text survives Fountain → FDX → Fountain", () => {
    const rt = roundTripFromFountain(ACTS);
    expect(rt).toContain("ACT TWO");
    expect(rt).toContain("END ACT");
    expect(blocks(rt)).toEqual(blocks(ACTS));
    // and they re-classify as act / endact, not action
    const types = blocks(rt).map((b) => b.type);
    expect(types).toContain("act");
    expect(types).toContain("endact");
  });
});

describe("FDX round-trip — DUAL dialogue, both directions (§7.3)", () => {
  const DUAL = [
    "INT. BAR - NIGHT",
    "",
    "MARY",
    "We need to talk.",
    "",
    "JOHN ^",
    "No we don't.",
  ].join("\n");

  it("Fountain → FDX → Fountain keeps the pair DUAL (not two sequential cues)", () => {
    const rt = roundTripFromFountain(DUAL);
    const types = blocks(rt).map((b) => b.type);
    expect(types).toContain("dual"); // the ^-marked second cue survived
    expect(blocks(rt)).toEqual(blocks(DUAL));
  });

  it("export wraps the pair in <DualDialogue> and strips the ^", () => {
    const xml = fountainToFdx(DUAL);
    expect(xml).toContain("<DualDialogue>");
    expect(xml).not.toContain("^"); // ^ is Fountain syntax, not FDX
  });

  it("FDX (real DualDialogue) → Fountain → FDX stays dual", () => {
    const fdx = [
      '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
      '<FinalDraft DocumentType="Script" Template="No" Version="1">',
      "  <Content>",
      '    <Paragraph Type="Scene Heading"><Text>INT. BAR - NIGHT</Text></Paragraph>',
      "    <DualDialogue>",
      '      <Paragraph Type="Character"><Text>MARY</Text></Paragraph>',
      '      <Paragraph Type="Dialogue"><Text>We need to talk.</Text></Paragraph>',
      '      <Paragraph Type="Character"><Text>JOHN</Text></Paragraph>',
      '      <Paragraph Type="Dialogue"><Text>No we don\'t.</Text></Paragraph>',
      "    </DualDialogue>",
      "  </Content>",
      "</FinalDraft>",
    ].join("\n");
    const { fountain } = fdxToFountain(fdx);
    expect(blocks(fountain).map((b) => b.type)).toContain("dual");
    // re-export and re-import: still dual
    const again = fdxToFountain(fountainToFdx(fountain)).fountain;
    expect(blocks(again).map((b) => b.type)).toContain("dual");
  });
});

describe("FDX import — real Final Draft file with unknown types (§7.4)", () => {
  // Mimics what Final Draft actually writes: Text runs, a General paragraph, and an unknown
  // element type that must fall back to Action and be REPORTED, never dropped.
  const REAL_FD = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<FinalDraft DocumentType="Script" Template="No" Version="5">',
    "  <Content>",
    '    <Paragraph Type="Scene Heading"><Text>INT. OFFICE - DAY</Text></Paragraph>',
    '    <Paragraph Type="Action"><Text>A phone </Text><Text Style="Italic">rings</Text><Text>.</Text></Paragraph>',
    '    <Paragraph Type="Character"><Text>DETECTIVE RAO</Text></Paragraph>',
    '    <Paragraph Type="Dialogue"><Text>Nobody moves.</Text></Paragraph>',
    '    <Paragraph Type="Cast List"><Text>RAO, MARY, JOHN</Text></Paragraph>',
    "  </Content>",
    "</FinalDraft>",
  ].join("\n");

  it("maps known types, flattens Text runs, falls back unknown→Action, and reports it", () => {
    const { fountain, unmapped } = fdxToFountain(REAL_FD);
    const b = blocks(fountain);
    const types = b.map((x) => x.type);
    expect(types).toEqual(expect.arrayContaining(["scene", "action", "character", "dialogue"]));
    // styled runs flattened into one line
    expect(fountain).toContain("A phone rings.");
    // unknown "Cast List" did not vanish — present as action text and reported
    expect(fountain).toContain("RAO, MARY, JOHN");
    expect(unmapped).toContain("Cast List");
  });

  it("never drops a paragraph", () => {
    const { fountain } = fdxToFountain(REAL_FD);
    // 5 source paragraphs → 5 non-blank Fountain blocks
    expect(blocks(fountain).length).toBe(5);
  });
});

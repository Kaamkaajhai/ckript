import { describe, it, expect } from "vitest";
import {
  KEEPALIVE_BODY_LIMIT_BYTES,
  KEEPALIVE_DROPPED_FIELDS,
  measureUtf8Bytes,
  buildKeepalivePayload,
  encodeKeepaliveBody,
} from "./keepaliveSave";

/*
 * DEF-1 (NATIVE_APP_IMPLEMENTATION.md §19.1). The exit save posts the draft with
 * `keepalive: true`, whose body MDN caps at 64 KiB. The draft payload carries the
 * script text three or four times over, so it crosses that cap on any real
 * screenplay — and the rejection arrives after fetch() returns, was swallowed by
 * `.catch(() => {})`, and the caller advanced its "saved" signature regardless.
 *
 * The measurement below is the point of this file. It is built from the real
 * payload shape (usePayloads.js buildDraftPayload) rather than a toy object,
 * because the whole defect is that nobody had measured it.
 */

// One page of a screenplay at ordinary density — a filled 55-line page, which runs
// 1,200-2,000 bytes in Fountain. Deliberately at the low end of that range so the
// numbers below understate the problem rather than flatter the fix.
const PAGE = [
  "INT. RENTED ROOM - NIGHT",
  "",
  "Rain on the window. MAYA (30s) sits on the floor with a shoebox of letters",
  "open in front of her. The lid is off. It has been off for a while.",
  "",
  "MAYA",
  "You said you'd write. You didn't say how much.",
  "",
  "She lifts one, reads the first line, and puts it back without finishing it.",
  "",
  "ANOTHER ANGLE",
  "",
  "The stack is taller than the box is deep. She closes the lid anyway and sits",
  "with both hands flat on top of it, the way you hold a door shut.",
  "",
  "DEV (O.S.)",
  "(from the hall)",
  "You're not asleep.",
  "",
  "MAYA",
  "I'm not anything.",
  "",
  "DEV steps into the doorway with two cups he has clearly been holding too long.",
  "He looks at the box. He does not look at her looking at the box.",
  "",
  "DEV",
  "There's a version of tonight where we don't do this.",
  "",
  "MAYA",
  "There's a version of every night where we don't do this. I keep picking",
  "the other one.",
  "",
  "He sets a cup down beside her, close enough to reach, far enough to ignore.",
  "",
  "DEV",
  "Then read one out. Just one. Out loud, so it's in the room instead of",
  "in your head.",
  "",
  "She doesn't move. Rain fills the pause. Somewhere below, a door closes.",
  "",
  "MAYA",
  "\"By the time you get this I'll have stopped waiting for you to answer.\"",
  "",
  "DEV",
  "Which one is that?",
  "",
  "MAYA",
  "The last one. They're all the last one.",
  "",
  "CUT TO:",
  "",
].join("\n");

const screenplayOf = (pages) => Array.from({ length: pages }, () => PAGE).join("\n");

/** The real draft payload shape, screenplay mode, where all three text fields are the same string. */
const draftPayload = (pages) => {
  const text = screenplayOf(pages);
  return {
    title: "The Last Scene",
    textContent: text,
    fountainContent: text,
    baseContent: text,
    scriptPreviewPageTexts: Array.from({ length: pages }, () => PAGE),
    sceneSynopses: {},
    outlineNotes: "",
    titlePage: null,
    companyName: "",
    writers: [{ userId: "u1", name: "A Writer", creditType: "written_by", order: 0 }],
    format: "feature_film",
    contentType: "screenplay",
    logline: "A woman inherits a box of letters she never answered.",
    synopsis: "",
    pageCount: pages,
    primaryGenre: "Drama",
    classification: { primaryGenre: "Drama", secondaryGenre: "", tones: [], themes: [], settings: [] },
    viewableScript: false,
    scriptPreviewAccess: null,
    scriptCompletion: {},
    legal: { agreedToTerms: false, termsVersion: 1, customInvestorTerms: "" },
    collabVisibility: "private",
    rightsLicensing: {},
    filmDetails: { filmLanguage: "English", dialoguesPresent: "yes", wantToDirect: false, wantToProduce: false, scriptStyle: [] },
    targetIndustry: ["film"],
    publishingDetails: {},
    scriptId: "68b0f0f0f0f0f0f0f0f0f0f0",
  };
};

describe("measureUtf8Bytes", () => {
  it("counts bytes, not characters — the cap is on the encoded body", () => {
    expect(measureUtf8Bytes("abc")).toBe(3);
    expect(measureUtf8Bytes("é")).toBe(2);
    expect(measureUtf8Bytes("—")).toBe(3);   // em dash, common in dialogue
    expect(measureUtf8Bytes("😀")).toBe(4);
  });

  it("agrees with TextEncoder on mixed text", () => {
    const sample = "INT. CAFÉ — DAY\n\nMAYA\nDon't — please.\n😶";
    expect(measureUtf8Bytes(sample)).toBe(new TextEncoder().encode(sample).length);
  });
});

describe("the measurement DEF-1 is about", () => {
  // The page fixture must stay honest, or every number below is decoration.
  it("uses a page of realistic density (1,200-2,000 bytes)", () => {
    const pageBytes = measureUtf8Bytes(PAGE);
    expect(pageBytes).toBeGreaterThanOrEqual(1200);
    expect(pageBytes).toBeLessThanOrEqual(2000);
  });

  it("the untrimmed draft payload crosses the 64 KiB keepalive cap between 9 and 16 pages", () => {
    let crossesAt = null;
    for (let pages = 1; pages <= 60 && crossesAt === null; pages += 1) {
      if (measureUtf8Bytes(JSON.stringify(draftPayload(pages))) > KEEPALIVE_BODY_LIMIT_BYTES) {
        crossesAt = pages;
      }
    }
    // This is the number §19.1 records, computed here rather than quoted: past it,
    // every exit save was silently discarded by the browser.
    expect(crossesAt).not.toBeNull();
    expect(crossesAt).toBeGreaterThanOrEqual(9);
    expect(crossesAt).toBeLessThanOrEqual(16);
  });

  it("a feature-length script is many multiples of the cap, so this was never a rare edge case", () => {
    const feature = measureUtf8Bytes(JSON.stringify(draftPayload(100)));
    expect(feature).toBeGreaterThan(KEEPALIVE_BODY_LIMIT_BYTES * 3);
  });

  it("trimming buys pages but does not solve it — which is why the refusal has to exist", () => {
    let crossesAt = null;
    for (let pages = 1; pages <= 120 && crossesAt === null; pages += 1) {
      if (!encodeKeepaliveBody(draftPayload(pages)).withinLimit) crossesAt = pages;
    }
    expect(crossesAt).not.toBeNull();
    // Better than the untrimmed 9-16, and still nowhere near a feature.
    expect(crossesAt).toBeGreaterThan(12);
    expect(crossesAt).toBeLessThan(60);
  });
});

describe("buildKeepalivePayload", () => {
  it("drops the derived page texts, which the very next autosave rewrites anyway", () => {
    const slim = buildKeepalivePayload(draftPayload(5));
    expect(slim.scriptPreviewPageTexts).toBeUndefined();
    expect(KEEPALIVE_DROPPED_FIELDS).toContain("scriptPreviewPageTexts");
  });

  it("keeps every field the server needs to write the draft", () => {
    const slim = buildKeepalivePayload(draftPayload(5));
    expect(slim.title).toBe("The Last Scene");
    expect(slim.textContent).toBeTruthy();
    expect(slim.fountainContent).toBeTruthy();
    expect(slim.baseContent).toBeTruthy();   // the duet merge base — dropping it would lose a co-writer's work
    expect(slim.scriptId).toBe("68b0f0f0f0f0f0f0f0f0f0f0");
  });

  it("does not mutate the caller's payload", () => {
    const original = draftPayload(2);
    buildKeepalivePayload(original);
    expect(Array.isArray(original.scriptPreviewPageTexts)).toBe(true);
  });
});

describe("encodeKeepaliveBody — the refusal is the fix", () => {
  it("encodes a small draft and reports it will fit", () => {
    const result = encodeKeepaliveBody(draftPayload(2));
    expect(result.withinLimit).toBe(true);
    expect(result.reason).toBe("ok");
    expect(result.bytes).toBeLessThanOrEqual(KEEPALIVE_BODY_LIMIT_BYTES);
    expect(JSON.parse(result.body).title).toBe("The Last Scene");
  });

  it("returns NO body for a payload over the cap, rather than one the browser will reject after the fact", () => {
    const result = encodeKeepaliveBody(draftPayload(60));
    expect(result.withinLimit).toBe(false);
    expect(result.reason).toBe("too-large");
    expect(result.body).toBeNull();
    expect(result.bytes).toBeGreaterThan(KEEPALIVE_BODY_LIMIT_BYTES);
  });

  it("measures what would actually be sent — the trimmed body, not the original payload", () => {
    const payload = draftPayload(12);
    const trimmed = encodeKeepaliveBody(payload).bytes;
    const untrimmed = measureUtf8Bytes(JSON.stringify(payload));
    expect(trimmed).toBeLessThan(untrimmed);
  });

  it("uses MDN's documented 64 KiB cap", () => {
    expect(KEEPALIVE_BODY_LIMIT_BYTES).toBe(65536);
  });

  it("honours an explicit limit, so the boundary itself is testable", () => {
    const tiny = encodeKeepaliveBody({ title: "x" }, { limit: 2 });
    expect(tiny.withinLimit).toBe(false);
    expect(tiny.limit).toBe(2);
  });

  it("refuses an unserializable payload instead of throwing on the way out of the page", () => {
    const circular = { title: "x" };
    circular.self = circular;
    const result = encodeKeepaliveBody(circular);
    expect(result.withinLimit).toBe(false);
    expect(result.reason).toBe("unserializable");
    expect(result.body).toBeNull();
  });
});

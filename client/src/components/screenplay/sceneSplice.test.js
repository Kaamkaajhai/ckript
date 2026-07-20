import { describe, it, expect } from "vitest";
import { getScenes, getSceneText, replaceSceneText } from "./sceneIdentity";

// Live duet sync: a co-writer streams the scene they hold, and we splice it into our own copy.
// The invariant that matters is that ONLY the target scene changes — everything a different
// writer is working on must survive untouched.
describe("live scene splice", () => {
  const doc = [
    "INT. ROOM - DAY", "", "Sam paces.", "",
    "EXT. PARK - DAY", "", "Riya runs.", "",
    "INT. KITCHEN - NIGHT", "", "Alex burns toast.", "",
  ].join("\n");

  const sceneIdFor = (text, needle) =>
    getScenes(text).find((s) => s.heading.includes(needle)).sceneId;

  it("reads a single scene's text back out", () => {
    expect(getSceneText(doc, sceneIdFor(doc, "PARK"))).toBe("EXT. PARK - DAY\n\nRiya runs.\n");
  });

  it("replaces only the target scene and leaves its neighbours intact", () => {
    const incoming = "EXT. PARK - DAY\n\nRiya sprints past the fountain.\nShe stops.\n";
    const next = replaceSceneText(doc, sceneIdFor(doc, "PARK"), incoming);

    expect(next).toContain("Riya sprints past the fountain.");
    expect(next).not.toContain("Riya runs.");
    // The scenes the other writers own are untouched.
    expect(next).toContain("Sam paces.");
    expect(next).toContain("Alex burns toast.");
    expect(getScenes(next)).toHaveLength(3);
  });

  it("ignores an unknown scene id rather than guessing where it goes", () => {
    expect(replaceSceneText(doc, "scene-99-does-not-exist", "whatever")).toBeNull();
  });

  it("round-trips a document with no sluglines (whole-doc fallback)", () => {
    const plain = "Just some text\nwith no slugline.";
    const only = getScenes(plain)[0].sceneId;
    expect(replaceSceneText(plain, only, "Replaced entirely.")).toBe("Replaced entirely.");
  });

  it("survives repeated application (idempotent for the same payload)", () => {
    const id = sceneIdFor(doc, "KITCHEN");
    const incoming = "INT. KITCHEN - NIGHT\n\nAlex plates the eggs.\n";
    const once = replaceSceneText(doc, id, incoming);
    const twice = replaceSceneText(once, sceneIdFor(once, "KITCHEN"), incoming);
    expect(twice).toBe(once);
  });
});

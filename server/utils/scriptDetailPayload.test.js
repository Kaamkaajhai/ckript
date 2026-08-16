import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SCRIPT_DETAIL_BODY_FIELDS,
  SCRIPT_DETAIL_CREATOR_SELECT,
  buildScriptDetailBodyAccess,
} from "./scriptDetailPayload.js";

const fullScript = {
  fullContent: "FADE IN: the whole thing",
  textContent: "<p>the whole thing</p>",
  fountainContent: "INT. ROOM - DAY\n\nThe whole thing.",
  fileUrl: "https://res.cloudinary.com/ckript/raw/upload/private/script.pdf",
};

describe("authenticated script-detail privacy boundary", () => {
  it("withholds every body field from a viewer without full access (DEF-25)", () => {
    const payload = buildScriptDetailBodyAccess({ script: fullScript, canViewFullScript: false });

    for (const field of SCRIPT_DETAIL_BODY_FIELDS) {
      assert.equal(payload[field], null, `${field} must not reach an unentitled viewer`);
    }
  });

  it("names fountainContent and fileUrl specifically, because those are the two that leaked", () => {
    // The regression this pins is not "bodies are private" in the abstract — fullContent and
    // textContent were always gated. It is that TWO MORE fields carried the same screenplay past
    // that gate: the canonical Fountain source the client reader prefers, and the private URL of
    // the stored PDF. If either name is ever dropped from the list, this fails.
    assert.ok(SCRIPT_DETAIL_BODY_FIELDS.includes("fountainContent"));
    assert.ok(SCRIPT_DETAIL_BODY_FIELDS.includes("fileUrl"));

    const payload = buildScriptDetailBodyAccess({ script: fullScript, canViewFullScript: false });
    assert.equal(payload.fountainContent, null);
    assert.equal(payload.fileUrl, null);
  });

  it("returns every body field to an entitled viewer unchanged", () => {
    const payload = buildScriptDetailBodyAccess({ script: fullScript, canViewFullScript: true });

    for (const field of SCRIPT_DETAIL_BODY_FIELDS) {
      assert.equal(payload[field], fullScript[field], `${field} must reach an entitled viewer`);
    }
  });

  it("still answers 'is there a stored PDF' for a viewer who may not have its URL", () => {
    // Withholding fileUrl also withheld a fact that is not private, and which the reader needs in
    // order to choose between the authenticated PDF proxy and structured pages. A viewer without
    // access learns that a PDF exists; they do not learn where it is.
    const locked = buildScriptDetailBodyAccess({ script: fullScript, canViewFullScript: false });
    assert.equal(locked.hasUploadedScriptFile, true);
    assert.equal(locked.fileUrl, null);

    const unlocked = buildScriptDetailBodyAccess({ script: fullScript, canViewFullScript: true });
    assert.equal(unlocked.hasUploadedScriptFile, true);
  });

  it("reports no stored PDF for an editor-authored project, including a whitespace-only url", () => {
    for (const fileUrl of [undefined, null, "", "   "]) {
      const payload = buildScriptDetailBodyAccess({
        script: { ...fullScript, fileUrl },
        canViewFullScript: true,
      });
      assert.equal(payload.hasUploadedScriptFile, false, `fileUrl=${JSON.stringify(fileUrl)}`);
    }
  });

  it("normalizes a missing field to null rather than undefined", () => {
    // The response spreads this object over `...script.toObject()`. `undefined` does not override
    // a spread key in JSON serialization the way null does, so an absent field must resolve to
    // null or the gate silently lets the spread's value through.
    const payload = buildScriptDetailBodyAccess({ script: {}, canViewFullScript: true });
    for (const field of SCRIPT_DETAIL_BODY_FIELDS) {
      assert.equal(payload[field], null, `${field} must be null, not undefined`);
    }
  });

  it("defaults to withholding when called with nothing", () => {
    const payload = buildScriptDetailBodyAccess();
    for (const field of SCRIPT_DETAIL_BODY_FIELDS) {
      assert.equal(payload[field], null);
    }
    assert.equal(payload.hasUploadedScriptFile, false);
  });

  it("keeps the writer's email and phone out of the creator populate (DEF-26)", () => {
    // These two are sold: an active Film Industry Professional plan releases a bounded number of
    // writer contacts per month, and the detail handler spends one to populate `writerContact`.
    // Selecting them onto `creator` handed the same values to every authenticated viewer for free.
    const selected = SCRIPT_DETAIL_CREATOR_SELECT.split(/\s+/).filter(Boolean);
    assert.ok(!selected.includes("email"), "creator.email must not be selected");
    assert.ok(!selected.includes("phone"), "creator.phone must not be selected");

    // The fields the detail screen genuinely renders are still there, so this is a narrowing and
    // not a removal.
    for (const field of ["name", "profileImage", "role", "username", "writerProfile.links"]) {
      assert.ok(selected.includes(field), `${field} must remain selected`);
    }
  });
});

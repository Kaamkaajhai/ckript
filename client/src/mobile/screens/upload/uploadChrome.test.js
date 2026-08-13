import { describe, expect, it } from "vitest";
import { DETAIL_SCREEN_ORDER, UPLOAD_SCREEN_ORDER } from "../../../utils/scriptUploadValidation";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import {
  buildUploadOverflowItems,
  describeUploadFooter,
  describeUploadPosition,
  describeUploadSaveState,
  UPLOAD_LAST_STEP,
  UPLOAD_SHELL_MODE,
  UPLOAD_SHELL_SLOTS,
} from "./uploadChrome";

/*
 * The upload flow's chrome model is pure data, which is the point of it being a
 * separate module: "what does the app bar say on step 2 panel 4?" and "when is
 * Publish refused, and what does it say instead?" are answerable without a
 * screen, a network or a browser.
 */

describe("upload shell contract", () => {
  it("is a flow screen with exactly one declared slot override", () => {
    expect(UPLOAD_SHELL_MODE).toBe(MOBILE_SHELL_MODE.FLOW);
    // `flow` forbids bottom chrome, so the sticky footer is an exception and
    // must be a named exported constant rather than an object literal in JSX —
    // that is what makes it greppable from the manifest side.
    expect(UPLOAD_SHELL_SLOTS).toEqual({ bottomNav: true });
    expect(Object.isFrozen(UPLOAD_SHELL_SLOTS)).toBe(true);
  });
});

describe("describeUploadPosition", () => {
  it("names the step and, inside Details, the panel", () => {
    const basics = describeUploadPosition({ step: 2, detailStep: 0 });
    expect(basics.position).toBe("Step 2 of 5");
    expect(basics.label).toBe("Details");
    expect(basics.panelLabel).toBe("Project basics");
    expect(basics.panelPosition).toBe(`1 of ${DETAIL_SCREEN_ORDER.length}`);
  });

  it("does not repeat the step label as a panel label outside Details", () => {
    // "Step 3 of 5 · Classification · Classification" is the stutter this guards.
    for (const step of [1, 3, 4, 5]) {
      const position = describeUploadPosition({ step });
      expect(position.panelLabel).toBe("");
      expect(position.panelPosition).toBeNull();
    }
  });

  it("resolves the panel key through the SHARED screen resolver", () => {
    // Not a local table: `validateUploadScreen` and this must agree, or the
    // wrong panel is drawn for a validation issue that named the right one.
    expect(describeUploadPosition({ step: 1 }).panelKey).toBe("upload");
    expect(describeUploadPosition({ step: 2, detailStep: 4 }).panelKey).toBe("access");
    expect(describeUploadPosition({ step: 5 }).panelKey).toBe("publish");
  });

  it("counts progress in panels, not steps, so step 2 does not stall then jump", () => {
    const walked = [
      describeUploadPosition({ step: 1 }),
      ...DETAIL_SCREEN_ORDER.map((_, index) => describeUploadPosition({ step: 2, detailStep: index })),
      describeUploadPosition({ step: 3 }),
      describeUploadPosition({ step: 4 }),
      describeUploadPosition({ step: 5 }),
    ].map((position) => position.progress);

    expect(walked).toHaveLength(UPLOAD_SCREEN_ORDER.length);
    // Strictly increasing, and it ends at exactly 1.
    expect(walked.every((value, index) => index === 0 || value > walked[index - 1])).toBe(true);
    expect(walked.at(-1)).toBe(1);
  });

  it("clamps a step outside the flow rather than producing a broken position line", () => {
    expect(describeUploadPosition({ step: 99 }).step).toBe(UPLOAD_LAST_STEP);
    expect(describeUploadPosition({ step: 0 }).step).toBe(1);
    expect(describeUploadPosition({ step: 2, detailStep: 99 }).panelPosition)
      .toBe(`${DETAIL_SCREEN_ORDER.length} of ${DETAIL_SCREEN_ORDER.length}`);
  });

  it("does not promise four more steps to a content-only collaborator", () => {
    const position = describeUploadPosition({ step: 1, contentOnly: true });
    expect(position.position).toBe("Content-only edit");
    expect(position.total).toBe(1);
    expect(position.progress).toBe(1);
  });
});

describe("describeUploadFooter", () => {
  it("walks with Next inside Details and Continue when the step changes", () => {
    expect(describeUploadFooter({ step: 2, detailStep: 0 }).next.label).toBe("Next");
    expect(describeUploadFooter({ step: 2, detailStep: 4 }).next.label).toBe("Next");
    // The last Details panel leaves step 2.
    expect(describeUploadFooter({ step: 2, detailStep: 5 }).next.label).toBe("Continue");
    expect(describeUploadFooter({ step: 1 }).next.label).toBe("Continue");
  });

  it("disables Back only on the first screen, never elsewhere", () => {
    expect(describeUploadFooter({ step: 1 }).back.disabled).toBe(true);
    expect(describeUploadFooter({ step: 2, detailStep: 0 }).back.disabled).toBe(false);
    expect(describeUploadFooter({ step: 5 }).back.disabled).toBe(false);
  });

  it("publishes on the last step, and says 'update' when editing a live listing", () => {
    expect(describeUploadFooter({ step: 5 }).next).toMatchObject({
      kind: "publish", label: "Publish for review", disabled: false,
    });
    expect(describeUploadFooter({ step: 5, editing: true }).next.label).toBe("Submit update");
  });

  it("REFUSES only what the writer cannot fix here, and says why in words", () => {
    // The two hard gates.
    const blocked = describeUploadFooter({ step: 5, creationBlocked: true });
    expect(blocked.next.disabled).toBe(true);
    expect(blocked.next.blockedReason).toMatch(/script limit/i);

    const locked = describeUploadFooter({ step: 5, editing: true, editApprovalLocked: true });
    expect(locked.next.disabled).toBe(true);
    expect(locked.next.blockedReason).toMatch(/admin review/i);

    const localOnly = describeUploadFooter({ step: 5, editing: true, sourceWriteBlocked: true });
    expect(localOnly.next.disabled).toBe(true);
    expect(localOnly.next.blockedReason).toMatch(/reload the server copy/i);
  });

  it("leaves Publish ENABLED for anything validation can navigate to", () => {
    /*
     * The deliberate difference from the create-project wizard. Missing terms, a
     * missing price, a missing genre — `validateUploadWorkflow` returns the
     * offending field with its coordinates, so pressing Publish takes the writer
     * TO the problem. A disabled button on a ten-screen flow would mean staring
     * at a dead control over a field four panels back.
     */
    const footer = describeUploadFooter({ step: 5 });
    expect(footer.next.disabled).toBe(false);
    expect(footer.next.blockedReason).toBe("");
  });

  it("refuses Next while the extractor is still reading, and names that too", () => {
    const footer = describeUploadFooter({ step: 1, extracting: true });
    expect(footer.next.disabled).toBe(true);
    expect(footer.next.blockedReason).toMatch(/reading your script/i);
  });

  it("never shows a blocked reason while the request is in flight", () => {
    // "Submitting…" and "you have reached your limit" on screen together would
    // be two contradictory statements about the same button.
    const footer = describeUploadFooter({ step: 5, loading: true, creationBlocked: true });
    expect(footer.next.label).toBe("Submitting…");
    expect(footer.next.blockedReason).toBe("");
  });

  it("relabels the primary once the project is saved and only media failed", () => {
    // Desktop reuses "Publish" here, which is wrong twice over: the project is
    // published, and pressing it does not publish anything.
    const footer = describeUploadFooter({ step: 2, detailStep: 5, mediaRecoveryPending: true });
    expect(footer.next.id).toBe("retry-media");
    expect(footer.next.label).toMatch(/retry the media upload/i);
    expect(footer.next.disabled).toBe(false);
  });

  it("requires an explicit start after preflight and keeps Back available", () => {
    const footer = describeUploadFooter({ step: 2, detailStep: 5, mediaUploadPreflight: true });

    expect(footer.back.disabled).toBe(false);
    expect(footer.next).toMatchObject({
      id: "start-media",
      label: "Start uploads",
      kind: "start-media",
      disabled: false,
    });
  });

  it("distinguishes a cancelled retry from a genuine failure", () => {
    const footer = describeUploadFooter({
      step: 2,
      detailStep: 5,
      mediaRecovery: { failedTypes: [], cancelledTypes: ["pitchVideo"] },
    });

    expect(footer.next.label).toBe("Retry cancelled uploads");
  });

  it("gives a content-only collaborator Cancel and one submit, not a flow", () => {
    const footer = describeUploadFooter({ contentOnly: true });
    expect(footer.back).toMatchObject({ label: "Cancel", kind: "cancel" });
    expect(footer.next).toMatchObject({ kind: "submit", label: "Submit revision" });
  });
});

describe("buildUploadOverflowItems", () => {
  it("carries Save draft, because the footer deliberately does not (D13)", () => {
    const ids = buildUploadOverflowItems({}).map((item) => item.id);
    expect(ids).toContain("save-draft");
    expect(ids).toContain("projects");
  });

  it("omits Save draft entirely while editing a published script", () => {
    // Absent, not disabled: there is no draft to save, because ?edit= submits an
    // update to a live listing (§2.8 — never present-and-inert).
    const ids = buildUploadOverflowItems({ editing: true }).map((item) => item.id);
    expect(ids).not.toContain("save-draft");
  });

  it("offers the editor only while step 1 is still empty", () => {
    expect(buildUploadOverflowItems({ hasScript: false }).map((i) => i.id)).toContain("editor");
    // Once a file is attached this would abandon what was just uploaded.
    expect(buildUploadOverflowItems({ hasScript: true }).map((i) => i.id)).not.toContain("editor");
  });

  it("explains a Save draft it has to disable", () => {
    const item = buildUploadOverflowItems({ creationBlocked: true })
      .find((entry) => entry.id === "save-draft");
    expect(item.disabled).toBe(true);
    expect(item.hint).toMatch(/plan/i);

    const localOnly = buildUploadOverflowItems({ sourceWriteBlocked: true })
      .find((entry) => entry.id === "save-draft");
    expect(localOnly.disabled).toBe(true);
    expect(localOnly.hint).toMatch(/reload the server copy/i);
  });

  it("shows a content-only collaborator no overflow at all", () => {
    // One field and one action. A sheet of inapplicable entries is worse than
    // no sheet.
    expect(buildUploadOverflowItems({ contentOnly: true })).toEqual([]);
  });
});

describe("describeUploadSaveState", () => {
  it("distinguishes never-saved from saved-then-edited", () => {
    // Desktop hides this indicator below 720px (DEF-4); DEF-7 now distinguishes
    // the local snapshot from a server-confirmed draft.
    expect(describeUploadSaveState({}).label).toMatch(/not saved yet/i);
    expect(describeUploadSaveState({ savedDraft: true, dirty: false }).label).toMatch(/draft saved/i);
    expect(describeUploadSaveState({ savedDraft: true, dirty: true }).label).toMatch(/unsaved changes/i);
  });

  it("says when dirty work is durable only on this device", () => {
    expect(describeUploadSaveState({ dirty: true, localSaved: true }).label).toMatch(/saved on this device/i);
    expect(describeUploadSaveState({ editing: true, dirty: true, localSaved: true }).label).toMatch(/local copy saved/i);
  });

  it("reports the request over the resting state", () => {
    expect(describeUploadSaveState({ saving: true, savedDraft: true }).state).toBe("saving");
  });

  it("does not claim a draft exists while editing a published script", () => {
    expect(describeUploadSaveState({ editing: true, savedDraft: true }).label)
      .toMatch(/review/i);
  });

  it("always says the state in words, so colour is never the only channel", () => {
    for (const input of [{}, { saving: true }, { savedDraft: true }, { savedDraft: true, dirty: true }]) {
      expect(describeUploadSaveState(input).label.trim().length).toBeGreaterThan(0);
    }
  });
});

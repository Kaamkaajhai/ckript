import { describe, expect, it } from "vitest";
import { STEPS, DETAILS_STEPS } from "../../../pages/CreateProject/constants";
import { MOBILE_SHELL_MODE, MOBILE_SHELL_SLOTS, resolveShellSlots } from "../../shell/mobileShellModes";
import {
  buildWizardOverflowItems,
  describeWizardFooter,
  describeWizardPosition,
  WIZARD_FIRST_STEP,
  WIZARD_LAST_STEP,
  WIZARD_SHELL_MODE,
  WIZARD_SHELL_SLOTS,
} from "./wizardChrome";

const filmSubSteps = DETAILS_STEPS.filter((sub) => sub.industries.includes("film"));
const publishingSubSteps = DETAILS_STEPS.filter((sub) => sub.industries.includes("publishing"));

describe("wizardChrome — the shell contract", () => {
  it("is a flow screen that turns the bottom slot back on for its sticky footer", () => {
    expect(WIZARD_SHELL_MODE).toBe(MOBILE_SHELL_MODE.FLOW);

    const resolved = resolveShellSlots(WIZARD_SHELL_MODE, WIZARD_SHELL_SLOTS);
    expect(resolved.bottomNav).toBe(true);
    // The footer is the ONLY exception. `flow` already allows an app bar, so an
    // override of it would be a no-op dressed up as a decision.
    expect(resolved.appBar).toBe(true);
    expect(Object.keys(WIZARD_SHELL_SLOTS)).toEqual(["bottomNav"]);
  });

  it("overrides only keys the slot contract recognises", () => {
    Object.keys(WIZARD_SHELL_SLOTS).forEach((slot) => {
      expect(MOBILE_SHELL_SLOTS).toContain(slot);
    });
  });

  it("covers steps 2 to the last step the wizard model declares", () => {
    expect(WIZARD_FIRST_STEP).toBe(2);
    expect(WIZARD_LAST_STEP).toBe(STEPS.length);
  });
});

describe("describeWizardPosition", () => {
  it("says where the writer is in words, as one string", () => {
    const position = describeWizardPosition({ step: 3, detailsSubSteps: filmSubSteps });

    expect(position.position).toBe(`Step 3 of ${STEPS.length}`);
    expect(position.label).toBe("Classify");
    // Assembled here rather than in JSX: a position line built from three spans
    // is announced as three separate stops.
    expect(position.position).not.toContain("undefined");
  });

  it("names the Details sub-panel, because 'Step 2 of 5' does not say how much of step 2 is left", () => {
    const position = describeWizardPosition({ step: 2, detailsStep: 2, detailsSubSteps: filmSubSteps });

    expect(position.label).toBe("Details");
    expect(position.panelKey).toBe(filmSubSteps[2].key);
    expect(position.panelLabel).toBe(filmSubSteps[2].label);
    expect(position.panelPosition).toBe(`3 of ${filmSubSteps.length}`);
  });

  it("reports no panel outside Details, so nothing can render a stale sub-label", () => {
    const position = describeWizardPosition({ step: 5, detailsStep: 3, detailsSubSteps: filmSubSteps });

    expect(position.panelKey).toBeNull();
    expect(position.panelLabel).toBe("");
    expect(position.panelPosition).toBeNull();
  });

  it("tracks whichever panel list the active track supplies", () => {
    // The two tracks are the same length but not the same panels — film has
    // Cast where publishing has Market — so indexing must follow the list it is
    // given rather than a copy of the film one.
    expect(publishingSubSteps.map((sub) => sub.key)).not.toEqual(filmSubSteps.map((sub) => sub.key));

    const atIndexTwo = describeWizardPosition({ step: 2, detailsStep: 2, detailsSubSteps: publishingSubSteps });
    expect(atIndexTwo.panelKey).toBe(publishingSubSteps[2].key);
    expect(atIndexTwo.panelKey).not.toBe(filmSubSteps[2].key);
    expect(atIndexTwo.panelPosition).toBe(`3 of ${publishingSubSteps.length}`);
  });

  it("falls back to the first step rather than rendering an empty bar on a bad step", () => {
    expect(describeWizardPosition({ step: 99, detailsSubSteps: filmSubSteps }).label).toBeTruthy();
  });
});

describe("describeWizardFooter", () => {
  const publishable = {
    step: 5,
    agreedToTerms: true,
    ownershipConfirmed: true,
    hasPublishAccess: true,
  };

  it("offers Next on every step but the last", () => {
    [2, 3, 4].forEach((step) => {
      const footer = describeWizardFooter({ step });
      expect(footer.next.kind).toBe("next");
      expect(footer.next.label).toBe("Next");
      expect(footer.next.disabled).toBe(false);
    });
  });

  it("becomes Submit on the last step, and only when every desktop gate is clear", () => {
    const footer = describeWizardFooter(publishable);

    expect(footer.next.kind).toBe("publish");
    expect(footer.next.label).toBe("Submit for approval");
    expect(footer.next.disabled).toBe(false);
    expect(footer.next.blockedReason).toBe("");
  });

  /*
   * The load-bearing test of this module. Desktop puts the reason in a `title`
   * attribute, which never appears on a touch device — so a phone writer met a
   * greyed-out Submit with no way to discover what was missing. Every refusal
   * must carry text.
   */
  it.each([
    ["no publishing access", { ...publishable, hasPublishAccess: false }, /publishing access/i],
    ["the plan limit", { ...publishable, creationBlocked: true }, /plan's script limit/i],
    ["unaccepted terms", { ...publishable, agreedToTerms: false }, /Submission Agreement/i],
    ["unconfirmed ownership", { ...publishable, ownershipConfirmed: false }, /own the rights/i],
  ])("refuses Submit for %s and says why in text", (_name, input, pattern) => {
    const footer = describeWizardFooter(input);

    expect(footer.next.disabled).toBe(true);
    expect(footer.next.blockedReason).toMatch(pattern);
  });

  it("explains a blocked Next too, rather than only a blocked Submit", () => {
    const footer = describeWizardFooter({ step: 3, creationBlocked: true });

    expect(footer.next.disabled).toBe(true);
    expect(footer.next.blockedReason).toMatch(/plan's script limit/i);
  });

  it("says 'Submitting…' and gives no reason while the request is in flight", () => {
    const footer = describeWizardFooter({ ...publishable, loading: true });

    expect(footer.next.label).toBe("Submitting…");
    expect(footer.next.disabled).toBe(true);
    // Pending is not a refusal. A reason line here would tell the writer
    // something is wrong at the exact moment nothing is.
    expect(footer.next.blockedReason).toBe("");
  });

  it("turns every wizard step into an explicit media retry while recovery is pending", () => {
    const ready = describeWizardFooter({ step: 2, mediaRecoveryPending: true });
    const busy = describeWizardFooter({ step: 2, mediaRecoveryPending: true, loading: true });

    expect(ready.next).toMatchObject({
      id: "retry-media",
      label: "Retry the media upload",
      kind: "publish",
      disabled: false,
    });
    expect(busy.next).toMatchObject({ label: "Retrying…", disabled: true });
  });

  it("holds navigation while a selected file is actively uploading", () => {
    const footer = describeWizardFooter({ step: 2, mediaUploadActive: true });

    expect(footer.back.disabled).toBe(true);
    expect(footer.next).toMatchObject({
      id: "uploading-media",
      label: "Uploading media…",
      disabled: true,
    });
  });

  it("reports the access refusal first when several gates are shut", () => {
    // Order matters: "you cannot publish this at all" is a different answer
    // from "tick this box", and offering the tickable one first sends the
    // writer to do something that will not help.
    const footer = describeWizardFooter({
      ...publishable,
      hasPublishAccess: false,
      agreedToTerms: false,
      creationBlocked: true,
    });

    expect(footer.next.blockedReason).toMatch(/publishing access/i);
  });

  it("never disables Back — a dead control on the first screen of a flow reads as being stuck", () => {
    expect(describeWizardFooter({ step: 2 }).back.disabled).toBe(false);
    expect(describeWizardFooter({ step: 5, creationBlocked: true }).back.disabled).toBe(false);
    // The one exception: an exit is already in flight.
    expect(describeWizardFooter({ step: 2, exiting: true }).back.disabled).toBe(true);
  });
});

describe("buildWizardOverflowItems", () => {
  it("offers the two project-level actions and nothing panel-level", () => {
    const items = buildWizardOverflowItems({ drafts: 3 });

    expect(items.map((item) => item.id)).toEqual(["drafts", "editor"]);
    expect(items[0].hint).toBe("3 saved projects");
  });

  it("counts one draft in the singular", () => {
    expect(buildWizardOverflowItems({ drafts: 1 })[0].hint).toBe("1 saved project");
  });

  it("still offers My projects with nothing in it, because that is a true statement", () => {
    expect(buildWizardOverflowItems({ drafts: 0 })[0].hint).toBe("Nothing saved yet");
  });

  it("omits project switching where there is nothing to switch to", () => {
    // A competition entry is one entry. An item that is real for one writer and
    // a dead end for another is the placeholder §2.8 forbids.
    const items = buildWizardOverflowItems({ drafts: 4, canSwitchProject: false });

    expect(items.map((item) => item.id)).toEqual(["editor"]);
  });

  it("returns descriptors only, so the capability rules can be read without stubbing handlers", () => {
    buildWizardOverflowItems({ drafts: 2 }).forEach((item) => {
      expect(item).not.toHaveProperty("onSelect");
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeTruthy();
    });
  });
});

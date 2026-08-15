import { STEPS } from "../../../pages/CreateProject/constants";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";

/*
 * Ckript Mobile — the publish wizard's chrome model (plan §11 Phase 3, "mode B"
 * of the 2026-08-08 §4.3 wireframe: `/create-project` steps 2–5).
 *
 * The sibling of `editorChrome.js`, and for the same reason: everything here is
 * data, so "what does the app bar say on step 2, panel 3?" and "when is Submit
 * refused, and what does it say instead?" are pure functions a test can read
 * without mounting a wizard, a context or a browser.
 *
 * WHY THE FOOTER IS A SHELL SLOT AND NOT A `position: fixed` BAR
 * -------------------------------------------------------------
 * `flow` allows an app bar and forbids bottom chrome, so the footer is a
 * declared slot override — the second use of the mechanism the editor added,
 * and the same argument as the editor's dock: the shell's slots are `flex: none`
 * siblings of the one scroll surface, so the footer *displaces* the form instead
 * of covering it. A fixed bar of our own would sit on top of the last field of
 * every panel, which on a phone is exactly the field someone is typing into.
 *
 * Unlike the editor, the override is one slot, not two: `flow` already gives the
 * app bar, and only the footer is the exception.
 */
export const WIZARD_SHELL_MODE = MOBILE_SHELL_MODE.FLOW;

export const WIZARD_SHELL_SLOTS = Object.freeze({ bottomNav: true });

/* The wizard owns steps 2–5. Step 1 is the editor (mode A), a different surface
   with a different shell mode, reached by the same route. */
export const WIZARD_FIRST_STEP = 2;
export const WIZARD_LAST_STEP = STEPS.length;

/**
 * Where the writer is, as one sentence and one label.
 *
 * The desktop rail shows all five steps at once with a connector line between
 * them. That does not survive 320px: five labels and four connectors either wrap
 * into three rows of chrome or shrink past the 11px floor, and the wireframe
 * therefore replaced the whole navigator with the app bar's position line —
 * "Step 3 of 5" — which is the part of a stepper that carries information.
 *
 * Details (step 2) is a mini-wizard of its own, so its panel is named too: a
 * writer three panels into Details who only sees "Step 2 of 5" has no way to
 * tell how much of step 2 is left.
 */
export function describeWizardPosition({
  step = WIZARD_FIRST_STEP,
  detailsStep = 0,
  detailsSubSteps = [],
} = {}) {
  const meta = STEPS[step - 1] || STEPS[WIZARD_FIRST_STEP - 1];
  const panel = step === 2 ? (detailsSubSteps[detailsStep] || detailsSubSteps[0] || null) : null;

  return {
    step,
    total: STEPS.length,
    /* Read aloud as one string rather than assembled from three elements: a
       screen reader announcing "Step, 3, of, 5, Classify" in five stops is the
       usual cost of laying a position line out as separate spans. */
    position: `Step ${step} of ${STEPS.length}`,
    label: meta?.label || "",
    description: meta?.desc || "",
    panelKey: panel?.key || null,
    panelLabel: panel?.label || "",
    /* Only meaningful inside Details; `null` everywhere else so a caller cannot
       accidentally render "panel 1 of 1" on a single-panel step. */
    panelPosition: panel && detailsSubSteps.length > 1
      ? `${detailsStep + 1} of ${detailsSubSteps.length}`
      : null,
  };
}

/**
 * The two footer controls, including — and this is the part desktop does not
 * have — *why* the primary is refused.
 *
 * Desktop puts the reason in a `title` attribute. A `title` never appears on a
 * touch device: there is no hover, so a phone user meets a greyed-out "Submit
 * for approval" with no way at all to discover what is missing. WCAG 3.3.1 asks
 * for the error to be described in text, so `blockedReason` is rendered as
 * visible copy above the footer and referenced by `aria-describedby`.
 *
 * The gates are the desktop ones, unchanged and in the same order, because a
 * mobile writer must not be able to submit something a desktop writer cannot.
 */
export function describeWizardFooter({
  step = WIZARD_FIRST_STEP,
  creationBlocked = false,
  loading = false,
  agreedToTerms = false,
  ownershipConfirmed = false,
  hasPublishAccess = true,
  exiting = false,
  mediaRecoveryPending = false,
  mediaUploadActive = false,
} = {}) {
  const isLast = step >= WIZARD_LAST_STEP;

  const back = {
    label: "Back",
    /* Never disabled. Back from the first Details panel is how a writer returns
       to their script, and a dead Back control on the first screen of a flow is
       how someone concludes they are stuck. */
    disabled: exiting,
  };

  if (mediaRecoveryPending) {
    return {
      back,
      next: {
        id: "retry-media",
        label: loading ? "Retrying…" : "Retry the media upload",
        kind: "publish",
        disabled: loading,
        blockedReason: "",
      },
    };
  }

  if (mediaUploadActive) {
    return {
      back: { ...back, disabled: true },
      next: {
        id: "uploading-media",
        label: "Uploading media…",
        kind: "publish",
        disabled: true,
        blockedReason: "",
      },
    };
  }

  if (!isLast) {
    return {
      back,
      next: {
        id: "next",
        label: "Next",
        kind: "next",
        disabled: creationBlocked,
        blockedReason: creationBlocked
          ? "You've reached your plan's script limit, so this project can't be published yet. You can keep editing it."
          : "",
      },
    };
  }

  const blockedReason = !hasPublishAccess
    ? "You have content access to this script, not publishing access, so only the owner can submit it."
    : creationBlocked
      ? "You've reached your plan's script limit. Upgrade your plan to publish another script."
      : !agreedToTerms || !ownershipConfirmed
        ? "Accept the Submission Agreement and confirm you own the rights before submitting."
        : "";

  return {
    back,
    next: {
      id: "publish",
      label: loading ? "Submitting…" : "Submit for approval",
      kind: "publish",
      disabled: loading || Boolean(blockedReason),
      blockedReason: loading ? "" : blockedReason,
    },
  };
}

/**
 * The overflow sheet for the wizard's app bar.
 *
 * Much shorter than the editor's, and deliberately so: the wizard is a form, and
 * a form's actions belong on the form. What is left is the two things that are
 * *about* the project rather than about this panel — switching project, and
 * leaving. Same rule as the editor's list: an item that is not built is absent,
 * never present-and-inert (§2.8).
 */
export function buildWizardOverflowItems({ drafts = 0, canSwitchProject = true } = {}) {
  const items = [];

  if (canSwitchProject) {
    items.push({
      id: "drafts",
      label: "My projects",
      hint: drafts > 0 ? `${drafts} saved ${drafts === 1 ? "project" : "projects"}` : "Nothing saved yet",
      icon: "folder_open",
    });
  }

  items.push({
    id: "editor",
    label: "Back to the script",
    hint: "Return to step 1 and keep writing",
    icon: "edit_note",
  });

  return items;
}

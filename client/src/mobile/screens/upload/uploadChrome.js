import {
  DETAIL_SCREEN_ORDER,
  getUploadScreenKey,
  UPLOAD_SCREEN_LOCATIONS,
  UPLOAD_SCREEN_ORDER,
} from "../../../utils/scriptUploadValidation";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";

/*
 * Ckript Mobile — the upload flow's chrome model (plan §11 Phase 3 bullet 3,
 * the 2026-08-09 §4.3 wireframe for `/upload`).
 *
 * The third of these files, after `editorChrome.js` and `wizardChrome.js`, and
 * for the same reason: everything here is data, so "what does the app bar say on
 * step 2, panel 4?" and "when is Publish refused, and what does it say instead?"
 * are pure functions a test can read without mounting a screen, a network or a
 * browser.
 *
 * IT DERIVES FROM THE SHARED VALIDATION MODULE, NOT FROM A LOCAL COPY.
 * `utils/scriptUploadValidation.js` already owns the ten screens, their order,
 * their two-level step/detailStep coordinates and their human labels — and it
 * owns them because both platforms validate through it. Re-declaring the labels
 * here would create a second answer to "what is step 2, panel 4 called?", and
 * the two would disagree the first time one was renamed.
 *
 * WHY THE FOOTER IS A SHELL SLOT AND NOT A `position: fixed` BAR
 * -------------------------------------------------------------
 * The same argument the wizard's footer makes: `flow` allows an app bar and
 * forbids bottom chrome, so this is a declared slot override. The shell's slots
 * are `flex: none` siblings of the one scroll surface, so the footer *displaces*
 * the form instead of covering it. A fixed bar of our own would sit on top of
 * the last field of every panel, which on a phone is exactly the field someone
 * is typing into.
 */
export const UPLOAD_SHELL_MODE = MOBILE_SHELL_MODE.FLOW;

export const UPLOAD_SHELL_SLOTS = Object.freeze({ bottomNav: true });

export const UPLOAD_FIRST_STEP = 1;
export const UPLOAD_LAST_STEP = 5;

/* The five top-level steps, named from the shared screen table so this file
   holds coordinates and never a second set of labels. Step 2's label is the
   collective name for its six sub-panels, which is the one string the shared
   table does not carry (it names the panels, not the group). */
const STEP_LABELS = Object.freeze([
  UPLOAD_SCREEN_LOCATIONS.upload.label,
  "Details",
  UPLOAD_SCREEN_LOCATIONS.classify.label,
  UPLOAD_SCREEN_LOCATIONS.film.label,
  UPLOAD_SCREEN_LOCATIONS.publish.label,
]);

/* The progress fill counts PANELS, not steps, and the list it counts is the
   shared one. Step 2 is six of the flow's ten screens, so a bar that moved a
   fifth for it would sit still for six panels and then jump. */
const TOTAL_UPLOAD_SCREENS = UPLOAD_SCREEN_ORDER.length;

function uploadScreenIndex(screenKey) {
  const index = UPLOAD_SCREEN_ORDER.indexOf(screenKey);
  return index < 0 ? 0 : index;
}

/**
 * Where the writer is, as one sentence and one label.
 *
 * Desktop draws this three times over: a 158px tracker rail listing all five
 * phases with connector lines, a horizontal `su-mobile-phases` strip for narrow
 * screens (10.5px text and a 19×19px indicator — two of DEF-4's four measured
 * floor breaches), and a `su-detail-tabs` row whose labels become bare numerals
 * at ≤520px because `font-size: 0` is applied to them.
 *
 * On a phone there is one, and it is text. Nothing that told the writer where
 * they are was dropped; three things that told them the same thing were
 * collapsed into the one that survives 320px.
 */
export function describeUploadPosition({
  step = UPLOAD_FIRST_STEP,
  detailStep = 0,
  contentOnly = false,
} = {}) {
  if (contentOnly) {
    /*
     * Content-only edit is not step 1 of anything. A collaborator with content
     * access sees a single screen with one field, and a "Step 1 of 5" above it
     * would promise four more steps that will never arrive.
     */
    return {
      step: 1,
      total: 1,
      position: "Content-only edit",
      label: "Script content",
      panelKey: "upload",
      panelLabel: "",
      panelPosition: null,
      progress: 1,
    };
  }

  const safeStep = Math.min(UPLOAD_LAST_STEP, Math.max(UPLOAD_FIRST_STEP, Number(step) || UPLOAD_FIRST_STEP));
  const panelKey = getUploadScreenKey(safeStep, detailStep);
  const inDetails = safeStep === 2;
  const detailIndex = inDetails
    ? Math.max(0, Math.min(DETAIL_SCREEN_ORDER.length - 1, Number(detailStep) || 0))
    : 0;

  return {
    step: safeStep,
    total: UPLOAD_LAST_STEP,
    /* Read aloud as one string rather than assembled from three elements: a
       screen reader announcing "Step, 3, of, 5, Classification" in five stops is
       the usual cost of laying a position line out as separate spans. */
    position: `Step ${safeStep} of ${UPLOAD_LAST_STEP}`,
    label: STEP_LABELS[safeStep - 1] || "",
    panelKey,
    /* Only inside Details. Elsewhere the panel label IS the step label, and
       printing it twice on one line reads as a stutter. */
    panelLabel: inDetails ? (UPLOAD_SCREEN_LOCATIONS[panelKey]?.label || "") : "",
    panelPosition: inDetails ? `${detailIndex + 1} of ${DETAIL_SCREEN_ORDER.length}` : null,
    /* A fraction, never a percentage string: the caller decides whether that
       becomes a width, and nothing here has to know it is drawn at all. */
    progress: (uploadScreenIndex(panelKey) + 1) / TOTAL_UPLOAD_SCREENS,
  };
}

/**
 * The two footer controls, including — and this is the part desktop does not
 * have on a touch device — *why* the primary is refused.
 *
 * WHAT IS DELIBERATELY **NOT** A BLOCKED REASON, AND WHY
 * -----------------------------------------------------
 * Only two things disable the primary: the plan limit and an edit already in
 * admin review. Both are states the writer cannot fix from this screen, so a
 * live button would be a lie.
 *
 * Everything else a submit needs — a title, a logline, a genre, a price, the
 * accepted terms — leaves Publish ENABLED on purpose. `validateUploadWorkflow`
 * returns the offending field with its screen and its coordinates, and pressing
 * Publish therefore *navigates to the problem* instead of refusing silently.
 * That is strictly better than a disabled control, which on a ten-screen flow
 * would mean a writer on step 5 staring at a dead button over a missing field
 * four panels back. It is also the difference between this footer and the
 * wizard's, where no such per-field routing exists.
 */
export function describeUploadFooter({
  step = UPLOAD_FIRST_STEP,
  detailStep = 0,
  contentOnly = false,
  editing = false,
  loading = false,
  extracting = false,
  creationBlocked = false,
  editApprovalLocked = false,
  mediaRecovery = null,
  mediaRecoveryPending = false,
  mediaUploadActive = false,
  mediaUploadPreflight = false,
  sourceWriteBlocked = false,
} = {}) {
  if (contentOnly) {
    const blockedReason = sourceWriteBlocked
      ? "Reload the server copy before submitting this revision. Your device copy stays available."
      : "";
    return {
      back: { label: "Cancel", kind: "cancel", disabled: loading },
      next: {
        id: "submit-revision",
        label: loading ? "Sending…" : "Submit revision",
        kind: "submit",
        icon: "check",
        disabled: loading || sourceWriteBlocked,
        blockedReason: loading ? "" : blockedReason,
      },
    };
  }

  const safeStep = Math.min(UPLOAD_LAST_STEP, Math.max(UPLOAD_FIRST_STEP, Number(step) || UPLOAD_FIRST_STEP));
  const atStart = safeStep === UPLOAD_FIRST_STEP;
  const isLast = safeStep >= UPLOAD_LAST_STEP;

  const back = {
    label: "Back",
    kind: "back",
    /* Disabled only where there is genuinely nothing behind it. Leaving the flow
       is the app bar's Exit, which is always live — a dead Back on the first
       screen must not be the only thing a writer can find. */
    disabled: atStart || loading,
  };

  if (mediaUploadPreflight) {
    return {
      back: { ...back, disabled: false },
      next: {
        id: "start-media",
        label: "Start uploads",
        kind: "start-media",
        icon: "upload",
        disabled: false,
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
        icon: "upload",
        disabled: true,
        blockedReason: "",
      },
    };
  }

  if (mediaRecovery || mediaRecoveryPending) {
    const cancelledOnly = Boolean(
      mediaRecovery?.cancelledTypes?.length > 0
      && !mediaRecovery?.failedTypes?.length
    );
    /*
     * A recovery moves the writer back to the Visual assets panel. This branch
     * must therefore precede `!isLast`; otherwise the footer silently becomes
     * an ordinary Next button at the exact moment it owes a retry action.
     */
    return {
      back: { ...back, disabled: false },
      next: {
        id: "retry-media",
        label: loading
          ? "Continuing…"
          : cancelledOnly ? "Retry cancelled uploads" : "Continue media upload",
        kind: "publish",
        icon: "refresh",
        disabled: loading,
        blockedReason: "",
      },
    };
  }

  if (!isLast) {
    const blockedReason = creationBlocked
      ? "You've reached your plan's script limit, so a new script can't be submitted yet."
      : extracting
        ? "Reading your script file. This finishes on its own."
        : "";

    return {
      back,
      next: {
        id: "next",
        /* "Continue" when the press leaves a step, "Next" when it only moves to
           the following panel of the same step. The two words are doing real
           work: on a six-panel step, "Continue" five times running is what makes
           a writer think the flow is stuck. */
        label: safeStep === 2 && detailStep < DETAIL_SCREEN_ORDER.length - 1 ? "Next" : "Continue",
        kind: "next",
        icon: "arrow_forward",
        disabled: creationBlocked || extracting,
        blockedReason,
      },
    };
  }

  const blockedReason = creationBlocked
    ? "You've reached your plan's script limit. Upgrade your plan to submit another script."
    : editApprovalLocked
      ? "This script's last edit is still in admin review. You can edit it again once that decision is made."
      : sourceWriteBlocked
        ? "Reload the server copy before submitting. Your recovered device copy has not been sent."
      : "";

  return {
    back,
    next: {
      id: editing ? "submit-update" : "publish",
      label: loading
        ? "Submitting…"
        : editing ? "Submit update" : "Publish for review",
      kind: "publish",
      icon: "check",
      disabled: loading || Boolean(blockedReason),
      blockedReason: loading ? "" : blockedReason,
    },
  };
}

/**
 * The overflow sheet for the upload flow's app bar.
 *
 * SAVE DRAFT LIVES HERE, NOT IN THE FOOTER (decision D13). Desktop's action bar
 * carries Back, a save-state string, Save draft and Next; at ≤520px that is four
 * things in a 320px row, and DEF-4 measured what it costs — a 42px control,
 * under the 44px floor. The footer keeps the two controls that move the flow.
 *
 * Save draft is absent, not disabled, while editing a published script: there is
 * no draft to save, because `?edit=` submits an update to a live listing.
 * Absent rather than present-and-inert is §2.8.
 */
export function buildUploadOverflowItems({
  editing = false,
  contentOnly = false,
  saving = false,
  creationBlocked = false,
  sourceWriteBlocked = false,
  hasScript = false,
} = {}) {
  if (contentOnly) {
    /* One field, one action, no drafts and no project switching. An overflow of
       inapplicable entries is worse than no overflow. */
    return [];
  }

  const items = [];

  if (!editing) {
    items.push({
      id: "save-draft",
      label: saving ? "Saving…" : "Save draft",
      hint: creationBlocked
        ? "Blocked by your plan's script limit"
        : sourceWriteBlocked
          ? "Reload the server copy before saving"
        : "Keeps everything typed so far, privately",
      icon: "save",
      disabled: saving || creationBlocked || sourceWriteBlocked,
    });
  }

  if (!hasScript && !editing) {
    /* Only while step 1 is still empty. Once a file is attached this would send
       a writer to a different flow and quietly abandon what they uploaded. */
    items.push({
      id: "editor",
      label: "Write in the editor instead",
      hint: "Screenplay formatting, built in",
      icon: "edit_note",
    });
  }

  items.push({
    id: "projects",
    label: "My projects",
    hint: "Everything saved to your account",
    icon: "folder_open",
  });

  return items;
}

/**
 * What the save indicator says.
 *
 * This exists because of DEF-4's most consequential breach: `su-save-state` is
 * `display: none` at ≤720px, so on every phone the desktop page hides the only
 * thing that tells a writer whether their work is safe. DEF-7 added a debounced
 * device snapshot, so this state now says whether work is local-only, dirty, or
 * confirmed as a server draft; it is not decoration.
 */
export function describeUploadSaveState({
  editing = false,
  saving = false,
  savedDraft = false,
  dirty = false,
  localSaved = false,
} = {}) {
  if (saving) return { state: "saving", label: "Saving…" };
  if (editing && dirty && localSaved) return { state: "saved", label: "Local copy saved" };
  if (editing && dirty) return { state: "dirty", label: "Unsaved changes" };
  if (editing) return { state: "idle", label: "Changes go for review" };
  if (savedDraft && !dirty) return { state: "saved", label: "Draft saved" };
  if (dirty && localSaved) return { state: "saved", label: "Saved on this device" };
  if (dirty) return { state: "dirty", label: "Unsaved changes" };
  return { state: "idle", label: "Not saved yet" };
}

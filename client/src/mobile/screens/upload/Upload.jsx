import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import InlineMessage from "../../components/feedback/InlineMessage";
import CoverCropDialog from "../../components/media/CoverCropDialog";
import ActionSheet from "../../components/overlays/ActionSheet";
import ConfirmDialog from "../../components/overlays/ConfirmDialog";
import MobileShell from "../../shell/MobileShell";
import { UPLOAD_PANELS } from "./panels/UploadPanels";
import { UPLOAD_SOURCE_LOAD_STATUS } from "../../../pages/CreateProject/lib/uploadSourceLoad";
import {
  buildUploadOverflowItems,
  describeUploadFooter,
  describeUploadPosition,
  describeUploadSaveState,
  UPLOAD_SHELL_MODE,
  UPLOAD_SHELL_SLOTS,
} from "./uploadChrome";
import "./Upload.css";

/*
 * The mobile upload flow — `/upload` (prefix: ckm-upload, plan §11 Phase 3
 * bullet 3, the 2026-08-09 §4.3 wireframe).
 *
 * WHAT THE DESKTOP SHAPE WAS, AND WHAT SURVIVED
 * ---------------------------------------------
 * `ScriptUploadWorkspace` is a three-column workspace: a 158px "Publish your
 * script" tracker rail on the left listing all five phases with connector lines
 * and an overall-progress bar; the form in the middle, above a `su-detail-tabs`
 * row and a `su-mobile-phases` strip; and a helper rail on the right carrying a
 * tip, a five-row summary of the project, a deal preview and a plan badge.
 *
 * Three navigators and two summaries for one form. On a phone there is one of
 * each: the position line in the app bar says "Step 3 of 5 · Details · Cast &
 * roles", the progress fill under it says how far through the ten panels the
 * writer is, and the summary rail is gone — every fact it repeated (title,
 * format, length, genre, role count) is a field the writer can see on the panel
 * that owns it.
 *
 * THE SAVE STATE IS NOT DECORATION HERE (DEF-4). Desktop sets
 * `.su-save-state { display: none }` at ≤720px, so on every phone the page hides
 * the only thing that says whether the work is safe. DEF-7 added the shared
 * local snapshot; this app-bar status now distinguishes that local copy from a
 * draft the server has confirmed. It remains visible at every width.
 *
 * IT OWNS NO UPLOAD STATE. Every value and every action is
 * `pages/ScriptUpload.jsx`'s, arriving through the same `vm` prop the desktop
 * workspace reads. `handleNext` runs the shared per-screen validation;
 * `handleSubmit` builds and posts the payload. This file decides what is on
 * screen, never what is true.
 */
export default function Upload({ vm }) {
  const { state, actions, mode } = vm;
  const navigate = useNavigate();

  const [overflowOpen, setOverflowOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const overflowRef = useRef(null);
  const exitRef = useRef(null);

  const contentOnly = Boolean(mode.isContentOnlyEditMode);
  const editing = Boolean(mode.editId);

  const position = describeUploadPosition({
    step: state.step,
    detailStep: state.detailStep,
    contentOnly,
  });

  const footer = describeUploadFooter({
    step: state.step,
    detailStep: state.detailStep,
    contentOnly,
    editing,
    loading: state.loading,
    extracting: state.isExtracting,
    creationBlocked: state.creationBlocked,
    editApprovalLocked: state.editApprovalLocked,
    mediaRecoveryPending: state.mediaRecoveryPending,
    sourceWriteBlocked: state.sourceWriteBlocked,
  });

  /* The orchestrator now owns the server-baseline signature. The fallback keeps
     deterministic harnesses useful while making production's answer exact. */
  const dirty = typeof state.workingDraftDirty === "boolean"
    ? state.workingDraftDirty
    : Boolean(
      state.formData.title
      || state.textContent
      || state.uploadedFile
      || state.formData.logline
      || state.formData.synopsis
      || state.thumbnailFile
      || state.trailerFile
      || state.pitchVideoFile
      || state.roles.length
      || state.tagsInput
    );

  const save = describeUploadSaveState({
    editing,
    saving: state.loading,
    savedDraft: state.fromDraft,
    dirty,
    localSaved: state.localSnapshotSaved,
  });

  useEffect(() => {
    if (state.navigationExitRequested) setExitOpen(true);
  }, [state.navigationExitRequested]);

  const Panel = UPLOAD_PANELS[position.panelKey] || UPLOAD_PANELS.upload;

  /*
   * Take the writer to the field that refused.
   *
   * The orchestrator's `focusValidationIssue` moves `step`/`detailStep` and
   * bumps `validationAttempt`; the *scrolling and focusing* is the chrome's job,
   * and on desktop it lives in `ScriptUploadWorkspace`'s own effect — which
   * `nativeChrome` never mounts. Without this, pressing Publish on step 5 over a
   * missing logline would silently jump to step 2 panel 2 and leave the writer
   * to find the problem.
   *
   * `validationAttempt` rather than the errors array is the dependency, because
   * pressing Publish twice on the SAME unfixed field must move focus twice — the
   * error object is identical, the intent is not.
   *
   * Focus lands on the control, not on the anchor: the anchor is
   * `display: contents` and has no box, so it can neither be scrolled to nor
   * focused. That is also why `scrollIntoView` is called on the control.
   */
  useEffect(() => {
    if (!state.validationAttempt) return undefined;
    const issue = (state.validationErrors || []).find((item) => item.screen === position.panelKey);
    if (!issue) return undefined;

    // After the keyed panel has remounted and laid out. A frame is not enough:
    // the chip rows and the agreement box both settle on the second.
    const timer = window.setTimeout(() => {
      const anchor = document.getElementById(issue.fieldId);
      if (!anchor) return;
      const control = anchor.matches?.("input, textarea, select, button, [tabindex]")
        ? anchor
        : anchor.querySelector("input, textarea, select, button, [tabindex]");
      (control || anchor).scrollIntoView?.({ behavior: "smooth", block: "center" });
      control?.focus?.({ preventScroll: true });
    }, 220);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.validationAttempt]);

  const leave = () => navigate(editing && mode.editId ? `/script/${mode.editId}` : "/dashboard");

  const requestExit = () => {
    actions.flushWorkingSnapshot?.();
    setExitOpen(true);
  };
  const requestDestination = (action) => (dirty ? requestExit() : action());
  const overflowActions = {
    "save-draft": actions.handleSaveDraft,
    editor: () => requestDestination(actions.openEditor),
    projects: () => requestDestination(actions.openDrafts),
  };

  const overflowItems = buildUploadOverflowItems({
    editing,
    contentOnly,
    saving: state.loading,
    creationBlocked: state.creationBlocked,
    sourceWriteBlocked: state.sourceWriteBlocked,
    hasScript: Boolean(state.uploadedFile || state.existingUploadedFile || state.textContent),
  }).map((item) => ({ ...item, onSelect: overflowActions[item.id] }));

  const appBar = (
    <>
      <div className="ckm-upload__bar">
        {/*
          * Exit, not Back. The footer's Back walks the flow; this leaves it.
          * Two controls in one bar that both say "Back" and do different things
          * is the ambiguity the wizard's app bar removed, and the same split
          * applies here.
          */}
        <IconButton
          ref={exitRef}
          icon="close"
          label="Leave the upload"
          variant="soft"
          onClick={() => (dirty ? requestExit() : leave())}
        />

        <div className="ckm-upload__bar-text">
          <h1 className="ckm-upload__bar-title">
            {state.formData.title?.trim() || (editing ? "Update your script" : "Upload a script")}
          </h1>
          {/* One string, not three spans: a position line assembled from
              separate elements is announced as five separate stops. */}
          <p className="ckm-upload__bar-position">
            {position.panelLabel
              ? `${position.position} · ${position.label} · ${position.panelLabel}`
              : `${position.position} · ${position.label}`}
          </p>
        </div>

        {/*
          * The indicator desktop hides on phones. `role="status"` and polite, so
          * a change from "Not saved yet" to "Draft saved" is announced without
          * interrupting whatever is being typed.
          */}
        <span
          className={`ckm-upload__save ckm-upload__save--${save.state}`}
          role="status"
          aria-live="polite"
        >
          <span className="ckm-upload__save-dot" aria-hidden="true" />
          <span className="ckm-upload__save-label">{save.label}</span>
        </span>

        {overflowItems.length > 0 && (
          <IconButton
            ref={overflowRef}
            icon="more_vert"
            label="More upload actions"
            variant="soft"
            aria-haspopup="dialog"
            aria-expanded={overflowOpen}
            onClick={() => setOverflowOpen(true)}
          />
        )}
      </div>

      {/* A progress bar the position line can be read against. `aria-hidden`
          because the line above already says "Step 3 of 5" in words — a
          progressbar role would announce the same fact a second time as "60
          percent", which is not what a writer wants to hear. */}
      {!contentOnly && (
        <div className="ckm-upload__progress" aria-hidden="true">
          <span
            className="ckm-upload__progress-fill"
            style={{ width: `${Math.round(position.progress * 100)}%` }}
          />
        </div>
      )}

      {/*
        * Notices live in the fixed chrome, under the bar rather than in the
        * scroll body. A validation error that scrolls out of sight is the exact
        * failure this placement prevents: `handleNext` refuses to advance, and if
        * the reason is 400px up the panel the writer sees a Next button that
        * simply stopped working.
        */}
      {state.creationBlocked && (
        <InlineMessage
          tone="warning"
          variant="panel"
          title={`You've reached your ${state.scriptLimit?.plan || "current"} plan's script limit.`}
          className="ckm-upload__notice"
          action={<Button size="sm" to="/pricing">View plans</Button>}
        >
          You already have {state.scriptLimit?.used || 0} submitted script
          {state.scriptLimit?.used === 1 ? "" : "s"}. Upgrade before starting another upload.
        </InlineMessage>
      )}

      {state.mediaRecoveryPending && (
        <InlineMessage
          tone="warning"
          variant="panel"
          title="Your project is saved, but some media did not upload."
          className="ckm-upload__notice"
        >
          Replace or remove the highlighted files on the Visual assets panel, then use
          &ldquo;Retry the media upload&rdquo;. Nothing else needs re-entering.
        </InlineMessage>
      )}

      {state.sourceLoad?.status === UPLOAD_SOURCE_LOAD_STATUS.LOCAL_ONLY && (
        <InlineMessage
          tone="warning"
          variant="panel"
          title="This is the copy saved on this device."
          className="ckm-upload__notice"
          action={<Button size="sm" onClick={actions.retrySourceLoad}>Reload server copy</Button>}
        >
          You can keep reviewing it, but saving or submitting stays blocked until Ckript confirms
          the current server version.
        </InlineMessage>
      )}

      {state.pdfNotice && (
        <InlineMessage tone="info" variant="panel" className="ckm-upload__notice">
          {state.pdfNotice}
        </InlineMessage>
      )}
    </>
  );

  const bottomBar = (
    <div className="ckm-upload__footer">
      {/* The reason a primary is refused, as visible text. Desktop puts it in a
          `title` attribute, which never appears on a touch device — there is no
          hover — so a phone writer met a greyed-out Publish with no way at all
          to find out why. */}
      {footer.next.blockedReason && (
        <p className="ckm-upload__footer-reason" id="ckm-upload-blocked">
          {footer.next.blockedReason}
        </p>
      )}

      <div className="ckm-upload__footer-actions">
        <Button
          variant="secondary"
          disabled={footer.back.disabled}
          onClick={footer.back.kind === "cancel" ? actions.cancelContentEdit : actions.handleBack}
        >
          {footer.back.label}
        </Button>
        <Button
          fullWidth
          pending={state.loading}
          disabled={footer.next.disabled}
          trailingIcon={footer.next.icon}
          aria-describedby={footer.next.blockedReason ? "ckm-upload-blocked" : undefined}
          onClick={(event) => (
            footer.next.kind === "next" ? actions.handleNext() : actions.handleSubmit(event)
          )}
        >
          {footer.next.label}
        </Button>
      </div>
    </div>
  );

  return (
    <MobileShell
      mode={UPLOAD_SHELL_MODE}
      slots={UPLOAD_SHELL_SLOTS}
      screenId="upload"
      className="ckm-upload"
      scrollClassName="ckm-upload__scroll"
      appBar={appBar}
      bottomNav={bottomBar}
      overlays={(
        <>
          <ActionSheet
            open={overflowOpen}
            onClose={() => setOverflowOpen(false)}
            title="This upload"
            items={overflowItems}
            returnFocusTo={overflowRef}
          />

          {/*
            * Leaving with unsaved work. THREE outcomes and one of them destroys
            * the lot, so "Discard" and "Keep going" must not be adjacent
            * same-shaped buttons — the sheet names the actions, and the
            * destructive one does not act, it opens an alertdialog focused on
            * Cancel. Same contract as the create-project exit flow.
            *
            * DEF-7 makes the local copy durable, but only a manual Save draft is
            * confirmed by the server. The sheet names that distinction and a
            * failed Save never continues into navigation.
            */}
          <ActionSheet
            open={exitOpen && !discardOpen}
            onClose={() => setExitOpen(false)}
            title="Leave this upload?"
            description={state.localSnapshotSaved
              ? "Your latest changes are saved on this device. Save a draft to confirm them on the server."
              : "Unsaved changes will be lost unless you save a draft."}
            cancelLabel="Keep going"
            returnFocusTo={exitRef}
            items={[
              ...(editing ? [] : [{
                id: "save",
                label: state.loading ? "Saving…" : "Save a draft & leave",
                hint: "Pick it up later from My projects",
                icon: "save",
                disabled: state.loading || state.creationBlocked || state.sourceWriteBlocked,
                onSelect: async () => {
                  const saved = await actions.handleSaveDraft();
                  if (!saved) return;
                  setExitOpen(false);
                  leave();
                },
              }]),
              {
                id: "discard",
                label: "Leave without saving",
                hint: "Everything typed here is lost",
                icon: "logout",
                destructive: true,
                disabled: state.loading,
                onSelect: () => setDiscardOpen(true),
              },
            ]}
          />

          <ConfirmDialog
            open={discardOpen}
            destructive
            title="Leave without saving?"
            message="The file, the details and the terms you have entered are all discarded. This cannot be undone."
            confirmLabel="Leave anyway"
            cancelLabel="Keep going"
            onCancel={() => setDiscardOpen(false)}
            onConfirm={() => {
              actions.discardWorkingDraft?.();
              leave();
            }}
          />

          {/*
            * The cover cropper, on the shared surface. `/upload` keeps this
            * state in `pages/ScriptUpload.jsx` — a portal-rendered Tailwind modal
            * with a hand-rolled focus trap on desktop — and passes it here, so
            * the phone gets the full-screen dialog and the focus trap that Phase
            * 1's `Dialog` already owns and tests.
            */}
          <CoverCropDialog {...(state.thumbnailEditor || {})} />
        </>
      )}
    >
      {/* Keyed by the exact panel, so React remounts on every move. That is what
          resets scroll to the top of the new panel — without it, walking from a
          long panel to a short one leaves the writer looking at blank space. */}
      <div className="ckm-upload__panel" key={position.panelKey}>
        <Panel vm={vm} />
      </div>
    </MobileShell>
  );
}

import { useCallback, useRef, useState } from "react";
import { EditorContent } from "@tiptap/react";
import ScreenplayEditor from "../../../components/screenplay/ScreenplayEditor";
import { TitlePageSheet } from "../../../components/screenplay/ScreenplayFocusMode";
import { useCreateProject } from "../../../pages/CreateProject/CreateProjectContext";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import InlineMessage from "../../components/feedback/InlineMessage";
import ActionSheet from "../../components/overlays/ActionSheet";
import ConfirmDialog from "../../components/overlays/ConfirmDialog";
import MobileShell from "../../shell/MobileShell";
import EditorDock from "./EditorDock";
import {
  buildEditorOverflowItems,
  describeSaveState,
  EDITOR_DOCK_TAB,
  EDITOR_SHELL_MODE,
  EDITOR_SHELL_SLOTS,
} from "./editorChrome";
import "./Editor.css";

/*
 * The mobile screenplay editor — /create-project step 1, "mode A" of the
 * approved wireframe (prefix: ckm-editor, plan §11 Phase 3, decisions D1–D5).
 *
 * WHAT THIS COMPONENT IS, AND IS NOT
 * ----------------------------------
 * It is CHROME. The editor itself is `components/screenplay/ScreenplayEditor` —
 * the same CodeMirror 6 host the desktop wizard mounts, with the same Fountain
 * classification, the same pagination, the same comment anchors and the same
 * collaborator locks. D1 is the reason this file is short: a forked mobile
 * editor would mean two Fountain parsers drifting apart, and the surface that
 * actually needed rebuilding for touch was never the editor — it was the three
 * desktop panes around it.
 *
 * So the transformation is: left rail + centre + right panel + ribbon → one
 * scroll surface, one docked bar, and sheets summoned one at a time (D5).
 *
 * IT READS THE ORCHESTRATOR'S CONTEXT, IT OWNS NO WIZARD STATE
 * ------------------------------------------------------------
 * `pages/CreateProject/index.jsx` owns every piece of create-project state and
 * publishes it through `CreateProjectContext`; `CreateProjectShell` is the
 * desktop chrome that reads it. This is the mobile chrome that reads the same
 * context. Autosave, the draft signature, the keepalive exit save, the working
 * draft snapshot and the recovery decision are all shared code, already tested,
 * and none of it is re-implemented here — which is also why "save/resume" needed
 * no mobile-specific work beyond showing the writer what it decided.
 *
 * NOT MOUNTED BY A ROUTE YET. `/create-project` stays a desktop migration
 * fallback until mode B (steps 2–5) exists, because promoting the route with an
 * unported wizard would put desktop form markup on the phone the moment a writer
 * taps "Continue to details" — exactly what plan §2.2 forbids. The development
 * harness at /__mobile-editor mounts this surface in the meantime.
 */
export default function Editor() {
  const {
    canEditContent, collabLocks, collabMyUserId, collabRequestEdit,
    competitionMode, creationBlocked, currentElement, dark, editor, editorZoom,
    emphasisState, enforceGoldPlan, error, exiting, exportingScreenplay,
    focusedCommentId, handleCaretLine, handleExitEditor, handleExportScreenplay,
    handleImportScreenplayFile, handleNext, handleScreenplayChange, hasFullAccess,
    importNotice, isScreenplayFormat, lastSaved, saved, saving, sceneComments,
    screenplayApiRef, screenplayEnabled, screenplayFileInputRef, screenplayValue,
    setCurrentElement, setEmphasisState, setError, setScreenplayEnabled,
    setShowExitConfirm, setShowTitlePageModal, setTitle, setSaved, showExitConfirm,
    title, titlePage, titlePageActive, useScreenplayEditor,
    confirmExitDiscard, confirmExitSaveDraft,
    pendingRecovery, acceptPendingRecovery, dismissPendingRecovery,
  } = useCreateProject();

  const [dockTab, setDockTab] = useState(EDITOR_DOCK_TAB.ELEMENTS);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const overflowRef = useRef(null);

  const save = describeSaveState({ saving, saved, lastSaved });

  // The recovery notice's timestamp is the snapshot's, and it is the writer's
  // only way to tell "the work I did on the train" from "something from a week
  // ago" before choosing which copy survives.
  const recoveredAt = pendingRecovery?.updatedAt
    ? new Date(pendingRecovery.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  const applyFormat = (control) => {
    const api = screenplayApiRef?.current;
    if (!api) return;
    if (control.action === "emphasis") api.applyEmphasis(control.kind);
    else if (control.action === "case") api.applyCase(control.kind);
    else if (control.action === "centered") api.applyCentered();
  };

  /* Hoisted out of the descriptor below rather than written inline: the ref is
     only ever read inside the handler, and keeping it out of an object literal
     built during render is what tells `react-hooks/refs` so. */
  const openImportPicker = useCallback((event) => {
    if (enforceGoldPlan(event)) screenplayFileInputRef.current?.click();
  }, [enforceGoldPlan, screenplayFileInputRef]);

  /*
   * The builder decides WHICH items exist; the screen decides what each one
   * does. Keeping the two apart is what lets a unit test read the capability
   * rules ("no publish step for a competition entry") without stubbing four
   * handlers — and it keeps the ref read inside a handler rather than inside an
   * argument evaluated during render.
   */
  const overflowActions = {
    import: openImportPicker,
    export: () => setExportOpen(true),
    prose: () => setScreenplayEnabled((value) => !value),
    continue: handleNext,
  };

  const overflowItems = buildEditorOverflowItems({
    canEditContent,
    // Import is gold-plan gated on desktop through `enforceGoldPlan`, which
    // shows the pricing modal when it refuses. The item is offered and the gate
    // answers — hiding it would tell a free writer the feature does not exist.
    canImport: canEditContent && useScreenplayEditor,
    isScreenplayFormat,
    screenplayEnabled,
    hasFullAccess,
    competitionMode,
    exporting: Boolean(exportingScreenplay),
  }).map((item) => ({ ...item, onSelect: overflowActions[item.id] }));

  const appBar = (
    <>
      <div className="ckm-editor__bar">
        <IconButton
          icon="chevron_left"
          label="Exit the editor"
          variant="soft"
          className="ckm-editor__bar-exit"
          onClick={handleExitEditor}
        />

        {/* Inline-editable, as on desktop. `setSaved(false)` is not incidental:
            it is what tells the autosave loop the draft signature moved, so a
            title typed and then abandoned is still saved. */}
        <input
          type="text"
          className="ckm-editor__bar-title"
          aria-label="Project title"
          placeholder="Untitled project"
          value={title}
          readOnly={!canEditContent}
          onChange={(event) => { setTitle(event.target.value); setSaved(false); }}
        />

        {/* One state, never two. `aria-live="polite"` because a save is a status
            change the writer did not ask to be interrupted by — SC 4.1.3. */}
        <span
          className={`ckm-editor__bar-save ckm-editor__bar-save--${save.state}`}
          role="status"
          aria-live="polite"
        >
          <span className="ckm-editor__bar-save-dot" aria-hidden="true" />
          <span className="ckm-editor__bar-save-label">{save.label}</span>
        </span>

        <IconButton
          ref={overflowRef}
          icon="more_vert"
          label="More editor actions"
          variant="soft"
          aria-haspopup="dialog"
          aria-expanded={overflowOpen}
          onClick={() => setOverflowOpen(true)}
        />
      </div>

      {/* The banner slot: pinned under the bar rather than in the scroll body,
          because a plan limit or a failed save that scrolls out of sight is a
          message the writer never sees again. */}
      {pendingRecovery && (
        <InlineMessage
          tone="info"
          variant="panel"
          title={`Unsaved changes from this device were found${recoveredAt ? ` (${recoveredAt})` : ""}.`}
          className="ckm-editor__notice"
          action={(
            <>
              <Button size="sm" onClick={acceptPendingRecovery}>Restore my changes</Button>
              <Button size="sm" variant="tertiary" onClick={dismissPendingRecovery}>
                Keep the saved version
              </Button>
            </>
          )}
        >
          The saved version has also changed since then, so these were not restored
          automatically. Restoring replaces what you see now.
        </InlineMessage>
      )}

      {creationBlocked && (
        <InlineMessage tone="warning" variant="panel" title="You've reached your plan's script limit." className="ckm-editor__notice">
          You can keep writing this draft, but publishing another script needs an upgraded plan.
        </InlineMessage>
      )}

      {importNotice && (
        <InlineMessage tone="info" variant="panel" className="ckm-editor__notice">
          {importNotice}
        </InlineMessage>
      )}

      {error && (
        <InlineMessage
          tone="error"
          variant="panel"
          className="ckm-editor__notice"
          action={<Button size="sm" variant="tertiary" onClick={() => setError("")}>Dismiss</Button>}
        >
          {error}
        </InlineMessage>
      )}
    </>
  );

  return (
    <MobileShell
      mode={EDITOR_SHELL_MODE}
      slots={EDITOR_SHELL_SLOTS}
      screenId="create-project-editor"
      className="ckm-editor"
      scrollClassName="ckm-editor__scroll"
      appBar={appBar}
      bottomNav={useScreenplayEditor ? (
        <EditorDock
          tab={dockTab}
          onTabChange={setDockTab}
          currentElement={currentElement}
          onSelectElement={(value) => screenplayApiRef?.current?.setElementType(value)}
          emphasis={emphasisState}
          onFormat={applyFormat}
          readOnly={!canEditContent}
        />
      ) : null}
      overlays={(
        <>
          <ActionSheet
            open={overflowOpen}
            onClose={() => setOverflowOpen(false)}
            title="Editor"
            items={overflowItems}
            returnFocusTo={overflowRef}
          />

          <ActionSheet
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            title="Export"
            description="A copy is prepared and downloaded to this device."
            items={[
              { id: "pdf", label: "PDF", icon: "picture_as_pdf", onSelect: () => handleExportScreenplay("pdf") },
              { id: "pdf-wm", label: "Watermarked PDF", icon: "branding_watermark", onSelect: () => handleExportScreenplay("pdf-wm") },
              { id: "fountain", label: "Fountain", icon: "description", onSelect: () => handleExportScreenplay("fountain") },
              { id: "fdx", label: "Final Draft (.fdx)", icon: "movie_edit", onSelect: () => handleExportScreenplay("fdx") },
            ]}
          />

          {/* Unsaved-change protection. Three outcomes, one of which destroys
              work, so it is a sheet of named actions rather than a two-button
              confirm: "Discard" and "Keep editing" must not be adjacent
              same-shaped buttons. The destructive item does not act — it hands
              over to a confirmation, which is ActionSheet's documented contract
              for exactly this case. */}
          <ActionSheet
            open={Boolean(showExitConfirm) && !discardOpen}
            onClose={() => { if (!exiting) setShowExitConfirm(false); }}
            title="Leave the editor?"
            description="This project will be waiting in My projects."
            cancelLabel="Keep editing"
            items={[
              {
                id: "save",
                label: exiting ? "Saving…" : "Save as draft & exit",
                hint: "Finish it later from My projects",
                icon: "save",
                disabled: exiting,
                onSelect: confirmExitSaveDraft,
              },
              {
                id: "discard",
                label: "Discard & exit",
                hint: "This draft is deleted",
                icon: "delete",
                destructive: true,
                disabled: exiting,
                onSelect: () => setDiscardOpen(true),
              },
            ]}
          />

          <ConfirmDialog
            open={discardOpen}
            destructive
            pending={exiting}
            title="Discard this draft?"
            message="Everything written in this session is deleted. This cannot be undone."
            confirmLabel="Discard & exit"
            cancelLabel="Keep editing"
            onCancel={() => setDiscardOpen(false)}
            onConfirm={confirmExitDiscard}
          />
        </>
      )}
    >
      <div className="ckm-editor__page-stack">
        {/* The title page is a separate sheet above the script, tappable to
            edit — the same object desktop shows, at phone width. */}
        {useScreenplayEditor && titlePageActive && (
          <TitlePageSheet
            fields={titlePage}
            hasTitlePage
            onEdit={() => setShowTitlePageModal(true)}
            dark={dark}
          />
        )}

        <div className="ckm-editor__page">
          {useScreenplayEditor ? (
            <ScreenplayEditor
              value={screenplayValue}
              onChange={handleScreenplayChange}
              onElementChange={setCurrentElement}
              onEmphasisStateChange={setEmphasisState}
              onCaretLine={handleCaretLine}
              locks={collabLocks}
              myUserId={collabMyUserId}
              onRequestEdit={collabRequestEdit}
              comments={sceneComments}
              focusedCommentId={focusedCommentId}
              readOnly={!canEditContent}
              apiRef={screenplayApiRef}
              /* Zoom is the desktop rail's control. On a phone the page is
                 already fitted to the viewport width, so the editor is mounted
                 at whatever the wizard's stored zoom is and the chrome offers no
                 way to change it — pinch-zoom is the platform's answer. */
              zoom={editorZoom}
              dark={dark}
            />
          ) : (
            <div className="ckm-editor__prose">
              <EditorContent editor={editor} />
            </div>
          )}
        </div>
      </div>

      {/* The import path: a file input the overflow item clicks. Kept in the
          scroll body rather than the bar so nothing about it can affect the
          chrome's layout. */}
      <input
        ref={screenplayFileInputRef}
        type="file"
        className="ckm-editor__file"
        accept=".fountain,.txt,.fdx,.pdf,.docx,.doc,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        onChange={handleImportScreenplayFile}
        tabIndex={-1}
        aria-hidden="true"
      />
    </MobileShell>
  );
}

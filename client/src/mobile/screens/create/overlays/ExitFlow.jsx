import { useState } from "react";
import { useCreateProject } from "../../../../pages/CreateProject/CreateProjectContext";
import ActionSheet from "../../../components/overlays/ActionSheet";
import ConfirmDialog from "../../../components/overlays/ConfirmDialog";

/*
 * ExitFlow — leaving the create-project route with unsaved work
 * (surfaces: ckm-action-sheet, ckm-confirm).
 *
 * Shared by both modes. The editor (mode A) and the publish wizard (mode B) are
 * different surfaces with different chrome, but "you have unsaved work, what
 * should happen to it?" is one contract with one correct answer set, and two
 * copies of it is how one of them quietly loses the discard confirmation.
 *
 * Only one mode is mounted at a time — `step` decides — so this renders once.
 *
 * WHY A SHEET AND NOT A TWO-BUTTON CONFIRM
 * ----------------------------------------
 * There are three outcomes and one of them destroys work. "Discard" and "Keep
 * editing" must not be adjacent same-shaped buttons. So the choice is a sheet of
 * named actions, and the destructive item does not act: it opens a `ckm-confirm`
 * `alertdialog` focused on Cancel, which is ActionSheet's documented contract
 * for exactly this case.
 *
 * The orchestrator opens this. `setShowExitConfirm(true)` is reached three ways
 * — the app bar's exit control, the browser/OS back gesture (intercepted by the
 * popstate guard in `pages/CreateProject/index.jsx`), and a tab close — so the
 * same prompt answers all three rather than each growing its own.
 */
export default function ExitFlow() {
  const {
    exiting, showExitConfirm, setShowExitConfirm, confirmExitDiscard, confirmExitSaveDraft,
  } = useCreateProject();

  const [discardOpen, setDiscardOpen] = useState(false);

  return (
    <>
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
  );
}

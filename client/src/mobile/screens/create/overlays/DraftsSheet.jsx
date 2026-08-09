import { useCreateProject } from "../../../../pages/CreateProject/CreateProjectContext";
import Button from "../../../components/buttons/Button";
import InlineMessage from "../../../components/feedback/InlineMessage";
import { SkeletonRows } from "../../../components/feedback/Skeletons";
import List from "../../../components/lists/List";
import ListRow from "../../../components/lists/ListRow";
import Sheet from "../../../components/overlays/Sheet";

/*
 * DraftsSheet — switching between saved projects (surface: ckm-bottom-sheet).
 *
 * The mobile replacement for the desktop drafts drawer, which is an inline
 * accordion of a three-column card grid pushed above the workspace. That shape
 * cannot survive here: it displaces the thing you are working on to show you
 * something you might switch to.
 *
 * A Sheet and not a Dialog by the Phase 1 rule — a short contextual task that
 * belongs to the screen behind it. The strip of scrim above it is the part that
 * says "your project is still there", which matters more here than usual,
 * because the action on offer is *leaving* the project you have open.
 *
 * ONE DESKTOP AFFORDANCE IS DELIBERATELY NOT PORTED: delete. The desktop card
 * carries a delete control; a row in a list on a phone is a much easier
 * mis-tap, deleting a draft is irreversible, and My projects already owns
 * project management with room for a confirmation. Offering it here would mean
 * building that confirmation twice. Switching and starting fresh are what this
 * sheet is for.
 */
export default function DraftsSheet({ open = false, onClose = null, returnFocusTo = null }) {
  const {
    drafts, loadingDrafts, loadDraft, scriptId,
    setScriptId, setLoadedScriptStatus, setEditApprovalLocked, setPurchasedServiceCredits,
    setTitle, editor, clearLocalWorkingDraft, setStep,
  } = useCreateProject();

  /* The desktop "+ New Draft" reset, unchanged and in the same order. It is a
     sequence of nine setters rather than one action because the orchestrator has
     no "reset" of its own; copying it is the honest option until it does, and
     re-deriving it here would be the drift this whole seam exists to avoid. */
  const startFresh = () => {
    setScriptId(null);
    setLoadedScriptStatus("draft");
    setEditApprovalLocked(false);
    setPurchasedServiceCredits({ evaluation: false, aiTrailer: false, spotlight: false });
    setTitle("");
    editor?.commands.clearContent();
    clearLocalWorkingDraft();
    setStep(1);
    onClose?.();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      returnFocusTo={returnFocusTo}
      title="My projects"
      description="Switch to another draft. This one is saved first."
      footer={(
        <Button fullWidth variant="secondary" icon="add" onClick={startFresh}>
          Start a new project
        </Button>
      )}
    >
      {loadingDrafts ? (
        <SkeletonRows rows={3} media={false} />
      ) : drafts.length === 0 ? (
        <InlineMessage tone="info" variant="panel" title="Nothing saved yet">
          Projects you save appear here. This one will, as soon as it has a title and a few lines.
        </InlineMessage>
      ) : (
        <List label="Your saved projects">
          {drafts.map((draft) => (
            <ListRow
              key={draft._id}
              title={draft.title?.trim() || "Untitled project"}
              subtitle={draft.updatedAt
                ? `Saved ${new Date(draft.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`
                : "Not saved yet"}
              /* The open project is marked rather than removed: a writer looking
                 for "the one I am in" should find it, not be left wondering
                 whether it was lost. `current` also sets aria-current, so the
                 mark is not carried by a visual badge alone. */
              current={draft._id === scriptId}
              trailing={draft._id === scriptId ? "Open" : undefined}
              chevron={draft._id !== scriptId}
              onClick={draft._id === scriptId ? undefined : () => { loadDraft(draft._id); onClose?.(); }}
            />
          ))}
        </List>
      )}
    </Sheet>
  );
}

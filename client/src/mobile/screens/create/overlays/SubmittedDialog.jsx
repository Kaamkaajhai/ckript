import { useCreateProject } from "../../../../pages/CreateProject/CreateProjectContext";
import Button from "../../../components/buttons/Button";
import Icon from "../../../components/Icon";
import Dialog from "../../../components/overlays/Dialog";

/*
 * SubmittedDialog — the acknowledgement after a project is submitted for review
 * (surface: ckm-dialog).
 *
 * The terminal state of the whole flow, and the one screen in it a writer sees
 * exactly once per project. Desktop draws it as a centred `motion.div` in a
 * portal with no dialog role, no focus trap and no labelled heading; on a phone
 * that is a card floating over a form the user can still tab into. `Dialog`
 * gives it the three things it was missing: `role="dialog"`, a focus trap, and
 * an inert background.
 *
 * THE AUTO-REDIRECT IS KEPT, AND SO IS THE ESCAPE FROM IT.
 * `openUnderReviewModal` schedules a navigation 2.4 seconds out. That is a time
 * limit on reading (WCAG SC 2.2.1), which is only acceptable because the
 * information is not lost — the project is in My projects either way, and the
 * Continue button performs the same navigation immediately, cancelling the
 * timer. The countdown is stated rather than implied, because a screen that
 * moves on its own with no warning reads as a crash.
 *
 * `onClose` is Continue: there is no "stay here" outcome. The wizard behind this
 * describes a project that has already been submitted, so dismissing to it would
 * offer a Submit button for something already submitted.
 */
export default function SubmittedDialog() {
  const { showUnderReviewModal, handleUnderReviewContinue } = useCreateProject();

  return (
    <Dialog
      open={Boolean(showUnderReviewModal)}
      onClose={handleUnderReviewContinue}
      closeLabel="Continue to my projects"
      title="Submitted for review"
      description="An admin reads every submission before it goes live. You'll be notified when yours is approved."
      className="ckm-create-project__submitted"
      footer={(
        <Button fullWidth onClick={handleUnderReviewContinue}>Continue</Button>
      )}
    >
      <p className="ckm-create-project__submitted-icon" aria-hidden="true">
        <Icon name="hourglass_top" size={40} />
      </p>

      <p className="ckm-create-project__submitted-body">
        Your project is safe. You can find it under <strong>Under review</strong> in My projects,
        and you can keep writing other projects in the meantime.
      </p>

      {/* Announced politely, because a screen reader user who is still reading
          the first sentence should not be interrupted to be told the page is
          about to move — but they must be told. */}
      <p className="ckm-create-project__submitted-note" role="status">
        Taking you back to your projects in a moment.
      </p>
    </Dialog>
  );
}

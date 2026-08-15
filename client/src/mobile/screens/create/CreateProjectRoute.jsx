import CreateProject from "../../../pages/CreateProject";
import CreateProjectChrome from "./CreateProjectChrome";
import "./Wizard.css";

/*
 * CreateProjectRoute — what `/create-project` and `/create-project/:draftId`
 * mount on a phone.
 *
 * Three lines of substance, and that is the whole point of the seam. The
 * orchestrator is not forked, wrapped or re-implemented: it is the same
 * component App.jsx mounts on desktop, running the same effects against the same
 * endpoints, with a different chrome passed in.
 *
 * What that buys, concretely: autosave, the 64 KiB-aware keepalive exit save,
 * the per-draft working-draft snapshot, `chooseDraftRecovery`, the collaborator
 * locks, the plan gates, per-panel validation and `handlePublish` are one
 * implementation with one set of tests, and a fix to any of them lands on both
 * platforms in the same commit.
 *
 * `hostClassName` is not cosmetic. `.ckm-shell` is `height: 100%`, and the
 * orchestrator's outermost element sits between it and `.ckm-root`; left at the
 * desktop default that div has no height of its own and the entire screen
 * collapses to the height of its content.
 */
export default function CreateProjectRoute() {
  return (
    <CreateProject
      Shell={CreateProjectChrome}
      nativeChrome
      hostClassName="ckm-create-project__host"
    />
  );
}

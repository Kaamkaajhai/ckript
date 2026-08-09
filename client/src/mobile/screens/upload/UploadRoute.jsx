import ScriptUpload from "../../../pages/ScriptUpload";
import ScriptUploadChrome from "./ScriptUploadChrome";
import "./Upload.css";

/*
 * UploadRoute — what `/upload` mounts on a phone, including its two query forms
 * `?draft=<id>` and `?edit=<id>`.
 *
 * Three lines of substance, and that is the whole point of the seam. The
 * orchestrator is not forked, wrapped or re-implemented: it is the same
 * component App.jsx mounts on desktop, running the same effects against the same
 * endpoints, with a different chrome passed in.
 *
 * What that buys, concretely: the PDF extraction, the draft conversion, the
 * content-only revision path, the plan gate, `validateUploadScreen`,
 * `resolveUploadServerIssue`, the media-recovery retry and the whole submit
 * payload are one implementation with one set of tests, and a fix to any of them
 * lands on both platforms in the same commit.
 *
 * The two query parameters need nothing here: the orchestrator reads them itself
 * through `useSearchParams`, so there is nothing for the route to hand over.
 *
 * `hostClassName` is not cosmetic. `.ckm-shell` is `height: 100%`, and the
 * orchestrator's outermost element sits between it and `.ckm-root`; left at the
 * desktop default that element has no height of its own and the entire screen
 * collapses to the height of its content.
 */
export default function UploadRoute() {
  return (
    <ScriptUpload
      Workspace={ScriptUploadChrome}
      nativeChrome
      hostClassName="ckm-upload__host"
    />
  );
}

import Upload from "./Upload";
import { UploadDenied, UploadResolving, UploadSourceIssue, UploadSubmitted } from "./UploadStates";
import { UPLOAD_SOURCE_LOAD_STATUS } from "../../../pages/CreateProject/lib/uploadSourceLoad";
import useUploadToasts from "./useUploadToasts";

/*
 * ScriptUploadChrome — the mobile chrome for `/upload`, injected into
 * `pages/ScriptUpload.jsx` through its `Workspace` prop.
 *
 * NAMED AFTER THE PAGE IT DRESSES, and not `UploadChrome`, for a reason worth
 * stating so nobody "tidies" it back: this directory already holds
 * `uploadChrome.js`, the pure model, and on Windows and macOS the filesystem is
 * case-insensitive — `./uploadChrome` and `./UploadChrome` resolve to the same
 * module. The symptom is not a helpful error but a default export that is
 * silently `undefined` at render time.
 *
 * FIVE SURFACES, ONE ROUTE. Desktop expresses four of them as early `return`s
 * inside the orchestrator — access refused, a source load still resolving, a
 * source-load failure, and the post-submit screen — each written in Tailwind for a page that has a
 * nav rail around it. An early return happens *before* any injected chrome can
 * reach it, so under `nativeChrome` the orchestrator hands those states to
 * the view model instead and this component chooses. The alternative is the open
 * follow-up `/create-project` still carries: desktop markup arriving on a phone
 * with no shell, no safe-area padding and no way back.
 *
 * The order is the orchestrator's own, kept exactly: refusal first (nothing else
 * matters if the account may not upload), then the resolving gate (the form must
 * not be drawn empty over a real listing), then a load failure, submitted, and the flow.
 *
 * WHY THIS COMPONENT IS SO SHORT. Everything it could have owned belongs
 * somewhere better: state to the orchestrator, chrome to the five surfaces,
 * transient messages to the app-wide toast layer. What is left is the one
 * decision only it can make.
 */
export default function ScriptUploadChrome({ vm }) {
  // The orchestrator's `toastMessage` has no renderer under `nativeChrome`, so
  // it is forwarded to the mobile toast layer here — once, above every surface,
  // rather than by whichever one happens to be mounted when a save fails.
  useUploadToasts(vm);

  if (vm.state.accessDenied) return <UploadDenied />;
  if (vm.state.sourceLoad?.status === UPLOAD_SOURCE_LOAD_STATUS.LOADING) {
    return <UploadResolving kind={vm.state.sourceLoad.kind} />;
  }
  if ([
    UPLOAD_SOURCE_LOAD_STATUS.NOT_FOUND,
    UPLOAD_SOURCE_LOAD_STATUS.FORBIDDEN,
    UPLOAD_SOURCE_LOAD_STATUS.FAILED,
  ].includes(vm.state.sourceLoad?.status)) {
    return (
      <UploadSourceIssue
        sourceLoad={vm.state.sourceLoad}
        onRetry={vm.actions.retrySourceLoad}
        onRecover={vm.actions.recoverSourceFromDevice}
      />
    );
  }

  if (vm.state.submissionSuccess) {
    return (
      <UploadSubmitted
        projectTitle={vm.state.submissionSuccess.projectTitle}
        reviewPath={vm.state.submissionSuccess.reviewPath}
        editing={Boolean(vm.mode.editId)}
      />
    );
  }

  return <Upload vm={vm} />;
}

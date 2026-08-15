import { useEffect, useRef } from "react";
import Button from "../../components/buttons/Button";
import Icon from "../../components/Icon";
import SkeletonGroup, { SkeletonShape, SkeletonText } from "../../components/feedback/Skeletons";
import MobileShell from "../../shell/MobileShell";
import { uploadSourceCopy } from "../../../pages/CreateProject/lib/uploadSourceLoad";
import { UPLOAD_SHELL_MODE } from "./uploadChrome";
import "./Upload.css";

/*
 * The three surfaces `/upload` shows INSTEAD of the flow (prefix: ckm-upload).
 *
 * On desktop these are three early `return`s inside `pages/ScriptUpload.jsx`,
 * each a block of Tailwind written for a page that has a nav rail around it.
 * Under `nativeChrome` the orchestrator hands them to the chrome instead, for
 * the same reason the wizard's `accessDenied` and `invitePending` returns are
 * still an open follow-up on `/create-project`: an early return happens *before*
 * any injected chrome, so desktop markup would reach the phone with no shell,
 * no safe-area padding and no way back.
 *
 * All three are `flow` screens. None of them is a place to browse from, and a
 * tab bar under a "we're reviewing your script" message is an invitation to
 * leave in the middle of being told something.
 */

/* ─────────────────────────── Access refused ─────────────────────────── */

/*
 * Only `creator` and `writer` accounts may upload. This is not a failure the
 * visitor can fix by trying again, so it does not offer a retry — it offers the
 * two places they can actually go.
 */
export function UploadDenied() {
  return (
    <MobileShell mode={UPLOAD_SHELL_MODE} screenId="upload-denied" className="ckm-upload">
      <div className="ckm-upload__state">
        <Icon name="lock" size={40} className="ckm-upload__state-icon" />
        <h1 className="ckm-upload__state-title">Only writer accounts can upload scripts</h1>
        <p className="ckm-upload__state-body">
          Uploading is part of the writer experience. Switch to your writer profile, or head back to
          what you were reading.
        </p>
        <div className="ckm-upload__state-actions">
          <Button to="/dashboard">Go to my dashboard</Button>
          <Button variant="secondary" to="/">Back to Ckript</Button>
        </div>
      </div>
    </MobileShell>
  );
}

/* ──────────────────────── Resolving an ?edit= load ──────────────────── */

/*
 * `?edit=<id>` fetches the published script before the form can be drawn, and
 * until it resolves the flow would show an EMPTY form over a real listing.
 *
 * A skeleton of the shape that is coming, not a spinner: the shell is already
 * on screen, so what is loading is a form, and a skeleton says how much of one.
 * `aria-busy` plus one polite status line is what a screen reader gets — a
 * skeleton is decoration to a screen reader and announces nothing on its own.
 */
export function UploadResolving({ kind = "draft" }) {
  return (
    <MobileShell mode={UPLOAD_SHELL_MODE} screenId="upload-resolving" className="ckm-upload">
      <SkeletonGroup label={`Loading your ${kind === "edit" ? "script" : "draft"}`} className="ckm-upload__panel">
        <SkeletonShape width="60%" height={28} />
        <SkeletonText lines={2} />
        <SkeletonShape height={120} />
        <SkeletonShape height={120} />
      </SkeletonGroup>
    </MobileShell>
  );
}

/* ───────────────────── Source unavailable / local recovery ─────────── */

export function UploadSourceIssue({ sourceLoad, onRetry, onRecover }) {
  const copy = uploadSourceCopy(sourceLoad);
  if (!copy) return null;

  return (
    <MobileShell mode={UPLOAD_SHELL_MODE} screenId="upload-source-issue" className="ckm-upload">
      <section className="ckm-upload__state" aria-labelledby="ckm-upload-source-title">
        <Icon name={copy.icon} size={40} className="ckm-upload__state-icon" />
        <p className="ckm-upload__state-kicker">{copy.kicker}</p>
        <h1 className="ckm-upload__state-title" id="ckm-upload-source-title">{copy.title}</h1>
        <p className="ckm-upload__state-body">{copy.body}</p>

        <div className="ckm-upload__state-actions">
          {copy.retryable && (
            <Button onClick={onRetry} icon="refresh">Try again</Button>
          )}
          {copy.retryable && sourceLoad?.hasLocalRecovery && (
            <Button variant="secondary" onClick={onRecover} icon="history">
              Open device copy
            </Button>
          )}
          <Button variant="tertiary" to="/dashboard">Go to dashboard</Button>
        </div>
      </section>
    </MobileShell>
  );
}

/* ───────────────────────────── Submitted ────────────────────────────── */

/*
 * The end of the flow, and the only screen here that has to be *remembered*: a
 * writer who has just given away four minutes and a 30 MB file needs to be told
 * what happens next, not bounced to a dashboard where their script is not
 * visible yet because it is unpublished.
 *
 * The heading takes focus on mount, deliberately. WCAG 4.1.3 says a status
 * message must not take focus — but this is not a status message appearing
 * beside unchanged content; it is a whole new screen replacing the form, which
 * is a change of context the user asked for, and moving focus to its heading is
 * what stops a screen reader user being left on a button that no longer exists.
 */
export function UploadSubmitted({ projectTitle = "", reviewPath = "/dashboard", editing = false }) {
  const headingRef = useRef(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <MobileShell mode={UPLOAD_SHELL_MODE} screenId="upload-submitted" className="ckm-upload">
      <div className="ckm-upload__state">
        <span className="ckm-upload__state-mark" aria-hidden="true">
          <Icon name="check" size={30} />
        </span>

        <p className="ckm-upload__state-kicker">
          {editing ? "Update submitted" : "Submission complete"}
        </p>
        <h1 className="ckm-upload__state-title" ref={headingRef} tabIndex={-1}>
          {editing ? "Your changes are with the review team." : "Your project is with the review team."}
        </h1>
        <p className="ckm-upload__state-body">
          <strong>{projectTitle || "Your project"}</strong> is being reviewed. You'll get a
          notification when there is a decision — you do not need to keep this open.
        </p>

        <div className="ckm-upload__state-actions">
          <Button to={reviewPath || "/dashboard"} trailingIcon="arrow_forward">
            Review your project
          </Button>
          {/*
            * A real navigation, not desktop's `<a href="/upload">`. That anchor
            * is a full document reload of the SPA — on a phone, several seconds
            * and a fresh download of the bundle to reach a route the router
            * already owns.
            */}
          {!editing && (
            <Button variant="secondary" to="/new-project" icon="add">
              Start another project
            </Button>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

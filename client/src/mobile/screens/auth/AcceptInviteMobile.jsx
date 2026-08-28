import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { AuthContext } from "../../../context/AuthContext";
import { acceptCollabInvite } from "../../../components/collab/collaborationRequests";
import Button from "../../components/buttons/Button";
import Icon from "../../components/Icon";
import InlineMessage from "../../components/feedback/InlineMessage";
import { SkeletonShape } from "../../components/feedback/Skeletons";
import MobileShell from "../../shell/MobileShell";
import { AUTH_SHELL_MODE, withReturnPath } from "./authChrome";
import { readRefusal } from "./authModel";
import "./AcceptInviteMobile.css";

/*
 * AcceptInviteMobile — /invite/:token (Phase 8, D59).
 *
 * The only route in this family that has work to do for both a signed-in and a
 * signed-out viewer, which is why it is a result surface rather than a form.
 *
 * The signed-out case is the one that mattered. `pages/AcceptInvite.jsx` carries
 * a comment explaining why it does NOT route away — "/signup and /login are
 * both `<Navigate to="/">`, and nothing reads the `next` param — sending an
 * invitee there dropped them on the homepage and lost the invite entirely" — so
 * it opens a modal over itself instead. On mobile that is no longer necessary:
 * /login is a real screen and `?redirect=` is honoured, so an invitee can be
 * SENT to sign in and come back to this exact URL, which is the behaviour the
 * desktop comment wanted and could not have.
 *
 * The invite is deliberately not accepted on mount for a signed-out visitor and
 * is stated first for everyone: accepting a collaboration invitation adds a
 * person to someone else's screenplay, and doing that silently because a link
 * was opened is the wrong default for an irreversible-feeling action.
 */

const STATUS = Object.freeze({
  LOADING: "loading",
  SIGNED_OUT: "signed-out",
  READY: "ready",
  ACCEPTING: "accepting",
  ACCEPTED: "accepted",
  FAILED: "failed",
  NO_TOKEN: "no-token",
});

/*
 * What this screen is showing, derived rather than stored.
 *
 * Four of the seven states are facts about the props — the session is still
 * restoring, the URL has no token, nobody is signed in — and storing those in
 * state means an effect that copies props into state and a render where the two
 * disagree. Only the acceptance ATTEMPT is genuine local state, so only that is
 * held; everything else is computed from it and the session on every render.
 */
function resolveStatus({ loading, token, user, attempt }) {
  if (attempt === STATUS.ACCEPTED) return STATUS.ACCEPTED;
  if (loading) return STATUS.LOADING;
  if (!token) return STATUS.NO_TOKEN;
  if (!user) return STATUS.SIGNED_OUT;
  if (attempt) return attempt;
  return STATUS.READY;
}

export default function AcceptInviteMobile() {
  const { token } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useContext(AuthContext);

  /* Only the acceptance attempt is state; see resolveStatus above. */
  const [attempt, setAttempt] = useState(null);
  const [refusal, setRefusal] = useState(null);
  const [result, setResult] = useState(null);
  const inFlightRef = useRef(false);

  const status = resolveStatus({ loading, token, user, attempt });

  /* This exact URL is where the invitee must come back to. */
  const returnHere = useMemo(
    () => `${location.pathname}${location.search}`,
    [location.pathname, location.search],
  );

  const accept = useCallback(async () => {
    // A double tap on a slow connection must not send two accepts; the ref
    // guards synchronously, which state set in the same tick would not.
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setAttempt(STATUS.ACCEPTING);
    setRefusal(null);
    try {
      const data = await acceptCollabInvite(token, api);
      setResult(data);
      setAttempt(STATUS.ACCEPTED);
    } catch (error) {
      // Let them try again — the common failures here are a dropped connection
      // and a token someone else already used, and only one of those is final.
      setRefusal(readRefusal(error));
      setAttempt(STATUS.FAILED);
    } finally {
      inFlightRef.current = false;
    }
  }, [token]);

  const body = () => {
    if (status === STATUS.LOADING) return <SkeletonShape height={120} radius="var(--ckm-r-lg)" />;

    if (status === STATUS.NO_TOKEN) {
      return (
        <InlineMessage tone="warning" variant="panel" title="That invitation link is incomplete">
          The link is missing its invitation code. Ask whoever invited you to send it again.
        </InlineMessage>
      );
    }

    if (status === STATUS.SIGNED_OUT) {
      return (
        <>
          <p className="ckm-invite__lede">
            You&apos;ve been invited to collaborate on a screenplay. Sign in — or create your account —
            and we&apos;ll bring you straight back here.
          </p>
          <div className="ckm-invite__actions">
            <Button fullWidth to={withReturnPath("/login", returnHere)}>Sign in to accept</Button>
            <Button fullWidth variant="secondary" to={withReturnPath("/join", returnHere)}>
              Create an account
            </Button>
          </div>
        </>
      );
    }

    if (status === STATUS.ACCEPTED) {
      return (
        <>
          <p className="ckm-invite__lede">
            {result?.message || "You're on the project."}
            {result?.script?.title ? ` You now have access to ${result.script.title}.` : ""}
          </p>
          <div className="ckm-invite__actions">
            <Button fullWidth to={result?.script?.id ? `/script/${result.script.id}` : "/collaborations"}>
              {result?.script?.id ? "Open the project" : "See your collaborations"}
            </Button>
            <Button fullWidth variant="tertiary" to="/dashboard">Go to your dashboard</Button>
          </div>
        </>
      );
    }

    return (
      <>
        <p className="ckm-invite__lede">
          Accepting adds you to this screenplay as a collaborator, and the writer will be told.
        </p>
        {status === STATUS.FAILED && refusal && (
          <InlineMessage tone="error" className="ckm-invite__error">
            {refusal.message || "We couldn't accept that invitation."}
          </InlineMessage>
        )}
        <div className="ckm-invite__actions">
          <Button
            fullWidth
            onClick={accept}
            pending={status === STATUS.ACCEPTING}
            pendingLabel="Accepting…"
          >
            {status === STATUS.FAILED ? "Try again" : "Accept invitation"}
          </Button>
          <Button fullWidth variant="tertiary" onClick={() => navigate("/dashboard", { replace: true })}>
            Not now
          </Button>
        </div>
      </>
    );
  };

  return (
    <MobileShell mode={AUTH_SHELL_MODE} screenId="accept-invite">
      <section className="ckm-invite" aria-labelledby="ckm-invite-title">
        <Icon className="ckm-invite__mark" name="group_add" size={30} />
        <p className="ckm-invite__eyebrow">Collaboration invitation</p>
        <h1 className="ckm-invite__title" id="ckm-invite-title">
          {status === STATUS.ACCEPTED ? "You're in." : "You've been invited"}
        </h1>
        {body()}
      </section>
    </MobileShell>
  );
}

import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  INCOMING_FOLLOW_REQUEST_STATUS,
  useIncomingFollowRequests,
} from "../../../../pages/profile/useIncomingFollowRequests";
import { resolveMediaUrl } from "../../../../utils/mediaUrl";
import PageHeader from "../../../components/app-bars/PageHeader";
import Button from "../../../components/buttons/Button";
import EmptyState from "../../../components/EmptyState";
import InlineMessage from "../../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../../components/feedback/Skeletons";
import { useToast } from "../../../components/feedback/toastContext";
import NavBar from "../../../components/navigation/NavBar";
import MobileShell from "../../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../../shell/mobileShellModes";
import { buildIncomingFollowRequestList } from "./followRequestsModel";
import "./FollowRequestsMobile.css";

export default function FollowRequestsMobile({ user }) {
  const requestState = useIncomingFollowRequests();
  const toast = useToast();
  const requests = useMemo(
    () => buildIncomingFollowRequestList(requestState.requests),
    [requestState.requests],
  );

  const decide = async (request, decision) => {
    const result = await requestState.decide(request.fromUserId, decision);
    if (result.ok) {
      toast.success(
        decision === "accept" ? "Follow request accepted" : "Follow request rejected",
        decision === "accept" ? `${request.name} can now follow your profile.` : `${request.name}'s request was removed.`,
      );
    }
  };

  const header = <PageHeader title="Follow requests" eyebrow="Your network" backTo="/profile" />;
  const shell = (children) => (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="follow-requests"
      className="ckm-follow-requests"
      appBar={header}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={requestState.reload}
    >
      {children}
    </MobileShell>
  );

  if (requestState.status === INCOMING_FOLLOW_REQUEST_STATUS.LOADING) {
    return shell(
      <SkeletonGroup label="Loading follow requests" className="ckm-follow-requests__state">
        <SkeletonShape height={104} />
        <SkeletonShape height={104} />
      </SkeletonGroup>,
    );
  }

  if (requestState.status === INCOMING_FOLLOW_REQUEST_STATUS.FAILED) {
    return shell(
      <div className="ckm-follow-requests__state">
        <InlineMessage variant="panel" title="Could not load follow requests" onRetry={requestState.reload}>
          {requestState.error}
        </InlineMessage>
      </div>,
    );
  }

  return shell(
    <main className="ckm-follow-requests__page">
      <p className="ckm-follow-requests__intro">Review people who want to follow your private profile.</p>
      {requestState.error ? <InlineMessage>{requestState.error}</InlineMessage> : null}
      {!requests.length ? (
        <EmptyState
          icon="person_check"
          title="No pending requests"
          titleAs="h2"
          body="New follow requests will appear here."
        />
      ) : (
        <ul className="ckm-follow-requests__list">
          {requests.map((request) => (
            <li key={request.id} className="ckm-follow-requests__card">
              <Link to={request.profilePath} className="ckm-follow-requests__identity" aria-label={`View ${request.name}'s profile`}>
                <span className="ckm-follow-requests__avatar">
                  {request.image ? <img src={resolveMediaUrl(request.image)} alt="" /> : <span aria-hidden="true">{request.name.charAt(0).toUpperCase()}</span>}
                </span>
                <span className="ckm-follow-requests__copy">
                  <strong>{request.name}</strong>
                  <small>{request.role}</small>
                  {request.bio ? <span>{request.bio}</span> : null}
                </span>
              </Link>
              <div className="ckm-follow-requests__actions">
                <Button
                  fullWidth
                  pending={requestState.actingId === request.fromUserId}
                  disabled={Boolean(requestState.actingId && requestState.actingId !== request.fromUserId)}
                  onClick={() => decide(request, "accept")}
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  disabled={Boolean(requestState.actingId)}
                  onClick={() => decide(request, "reject")}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>,
  );
}

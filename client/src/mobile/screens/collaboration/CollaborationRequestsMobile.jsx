import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  COLLAB_REQUEST_ROLES,
  acceptCollabInvite,
  describeCollabActivity,
  formatCollabTimeAgo,
  getCollabErrorMessage,
  getCollabRoleLabel,
  respondToCollabRequest,
  useCollabActivityPage,
  useCollabInvitePage,
  useCollabRequestPage,
} from "../../../components/collab/collaborationRequests";
import { getApiBaseUrl } from "../../../utils/apiOrigin";
import PageHeader from "../../components/app-bars/PageHeader";
import Button from "../../components/buttons/Button";
import EmptyState from "../../components/EmptyState";
import InlineMessage from "../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../components/feedback/Skeletons";
import { useToast } from "../../components/feedback/toastContext";
import NavBar from "../../components/navigation/NavBar";
import Tabs, { TabPanel } from "../../components/tabs/Tabs";
import MobileShell from "../../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../../shell/mobileShellModes";
import "./CollaborationRequestsMobile.css";

const SOCKET_ORIGIN = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
const TABS = [
  { id: "incoming", label: "Incoming" },
  { id: "sent", label: "Sent" },
  { id: "invites", label: "Invites" },
  { id: "activity", label: "Activity" },
];
const TAB_IDS = new Set(TABS.map((tab) => tab.id));

const getQueryState = (search) => {
  const params = new URLSearchParams(search);
  const requestedTab = params.get("tab");
  const tab = TAB_IDS.has(requestedTab) ? requestedTab : "incoming";
  const page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
  return { tab, page };
};

const RequestPager = ({ pagination, onPage, label = "Collaboration pages" }) => pagination.pages > 1 ? (
  <nav className="ckm-collaboration__pager" aria-label={label}>
    <Button variant="tertiary" size="sm" disabled={!pagination.hasPrevious} onClick={() => onPage(pagination.page - 1)}>Previous</Button>
    <span>Page {pagination.page} of {pagination.pages}</span>
    <Button variant="tertiary" size="sm" disabled={!pagination.hasNext} onClick={() => onPage(pagination.page + 1)}>Next</Button>
  </nav>
) : null;

export default function CollaborationRequestsMobile({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const query = useMemo(() => getQueryState(location.search), [location.search]);
  const scope = query.tab === "sent" ? "outgoing" : "inbox";
  const requestsSelected = query.tab === "incoming" || query.tab === "sent";
  const requestPage = useCollabRequestPage({ scope, page: query.page, enabled: requestsSelected });
  const invitePage = useCollabInvitePage({ page: query.page, enabled: query.tab === "invites" });
  const activityPage = useCollabActivityPage({ page: query.page, enabled: query.tab === "activity" });
  const refreshRequests = requestPage.refresh;
  const refreshInvites = invitePage.refresh;
  const refreshActivity = activityPage.refresh;
  const [actingId, setActingId] = useState("");
  const [choices, setChoices] = useState({});
  const [result, setResult] = useState(null);

  const setQuery = (next) => {
    const tab = next.tab || query.tab;
    const page = next.page || 1;
    const params = new URLSearchParams();
    if (tab !== "incoming") params.set("tab", tab);
    if (page > 1) params.set("page", String(page));
    navigate(`/collaborations${params.size ? `?${params}` : ""}`);
  };

  useEffect(() => {
    if (!user?.token) return undefined;
    const socket = io(SOCKET_ORIGIN, { auth: { token: user.token } });
    const refresh = () => {
      refreshRequests();
      refreshInvites();
      refreshActivity();
    };
    ["collab_request", "collab_request_sent", "collab_request_responded", "collab_invite", "collab_membership_changed"]
      .forEach((event) => socket.on(event, refresh));
    return () => socket.disconnect();
  }, [refreshActivity, refreshInvites, refreshRequests, user?.token]);

  const decide = async (request, decision) => {
    const role = choices[request.id] || request.requestedRole;
    try {
      setActingId(request.id);
      const result = await respondToCollabRequest(request, {
        decision,
        role,
        accessLevel: role === "full_admin" ? "full_access" : "content_only",
      });
      toast.success(result.message, decision === "accepted" ? `${request.requester?.name || "This writer"} can now open ${request.scriptTitle}.` : "The request was removed from your inbox.");
      requestPage.refresh();
    } catch (error) {
      toast.error("Could not update request", getCollabErrorMessage(error));
    } finally {
      setActingId("");
    }
  };

  const acceptInvitation = async (invitation) => {
    try {
      setActingId(invitation.id);
      setResult(null);
      const accepted = await acceptCollabInvite(invitation.token);
      setResult({ tone: "success", message: accepted.message, script: accepted.script });
      invitePage.refresh();
      activityPage.refresh();
    } catch (error) {
      setResult({ tone: "error", message: getCollabErrorMessage(error, "Could not accept invitation") });
    } finally {
      setActingId("");
    }
  };

  const shell = (children) => (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="collaborations"
      className="ckm-collaboration"
      appBar={<PageHeader title="Collaboration" eyebrow="Writing together" backTo="/dashboard" />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={() => {
        refreshRequests();
        refreshInvites();
        refreshActivity();
      }}
    >
      {children}
    </MobileShell>
  );

  return shell(
    <main className="ckm-collaboration__page">
      <p className="ckm-collaboration__intro">Handle requests and invitations, then follow changes across every project you write together.</p>
      <Tabs tabsId="collaboration" label="Collaboration view" tabs={TABS} value={query.tab} onChange={(tab) => { setResult(null); setQuery({ tab, page: 1 }); }} />
      <TabPanel tabsId="collaboration" id={query.tab} value={query.tab} className="ckm-collaboration__panel">
        {result ? (
          <InlineMessage tone={result.tone} variant="panel" title={result.tone === "success" ? "Invitation accepted" : "Invitation problem"}>
            <span>{result.message}</span>
            {result.script?.id ? <Link className="ckm-collaboration__result-link" to={`/create-project/${encodeURIComponent(result.script.id)}`}>Open {result.script.title}</Link> : null}
          </InlineMessage>
        ) : null}

        {requestsSelected ? <>
          {requestPage.status === "loading" && !requestPage.requests.length ? (
            <SkeletonGroup label="Loading collaboration requests" className="ckm-collaboration__state"><SkeletonShape height={176} /><SkeletonShape height={142} /></SkeletonGroup>
          ) : requestPage.status === "error" && !requestPage.requests.length ? (
            <InlineMessage variant="panel" title="Could not load requests" onRetry={requestPage.refresh}>{requestPage.error}</InlineMessage>
          ) : !requestPage.requests.length ? (
            <EmptyState
              icon={query.tab === "incoming" ? "person_add" : "outbox"}
              title={query.tab === "incoming" ? "No incoming requests" : "No sent requests"}
              titleAs="h2"
              body={query.tab === "incoming" ? "Requests to join your projects will appear here." : "Requests you send from open project pages will appear here."}
            />
          ) : (
            <ul className="ckm-collaboration__list">
              {requestPage.requests.map((request) => (
                <li key={request.id} className="ckm-collaboration__card">
                  <div className="ckm-collaboration__card-head">
                    <div>
                      <span>{query.tab === "incoming" ? request.requester?.name || "Writer" : request.scriptTitle}</span>
                      <strong>{query.tab === "incoming" ? request.scriptTitle : getCollabRoleLabel(request.requestedRole)}</strong>
                    </div>
                    <span className={`ckm-collaboration__status is-${request.status}`}>{request.status}</span>
                  </div>
                  {request.message ? <p>{request.message}</p> : null}
                  {query.tab === "incoming" ? (
                    <div className="ckm-collaboration__decision">
                      <label>
                        Role if accepted
                        <select value={choices[request.id] || request.requestedRole} onChange={(event) => setChoices((current) => ({ ...current, [request.id]: event.target.value }))}>
                          {COLLAB_REQUEST_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                      </label>
                      {request.legacyRequestedRole ? <small>This older Merger request defaults to Commenter.</small> : null}
                      <div>
                        <Button fullWidth pending={actingId === request.id} disabled={Boolean(actingId && actingId !== request.id)} onClick={() => decide(request, "accepted")}>Accept</Button>
                        <Button fullWidth variant="secondary" disabled={Boolean(actingId)} onClick={() => decide(request, "rejected")}>Decline</Button>
                      </div>
                    </div>
                  ) : (
                    <Link className="ckm-collaboration__project-link" to={request.status === "accepted" ? `/create-project/${encodeURIComponent(request.scriptId)}` : `/share/project/${encodeURIComponent(request.scriptId)}`}>
                      {request.status === "accepted" ? "Open workspace" : request.status === "rejected" ? "View project and request again" : "View project"}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
          {requestPage.error && requestPage.requests.length ? <InlineMessage>{requestPage.error}</InlineMessage> : null}
          <RequestPager pagination={requestPage.pagination} onPage={(page) => setQuery({ page })} label="Collaboration request pages" />
        </> : null}

        {query.tab === "invites" ? <>
          {invitePage.status === "loading" && !invitePage.invitations.length ? (
            <SkeletonGroup label="Loading invitations" className="ckm-collaboration__state"><SkeletonShape height={164} /><SkeletonShape height={164} /></SkeletonGroup>
          ) : invitePage.status === "error" && !invitePage.invitations.length ? (
            <InlineMessage variant="panel" title="Could not load invitations" onRetry={invitePage.refresh}>{invitePage.error}</InlineMessage>
          ) : !invitePage.invitations.length ? (
            <EmptyState icon="mail" title="No invitations waiting" titleAs="h2" body="Direct invitations sent to your account or email address will appear here." />
          ) : (
            <ul className="ckm-collaboration__list">
              {invitePage.invitations.map((invitation) => (
                <li key={invitation.id} className="ckm-collaboration__card">
                  <div className="ckm-collaboration__card-head">
                    <div>
                      <span>From {invitation.invitedBy?.name || invitation.owner?.name || "a writer"}</span>
                      <strong>{invitation.scriptTitle}</strong>
                    </div>
                    <span className={`ckm-collaboration__status ${invitation.expired ? "is-rejected" : "is-pending"}`}>{invitation.expired ? "Expired" : "Pending"}</span>
                  </div>
                  <p>You were invited as {getCollabRoleLabel(invitation.role)}. {invitation.accessLevel === "content_only" ? "You can work with screenplay content only." : "You will have full project access."}</p>
                  {invitation.expired || !invitation.token ? (
                    <p className="ckm-collaboration__expiry">This link is no longer valid. Ask the project owner to send a new link.</p>
                  ) : (
                    <Button fullWidth pending={actingId === invitation.id} disabled={Boolean(actingId && actingId !== invitation.id)} onClick={() => acceptInvitation(invitation)}>Accept invitation</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {invitePage.error && invitePage.invitations.length ? <InlineMessage>{invitePage.error}</InlineMessage> : null}
          <RequestPager pagination={invitePage.pagination} onPage={(page) => setQuery({ page })} label="Invitation pages" />
        </> : null}

        {query.tab === "activity" ? <>
          {activityPage.status === "loading" && !activityPage.activity.length ? (
            <SkeletonGroup label="Loading collaboration activity" className="ckm-collaboration__state"><SkeletonShape height={112} /><SkeletonShape height={112} /></SkeletonGroup>
          ) : activityPage.status === "error" && !activityPage.activity.length ? (
            <InlineMessage variant="panel" title="Could not load activity" onRetry={activityPage.refresh}>{activityPage.error}</InlineMessage>
          ) : !activityPage.activity.length ? (
            <EmptyState icon="history" title="No collaboration activity yet" titleAs="h2" body="Invitations, access changes, requests, and publishing events from your shared projects will appear here." />
          ) : (
            <ul className="ckm-collaboration__list">
              {activityPage.activity.map((entry) => (
                <li key={entry.id} className="ckm-collaboration__card ckm-collaboration__activity">
                  <div className="ckm-collaboration__activity-copy">
                    <span>{entry.actor?.name || "Unknown user"} {describeCollabActivity(entry)}</span>
                    <strong>{entry.scriptTitle}</strong>
                    <small>{formatCollabTimeAgo(entry.createdAt)}</small>
                  </div>
                  {entry.scriptId ? <Link className="ckm-collaboration__project-link" to={`/create-project/${encodeURIComponent(entry.scriptId)}`}>Open workspace</Link> : null}
                </li>
              ))}
            </ul>
          )}
          {activityPage.error && activityPage.activity.length ? <InlineMessage>{activityPage.error}</InlineMessage> : null}
          <RequestPager pagination={activityPage.pagination} onPage={(page) => setQuery({ page })} label="Activity pages" />
        </> : null}
      </TabPanel>
    </main>,
  );
}

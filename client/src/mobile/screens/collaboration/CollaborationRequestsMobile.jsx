import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  COLLAB_REQUEST_ROLES,
  getCollabErrorMessage,
  getCollabRoleLabel,
  respondToCollabRequest,
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
const TABS = [{ id: "incoming", label: "Incoming" }, { id: "sent", label: "Sent" }];

const getQueryState = (search) => {
  const params = new URLSearchParams(search);
  const tab = params.get("tab") === "sent" ? "sent" : "incoming";
  const page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
  return { tab, page };
};

const RequestPager = ({ pagination, onPage }) => pagination.pages > 1 ? (
  <nav className="ckm-collaboration__pager" aria-label="Collaboration request pages">
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
  const requestPage = useCollabRequestPage({ scope, page: query.page });
  const [actingId, setActingId] = useState("");
  const [choices, setChoices] = useState({});

  const setQuery = (next) => {
    const tab = next.tab || query.tab;
    const page = next.page || 1;
    const params = new URLSearchParams();
    if (tab === "sent") params.set("tab", "sent");
    if (page > 1) params.set("page", String(page));
    navigate(`/collaborations${params.size ? `?${params}` : ""}`);
  };

  useEffect(() => {
    if (!user?.token) return undefined;
    const socket = io(SOCKET_ORIGIN, { auth: { token: user.token } });
    ["collab_request", "collab_request_sent", "collab_request_responded", "collab_membership_changed"]
      .forEach((event) => socket.on(event, requestPage.refresh));
    return () => socket.disconnect();
  }, [requestPage.refresh, user?.token]);

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

  const shell = (children) => (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="collaborations"
      className="ckm-collaboration"
      appBar={<PageHeader title="Collaboration" eyebrow="Writing together" backTo="/dashboard" />}
      bottomNav={<NavBar user={user} />}
      onConnectionRestored={requestPage.refresh}
    >
      {children}
    </MobileShell>
  );

  return shell(
    <main className="ckm-collaboration__page">
      <p className="ckm-collaboration__intro">Review requests for your projects and track the requests you have sent.</p>
      <Tabs tabsId="collaboration-requests" label="Collaboration request type" tabs={TABS} value={query.tab} onChange={(tab) => setQuery({ tab, page: 1 })} fitted />
      <TabPanel tabsId="collaboration-requests" id={query.tab} value={query.tab} className="ckm-collaboration__panel">
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
        <RequestPager pagination={requestPage.pagination} onPage={(page) => setQuery({ page })} />
      </TabPanel>
    </main>,
  );
}

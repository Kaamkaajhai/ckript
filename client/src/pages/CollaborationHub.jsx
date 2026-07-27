import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useDarkMode } from "../context/DarkModeContext";
import useCollabSocket from "../hooks/useCollabSocket";
import InviteModal from "../components/collab/InviteModal";
import CollaborationHubSkeleton from "../components/skeleton/CollaborationHubSkeleton";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { getProfileCanonicalPath } from "../utils/profilePath";
import { getScriptCanonicalPath } from "../utils/scriptPath";
import { getCollabRoleLabel } from "../constants/collabRoles";

const REQUEST_TABS = ["pending", "accepted", "rejected"];
const ACTIVITY_FILTERS = ["all", "invites", "requests", "revisions", "publishing"];
const PR_TABS = ["open", "approved", "rejected"];
const ACCESS_LEVEL_OPTIONS = [
  { value: "full_access", label: "Full Access" },
  { value: "content_only", label: "Content Only" },
];
const getRoleLabel = getCollabRoleLabel;
const getAccessLevelLabel = (value) => (
  value === "content_only" ? "Content Only" : "Full Access"
);
const getCollaboratorUserId = (entry) => String(
  entry?.user?._id
  || entry?.user
  || entry?.userId?._id
  || entry?.userId
  || ""
);
const dedupeCollaborators = (entries = []) => {
  const seen = new Set();
  return (Array.isArray(entries) ? entries : []).filter((entry) => {
    const userId = getCollaboratorUserId(entry);
    const status = String(entry?.status || "");
    const key = `${userId}:${status}`;
    if (!userId || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const timeAgo = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  const delta = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
};

const getInitials = (name = "") =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

const getDisplayName = (person) => String(
  person?.writerProfile?.username
  || person?.username
  || person?.user?.writerProfile?.username
  || person?.user?.username
  || person?.name
  || person?.user?.name
  || "User"
).trim();

const getActivityCategory = (action = "") => {
  const normalized = String(action || "").toLowerCase();
  if (normalized.startsWith("invite_")) return "invites";
  if (normalized.startsWith("request_")) return "requests";
  if (normalized.startsWith("revision_") || normalized.startsWith("comment_")) return "revisions";
  if (normalized === "published" || normalized === "visibility_changed") return "publishing";
  if (normalized.startsWith("pr_")) return "revisions";
  return "all";
};

const describeActivity = (entry) => {
  const actorName = entry?.actorId?.name || "Someone";
  const action = String(entry?.action || "").toLowerCase();
  const metadata = entry?.metadata || {};

  switch (action) {
    case "invite_sent":
      return `${actorName} sent a collaboration invite`;
    case "invite_resent":
      return `${actorName} resent an invite`;
    case "invite_accepted":
      return `${actorName} accepted an invitation`;
    case "request_sent":
      return `${actorName} requested collaboration access`;
    case "request_accepted":
      return `${actorName} accepted a collaboration request`;
    case "request_rejected":
      return `${actorName} rejected a collaboration request`;
    case "revision_submitted":
      return `${actorName} submitted a revision${metadata?.sectionRef ? ` for ${metadata.sectionRef}` : ""}`;
    case "revision_approved":
      return `${actorName} approved a revision${metadata?.sectionRef ? ` for ${metadata.sectionRef}` : ""}`;
    case "revision_rejected":
      return `${actorName} rejected a revision${metadata?.sectionRef ? ` for ${metadata.sectionRef}` : ""}`;
    case "comment_added":
      return `${actorName} added a review comment`;
    case "comment_resolved":
      return `${actorName} resolved a review comment`;
    case "published":
      return `${actorName} published this script`;
    case "visibility_changed":
      return `${actorName} changed visibility to ${metadata?.collabVisibility || "private"}`;
    case "role_changed":
      return `${actorName} updated a collaborator role`;
    case "collaborator_removed":
      return `${actorName} removed a collaborator`;
    case "pr_raised":
      return `${actorName} raised a pull request`;
    case "pr_updated":
      return `${actorName} updated an open pull request`;
    case "pr_approved":
      return `${actorName} approved and merged a pull request`;
    case "pr_reverted":
      return `${actorName} reverted a merged pull request`;
    case "pr_rejected":
      return `${actorName} rejected a pull request`;
    default:
      return `${actorName} ${String(entry?.action || "").replace(/_/g, " ")}`;
  }
};

export default function CollaborationHub() {
  const { scriptId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { isDarkMode } = useDarkMode();
  const resolvedScriptId = String(scriptId || "").trim();

  const [script, setScript] = useState(null);
  const [collabData, setCollabData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [isRoleResolved, setIsRoleResolved] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [requestTab, setRequestTab] = useState("pending");
  const [activityFilter, setActivityFilter] = useState("all");
  const [busyKey, setBusyKey] = useState("");
  const [requestAccessLevels, setRequestAccessLevels] = useState({});
  const collabDataRef = useRef(null);
  const visibilityToggleSeqRef = useRef(0);
  collabDataRef.current = collabData;

  const currentSection = useMemo(() => {
    const parts = location.pathname.split("/collaborate/");
    return parts[1]?.split("/")[0] || "overview";
  }, [location.pathname]);

  const ownerId = String(collabData?.ownerId || "");
  const currentUserId = String(user?._id || user?.id || "");
  const isOwner = Boolean(ownerId && currentUserId && ownerId === currentUserId);
  const acceptedCollaborators = useMemo(
    () => dedupeCollaborators((collabData?.collaborators || []).filter((entry) => entry?.isActive && entry?.status === "accepted")),
    [collabData]
  );
  const pendingInvites = useMemo(
    () => dedupeCollaborators((collabData?.collaborators || []).filter((entry) => entry?.isActive && entry?.status === "pending")),
    [collabData]
  );
  const invitedAcceptedCollaborators = useMemo(
    () => acceptedCollaborators.filter((entry) => getCollaboratorUserId(entry) !== ownerId),
    [acceptedCollaborators, ownerId]
  );
  const currentCollaborator = useMemo(
    () => acceptedCollaborators.find((entry) => String(entry?.user?._id || entry?.userId || "") === currentUserId) || null,
    [acceptedCollaborators, currentUserId]
  );
  const userRole = isOwner ? "full_admin" : String(currentCollaborator?.role || "");
  const canManageCollaborators = userRole === "full_admin";
  const canSeeCollaborators = Boolean(userRole);
  const canSeeRequests = userRole === "full_admin";
  const canLoadRoleScopedData = Boolean(resolvedScriptId && userRole);

  const navItems = useMemo(() => {
    const items = [
      { id: "overview", label: "Overview" },
      ...(canSeeCollaborators ? [{ id: "collaborators", label: "Collaborators" }] : []),
      ...(canSeeRequests ? [{ id: "requests", label: "Requests" }] : []),
      { id: "activity", label: "Activity Log" },
    ];
    return items;
  }, [canSeeCollaborators, canSeeRequests]);

  useEffect(() => {
    if (!resolvedScriptId) return;
    if (location.pathname.endsWith("/collaborate") || location.pathname.endsWith("/collaborate/")) {
      navigate(`/script/${resolvedScriptId}/collaborate/overview`, { replace: true });
    }
  }, [location.pathname, navigate, resolvedScriptId]);

  useEffect(() => {
    if (!canLoadRoleScopedData) return;
    if (!navItems.some((item) => item.id === currentSection)) {
      navigate(`/script/${resolvedScriptId}/collaborate/${navItems[0]?.id || "overview"}`, { replace: true });
    }
  }, [canLoadRoleScopedData, currentSection, navigate, navItems, resolvedScriptId]);

  useEffect(() => {
    let ignore = false;

    const loadRoleContext = async () => {
      try {
        if (!resolvedScriptId) {
          if (!ignore) {
            setPageError("Script not found.");
            setIsRoleResolved(false);
            setLoading(false);
          }
          return;
        }

        setLoading(true);
        setPageError("");
        setIsRoleResolved(false);
        setRequests([]);
        setActivity([]);

        const [scriptRes, collabRes] = await Promise.allSettled([
          api.get(`/scripts/${resolvedScriptId}`),
          api.get(`/collab/${resolvedScriptId}/collaborators`),
        ]);

        if (ignore) return;

        if (scriptRes.status === "fulfilled") {
          setScript(scriptRes.value.data || null);
        }

        if (collabRes.status !== "fulfilled") {
          const status = collabRes.reason?.response?.status;
          if (status === 403) {
            window.alert("403: You are not a collaborator on this script.");
            navigate(`/script/${resolvedScriptId}`, { replace: true });
            return;
          }
          throw collabRes.reason;
        }

        const nextCollabData = collabRes.value.data || null;
        const nextOwnerId = String(nextCollabData?.ownerId || "");
        const nextIsOwner = Boolean(nextOwnerId && currentUserId && nextOwnerId === currentUserId);
        const nextAcceptedCollaborators = dedupeCollaborators(
          (nextCollabData?.collaborators || []).filter((entry) => entry?.isActive && entry?.status === "accepted")
        );
        const nextCurrentCollaborator = nextAcceptedCollaborators.find(
          (entry) => String(entry?.user?._id || entry?.userId || "") === currentUserId
        ) || null;
        const nextUserRole = nextIsOwner ? "full_admin" : String(nextCurrentCollaborator?.role || "");

        if (!nextUserRole) {
          setPageError("Unable to determine your collaboration role.");
          setCollabData(nextCollabData);
          return;
        }

        setCollabData(nextCollabData);
        setIsRoleResolved(true);
      } catch (error) {
        if (ignore) return;
        setPageError(error?.response?.data?.error || "Failed to load collaboration hub.");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadRoleContext();

    return () => {
      ignore = true;
    };
  }, [currentUserId, navigate, resolvedScriptId]);

  useEffect(() => {
    let ignore = false;
    let activityTimer;

    const loadRoleScopedData = async () => {
      if (!canLoadRoleScopedData) return;

      try {
        setLoading(true);
        setPageError("");

        const requestsPromise = canSeeRequests
          ? api.get(`/collab/${resolvedScriptId}/requests`)
          : Promise.resolve({ data: { requests: [] } });

        const [activityRes, requestsRes] = await Promise.allSettled([
          api.get(`/collab/${resolvedScriptId}/activity`),
          requestsPromise,
        ]);

        if (ignore) return;

        setActivity(activityRes.status === "fulfilled" ? activityRes.value.data?.activity || [] : []);
        setRequests(requestsRes.status === "fulfilled" ? requestsRes.value.data?.requests || [] : []);
      } catch (error) {
        if (ignore) return;
        setPageError(error?.response?.data?.error || "Failed to load collaboration hub.");
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadRoleScopedData();
    if (canLoadRoleScopedData) {
      activityTimer = setInterval(async () => {
        try {
          const { data } = await api.get(`/collab/${resolvedScriptId}/activity`);
          if (!ignore) {
            setActivity(data?.activity || []);
          }
        } catch {
          // Keep current activity feed on background refresh failures.
        }
      }, 60000);
    }

    return () => {
      ignore = true;
      if (activityTimer) clearInterval(activityTimer);
    };
  }, [canLoadRoleScopedData, canSeeRequests, resolvedScriptId]);

  const refreshCollaborators = useCallback(async () => {
    if (!resolvedScriptId) return;
    const { data } = await api.get(`/collab/${resolvedScriptId}/collaborators`);
    setCollabData(data);
  }, [resolvedScriptId]);

  const refreshRequests = useCallback(async () => {
    if (!isOwner || !resolvedScriptId) return;
    const { data } = await api.get(`/collab/${resolvedScriptId}/requests`);
    setRequests(data?.requests || []);
  }, [isOwner, resolvedScriptId]);

  const refreshActivity = useCallback(async () => {
    const { data } = await api.get(`/collab/${resolvedScriptId}/activity`);
    setActivity(data?.activity || []);
  }, [resolvedScriptId]);

  const refreshCollabHub = useCallback(async () => {
    await Promise.allSettled([
      refreshCollaborators(),
      refreshRequests(),
      refreshActivity(),
    ]);
  }, [refreshActivity, refreshCollaborators, refreshRequests]);

  const { onlineUsers } = useCollabSocket(
    resolvedScriptId,
    Boolean(canLoadRoleScopedData && !pageError),
    {
      onCollabMembershipChanged: refreshCollabHub,
      onCollabRequest: async () => {
        await Promise.allSettled([refreshRequests(), refreshActivity()]);
      },
      onCollabRequestResponded: async () => {
        await Promise.allSettled([refreshRequests(), refreshActivity(), refreshCollaborators()]);
      },
    }
  );

  const toggleVisibility = useCallback((collabVisibility) => {
    const target = collabVisibility === "open" ? "open" : "private";
    const current = collabDataRef.current;
    if (!current) return;

    const currentEffective = current.collabVisibility === "open" ? "open" : "private";
    if (currentEffective === target) return;

    const previousVisibility = currentEffective;
    const seq = (visibilityToggleSeqRef.current += 1);

    setCollabData((prev) => (prev ? { ...prev, collabVisibility: target } : prev));

    api
      .patch(`/collab/${resolvedScriptId}/visibility`, { collabVisibility: target })
      .then(({ data }) => {
        if (visibilityToggleSeqRef.current !== seq) return;
        const next = data?.collabVisibility === "open" ? "open" : "private";
        setCollabData((prev) => (prev ? { ...prev, collabVisibility: next } : prev));
      })
      .catch((error) => {
        if (visibilityToggleSeqRef.current !== seq) return;
        setCollabData((prev) => (prev ? { ...prev, collabVisibility: previousVisibility } : prev));
        window.alert(error?.response?.data?.error || "Failed to update collaboration visibility.");
      });
  }, [resolvedScriptId]);

  const updateRole = async (userId, role, accessLevel) => {
    const previousCollabData = collabData;
    
    // Optimistic UI update for immediate feedback
    setCollabData((prev) => {
      if (!prev || !prev.collaborators) return prev;
      return {
        ...prev,
        collaborators: prev.collaborators.map((c) => {
          const cId = String(c.user?._id || c.userId || "");
          if (cId === String(userId)) {
            return { ...c, role, accessLevel };
          }
          return c;
        }),
      };
    });

    try {
      setBusyKey(`role:${userId}`);
      await api.patch(`/collab/${scriptId}/collaborators/${userId}/role`, { role, accessLevel });
      await refreshCollaborators();
    } catch (error) {
      setCollabData(previousCollabData);
      window.alert(error?.response?.data?.error || "Failed to update collaborator access.");
    } finally {
      setBusyKey("");
    }
  };

  const removeCollaborator = async (userId) => {
    if (!window.confirm("Remove this collaborator from the script?")) return;
    try {
      setBusyKey(`remove:${userId}`);
      await api.delete(`/collab/${scriptId}/collaborators/${userId}`);
      await refreshCollaborators();
    } catch (error) {
      window.alert(error?.response?.data?.error || "Failed to remove collaborator.");
    } finally {
      setBusyKey("");
    }
  };

  const resendInvite = async (userId) => {
    try {
      setBusyKey(`resend:${userId}`);
      await api.post(`/collab/${scriptId}/collaborators/${userId}/resend-invite`, {});
      await refreshCollaborators();
    } finally {
      setBusyKey("");
    }
  };

  const respondToRequest = async (request, decision) => {
    if (decision === "rejected" && !window.confirm("Reject this collaboration request?")) return;
    const nextStatus = decision === "accepted" ? "accepted" : "rejected";
    const assignedRole = String(request?.requestedRole || "").trim().toLowerCase();
    const assignedAccessLevel = requestAccessLevels[request._id] || "full_access";
    const previousRequests = requests;
    const previousCollabData = collabData;

    setRequests((prev) => prev.map((entry) => (
      entry._id === request._id
        ? {
            ...entry,
            status: nextStatus,
            respondedAt: new Date().toISOString(),
          }
        : entry
    )));

    if (decision === "accepted" && request?.requesterId?._id) {
      setCollabData((prev) => {
        if (!prev) return prev;
        const requesterId = String(request.requesterId._id);
        const existing = Array.isArray(prev.collaborators) ? prev.collaborators : [];
        const alreadyExists = existing.some((entry) => String(entry?.user?._id || entry?.userId || "") === requesterId);
        if (alreadyExists) return prev;

        return {
          ...prev,
          collaborators: [
            ...existing,
            {
              _id: `optimistic-${request._id}`,
              role: assignedRole,
              accessLevel: assignedAccessLevel,
              invitedBy: prev.ownerId || null,
              status: "accepted",
              joinedAt: new Date().toISOString(),
              isActive: true,
              user: {
                _id: request.requesterId._id,
                name: request.requesterId.name || "Unknown",
                email: request.requesterId.email || "",
                profileImage: request.requesterId.profileImage || "",
              },
            },
          ],
        };
      });
    }

    try {
      setBusyKey(`request:${request._id}:${decision}`);
      await api.post(`/collab/${scriptId}/request/${request._id}/respond`, {
        decision,
        accessLevel: requestAccessLevels[request._id] || "full_access",
      });
      await Promise.all([refreshRequests(), refreshCollaborators()]);
    } catch (error) {
      setRequests(previousRequests);
      setCollabData(previousCollabData);
      window.alert(error?.response?.data?.error || "Failed to respond to request.");
    } finally {
      setBusyKey("");
    }
  };


  const filteredRequests = useMemo(
    () => requests.filter((entry) => entry?.status === requestTab),
    [requestTab, requests]
  );

  const visibleActivity = useMemo(() => {
    if (activityFilter === "all") return activity;
    return activity.filter((entry) => getActivityCategory(entry?.action) === activityFilter);
  }, [activity, activityFilter]);

  const recentActivity = activity.slice(0, 5);
  const onlineUserIds = new Set((onlineUsers || []).map((entry) => String(entry?.userId || "")));
  const pendingRequestCount = requests.filter((entry) => entry?.status === "pending").length;
  const roleOverviewLabel = userRole === "full_admin" ? "Admin" : `${String(userRole || "").charAt(0).toUpperCase()}${String(userRole || "").slice(1)}`;
  const currentSectionLabel = navItems.find((item) => item.id === currentSection)?.label || "Overview";
  const currentVisibilityLabel = collabData?.collabVisibility === "open" ? "Open for requests" : "Private workspace";
  const overviewCards = isOwner
    ? [
      { label: "Collaborators", shortLabel: "Collab", value: acceptedCollaborators.length, accent: "from-[#1e3a5f] to-[#2d5a8e]" },
      { label: "Pending Requests", shortLabel: "Pending", value: pendingRequestCount, accent: "from-amber-500 to-orange-500" },
      { label: "Activity items", shortLabel: "Activity", value: activity.length, accent: "from-emerald-500 to-teal-500" },
      {
        label: "Visibility",
        shortLabel: "Visibility",
        value: collabData?.collabVisibility === "open" ? "Open" : "Private",
        accent: "from-violet-500 to-fuchsia-500",
        helper: collabData?.collabVisibility === "open" ? "Requests enabled" : "Invite only",
      },
    ]
    : [
      { label: "Collaborators", shortLabel: "Collab", value: acceptedCollaborators.length, accent: "from-[#1e3a5f] to-[#2d5a8e]" },
      { label: "Pending requests", shortLabel: "Pending", value: pendingRequestCount, accent: "from-amber-500 to-orange-500" },
      { label: "Activity items", shortLabel: "Activity", value: activity.length, accent: "from-emerald-500 to-teal-500" },
      { label: "Your role", shortLabel: "Role", value: roleOverviewLabel, accent: "from-rose-500 to-red-500", helper: "Workspace access" },
    ];


  const renderAvatar = (person, size = "h-10 w-10") => {
    const image = person?.profileImage || person?.user?.profileImage || "";
    const name = getDisplayName(person);

    if (image) {
      return <img src={resolveMediaUrl(image)} alt={name} className={`${size} rounded-full object-cover`} />;
    }

    return (
      <div className={`${size} rounded-full bg-[#1e3a5f] text-white flex items-center justify-center text-xs font-bold`}>
        {getInitials(name)}
      </div>
    );
  };

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (pageError) {
    return (
      <div className="min-h-screen bg-[#eef0f3] flex items-center justify-center px-4">
        <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Collaboration unavailable</h1>
          <p className="mt-3 text-sm text-red-600">{pageError}</p>
          <Link to={getScriptCanonicalPath(script || { _id: resolvedScriptId || scriptId })} className="mt-6 inline-flex rounded-2xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white">
            Back to Script
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !isRoleResolved) {
    return <CollaborationHubSkeleton dark={isDarkMode} />;
  }

  const shellCard = isDarkMode ? "bg-[#0d1520] border-[#1c2a3a]" : "bg-white border-gray-200";
  const softCard = isDarkMode ? "bg-[#101b2b] border-[#1c2a3a] text-white" : "bg-white border-gray-100 text-gray-900";
  const muted = isDarkMode ? "text-[#8da3bc]" : "text-gray-500";
  const titleTone = isDarkMode ? "text-white" : "text-gray-900";
  const surface = isDarkMode ? "bg-[#09111b]" : "bg-[#eef0f3]";
  const scriptDetailPath = getScriptCanonicalPath(script || { _id: resolvedScriptId || scriptId });

  const SectionShell = ({ title, subtitle, action, children }) => (
    <section className={`rounded-3xl border shadow-sm ${shellCard}`}>
      <div className={`flex flex-col gap-3 border-b px-4 py-4 sm:px-5 sm:py-5 sm:flex-row sm:items-center sm:justify-between ${isDarkMode ? "border-[#1c2a3a]" : "border-gray-100"}`}>
        <div>
          <h2 className={`text-xl font-bold tracking-tight ${titleTone}`}>{title}</h2>
          {subtitle ? <p className={`mt-1 text-sm ${muted}`}>{subtitle}</p> : null}
        </div>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );

  return (
    <div className={`min-h-screen ${surface} pb-28 sm:pb-24 lg:pb-8`}>
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:gap-6 lg:px-8">
        <aside className={`hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col lg:rounded-3xl lg:border lg:p-5 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] ${shellCard}`}>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
            {script?.coverImage ? (
              <img src={resolveMediaUrl(script.coverImage)} alt={script?.title || "Script cover"} className="h-36 w-full object-cover" />
            ) : (
              <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] text-white">
                <span className="text-sm font-bold tracking-[0.25em]">CKRIPT</span>
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>Collaboration Hub</p>
            <h1 className={`mt-2 text-2xl font-bold leading-tight ${titleTone}`}>{script?.title || "Untitled Script"}</h1>
          </div>

          <nav className="mt-6 space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.id}
                to={`/script/${scriptId}/collaborate/${item.id}`}
                className={({ isActive }) => `flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#1e3a5f] text-white shadow-sm"
                    : isDarkMode
                      ? "text-[#9db3cc] hover:bg-[#101b2b] hover:text-white"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto pt-5">
            <Link
              to={scriptDetailPath}
              className={`flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold ${
                isDarkMode ? "border-[#1c2a3a] text-white hover:bg-[#101b2b]" : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Back to Script
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-4 sm:space-y-5">
          <section className={`rounded-3xl border p-4 shadow-sm lg:hidden ${shellCard}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${muted}`}>Collaboration Hub</p>
                <h1 className={`mt-2 text-xl font-bold leading-tight sm:text-2xl ${titleTone}`}>{script?.title || "Untitled Script"}</h1>
                <p className={`mt-1 text-sm ${muted}`}>{currentSectionLabel}</p>
              </div>
              <Link
                to={scriptDetailPath}
                className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2.5 text-sm font-semibold ${
                  isDarkMode ? "border-[#1c2a3a] text-white hover:bg-[#101b2b]" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                Back to Script
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-white/[0.06] text-[#c6d4e3]" : "border border-gray-200 bg-white text-gray-700"}`}>
                {roleOverviewLabel}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-white/[0.06] text-[#c6d4e3]" : "border border-gray-200 bg-white text-gray-700"}`}>
                {currentVisibilityLabel}
              </span>
            </div>
          </section>


          {currentSection === "overview" && (
            <>
              <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((card) => (
                  <div key={card.label} className={`flex min-h-[136px] flex-col rounded-3xl border p-4 shadow-sm sm:min-h-[152px] sm:p-5 ${softCard}`}>
                    <div
                      className={`inline-flex max-w-full min-w-0 self-start overflow-hidden rounded-2xl bg-gradient-to-r px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white min-[360px]:text-[10px] sm:px-3 sm:text-[11px] sm:tracking-[0.14em] ${card.accent}`}
                      title={card.label}
                    >
                      <span className="min-w-0 truncate">{card.shortLabel || card.label}</span>
                    </div>
                    <p
                      className={`mt-4 max-w-full truncate whitespace-nowrap text-[clamp(1.9rem,3vw,2.5rem)] font-extrabold leading-none ${titleTone}`}
                      title={String(card.value)}
                    >
                      {card.value}
                    </p>
                    {card.helper ? (
                      <p className={`mt-2 text-xs font-medium ${muted}`}>{card.helper}</p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <SectionShell title="Recent Activity" subtitle="Last 5 actions across this script">
                  <div className="space-y-3">
                    {recentActivity.length > 0 ? recentActivity.map((entry) => (
                      <div key={entry._id} className={`flex items-start gap-3 rounded-2xl border p-4 ${isDarkMode ? "border-[#1c2a3a] bg-[#101b2b]" : "border-gray-100 bg-gray-50/50"}`}>
                        {renderAvatar(entry.actorId)}
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${titleTone}`}>{describeActivity(entry)}</p>
                          <p className={`mt-1 text-xs ${muted}`}>{timeAgo(entry.createdAt)}</p>
                        </div>
                      </div>
                    )) : (
                      <p className={`text-sm ${muted}`}>No activity yet.</p>
                    )}
                  </div>
                </SectionShell>

                <SectionShell title="Currently Online" subtitle="People active on this script right now">
                  {onlineUsers.length > 0 ? (
                    <div className="space-y-3">
                      {onlineUsers.map((person) => (
                        <div key={person.userId} className={`flex items-center gap-3 rounded-2xl border p-4 ${isDarkMode ? "border-[#1c2a3a] bg-[#101b2b]" : "border-gray-100 bg-gray-50/50"}`}>
                          {renderAvatar(person)}
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${titleTone}`}>{getDisplayName(person)}</p>
                            <p className={`text-xs ${muted}`}>{String(person.role || "collaborator").replace(/^\w/, (m) => m.toUpperCase())}</p>
                          </div>
                          <span className="ml-auto inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={`text-sm ${muted}`}>Nobody else is active on this script right now.</p>
                  )}
                </SectionShell>
              </div>
            </>
          )}

          {currentSection === "collaborators" && canSeeCollaborators && (
            <SectionShell
              title="Collaborators"
              subtitle={
                canManageCollaborators
                  ? "Manage invites, roles, and workspace visibility"
                  : "Everyone who can work on this script."
              }
              action={canManageCollaborators ? (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="w-full rounded-2xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"
                >
                  Invite Someone
                </button>
              ) : undefined}
            >
              {canManageCollaborators ? (
                <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${titleTone}`}>{invitedAcceptedCollaborators.length} collaborators</p>
                    <p className={`mt-1 text-sm ${muted}`}>Choose how new contributors can join this project.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["private", "open"].map((visibility) => (
                      <button
                        key={visibility}
                        type="button"
                        onClick={() => toggleVisibility(visibility)}
                        className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                          (collabData?.collabVisibility === "open" ? "open" : "private") === visibility
                            ? "bg-[#1e3a5f] text-white"
                            : isDarkMode
                              ? "bg-[#101b2b] text-[#9db3cc]"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {visibility === "private" ? "🔒 Private" : "🌐 Open for Collaboration"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {script?.creator && typeof script.creator === "object" && script.creator._id ? (
                  <div className={`flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center ${isDarkMode ? "border-[#1c2a3a] bg-[#101b2b]" : "border-gray-100 bg-gray-50/50"}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      {renderAvatar(script.creator)}
                      <div className="min-w-0">
                        <p className={`truncate text-sm font-semibold ${titleTone}`}>{script.creator.name || "Script owner"}</p>
                        <p className={`truncate text-xs ${muted}`}>{script.creator.email || "Owner"}</p>
                      </div>
                    </div>
                    <div className="flex w-full flex-1 flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-white/[0.06] text-[#c6d4e3]" : "bg-white text-gray-700 border border-gray-200"}`}>
                        Owner
                      </span>
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${onlineUserIds.has(String(script.creator._id)) ? "bg-emerald-50 text-emerald-700" : isDarkMode ? "bg-white/[0.06] text-[#8da3bc]" : "bg-gray-100 text-gray-600"}`}>
                        <span className={`h-2 w-2 rounded-full ${onlineUserIds.has(String(script.creator._id)) ? "bg-emerald-500" : "bg-gray-400"}`} />
                        {onlineUserIds.has(String(script.creator._id)) ? "Active" : "Offline"}
                      </span>
                    </div>
                  </div>
                ) : null}

                {invitedAcceptedCollaborators.map((entry) => {
                  const person = entry?.user || {};
                  const personId = getCollaboratorUserId(entry);
                  const isOnline = onlineUserIds.has(personId);

                  return (
                    <div key={entry._id} className={`flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center ${isDarkMode ? "border-[#1c2a3a] bg-[#101b2b]" : "border-gray-100 bg-gray-50/50"}`}>
                      <div className="flex min-w-0 items-center gap-3">
                        {renderAvatar(person)}
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-semibold ${titleTone}`}>{person?.name || "Unknown user"}</p>
                          <p className={`truncate text-xs ${muted}`}>{person?.email || "No email"}</p>
                        </div>
                      </div>
                      <div className="flex w-full flex-1 flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-white/[0.06] text-[#c6d4e3]" : "bg-white text-gray-700 border border-gray-200"}`}>
                          {entry.role}
                        </span>
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${isOnline ? "bg-emerald-50 text-emerald-700" : isDarkMode ? "bg-white/[0.06] text-[#8da3bc]" : "bg-gray-100 text-gray-600"}`}>
                          <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-gray-400"}`} />
                          {isOnline ? "Active" : "Offline"}
                        </span>
                        {canManageCollaborators ? (
                          <>
                            <select
                              value={entry.accessLevel || "full_access"}
                              disabled={busyKey === `role:${personId}`}
                              onChange={(event) => updateRole(personId, entry.role, event.target.value)}
                              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 sm:w-auto"
                            >
                              {ACCESS_LEVEL_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={busyKey === `remove:${personId}`}
                              onClick={() => removeCollaborator(personId)}
                              className="w-full rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 sm:w-auto"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <span className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 sm:w-auto">
                            {getAccessLevelLabel(entry.accessLevel)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {invitedAcceptedCollaborators.length === 0 && !(script?.creator && typeof script.creator === "object" && script.creator._id) ? (
                  <p className={`text-sm ${muted}`}>No collaborators yet.</p>
                ) : null}
              </div>

              {canManageCollaborators ? (
                <div className="mt-8">
                  <h3 className={`text-sm font-bold uppercase tracking-[0.2em] ${muted}`}>Pending Invites</h3>
                  <div className="mt-3 space-y-3">
                    {pendingInvites.length > 0 ? pendingInvites.map((entry) => {
                      const person = entry?.user || {};
                      const personId = getCollaboratorUserId(entry);

                      return (
                        <div key={entry._id} className={`flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center ${isDarkMode ? "border-[#1c2a3a] bg-[#101b2b]" : "border-amber-100 bg-amber-50/60"}`}>
                          <div className="flex min-w-0 items-center gap-3">
                            {renderAvatar(person)}
                            <div className="min-w-0">
                              <p className={`truncate text-sm font-semibold ${titleTone}`}>{person?.name || person?.email || "Pending invite"}</p>
                              <p className={`truncate text-xs ${muted}`}>{person?.email || "No email"}</p>
                            </div>
                          </div>
                          <div className="flex w-full flex-1 flex-wrap items-center gap-3 lg:w-auto lg:justify-end">
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">Pending</span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isDarkMode ? "bg-white/[0.06] text-[#c6d4e3]" : "bg-white text-gray-700 border border-gray-200"}`}>
                              {entry.role}
                            </span>
                            <span className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 sm:w-auto">
                              {getAccessLevelLabel(entry.accessLevel)}
                            </span>
                            <button
                              type="button"
                              disabled={busyKey === `resend:${personId}`}
                              onClick={() => resendInvite(personId)}
                              className="w-full rounded-2xl bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white sm:w-auto"
                            >
                              Resend Invite
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className={`text-sm ${muted}`}>No pending invites right now.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </SectionShell>
          )}

          {currentSection === "requests" && canSeeRequests && (
            <SectionShell title="Requests" subtitle="Review who wants to collaborate on this script">
              <div className="mb-5 flex flex-wrap gap-2">
                {REQUEST_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setRequestTab(tab)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                      requestTab === tab
                        ? "bg-[#1e3a5f] text-white"
                        : isDarkMode
                          ? "bg-[#101b2b] text-[#9db3cc]"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {tab.replace(/^\w/, (m) => m.toUpperCase())}
                  </button>
                ))}
              </div>

              {filteredRequests.length === 0 ? (
                <div className={`rounded-3xl border px-6 py-12 text-center ${isDarkMode ? "border-[#1c2a3a] bg-[#101b2b]" : "border-gray-100 bg-gray-50/50"}`}>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] text-white">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2a3 3 0 00-.356-1.429M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.496.122-.964.338-1.375M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className={`text-lg font-semibold ${titleTone}`}>No collaboration requests yet.</p>
                  <p className={`mt-2 text-sm ${muted}`}>
                    Turn on Open Collaboration to let writers request access.
                  </p>
                  <button
                    type="button"
                    onClick={() => toggleVisibility("open")}
                    className="mt-5 rounded-2xl bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Toggle Open for Collaboration
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRequests.map((request) => (
                    <div key={request._id} className={`rounded-3xl border p-5 ${isDarkMode ? "border-[#1c2a3a] bg-[#101b2b]" : "border-gray-100 bg-gray-50/50"}`}>
                      <div className="flex items-start gap-3">
                        {renderAvatar(request.requesterId)}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className={`text-base font-semibold ${titleTone}`}>{request.requesterId?.name || "Unknown"}</p>
                              <p className={`text-sm ${muted}`}>Wants to join as: {getRoleLabel(request.requestedRole)}</p>
                            </div>
                            <p className={`text-xs ${muted}`}>{timeAgo(request.createdAt)}</p>
                          </div>
                          {request.message ? <p className={`mt-3 text-sm leading-relaxed ${muted}`}>"{request.message}"</p> : null}
                          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            <Link
                              to={getProfileCanonicalPath(request.requesterId)}
                              className={`inline-flex w-full items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold sm:w-auto ${isDarkMode ? "border-[#1c2a3a] text-white" : "border-gray-200 text-gray-700"}`}
                            >
                              View Profile
                            </Link>
                            {request.status === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busyKey === `request:${request._id}:rejected`}
                                  onClick={() => respondToRequest(request, "rejected")}
                                  className="w-full rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 sm:w-auto"
                                >
                                  Reject
                                </button>
                                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                  <select
                                    value={requestAccessLevels[request._id] || "full_access"}
                                    onChange={(event) => setRequestAccessLevels((prev) => ({
                                      ...prev,
                                      [request._id]: event.target.value,
                                    }))}
                                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 sm:w-auto"
                                  >
                                    {ACCESS_LEVEL_OPTIONS.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    disabled={busyKey === `request:${request._id}:accepted`}
                                    onClick={() => respondToRequest(request, "accepted")}
                                    className="w-full rounded-2xl bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white sm:w-auto"
                                  >
                                    Accept
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${request.status === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                  {request.status}
                                </span>
                                {request.status === "accepted" ? (
                                  <span className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                                    {getAccessLevelLabel(
                                      acceptedCollaborators.find((entry) => getCollaboratorUserId(entry) === String(request.requesterId?._id || ""))?.accessLevel
                                    )}
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionShell>
          )}


          {currentSection === "activity" && (
            <SectionShell title="Activity Log" subtitle="Everything that happened on this script">
              <div className="mb-5 flex flex-wrap gap-2">
                {ACTIVITY_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActivityFilter(filter)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-semibold ${
                      activityFilter === filter
                        ? "bg-[#1e3a5f] text-white"
                        : isDarkMode
                          ? "bg-[#101b2b] text-[#9db3cc]"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {filter === "all" ? "All" : filter.replace(/^\w/, (m) => m.toUpperCase())}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {visibleActivity.length > 0 ? visibleActivity.map((entry) => (
                  <div key={entry._id} className={`flex items-start gap-3 rounded-2xl border p-4 ${isDarkMode ? "border-[#1c2a3a] bg-[#101b2b]" : "border-gray-100 bg-gray-50/50"}`}>
                    {renderAvatar(entry.actorId)}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <p className={`text-sm font-semibold ${titleTone}`}>{describeActivity(entry)}</p>
                        <p className={`text-xs ${muted}`}>{timeAgo(entry.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className={`text-sm ${muted}`}>No activity found for this filter.</p>
                )}
              </div>
            </SectionShell>
          )}
        </main>
      </div>

      <div className={`fixed inset-x-0 bottom-0 z-40 border-t px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] lg:hidden ${isDarkMode ? "border-[#1c2a3a] bg-[#09111b]" : "border-gray-200 bg-white/95 backdrop-blur"}`}>
        <div className="flex items-center justify-start gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              to={`/script/${scriptId}/collaborate/${item.id}`}
              className={({ isActive }) => `min-w-fit whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold ${
                isActive ? "bg-[#1e3a5f] text-white" : isDarkMode ? "text-[#9db3cc]" : "text-gray-700"
              }`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      {showInviteModal && canManageCollaborators ? (
        <InviteModal
          scriptId={scriptId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={async () => {
            await refreshCollaborators();
            setShowInviteModal(false);
          }}
        />
      ) : null}

    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppBar, { AppBarAction, AppBarAvatar } from "../components/app-bars/AppBar";
import SectionTabs from "../components/SectionTabs";
import NavBar from "../components/navigation/NavBar";
import InlineMessage from "../components/feedback/InlineMessage";
import MobileShell from "../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";
import { MobileRoutePending } from "../shell/MobileRouteBoundary";
import { useToast } from "../components/feedback/toastContext";
import useShellNotifications from "../../layouts/app-shell/hooks/useShellNotifications";
import { getProfileCanonicalPath } from "../../utils/profilePath";
import OverviewSection from "./sections/OverviewSection";
import PerformanceSection from "./sections/PerformanceSection";
import ReviewsSection from "./sections/ReviewsSection";
import ProjectsSection from "./sections/ProjectsSection";
import AiDetailSheet from "./overlays/AiDetailSheet";
import AllProjectsSheet from "./overlays/AllProjectsSheet";
import NotificationsPanel from "./overlays/NotificationsPanel";
import AccountMenu from "./overlays/AccountMenu";
import { shareProject } from "../data/shareProject";
import "./Dashboard.css";
import { useDashboardData } from "../hooks/useDashboardData";

const CREATE_HREF = "/create-project";
const UPLOAD_HREF = "/upload";

/*
 * Dashboard — the writer's home screen.
 *
 * NAVIGATION IS REAL (2026-08-07, plan §8.2). The app bar and tab bar come from
 * `AppBar`/`NavBar`, which read the viewer's audience preset and take the
 * current tab from the URL. Their destinations are ordinary links, so tapping
 * Messages goes to /messages — where the route policy (§5.1) deliberately
 * serves the existing responsive desktop page until that screen is built.
 *
 * THE CONTENT IS REAL TOO (2026-08-07, plan §11 Phase 2). Every
 * `island.desktopOnly(feature)` call in this family is gone, which is Phase 2's
 * exit gate, and with it the last production caller of `DynamicIsland`:
 *
 *   Create / Upload / Edit profile   → the routes desktop links to
 *   Open project / Top scripts /     → getScriptCanonicalPath(script)
 *     All projects / Collaborations
 *   Account menu items               → /contact, /terms, /privacy, the profile
 *   Filters                          → a real ckm-segmented status filter
 *   Sharing                          → the Web Share API, clipboard fallback
 *
 * The notification bell reads `useShellNotifications` — the desktop shell's own
 * hook — instead of the three hardcoded rows it used to show every account.
 */
export default function Dashboard({ initials, userName, onLogout, user, preview = false }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [tab, setTab] = useState("overview");
  const [aiReview, setAiReview] = useState(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  /*
   * Focus must come back to the control that opened an overlay, and these are
   * the four controls. Passing the element rather than relying on the trap's
   * fallback matters here because the bell and the avatar live in the app bar,
   * which is `inert` while the overlay is open.
   */
  const bellRef = useRef(null);
  const avatarRef = useRef(null);

  const { data, loading, error, refresh } = useDashboardData(user, { preview });

  /*
   * The same notification session the desktop shell runs: polling, socket,
   * unread count, mark-read, delete, follow-request decisions. Preview mode
   * has no authenticated user, so the hook simply reports zero.
   */
  const notifications = useShellNotifications({ user: preview ? null : user, navigate });

  const profileHref = getProfileCanonicalPath(user, { viewerId: user?._id, viewerRole: user?.role });

  const onShare = useCallback(async (project) => {
    const outcome = await shareProject(project);
    // "shared" already showed the OS sheet's own confirmation and "dismissed"
    // is the user's own choice — neither is news.
    if (outcome === "shared" || outcome === "dismissed") return;
    if (outcome === "copied") toast.success("Link copied", project.title);
    else toast.error("Could not share this project", "Copy the link from the project page instead.");
  }, [toast]);

  const openNotifications = () => {
    setShowNotifications(true);
    // Opening the bell is itself an acknowledgement — the desktop rule.
    notifications.acknowledgeAll();
  };

  if (loading || (!data && !error)) {
    return (
      <MobileShell
        mode={MOBILE_SHELL_MODE.STANDARD}
        screenId="dashboard"
        className="ckm-dashboard"
        scrollClassName="ckm-dashboard__scroll"
      >
        <MobileRoutePending />
      </MobileShell>
    );
  }

  return (
    <MobileShell
      mode={MOBILE_SHELL_MODE.STANDARD}
      screenId="dashboard"
      className="ckm-dashboard"
      scrollClassName="ckm-dashboard__scroll"
      appBar={(
        <>
          <AppBar
            user={user}
            actions={(
              <>
                <AppBarAction
                  ref={bellRef}
                  glyph="notifications"
                  label="Notifications"
                  badge={notifications.unreadCount}
                  active={showNotifications}
                  aria-haspopup="dialog"
                  aria-expanded={showNotifications}
                  onClick={openNotifications}
                />
                <AppBarAvatar
                  ref={avatarRef}
                  initials={initials}
                  active={showAccount}
                  onClick={() => setShowAccount(true)}
                />
              </>
            )}
          />

          <SectionTabs active={tab} onChange={(newTab) => {
            if (newTab === "challenge") {
              navigate("/challenge/c/the-final-draft");
            } else {
              setTab(newTab);
            }
          }} />
        </>
      )}
      bottomNav={<NavBar user={user} />}
      overlays={(
        <>
          <AiDetailSheet review={aiReview} open={!!aiReview} onClose={() => setAiReview(null)} />
          <AllProjectsSheet
            open={showAllProjects}
            onClose={() => setShowAllProjects(false)}
            allProjects={data?.allProjects || []}
          />
          <NotificationsPanel
            open={showNotifications}
            onClose={() => setShowNotifications(false)}
            items={notifications.notifications}
            unreadCount={notifications.unreadCount}
            onMarkAllRead={notifications.markAllRead}
            onOpen={(n) => { setShowNotifications(false); notifications.openNotification(n); }}
            onDelete={notifications.deleteNotification}
            onDecide={notifications.decideFollowRequest}
            returnFocusTo={bellRef}
          />
          <AccountMenu
            open={showAccount}
            userName={userName}
            profileHref={profileHref}
            onClose={() => setShowAccount(false)}
            onLogout={onLogout}
            returnFocusTo={avatarRef}
          />
        </>
      )}
    >
      <div className="ckm-dashboard__page">
        {/*
         * A failed load used to leave the pending skeleton on screen forever:
         * `data` stayed null, `loading` went false, and nothing said so. The
         * condition is still true while it is on screen, so it is an
         * InlineMessage and not a toast — and it carries the retry.
         */}
        {error && (
          <InlineMessage
            variant={data ? "inline" : "panel"}
            tone="error"
            title={data ? "Some of this may be out of date" : "We could not load your dashboard"}
            onRetry={refresh}
          >
            {data
              ? "The last refresh failed, so these numbers are the ones we loaded earlier."
              : "Check your connection and try again."}
          </InlineMessage>
        )}

        {data && tab === "overview" && (
          <OverviewSection
            createHref={CREATE_HREF}
            uploadHref={UPLOAD_HREF}
            profileHref={profileHref}
            onFullAnalytics={() => setTab("performance")}
            data={data.overview}
          />
        )}
        {data && tab === "performance" && <PerformanceSection data={data.performance} />}
        {data && tab === "reviews" && (
          <ReviewsSection
            onOpenAiDetail={setAiReview}
            aiReviews={data.aiReviews}
            platformReviews={data.platformReviews}
          />
        )}
        {data && tab === "projects" && (
          <ProjectsSection
            onViewAll={() => setShowAllProjects(true)}
            onShare={onShare}
            createHref={CREATE_HREF}
            uploadHref={UPLOAD_HREF}
            data={data.projects}
          />
        )}
      </div>
    </MobileShell>
  );
}

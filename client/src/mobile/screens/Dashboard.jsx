import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppBar, { AppBarAction, AppBarAvatar } from "../components/app-bars/AppBar";
import SectionTabs from "../components/SectionTabs";
import NavBar from "../components/navigation/NavBar";
import MobileShell from "../shell/MobileShell";
import { MOBILE_SHELL_MODE } from "../shell/mobileShellModes";
import { MobileRoutePending } from "../shell/MobileRouteBoundary";
import { useDynamicIsland } from "../context/dynamicIsland";
import OverviewSection from "./sections/OverviewSection";
import PerformanceSection from "./sections/PerformanceSection";
import ReviewsSection from "./sections/ReviewsSection";
import ProjectsSection from "./sections/ProjectsSection";
import AiDetailSheet from "./overlays/AiDetailSheet";
import AllProjectsSheet from "./overlays/AllProjectsSheet";
import NotificationsPanel from "./overlays/NotificationsPanel";
import AccountMenu from "./overlays/AccountMenu";
import { NOTIFICATIONS } from "../data/dashboardData";
import "./Dashboard.css";
import { useDashboardData } from "../hooks/useDashboardData";

/*
 * Dashboard — the only fully-built mobile screen. Owns the active section,
 * every overlay's open state and the notifications model (so the bell badge
 * stays truthful).
 *
 * NAVIGATION IS REAL (2026-08-07, plan §8.2). The app bar and tab bar now come
 * from `AppBar`/`NavBar`, which read the viewer's audience preset and take the
 * current tab from the URL. Their destinations are ordinary links, so tapping
 * Messages goes to /messages — where the route policy (§5.1) deliberately
 * serves the existing responsive desktop page until that screen is built. That
 * is the sanctioned migration fallback, and it is a better answer than the
 * "use desktop" hint it replaces, which was a dead end on a real destination.
 *
 * What is still funnelled to the Dynamic Island is the in-page work that has no
 * route of its own yet — filters, sharing, opening a project, collaborations.
 * Phase 2 removes those.
 */
export default function Dashboard({ initials, userName, onLogout, user, preview = false }) {
  const island = useDynamicIsland();
  const navigate = useNavigate();

  const [tab, setTab] = useState("overview");
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [aiReview, setAiReview] = useState(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const { data, loading } = useDashboardData(user, { preview });

  const unread = notifications.filter((n) => n.unread).length;
  const desktopOnly = (feature) => island.desktopOnly(feature);

  if (loading || !data) {
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
                  glyph="notifications"
                  label="Notifications"
                  badge={unread}
                  active={showNotifications}
                  onClick={() => setShowNotifications(true)}
                />
                <AppBarAvatar
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
            onOpenProject={() => desktopOnly("Project pages")}
            allProjects={data.allProjects}
          />
          <NotificationsPanel
            open={showNotifications}
            onClose={() => setShowNotifications(false)}
            items={notifications}
            onMarkAllRead={() => setNotifications((list) => list.map((n) => ({ ...n, unread: false })))}
          />
          <AccountMenu
            open={showAccount}
            userName={userName}
            onClose={() => setShowAccount(false)}
            onSelect={(m) => desktopOnly(m.label)}
            onLogout={onLogout}
          />
        </>
      )}
    >
      <div className="ckm-dashboard__page">
        {tab === "overview" && (
          <OverviewSection
            onCreate={() => desktopOnly("Create")}
            onUpload={() => desktopOnly("Upload")}
            onEditProfile={() => desktopOnly("Edit profile")}
            onFullAnalytics={() => setTab("performance")}
            data={data.overview}
          />
        )}
        {tab === "performance" && <PerformanceSection onDetail={() => desktopOnly("Details")} data={data.performance} />}
        {tab === "reviews" && <ReviewsSection onOpenAiDetail={setAiReview} aiReviews={data.aiReviews} platformReviews={data.platformReviews} />}
        {tab === "projects" && (
          <ProjectsSection
            onViewAll={() => setShowAllProjects(true)}
            onFilter={() => desktopOnly("Filters")}
            onOpenProject={() => desktopOnly("Project pages")}
            onShare={() => desktopOnly("Sharing")}
            onOpenCollab={() => desktopOnly("Collaborations")}
            data={data.projects}
          />
        )}
      </div>
    </MobileShell>
  );
}

import { useState } from "react";
import TopBar from "../components/TopBar";
import SectionTabs from "../components/SectionTabs";
import BottomNav from "../components/BottomNav";
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

/*
 * Dashboard — the only fully-built mobile screen. Owns the active section,
 * every overlay's open state and the notifications model (so the bell badge
 * stays truthful). Anything not yet built on mobile — search, create, upload,
 * opening a project, the other bottom-nav tabs — is funnelled to the Dynamic
 * Island as a "use desktop" hint, so there are no dead ends.
 */
export default function Dashboard({ time, initials, userName, onLogout }) {
  const island = useDynamicIsland();

  const [tab, setTab] = useState("overview");
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [aiReview, setAiReview] = useState(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccount, setShowAccount] = useState(false);

  const unread = notifications.filter((n) => n.unread).length;
  const desktopOnly = (feature) => island.desktopOnly(feature);

  return (
    <div className="ckm-dash">
      <TopBar
        initials={initials}
        unread={unread}
        avatarActive={showAccount}
        onSearch={() => desktopOnly("Search")}
        onBell={() => setShowNotifications(true)}
        onAvatar={() => setShowAccount(true)}
      />

      <SectionTabs active={tab} onChange={setTab} />

      <main className="ckm-dash__scroll ckm-scroll">
        <div className="ckm-dash__page">
          {tab === "overview" && (
            <OverviewSection
              onCreate={() => desktopOnly("Create")}
              onUpload={() => desktopOnly("Upload")}
              onEditProfile={() => desktopOnly("Edit profile")}
              onFullAnalytics={() => setTab("performance")}
            />
          )}
          {tab === "performance" && <PerformanceSection onDetail={() => desktopOnly("Details")} />}
          {tab === "reviews" && <ReviewsSection onOpenAiDetail={setAiReview} />}
          {tab === "projects" && (
            <ProjectsSection
              onViewAll={() => setShowAllProjects(true)}
              onFilter={() => desktopOnly("Filters")}
              onOpenProject={() => desktopOnly("Project pages")}
              onShare={() => desktopOnly("Sharing")}
              onOpenCollab={() => desktopOnly("Collaborations")}
            />
          )}
        </div>
      </main>

      <BottomNav
        active="dashboard"
        onSelect={(item) => {
          if (!item.implemented) desktopOnly(item.label);
        }}
      />

      {/* Overlays */}
      <AiDetailSheet review={aiReview} open={!!aiReview} onClose={() => setAiReview(null)} />
      <AllProjectsSheet
        open={showAllProjects}
        onClose={() => setShowAllProjects(false)}
        onOpenProject={() => desktopOnly("Project pages")}
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
    </div>
  );
}

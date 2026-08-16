import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import MobileRouteBoundary from "../shell/MobileRouteBoundary";

const Dashboard = lazy(() => import("../screens/Dashboard"));
const Holds = lazy(() => import("../screens/Holds"));
const NewProject = lazy(() => import("../screens/NewProject"));
const CreateProjectRoute = lazy(() => import("../screens/create/CreateProjectRoute"));
const UploadRoute = lazy(() => import("../screens/upload/UploadRoute"));
const SearchMobile = lazy(() => import("../screens/discovery/SearchMobile"));
const TopScriptsMobile = lazy(() => import("../screens/discovery/TopScriptsMobile"));
const FeaturedProjectsMobile = lazy(() => import("../screens/discovery/FeaturedProjectsMobile"));
const ProjectDetailMobile = lazy(() => import("../screens/projects/project-detail/ProjectDetailMobile"));
const PrimitiveGallery = lazy(() => import("../dev/PrimitiveGallery"));
const CreateHarness = lazy(() => import("../dev/CreateHarness"));
const UploadHarness = lazy(() => import("../dev/UploadHarness"));
const SearchHarness = lazy(() => import("../dev/SearchHarness"));
const TopScriptsHarness = lazy(() => import("../dev/TopScriptsHarness"));
const FeaturedHarness = lazy(() => import("../dev/FeaturedHarness"));
const ProjectDetailHarness = lazy(() => import("../dev/ProjectDetailHarness"));

/*
 * MobileRoutes lives inside the app's one existing BrowserRouter. Canonical
 * URLs select mobile screens exactly as they select desktop pages, so refresh,
 * deep links and browser history remain truthful. RootExperience only mounts
 * MobileApp for routes that the policy marks implemented.
 *
 * Every screen mounts through MobileRouteBoundary: one route-level pending
 * state while its chunk loads, and one recoverable failure surface if it
 * throws — a broken screen never blanks the app or leaks into the next URL.
 */
export default function MobileRoutes({
  time,
  initials,
  userName,
  onLogout,
  user,
  preview = false,
  devScreen = null,
}) {
  const dashboard = (
    <Dashboard
      time={time}
      initials={initials}
      userName={userName}
      onLogout={onLogout}
      user={user}
      preview={preview}
    />
  );

  // App.jsx's development-only routes already own their exact path, so a
  // nested <Routes> below them would never match. Render the requested dev
  // surface directly instead — production never reaches this branch.
  if (devScreen === "primitives") {
    return <MobileRouteBoundary><PrimitiveGallery /></MobileRouteBoundary>;
  }

  // The create-project chrome over a deterministic fixture. /create-project is
  // a real route now, but it authenticates, fetches drafts and autosaves, so it
  // renders a different screen on every run — this is where the real chrome,
  // the real CSS and the real CodeMirror meet a real browser in a state a sweep
  // can measure twice. See mobile/dev/CreateHarness.jsx.
  if (devScreen === "create") {
    return <MobileRouteBoundary><CreateHarness /></MobileRouteBoundary>;
  }

  // The upload flow over a deterministic view model. The live route
  // authenticates, fetches the plan limit, extracts a PDF and uploads media, so
  // it renders a different screen on every run — this is where the real chrome
  // and the real CSS meet a real browser in a state a sweep can measure twice.
  // See mobile/dev/UploadHarness.jsx.
  if (devScreen === "upload") {
    return <MobileRouteBoundary><UploadHarness /></MobileRouteBoundary>;
  }

  if (devScreen === "search") {
    return <MobileRouteBoundary><SearchHarness user={user} /></MobileRouteBoundary>;
  }

  if (devScreen === "top-scripts") {
    return <MobileRouteBoundary><TopScriptsHarness user={user} /></MobileRouteBoundary>;
  }

  if (devScreen === "featured") {
    return <MobileRouteBoundary><FeaturedHarness user={user} /></MobileRouteBoundary>;
  }

  if (devScreen === "project-detail") {
    return <MobileRouteBoundary><ProjectDetailHarness user={user} /></MobileRouteBoundary>;
  }

  if (preview) {
    return <MobileRouteBoundary>{dashboard}</MobileRouteBoundary>;
  }

  return (
    <MobileRouteBoundary>
      <Routes>
        <Route path="/dashboard" element={dashboard} />
        {/* /ai-tools is the dashboard, because on desktop it is literally the
            same element (App.jsx mounts <DashboardRoute /> at both). Without
            this line a mobile writer got the desktop dashboard at one alias and
            the mobile one at the other. See the manifest note. */}
        <Route path="/ai-tools" element={dashboard} />
        <Route path="/offer-holds" element={<Holds user={user} />} />
        <Route path="/new-project" element={<NewProject />} />
        {/* Both patterns mount the same component: the orchestrator reads
            :draftId through useParams, so there is nothing to hand over. */}
        <Route path="/create-project" element={<CreateProjectRoute />} />
        <Route path="/create-project/:draftId" element={<CreateProjectRoute />} />
        {/* One route, and its two query forms (?draft=, ?edit=) need no
            entries of their own — the orchestrator reads them itself. */}
        <Route path="/upload" element={<UploadRoute />} />
        <Route path="/search" element={<SearchMobile user={user} />} />
        <Route path="/top-script" element={<TopScriptsMobile user={user} />} />
        <Route path="/featured" element={<FeaturedProjectsMobile user={user} />} />
        {/* Three patterns, one screen. The server resolves the id form and both
            path forms to the same payload, and useProjectDetail rewrites the URL
            to the canonical one after load — so the screen never asks which
            alias it was reached by. The two-segment catch-all is LAST for the
            same reason App.jsx declares it last: it matches any two segments,
            and every static route above it must win first. */}
        <Route path="/script/:id" element={<ProjectDetailMobile user={user} />} />
        <Route path="/script/:projectHeading/:writerUsername" element={<ProjectDetailMobile user={user} />} />
        <Route path="/:projectHeading/:writerUsername" element={<ProjectDetailMobile user={user} />} />
        {/* Defensive no-op: policy prevents this branch from mounting for an
            unfinished route, and it must never substitute Dashboard. */}
        <Route path="*" element={null} />
      </Routes>
    </MobileRouteBoundary>
  );
}

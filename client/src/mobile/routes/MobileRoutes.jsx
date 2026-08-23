import { lazy } from "react";
import { Route, Routes, useLocation, useParams } from "react-router-dom";
import MobileRouteBoundary from "../shell/MobileRouteBoundary";
import { isOwnProfileKey } from "./mobileRoutePolicy";
import { isIndustryAudience } from "../../layouts/app-shell/shellPolicy";

const Dashboard = lazy(() => import("../screens/Dashboard"));
const Holds = lazy(() => import("../screens/Holds"));
const NewProject = lazy(() => import("../screens/NewProject"));
const CreateProjectRoute = lazy(() => import("../screens/create/CreateProjectRoute"));
const UploadRoute = lazy(() => import("../screens/upload/UploadRoute"));
const SearchMobile = lazy(() => import("../screens/discovery/SearchMobile"));
const TopScriptsMobile = lazy(() => import("../screens/discovery/TopScriptsMobile"));
const FeaturedProjectsMobile = lazy(() => import("../screens/discovery/FeaturedProjectsMobile"));
const ProjectDetailMobile = lazy(() => import("../screens/projects/project-detail/ProjectDetailMobile"));
const ProjectCheckoutMobile = lazy(() => import("../screens/projects/checkout/ProjectCheckoutMobile"));
const ProjectPublicMobile = lazy(() => import("../screens/projects/public-project/ProjectPublicMobile"));
const PublicProfileMobile = lazy(() => import("../screens/profiles/public-profile/PublicProfileMobile"));
const ProfileVisitorMobile = lazy(() => import("../screens/profiles/visitor-profile/ProfileVisitorMobile"));
const ProfileOwnerMobile = lazy(() => import("../screens/profiles/owner-profile/ProfileOwnerMobile"));
const AccountSettingsMobile = lazy(() => import("../screens/profiles/owner-profile/AccountSettingsMobile"));
const FollowRequestsMobile = lazy(() => import("../screens/profiles/follow-requests/FollowRequestsMobile"));
const CollaborationRequestsMobile = lazy(() => import("../screens/collaboration/CollaborationRequestsMobile"));
const MessagesMobile = lazy(() => import("../screens/messages/MessagesMobile"));
const ReaderProfileMobile = lazy(() => import("../screens/reader/reader-profile/ReaderProfileMobile"));
const ReaderHomeMobile = lazy(() => import("../screens/reader/ReaderHomeMobile"));
const ReaderDiscoverMobile = lazy(() => import("../screens/reader/ReaderDiscoverMobile"));
const LandingMobile = lazy(() => import("../marketing/LandingMobile"));
const SeoContentMobile = lazy(() => import("../marketing/SeoContentMobile"));
const ChallengeHubMobile = lazy(() => import("../screens/challenges/ChallengeHubMobile"));
const ChallengeDetailMobile = lazy(() => import("../screens/challenges/ChallengeDetailMobile"));
const ChallengeRegisterMobile = lazy(() => import("../screens/challenges/ChallengeRegisterMobile"));
const ChallengeDashboardMobile = lazy(() => import("../screens/challenges/ChallengeDashboardMobile"));
const HallOfFameMobile = lazy(() => import("../screens/challenges/HallOfFameMobile"));
const IndustryHomeMobile = lazy(() => import("../screens/industry/IndustryHomeMobile"));
const IndustryDashboardMobile = lazy(() => import("../screens/industry/IndustryDashboardMobile"));
const WriterRosterMobile = lazy(() => import("../screens/industry/WriterRosterMobile"));
const MandatesMobile = lazy(() => import("../screens/industry/MandatesMobile"));
const PrimitiveGallery = lazy(() => import("../dev/PrimitiveGallery"));
const CreateHarness = lazy(() => import("../dev/CreateHarness"));
const UploadHarness = lazy(() => import("../dev/UploadHarness"));
const SearchHarness = lazy(() => import("../dev/SearchHarness"));
const TopScriptsHarness = lazy(() => import("../dev/TopScriptsHarness"));
const FeaturedHarness = lazy(() => import("../dev/FeaturedHarness"));
const ProjectDetailHarness = lazy(() => import("../dev/ProjectDetailHarness"));
const CheckoutHarness = lazy(() => import("../dev/CheckoutHarness"));
const ChallengeHubHarness = lazy(() => import("../dev/ChallengeHubHarness"));
const ChallengeDetailHarness = lazy(() => import("../dev/ChallengeDetailHarness"));
const ChallengeRegisterHarness = lazy(() => import("../dev/ChallengeRegisterHarness"));
const ChallengeDashboardHarness = lazy(() => import("../dev/ChallengeDashboardHarness"));
const HallOfFameHarness = lazy(() => import("../dev/HallOfFameHarness"));
const IndustryWorkspaceHarness = lazy(() => import("../dev/IndustryWorkspaceHarness"));
const ReaderWorkspaceHarness = lazy(() => import("../dev/ReaderWorkspaceHarness"));

function AuthenticatedProfileRoute({ user }) {
  const { id } = useParams();
  const { search } = useLocation();
  const own = isOwnProfileKey(id, user);
  if (own && new URLSearchParams(search).get("tab") === "settings") {
    return <AccountSettingsMobile user={user} />;
  }
  return own ? <ProfileOwnerMobile user={user} /> : <ProfileVisitorMobile user={user} />;
}

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
  const writerDashboard = (
    <Dashboard
      time={time}
      initials={initials}
      userName={userName}
      onLogout={onLogout}
      user={user}
      preview={preview}
    />
  );
  const dashboard = isIndustryAudience(user?.role)
    ? <IndustryDashboardMobile user={user} />
    : writerDashboard;

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

  if (devScreen === "checkout") {
    return <MobileRouteBoundary><CheckoutHarness user={user} /></MobileRouteBoundary>;
  }

  if (devScreen === "challenges") {
    return <MobileRouteBoundary><ChallengeHubHarness user={user} /></MobileRouteBoundary>;
  }

  if (devScreen === "challenge-detail") {
    return <MobileRouteBoundary><ChallengeDetailHarness /></MobileRouteBoundary>;
  }

  if (devScreen === "challenge-register") {
    return <MobileRouteBoundary><ChallengeRegisterHarness /></MobileRouteBoundary>;
  }

  if (devScreen === "challenge-dashboard") {
    return <MobileRouteBoundary><ChallengeDashboardHarness /></MobileRouteBoundary>;
  }

  if (devScreen === "hall-of-fame") {
    return <MobileRouteBoundary><HallOfFameHarness /></MobileRouteBoundary>;
  }

  if (devScreen === "industry-workspace") {
    return <MobileRouteBoundary><IndustryWorkspaceHarness user={user} /></MobileRouteBoundary>;
  }

  if (devScreen === "reader-workspace") {
    return <MobileRouteBoundary><ReaderWorkspaceHarness user={user} /></MobileRouteBoundary>;
  }

  if (preview) {
    return <MobileRouteBoundary>{dashboard}</MobileRouteBoundary>;
  }

  return (
    <MobileRouteBoundary>
      <Routes>
        <Route path="/" element={<LandingMobile user={user} />} />
        <Route path="/features" element={<SeoContentMobile user={user} />} />
        <Route path="/features/:slug" element={<SeoContentMobile user={user} />} />
        <Route path="/for" element={<SeoContentMobile user={user} />} />
        <Route path="/for/:slug" element={<SeoContentMobile user={user} />} />
        <Route path="/industries" element={<SeoContentMobile user={user} />} />
        <Route path="/industries/:slug" element={<SeoContentMobile user={user} />} />
        <Route path="/resources" element={<SeoContentMobile user={user} />} />
        <Route path="/resources/blog" element={<SeoContentMobile user={user} />} />
        <Route path="/resources/blog/:slug" element={<SeoContentMobile user={user} />} />
        <Route path="/resources/:slug" element={<SeoContentMobile user={user} />} />
        <Route path="/tools" element={<SeoContentMobile user={user} />} />
        <Route path="/tools/:slug" element={<SeoContentMobile user={user} />} />
        <Route path="/faq" element={<SeoContentMobile user={user} />} />
        <Route path="/genre/:slug" element={<SeoContentMobile user={user} />} />
        <Route path="/how-to-sell-a-script" element={<SeoContentMobile user={user} />} />
        <Route path="/how-to-find-producers" element={<SeoContentMobile user={user} />} />
        <Route path="/how-to-pitch-screenplay" element={<SeoContentMobile user={user} />} />
        <Route path="/how-to-find-film-investors" element={<SeoContentMobile user={user} />} />
        <Route path="/film-investment-india" element={<SeoContentMobile user={user} />} />
        <Route path="/bollywood-script-submission" element={<SeoContentMobile user={user} />} />
        <Route path="/web-series-screenplay-guide" element={<SeoContentMobile user={user} />} />
        <Route path="/dashboard" element={dashboard} />
        <Route path="/home" element={<IndustryHomeMobile user={user} />} />
        <Route path="/writers" element={<WriterRosterMobile user={user} />} />
        <Route path="/mandates" element={<MandatesMobile user={user} />} />
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
        <Route path="/follow-requests" element={<FollowRequestsMobile user={user} />} />
        <Route path="/collaborations" element={<CollaborationRequestsMobile user={user} />} />
        <Route path="/messages" element={<MessagesMobile user={user} />} />
        <Route path="/reader" element={<ReaderHomeMobile user={user} />} />
        <Route path="/reader/search" element={<ReaderDiscoverMobile user={user} />} />
        <Route path="/challenge" element={<ChallengeHubMobile user={user} />} />
        <Route path="/challenge/c/:slug" element={<ChallengeDetailMobile user={user} />} />
        <Route path="/challenge/register" element={<ChallengeRegisterMobile user={user} />} />
        <Route path="/challenge/dashboard" element={<ChallengeDashboardMobile user={user} />} />
        <Route path="/hall-of-fame" element={<HallOfFameMobile user={user} />} />
        <Route path="/hall-of-fame/:slug" element={<HallOfFameMobile user={user} />} />
        <Route path="/share/project/:id" element={<ProjectPublicMobile />} />
        <Route path="/share/profile/:id" element={user ? <AuthenticatedProfileRoute user={user} /> : <PublicProfileMobile />} />
        <Route path="/profile" element={<AuthenticatedProfileRoute user={user} />} />
        <Route path="/profile/:id" element={<AuthenticatedProfileRoute user={user} />} />
        <Route
          path="/reader/script/:id"
          element={<ProjectDetailMobile user={user} canonicalize={false} backTo="/reader" screenId="reader-project" />}
        />
        <Route path="/reader/profile" element={<ReaderProfileMobile user={user} />} />
        <Route path="/reader/profile/:id" element={<ReaderProfileMobile user={user} />} />
        {/* Three patterns, one screen. The server resolves the id form and both
            path forms to the same payload, and useProjectDetail rewrites the URL
            to the canonical one after load — so the screen never asks which
            alias it was reached by. The two-segment catch-all is LAST for the
            same reason App.jsx declares it last: it matches any two segments,
            and every static route above it must win first. */}
        {/* Before the detail forms, because `/script/:projectHeading/:writerUsername` matches
            `/script/p1/pay` too. React Router ranks the static "pay" segment higher either way;
            the order is kept explicit so the file reads the way the manifest does. */}
        <Route path="/script/:id/pay" element={<ProjectCheckoutMobile user={user} />} />
        <Route path="/script/:id" element={<ProjectDetailMobile user={user} />} />
        <Route path="/script/:projectHeading/:writerUsername" element={<ProjectDetailMobile user={user} />} />
        <Route path="/:projectHeading/:writerUsername" element={<ProjectDetailMobile user={user} />} />
        <Route path="/:id" element={<AuthenticatedProfileRoute user={user} />} />
        {/* Defensive no-op: policy prevents this branch from mounting for an
            unfinished route, and it must never substitute Dashboard. */}
        <Route path="*" element={null} />
      </Routes>
    </MobileRouteBoundary>
  );
}

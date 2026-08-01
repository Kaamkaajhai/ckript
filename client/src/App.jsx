import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useSearchParams, useNavigate, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense, useEffect, useContext } from "react";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthModalProvider } from "./context/AuthModalContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { DarkModeProvider } from "./context/DarkModeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import PrivateRoute from "./utils/PrivateRoute";
import { AuthContext } from "./context/AuthContext";
import SeoManager from "./components/SeoManager";
import CookieConsentBanner from "./components/CookieConsentBanner";
import AnalyticsBootstrap from "./components/AnalyticsBootstrap";
import { applyLanguagePreference, getStoredLanguagePreference } from "./utils/languagePreference";
import useIsMobile from "./mobile/hooks/useIsMobile";
import { getSharedProfileExperience } from "./features/profile-pc/profilePolicy";
import RouteFallback from "./components/skeleton/RouteFallback";
/*
 * Imported from the policy module directly, NOT from the app-shell barrel.
 * The barrel re-exports AppShell, so importing these through it would pull the
 * whole shell into the entry bundle and undo its code-splitting. These are pure
 * functions and constants — a few hundred bytes.
 */
import {
  resolveShell,
  isWriterAudience,
  SHELL,
  CONTENT_VARIANT,
} from "./layouts/app-shell/shellPolicy";

const Landing = lazy(() => import("./pages/landing/Landing"));
const About = lazy(() => import("./pages/About"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const SeoPage = lazy(() => import("./pages/SeoPage"));
const PricingRoute = lazy(() => import("./pages/PricingRoute"));
const PrivacyPolicy = lazy(() => import("./pages/PolicyPage"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const EventPosterModal = lazy(() => import("./components/EventPosterModal"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const ScriptUploadTermsConditions = lazy(() => import("./pages/ScriptUploadTermsConditions"));
const ForgotPasswordRoute = lazy(() => import("./pages/ForgotPasswordRoute"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const RoleSelection = lazy(() => import("./pages/RoleSelection"));
const WriterOnboardingRoute = lazy(() => import("./pages/WriterOnboardingRoute"));
const ProducerOnboardingRoute = lazy(() => import("./pages/ProducerOnboardingRoute"));
const IndustryOnboarding = lazy(() => import("./pages/IndustryOnboarding"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ScriptUpload = lazy(() => import("./pages/ScriptUpload"));
const NewProject = lazy(() => import("./pages/NewProject"));
const CreateProject = lazy(() => import("./pages/CreateProject"));
const CompetitionLanding = lazy(() => import("./pages/challenge/CompetitionLanding"));
const ChallengeHub = lazy(() => import("./pages/challenge/ChallengeHub"));
// The landing-register overview of the challenge. Marketing surface, so it is bare like the
// landing itself — the hub above is what renders inside the app shell.
const ChallengesPage = lazy(() => import("./pages/landing/ChallengesPage"));
const HallOfFame = lazy(() => import("./pages/hall-of-fame/HallOfFame"));
const HallOfFameDetail = lazy(() => import("./pages/hall-of-fame/HallOfFameDetail"));
const CompetitionRegister = lazy(() => import("./pages/challenge/CompetitionRegister"));
const CompetitionDashboard = lazy(() => import("./pages/challenge/CompetitionDashboard"));
const Search = lazy(() => import("./pages/Search"));
const ScriptDetail = lazy(() => import("./pages/ScriptDetail"));
const PublicScript = lazy(() => import("./pages/PublicScript"));
const ScriptPaymentPage = lazy(() => import("./pages/ScriptPaymentPage"));
const FeaturedProjects = lazy(() => import("./pages/FeaturedProjects"));
const TopList = lazy(() => import("./pages/TopList"));
const Messages = lazy(() => import("./features/messages-operator"));
// The industry section — see features/producer-workspace for what lives there
// and, just as importantly, what deliberately does not.
const Mandates = lazy(() => import("./features/producer-workspace/MandatesPage"));
const Writers = lazy(() => import("./features/producer-workspace/WriterDirectoryPage"));
const InvestorHome = lazy(() => import("./pages/InvestorHome"));
const ReaderHome = lazy(() => import("./pages/ReaderHome"));
const ScriptReader = lazy(() => import("./pages/ScriptReader"));
const ReaderProfile = lazy(() => import("./pages/ReaderProfile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminCompetitionsEditor = lazy(() => import("./pages/admin/competitions/AdminCompetitionsEditor"));
const AdminScriptView = lazy(() => import("./pages/AdminScriptView"));
const AdminAgreements = lazy(() => import("./pages/AdminAgreements"));
const FollowRequests = lazy(() => import("./pages/FollowRequests"));
const MainLayout = lazy(() => import("./layouts/MainLayout"));
const AppShell = lazy(() => import("./layouts/app-shell/AppShell"));
const MobileApp = lazy(() => import("./mobile/MobileApp"));

/*
 * Warmed on idle, in likelihood order. The app shell leads because it is now the
 * chrome for writers AND the whole industry audience — the large majority of
 * signed-in sessions. MainLayout stays on the list for readers and admins.
 */
const preloadRouteChunks = [
  () => import("./layouts/app-shell/AppShell"),
  () => import("./layouts/MainLayout"),
  () => import("./pages/AcceptInvite"),
  () => import("./pages/Dashboard"),
  () => import("./pages/Profile"),
];

// Handles admin impersonation login via URL parameter
function AdminLoginHandler({ children }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    const adminLoginData = searchParams.get("adminLogin");
    if (adminLoginData) {
      try {
        const userData = JSON.parse(decodeURIComponent(adminLoginData));
        localStorage.setItem("user", JSON.stringify(userData));
        setUser(userData);
        // Clean URL by navigating without the query param
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Failed to parse admin login data:", err);
      }
    }
  }, [searchParams, setUser, navigate]);

  return children;
}

function ScrollToTopOnRouteChange() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Ensure each route opens from the top in SPA navigation.
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const mainEl = document.querySelector("main");
    if (mainEl && typeof mainEl.scrollTo === "function") {
      mainEl.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [pathname, search]);

  return null;
}

function LanguagePreferenceSync() {
  const { user } = useContext(AuthContext);
  const { pathname } = useLocation();

  useEffect(() => {
    const preferredLanguage = user?.language || getStoredLanguagePreference() || "en";
    applyLanguagePreference(preferredLanguage).catch(() => {
      // Translation is best-effort; settings should still remain usable on failures.
    });
  }, [user?.language, pathname]);

  return <div id="google_translate_element" style={{ display: "none" }} aria-hidden="true" />;
}

function ReferralCodeRedirect() {
  const { referralCode } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const normalizedCode = String(referralCode || "").trim().toUpperCase();

    if (!/^[A-Z0-9]{4,40}$/.test(normalizedCode)) {
      navigate("/", { replace: true });
      return;
    }

    try {
      localStorage.setItem("sb:referral-code", normalizedCode);
    } catch {
      // Storage can fail in restricted environments; query param still carries referral.
    }

    navigate(`/signup?ref=${encodeURIComponent(normalizedCode)}`, { replace: true });
  }, [navigate, referralCode]);

  return null;
}

function SingleSegmentProfileOrReferralRoute() {
  const { id } = useParams();
  const { user, loading } = useContext(AuthContext);
  const normalizedSegment = String(id || "").trim();
  const looksLikeReferralCode =
    normalizedSegment === normalizedSegment.toUpperCase() &&
    /^[A-Z0-9]{4,40}$/.test(normalizedSegment);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 bg-white">
        Loading...
      </div>
    );
  }

  if (!user && looksLikeReferralCode) {
    return <ReferralCodeRedirect />;
  }

  if (!user) {
    return <Navigate to={`/share/profile/${encodeURIComponent(normalizedSegment)}`} replace />;
  }

  return (
    <PrivateRoute>
      <AuthenticatedProfileShell>
        <Profile />
      </AuthenticatedProfileShell>
    </PrivateRoute>
  );
}

/*
 * AppChrome — the one place that decides which shell wraps a page.
 *
 * There used to be five copies of this decision (AuthenticatedProfileShell,
 * ProtectedMainLayout, PublicAppLayout, ProtectedScriptDetailLayout and
 * DashboardRoute), each re-deriving `role === "writer" || role === "creator"`
 * and each with its own idea of when a route is full-bleed. They disagreed:
 * /messages was flush in one and padded in another, and every role outside that
 * two-name check silently got the non-writer branch.
 *
 * Now the answer comes from layouts/app-shell/shellPolicy, which maps every role
 * in the User model exhaustively. Producers, directors, investors and other
 * industry professionals resolve to the app shell here — that is the switch that
 * moves the producer section onto the writer section's chrome.
 */
function AppChrome({ children, variant }) {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const resolved = resolveShell({ role: user?.role, pathname: location.pathname });

  // An explicit `variant` wins: a few routes know their own mounting needs
  // better than a path prefix can express.
  const contentVariant = variant ?? resolved.contentVariant;

  return resolved.shell === SHELL.APP
    ? <AppShell variant={contentVariant === CONTENT_VARIANT.PAGE ? "page" : "fill"}>{children}</AppShell>
    : <MainLayout contentVariant={contentVariant === CONTENT_VARIANT.PAGE ? "page" : "full"}>{children}</MainLayout>;
}

function AuthenticatedProfileShell({ children }) {
  // Profiles always mount edge-to-edge, whichever shell surrounds them.
  return <AppChrome variant={CONTENT_VARIANT.FILL}>{children}</AppChrome>;
}

// Profiles have one mounting contract regardless of whether the viewer opens
// their own profile, an id-based URL, or another member's canonical username.
function ProtectedProfileLayout() {
  const content = (
    <Suspense fallback={<RouteFallback label="Loading profile…" />}>
      <Outlet />
    </Suspense>
  );

  return (
    <PrivateRoute>
      <AuthenticatedProfileShell>{content}</AuthenticatedProfileShell>
    </PrivateRoute>
  );
}

function SharedProfileRoute() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 bg-white">
        Loading profile…
      </div>
    );
  }

  // A copied share URL is also a valid signed-in entry point. Authenticated
  // viewers get the real profile (permissions, follow/message, canonical URL),
  // while logged-out visitors retain the sanitized public representation.
  if (getSharedProfileExperience(user) === "authenticated") {
    return (
      <AuthenticatedProfileShell>
        <Profile />
      </AuthenticatedProfileShell>
    );
  }

  return <PublicProfile />;
}

// Shared layout for authenticated app routes. Which shell and which content
// inset each audience gets is AppChrome's decision, driven by shellPolicy.
function ProtectedMainLayout() {
  return (
    <PrivateRoute>
      <AppChrome>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </AppChrome>
    </PrivateRoute>
  );
}

// Public pages that a signed-in member should still see inside the app.
//
// /challenge and /hall-of-fame are genuinely public — a logged-out visitor has to be able to read
// them, and they are indexed. But they were declared as bare top-level routes, so a signed-in writer
// who clicked "Challenge" in the rail lost the entire shell: no sidebar, no topbar, no search, no
// notifications, just a full-bleed page with no way back except the browser button.
//
// So: branch on auth rather than gate on it, the same shape as SharedProfileRoute. Never wrap these
// in PrivateRoute — that redirects logged-out visitors to "/" and would make the pages unreachable
// for exactly the audience they exist to convert.
function PublicAppLayout() {
  const { user, loading } = useContext(AuthContext);

  const content = (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
          Loading...
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );

  // Wait the single tick it takes to restore the session. Rendering the page bare and then again
  // inside the shell would remount it, and these pages fetch on mount — every request would fire
  // twice. Prerendering is unaffected: prerender-seo.mjs injects meta into dist/index.html and never
  // executes React, so this branch is not what search engines read.
  if (loading) return <div className="min-h-screen" />;

  // Logged-out visitor: the page owns the whole viewport, exactly as before.
  if (!user) return content;

  // These pages are ordinary padded content inside whichever shell the viewer has.
  return <AppChrome variant={CONTENT_VARIANT.PAGE}>{content}</AppChrome>;
}

// Script detail owns a cinematic, full-bleed workspace. URLs and role-aware
// chrome remain identical; only the content inset differs from generic pages.
function ProtectedScriptDetailLayout() {
  return (
    <PrivateRoute>
      <AppChrome variant={CONTENT_VARIANT.FILL}>
        <Suspense fallback={<RouteFallback tone="cool" label="Loading project…" />}>
          <Outlet />
        </Suspense>
      </AppChrome>
    </PrivateRoute>
  );
}

/*
 * /dashboard, /ai-tools and /offer-holds.
 *
 * `Dashboard` is a router as well as a page: it renders the writer's dashboard
 * or the producer's depending on the viewer's audience. The chrome around it —
 * and crucially whether the content area is flush or padded, which differs
 * because the two dashboards have different layouts — comes from shellPolicy.
 *
 * Waiting for `loading` matters here: rendering with no user would resolve to
 * the fallback audience for a frame and then re-mount under different chrome.
 */
function DashboardRoute() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 bg-white">
        Loading...
      </div>
    );
  }

  return (
    <PrivateRoute>
      <AppChrome>
        <Suspense fallback={<RouteFallback />}>
          <Dashboard />
        </Suspense>
      </AppChrome>
    </PrivateRoute>
  );
}

// Ckript ships a *separate* mobile app (src/mobile) for signed-in creators on
// phone-sized viewports — a native-feeling experience, not a responsive reflow
// of the desktop UI. This gate is the single mount point: while a creator is
// on a phone it fully replaces the desktop routes; everyone else (logged-out
// visitors, non-creators, tablets/desktops) gets the normal `children`. There
// is deliberately no mobile landing page — the gate only trips once `user`
// exists. SSR/prerender is unaffected (no window → not mobile, and no user).
function RootExperience({ children }) {
  const isMobile = useIsMobile();
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  /*
   * The mobile app is a writer experience — it has no producer surfaces — so the
   * gate is deliberately writer-only. Asking the policy rather than re-deriving
   * the role check keeps this in step with the rest of the app: if `writer` or
   * `creator` is ever renamed, this stops being a place it can be forgotten.
   */
  if (!loading && isMobile && user && isWriterAudience(user.role)) {
    // Exempt /challenge routes so the competition registration and dashboard 
    // flows are accessible on mobile devices.
    if (location.pathname.startsWith("/challenge")) {
      return children;
    }
    return <MobileApp />;
  }

  return children;
}

function App() {
  useEffect(() => {
    const preload = () => {
      preloadRouteChunks.forEach((loadChunk) => {
        loadChunk().catch(() => {
          // Ignore prefetch errors; lazy route loading still works as fallback.
        });
      });
    };

    const idleCallback = window.requestIdleCallback
      ? window.requestIdleCallback(preload, { timeout: 1200 })
      : setTimeout(preload, 300);

    return () => {
      if (window.cancelIdleCallback && typeof idleCallback === "number") {
        window.cancelIdleCallback(idleCallback);
      } else {
        clearTimeout(idleCallback);
      }
    };
  }, []);

  const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID || "";
  const appTree = (
    <DarkModeProvider key="dm-root">
      <AuthProvider>
        <CurrencyProvider>
        <ToastProvider>
        <Router>
          <AuthModalProvider>
          <LanguagePreferenceSync />
          <ScrollToTopOnRouteChange />
          <SeoManager />
          <CookieConsentBanner />
          <AnalyticsBootstrap />
          <AdminLoginHandler>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 bg-white">
                  Loading...
                </div>
              }
            >
            <RootExperience>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/features" element={<SeoPage />} />
              <Route path="/features/:slug" element={<SeoPage />} />
              <Route path="/for" element={<SeoPage />} />
              <Route path="/for/:slug" element={<SeoPage />} />
              <Route path="/industries" element={<SeoPage />} />
              <Route path="/industries/:slug" element={<SeoPage />} />
              <Route path="/resources" element={<SeoPage />} />
              <Route path="/resources/blog" element={<SeoPage />} />
              <Route path="/resources/blog/:slug" element={<SeoPage />} />
              <Route path="/resources/:slug" element={<SeoPage />} />
              <Route path="/tools" element={<SeoPage />} />
              <Route path="/tools/:slug" element={<SeoPage />} />
              <Route path="/pricing" element={<PricingRoute />} />
              <Route path="/faq" element={<SeoPage />} />
              <Route path="/genre/:slug" element={<SeoPage />} />
              <Route path="/how-to-sell-a-script" element={<SeoPage />} />
              <Route path="/how-to-find-producers" element={<SeoPage />} />
              <Route path="/how-to-pitch-screenplay" element={<SeoPage />} />
              <Route path="/how-to-find-film-investors" element={<SeoPage />} />
              <Route path="/film-investment-india" element={<SeoPage />} />
              <Route path="/bollywood-script-submission" element={<SeoPage />} />
              <Route path="/web-series-screenplay-guide" element={<SeoPage />} />
              <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />
              <Route path="/t-and-c" element={<Navigate to="/terms-of-service" replace />} />
              <Route path="/registration-privacy-policy" element={<Navigate to="/privacy-policy" replace />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
              <Route path="/writer-terms" element={<Navigate to="/terms-conditions?tab=writer" replace />} />
              <Route path="/investor-terms" element={<Navigate to="/terms-conditions?tab=investor" replace />} />
              <Route path="/script-upload-terms" element={<ScriptUploadTermsConditions />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/forgot-password" element={<ForgotPasswordRoute />} />
              <Route path="/join" element={<Navigate to="/" replace />} />
              <Route path="/signup" element={<Navigate to="/" replace />} />
              <Route path="/invite/:token" element={<AcceptInvite />} />
              <Route path="/share/profile/:id" element={<SharedProfileRoute />} />
              <Route path="/share/project/:id" element={<PublicScript />} />
              {/* Public so a logged-out visitor can read them before signing up, but wrapped so a
                  signed-in member keeps the app chrome instead of being dropped into a bare page. */}
              <Route element={<PublicAppLayout />}>
                {/* The hub lists every challenge; an individual one lives under /c/ so its slug can
                    never collide with /challenge/register or /challenge/dashboard. */}
                <Route path="/challenge" element={<ChallengeHub />} />
                <Route path="/challenge/c/:slug" element={<CompetitionLanding />} />
                {/* The permanent archive. Public and indexable — it is the platform's credibility page.
                    The :slug record MUST stay declared. It was deleted as collateral in a commit about
                    the Events hub, and because the two-segment catch-all below swallows the path, it
                    did not 404 — it resolved to ScriptDetail behind PrivateRoute and bounced every
                    logged-out visitor to "/". Four links point here, including the card the Hall of
                    Fame tab renders and the "See who won" button on the phase band. */}
                <Route path="/hall-of-fame" element={<HallOfFame />} />
                <Route path="/hall-of-fame/:slug" element={<HallOfFameDetail />} />
              </Route>
              <Route path="/challenges" element={<ChallengesPage />} />
              {/* The hub's fourth tab IS this data, through the same EntryCard, and it is
                  URL-addressable. A standalone page meant two surfaces over one dataset — which is
                  what 5f77ee4 ("the hub is the destination") exists to prevent — and the second one
                  had drifted on award labels and lost dark mode. Public: a redirect needs no
                  session, and the hub asks for one in place on that tab. */}
              <Route path="/my-competitions" element={<Navigate to="/challenge?tab=mine" replace />} />
              <Route path="/writer-onboarding" element={<WriterOnboardingRoute />} />
              <Route path="/producer-director-onboarding" element={<ProducerOnboardingRoute />} />
              <Route path="/investor-onboarding" element={<Navigate to="/producer-director-onboarding" replace />} />
              <Route element={<ProtectedMainLayout />}>
                <Route path="/industry-onboarding" element={<IndustryOnboarding />} />
                <Route path="/top-script" element={<TopList />} />
                <Route path="/featured" element={<FeaturedProjects />} />
                <Route path="/trending" element={<Navigate to="/top-script" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/follow-requests" element={<FollowRequests />} />
                <Route path="/new-project" element={<NewProject />} />
                <Route path="/create-project" element={<CreateProject />} />
                <Route path="/create-project/:draftId" element={<CreateProject />} />
                <Route path="/challenge/register" element={<CompetitionRegister />} />
                <Route path="/challenge/dashboard" element={<CompetitionDashboard />} />
                <Route path="/upload" element={<ScriptUpload />} />
                <Route path="/search" element={<Search />} />
                <Route path="/script/:id/pay" element={<ScriptPaymentPage />} />
                <Route path="/mandates" element={<Mandates />} />
                <Route path="/writers" element={<Writers />} />
                <Route path="/home" element={<InvestorHome />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/reader" element={<ReaderHome />} />
                <Route path="/reader/script/:id" element={<ScriptReader />} />
                <Route path="/reader/profile/:id?" element={<ReaderProfile />} />
                <Route path="/reader/search" element={<ReaderHome />} />
              </Route>
              <Route element={<ProtectedProfileLayout />}>
                <Route path="/profile/:id?" element={<Profile />} />
              </Route>
              <Route element={<ProtectedScriptDetailLayout />}>
                <Route path="/script/:id" element={<ScriptDetail />} />
                <Route path="/script/:projectHeading/:writerUsername" element={<ScriptDetail />} />
                <Route path="/:projectHeading/:writerUsername" element={<ScriptDetail />} />
              </Route>
              <Route
                path="/reader/featured"
                element={<Navigate to="/featured" replace />}
              />
              <Route
                path="/admin"
                element={<AdminDashboard />}
              />
              <Route
                path="/admin/competitions/:id"
                element={<AdminCompetitionsEditor />}
              />
              <Route
                path="/admin/scripts/:id"
                element={<AdminScriptView />}
              />
              <Route
                path="/admin/agreements"
                element={<AdminAgreements />}
              />
              {/* Chrome comes from shellPolicy; `Dashboard` itself picks writer vs producer content. */}
              <Route path="/dashboard" element={<DashboardRoute />} />
              <Route path="/ai-tools"  element={<DashboardRoute />} />
              <Route path="/offer-holds" element={<DashboardRoute />} />
              {import.meta.env.DEV && (
                <Route
                  path="/__mobile-preview"
                  element={
                    <AuthContext.Provider value={{ user: { name: "Arshad Rahman", role: "creator", token: "preview" }, logout: () => {} }}>
                      <Suspense fallback={null}>
                        <MobileApp />
                      </Suspense>
                    </AuthContext.Provider>
                  }
                />
              )}
              <Route path="/:id" element={<SingleSegmentProfileOrReferralRoute />} />
            </Routes>
            </RootExperience>
            </Suspense>
            <EventPosterModal />
          </AdminLoginHandler>
          </AuthModalProvider>
        </Router>
        </ToastProvider>
        </CurrencyProvider>
      </AuthProvider>
    </DarkModeProvider>
  );

  return googleClientId
    ? <GoogleOAuthProvider clientId={googleClientId}>{appTree}</GoogleOAuthProvider>
    : appTree;
}

export default App;

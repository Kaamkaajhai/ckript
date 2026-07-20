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

const Landing = lazy(() => import("./pages/landing/Landing"));
const About = lazy(() => import("./pages/About"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const SeoPage = lazy(() => import("./pages/SeoPage"));
const PricingRoute = lazy(() => import("./pages/PricingRoute"));
const PrivacyPolicy = lazy(() => import("./pages/PolicyPage"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const RegistrationPrivacyPolicy = lazy(() => import("./pages/RegistrationPrivacyPolicy"));
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
const BranchEditor = lazy(() => import("./pages/BranchEditor"));
const CollaborationHub = lazy(() => import("./pages/CollaborationHub"));
const Search = lazy(() => import("./pages/Search"));
const ScriptDetail = lazy(() => import("./pages/ScriptDetail"));
const PublicScript = lazy(() => import("./pages/PublicScript"));
const ScriptPaymentPage = lazy(() => import("./pages/ScriptPaymentPage"));
const FeaturedProjects = lazy(() => import("./pages/FeaturedProjects"));
const Mandates = lazy(() => import("./pages/Mandates"));
const TopList = lazy(() => import("./pages/TopList"));
const Messages = lazy(() => import("./pages/Messages"));
const Writers = lazy(() => import("./pages/Writers"));
const InvestorHome = lazy(() => import("./pages/InvestorHome"));
const ReaderHome = lazy(() => import("./pages/ReaderHome"));
const ScriptReader = lazy(() => import("./pages/ScriptReader"));
const ReaderProfile = lazy(() => import("./pages/ReaderProfile"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminScriptView = lazy(() => import("./pages/AdminScriptView"));
const AdminAgreements = lazy(() => import("./pages/AdminAgreements"));
const FollowRequests = lazy(() => import("./pages/FollowRequests"));
const MainLayout = lazy(() => import("./layouts/MainLayout"));
const DashboardLayout = lazy(() => import("./layouts/DashboardLayout"));
const MobileApp = lazy(() => import("./mobile/MobileApp"));

const preloadRouteChunks = [
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

  const isCreator = user?.role === "writer" || user?.role === "creator";
  return (
    <PrivateRoute>
      {isCreator
        ? <DashboardLayout variant="page"><Profile /></DashboardLayout>
        : <MainLayout><Profile /></MainLayout>}
    </PrivateRoute>
  );
}

// Shared layout for authenticated app routes. Creators/writers get the unified
// 2B dashboard shell (dark rail + light top bar) on every page; investors and
// readers keep their existing MainLayout, which already carries role-appropriate
// chrome and page designs tuned for it.
function ProtectedMainLayout() {
  const { user } = useContext(AuthContext);
  const isCreator = user?.role === "writer" || user?.role === "creator";

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

  return (
    <PrivateRoute>
      {isCreator
        ? <DashboardLayout variant="page">{content}</DashboardLayout>
        : <MainLayout>{content}</MainLayout>}
    </PrivateRoute>
  );
}

// Script detail owns a cinematic, full-bleed workspace. URLs and role-aware
// chrome remain identical; only the content inset differs from generic pages.
function ProtectedScriptDetailLayout() {
  const { user } = useContext(AuthContext);
  const isCreator = user?.role === "writer" || user?.role === "creator";

  const content = (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-500">
          Loading project…
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );

  return (
    <PrivateRoute>
      {isCreator
        ? <DashboardLayout variant="fill">{content}</DashboardLayout>
        : <MainLayout contentVariant="full">{content}</MainLayout>}
    </PrivateRoute>
  );
}

// Creator/writer dashboard uses the independent 2B DashboardLayout.
// Investors fall back to MainLayout (their dashboard has a different design).
function DashboardRoute() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500 bg-white">
        Loading...
      </div>
    );
  }

  const isCreator = user?.role === "writer" || user?.role === "creator";

  if (isCreator) {
    return (
      <PrivateRoute>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm" style={{ color: "#a39d92", background: "#fff" }}>Loading...</div>}>
          <DashboardLayout variant="fill">
            <Dashboard />
          </DashboardLayout>
        </Suspense>
      </PrivateRoute>
    );
  }

  // Investor/other roles use the standard layout
  return (
    <PrivateRoute>
      <MainLayout>
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">Loading...</div>}>
          <Dashboard />
        </Suspense>
      </MainLayout>
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
  const isCreator = user?.role === "writer" || user?.role === "creator";

  if (!loading && isMobile && user && isCreator) {
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
              <Route path="/registration-privacy-policy" element={<RegistrationPrivacyPolicy />} />
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
              <Route path="/share/profile/:id" element={<PublicProfile />} />
              <Route path="/share/project/:id" element={<PublicScript />} />
              <Route path="/writer-onboarding" element={<WriterOnboardingRoute />} />
              <Route path="/producer-director-onboarding" element={<ProducerOnboardingRoute />} />
              <Route path="/investor-onboarding" element={<Navigate to="/producer-director-onboarding" replace />} />
              <Route element={<ProtectedMainLayout />}>
                <Route path="/industry-onboarding" element={<IndustryOnboarding />} />
                <Route path="/top-script" element={<TopList />} />
                <Route path="/featured" element={<FeaturedProjects />} />
                <Route path="/trending" element={<Navigate to="/top-script" replace />} />
                <Route path="/profile/:id?" element={<Profile />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/follow-requests" element={<FollowRequests />} />
                <Route path="/new-project" element={<NewProject />} />
                <Route path="/create-project" element={<CreateProject />} />
                <Route path="/create-project/:draftId" element={<CreateProject />} />
                <Route path="/upload" element={<ScriptUpload />} />
                <Route path="/search" element={<Search />} />
                <Route path="/script/:scriptId/branch/edit" element={<BranchEditor />} />
                <Route path="/script/:scriptId/collaborate" element={<CollaborationHub />} />
                <Route path="/script/:scriptId/collaborate/:section" element={<CollaborationHub />} />
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
                path="/admin/scripts/:id"
                element={<AdminScriptView />}
              />
              <Route
                path="/admin/agreements"
                element={<AdminAgreements />}
              />
              {/* Dashboard: creator/writer → DashboardLayout (2B); investor → MainLayout */}
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

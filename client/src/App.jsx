import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useNavigate, useLocation, useParams } from "react-router-dom";
import { lazy, Suspense, useEffect, useContext } from "react";
import { AuthProvider } from "./context/AuthContext";
import { DarkModeProvider } from "./context/DarkModeContext";
import PrivateRoute from "./utils/PrivateRoute";
import { AuthContext } from "./context/AuthContext";
import SeoManager from "./components/SeoManager";
import CookieConsentBanner from "./components/CookieConsentBanner";
import AnalyticsBootstrap from "./components/AnalyticsBootstrap";
import { applyLanguagePreference, getStoredLanguagePreference } from "./utils/languagePreference";

const Landing = lazy(() => import("./pages/Landing"));
const About = lazy(() => import("./pages/About"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPolicy = lazy(() => import("./pages/PolicyPage"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const RegistrationPrivacyPolicy = lazy(() => import("./pages/RegistrationPrivacyPolicy"));
const TermsConditions = lazy(() => import("./pages/TermsConditions"));
const ScriptUploadTermsConditions = lazy(() => import("./pages/ScriptUploadTermsConditions"));
const Login = lazy(() => import("./pages/Login"));
const Join = lazy(() => import("./pages/Join"));
const RoleSelection = lazy(() => import("./pages/RoleSelection"));
const WriterOnboarding = lazy(() => import("./pages/WriterOnboarding"));
const InvestorOnboarding = lazy(() => import("./pages/InvestorOnboarding"));
const IndustryOnboarding = lazy(() => import("./pages/IndustryOnboarding"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ScriptUpload = lazy(() => import("./pages/ScriptUpload"));
const NewProject = lazy(() => import("./pages/NewProject"));
const CreateProject = lazy(() => import("./pages/CreateProject"));
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
const WriterPurchaseRequests = lazy(() => import("./pages/WriterPurchaseRequests"));
const MainLayout = lazy(() => import("./layouts/MainLayout"));

const preloadRouteChunks = [
  () => import("./layouts/MainLayout"),
  () => import("./pages/Login"),
  () => import("./pages/Join"),
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

  return (
    <DarkModeProvider>
      <AuthProvider>
        <Router>
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
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<ContactPage />} />
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
              <Route path="/login" element={<Login />} />
              <Route path="/join" element={<RoleSelection />} />
              <Route path="/signup" element={<Join />} />
              <Route path="/share/profile/:id" element={<PublicProfile />} />
              <Route path="/share/project/:id" element={<PublicScript />} />
              <Route path="/writer-onboarding" element={<WriterOnboarding />} />
              <Route path="/producer-director-onboarding" element={<InvestorOnboarding />} />
              <Route path="/investor-onboarding" element={<Navigate to="/producer-director-onboarding" replace />} />
              <Route path="/industry-onboarding" element={
                <PrivateRoute>
                  <MainLayout>
                    <IndustryOnboarding />
                  </MainLayout>
                </PrivateRoute>
              } />
              <Route
                path="/top-list"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <TopList />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/featured"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <FeaturedProjects />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/trending"
                element={<Navigate to="/top-list" replace />}
              />
              <Route
                path="/profile/:id?"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <Profile />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/credits"
                element={<Navigate to="/dashboard" replace />}
              />
              <Route
                path="/purchase-requests"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <WriterPurchaseRequests />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/new-project"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <NewProject />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/ai-tools"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/offer-holds"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-project"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <CreateProject />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/create-project/:draftId"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <CreateProject />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <ScriptUpload />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/search"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <Search />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/script/:id/pay"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <ScriptPaymentPage />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/script/:id"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <ScriptDetail />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/script/:projectHeading/:writerUsername"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <ScriptDetail />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/mandates"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <Mandates />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/writers"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <Writers />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/home"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <InvestorHome />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <Messages />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/reader"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <ReaderHome />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/reader/script/:id"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <ScriptReader />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/reader/profile/:id?"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <ReaderProfile />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/reader/search"
                element={
                  <PrivateRoute>
                    <MainLayout>
                      <ReaderHome />
                    </MainLayout>
                  </PrivateRoute>
                }
              />
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
              <Route path="/:referralCode" element={<ReferralCodeRedirect />} />
            </Routes>
            </Suspense>
          </AdminLoginHandler>
        </Router>
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;
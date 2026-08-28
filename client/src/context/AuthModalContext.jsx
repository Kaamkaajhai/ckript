import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PENDING_AUTH_REDIRECT_KEY } from "../services/api";
import useIsMobile from "../mobile/hooks/useIsMobile";
import { findMobileRoute } from "../mobile/routes/mobileRoutePolicy";
import { MOBILE_ROUTE_DISPOSITION } from "../mobile/routes/mobileRouteManifest";
import AuthModal from "../components/AuthModal";
import ProducerOnboardingModal from "../components/ProducerOnboardingModal";
import WriterOnboardingModal from "../components/WriterOnboardingModal";
import AboutModal from "../components/AboutModal";
import PricingModal from "../components/PricingModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";
import { AuthContext } from "./AuthContext";
import { resolvePostAuthPath } from "../routing/audienceTransitions";

/* Global controller for the Ckript auth surfaces. Any component can pop the
   sign-in / join modal — or either role-specific onboarding modal — without
   routing away from the current page:

     const { openAuthModal, openProducerOnboarding, openWriterOnboarding } = useAuthModal();
     openAuthModal();                          // plain sign-in
     openAuthModal({ redirect: "/upload" });   // sign in, then land on /upload
     openProducerOnboarding();                 // become a producer/director
     openWriterOnboarding();                   // become a writer

   HOW an auth surface is presented is decided here and nowhere else (D59).
   Desktop opens a modal over the page the visitor was reading. Mobile navigates
   to a real native screen, because a modal has no URL and a phone needs one: a
   refresh must not lose a half-filled form, Android back must step back, and the
   OTP step routinely outlives a trip to the mail app.

   Putting the branch in the provider rather than in each caller is what keeps
   that a single decision. Every existing call site — the five mobile screens,
   the desktop invite page, PrivateRoute's `reason=auth-required` handoff and the
   axios interceptor's expired-session handoff — is already asking the right
   question ("open sign-in, and come back to here"); none of them should have to
   know the answer differs by platform.
*/

/* Whether the native account-entry routes are live for this viewer. Derived from
   the manifest rather than hardcoded, so promoting or demoting those entries
   changes this with them and cannot leave the two disagreeing. */
function useNativeAuthRoutes() {
  const isMobile = useIsMobile();
  return isMobile
    && findMobileRoute("/login")?.disposition === MOBILE_ROUTE_DISPOSITION.SCREEN;
}

/* `/login?redirect=…`, with the redirect omitted when there isn't one so the
   URL stays clean for the common case. */
const authPathWithRedirect = (base, redirect = "") => (
  redirect ? `${base}${base.includes("?") ? "&" : "?"}redirect=${encodeURIComponent(redirect)}` : base
);

const AuthModalContext = createContext({
  openAuthModal: () => {},
  closeAuthModal: () => {},
  isAuthModalOpen: false,
  openProducerOnboarding: () => {},
  closeProducerOnboarding: () => {},
  isProducerOnboardingOpen: false,
  openWriterOnboarding: () => {},
  closeWriterOnboarding: () => {},
  isWriterOnboardingOpen: false,
  openAboutModal: () => {},
  closeAboutModal: () => {},
  isAboutModalOpen: false,
  openPricingModal: () => {},
  closePricingModal: () => {},
  isPricingModalOpen: false,
  openForgotPasswordModal: () => {},
  closeForgotPasswordModal: () => {},
  isForgotPasswordModalOpen: false,
});

// The hook remains beside its provider to preserve the established public import.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuthModal = () => useContext(AuthModalContext);

export const AuthModalProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const nativeAuth = useNativeAuthRoutes();
  const [state, setState] = useState({ open: false, redirect: "" });
  const [producerOpen, setProducerOpen] = useState(false);
  const [writerOpen, setWriterOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingTab, setPricingTab] = useState("all");
  const [forgotOpen, setForgotOpen] = useState(false);

  const openAuthModal = useCallback((opts = {}) => {
    if (nativeAuth) {
      navigate(authPathWithRedirect("/login", opts.redirect || ""));
      return;
    }
    setState({ open: true, redirect: opts.redirect || "" });
  }, [nativeAuth, navigate]);

  const closeAuthModal = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const openProducerOnboarding = useCallback((opts = {}) => {
    if (nativeAuth) {
      navigate(authPathWithRedirect("/signup?as=producer", opts.redirect || ""));
      return;
    }
    setState((prev) => ({ ...prev, open: false })); // never stack the surfaces
    setWriterOpen(false);
    setProducerOpen(true);
  }, [nativeAuth, navigate]);

  const closeProducerOnboarding = useCallback(() => {
    setProducerOpen(false);
  }, []);

  const openWriterOnboarding = useCallback((opts = {}) => {
    if (nativeAuth) {
      navigate(authPathWithRedirect("/signup?as=writer", opts.redirect || ""));
      return;
    }
    setState((prev) => ({ ...prev, open: false })); // never stack the surfaces
    setProducerOpen(false);
    setWriterOpen(true);
  }, [nativeAuth, navigate]);

  const closeWriterOnboarding = useCallback(() => {
    setWriterOpen(false);
  }, []);

  const openAboutModal = useCallback(() => {
    setAboutOpen(true);
  }, []);

  const closeAboutModal = useCallback(() => {
    setAboutOpen(false);
  }, []);

  // Open the pricing surface as an overlay on the current page — no route
  // change, no scroll loss. The /pricing route still works for deep links and
  // new-tab opens via PricingRoute, which calls this on mount.
  const openPricingModal = useCallback((tab = "all") => {
    setState((prev) => ({ ...prev, open: false })); // never stack the surfaces
    setPricingTab(tab);
    setPricingOpen(true);
  }, []);

  const closePricingModal = useCallback(() => {
    setPricingOpen(false);
    // When the modal was reached by visiting /pricing directly, there's no page
    // behind it — send the visitor somewhere sensible instead of a bare route.
    if (location.pathname === "/pricing") {
      if (typeof window !== "undefined" && window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  // A session that expired mid-request lands here. The axios interceptor can't reach this context
  // (it runs outside React), so it parks the page the user was on in sessionStorage and sends them
  // to /?reason=session-expired. Pick that up once and pop sign-in with the original page as the
  // redirect, so an expiry costs them a sign-in rather than their place in the app.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(location.search);
    const reason = searchParams.get("reason");
    
    if (reason !== "session-expired" && reason !== "auth-required") return;
    
    let parked = "";
    if (reason === "session-expired") {
      try {
        parked = sessionStorage.getItem(PENDING_AUTH_REDIRECT_KEY) || "";
        sessionStorage.removeItem(PENDING_AUTH_REDIRECT_KEY); // consume once
      } catch { /* storage unavailable — still open the modal, just without a redirect */ }
    } else if (reason === "auth-required") {
      parked = searchParams.get("redirect") || "";
    }
    
    // On mobile the answer is a route, not a modal. Replacing the marker URL
    // rather than pushing means an expiry does not leave a dead `/?reason=…`
    // entry in the back stack between the visitor and where they were.
    if (nativeAuth) {
      navigate(authPathWithRedirect("/login", parked), { replace: true });
      return;
    }

    // Reading a one-shot handoff from two external systems (the URL marker and sessionStorage/params).
    // There is no render-time equivalent, and consuming the key makes this fire exactly once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ open: true, redirect: parked });
    navigate(location.pathname, { replace: true }); // drop the marker so a refresh doesn't re-trigger
  }, [location.search, location.pathname, navigate, nativeAuth]);

  // Password recovery, as an overlay. Like pricing, the /forgot-password route
  // still works for deep links via ForgotPasswordRoute.
  const openForgotPasswordModal = useCallback(() => {
    if (nativeAuth) {
      navigate("/forgot-password");
      return;
    }
    setState((prev) => ({ ...prev, open: false })); // never stack on sign-in
    setForgotOpen(true);
  }, [nativeAuth, navigate]);

  const closeForgotPasswordModal = useCallback(() => {
    setForgotOpen(false);
    if (location.pathname === "/forgot-password") {
      if (typeof window !== "undefined" && window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  // "Sign in" / "Back to sign in" from the recovery modal: dismiss it (leaving
  // the bare /forgot-password route if that's where we are) then open sign-in.
  const goToSignInFromForgot = useCallback(() => {
    if (nativeAuth) {
      navigate("/login", { replace: true });
      return;
    }
    setForgotOpen(false);
    if (location.pathname === "/forgot-password") {
      navigate("/", { replace: true });
    }
    setState({ open: true, redirect: "" });
  }, [location.pathname, navigate, nativeAuth]);

  const value = useMemo(
    () => ({
      openAuthModal,
      closeAuthModal,
      isAuthModalOpen: state.open,
      openProducerOnboarding,
      closeProducerOnboarding,
      isProducerOnboardingOpen: producerOpen,
      openWriterOnboarding,
      closeWriterOnboarding,
      isWriterOnboardingOpen: writerOpen,
      openAboutModal,
      closeAboutModal,
      isAboutModalOpen: aboutOpen,
      openPricingModal,
      closePricingModal,
      isPricingModalOpen: pricingOpen,
      openForgotPasswordModal,
      closeForgotPasswordModal,
      isForgotPasswordModalOpen: forgotOpen,
    }),
    [
      openAuthModal, closeAuthModal, state.open,
      openProducerOnboarding, closeProducerOnboarding, producerOpen,
      openWriterOnboarding, closeWriterOnboarding, writerOpen,
      openAboutModal, closeAboutModal, aboutOpen,
      openPricingModal, closePricingModal, pricingOpen,
      openForgotPasswordModal, closeForgotPasswordModal, forgotOpen,
    ]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal open={state.open} redirect={state.redirect} onClose={closeAuthModal} />
      <ProducerOnboardingModal
        open={producerOpen}
        onClose={closeProducerOnboarding}
        onComplete={() => {
          closeProducerOnboarding();
          navigate("/?investorReview=pending", { replace: true });
        }}
      />
      <WriterOnboardingModal
        open={writerOpen}
        onClose={closeWriterOnboarding}
        onComplete={() => {
          closeWriterOnboarding();
          const target = resolvePostAuthPath({ requestedPath: state.redirect || "/profile", user });
          if (state.redirect) setState((prev) => ({ ...prev, redirect: "" }));
          navigate(target, { replace: true });
        }}
      />
      <AboutModal open={aboutOpen} onClose={closeAboutModal} />
      <PricingModal open={pricingOpen} onClose={closePricingModal} tab={pricingTab} />
      <ForgotPasswordModal
        open={forgotOpen}
        onClose={closeForgotPasswordModal}
        onSignIn={goToSignInFromForgot}
      />
    </AuthModalContext.Provider>
  );
};

export default AuthModalContext;

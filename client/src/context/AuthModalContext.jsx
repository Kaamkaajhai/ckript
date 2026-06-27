import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import ProducerOnboardingModal from "../components/ProducerOnboardingModal";
import WriterOnboardingModal from "../components/WriterOnboardingModal";
import AboutModal from "../components/AboutModal";
import PricingModal from "../components/PricingModal";
import ForgotPasswordModal from "../components/ForgotPasswordModal";

/* Global controller for the Ckript auth surfaces. Any component can pop the
   sign-in / join modal — or either role-specific onboarding modal — without
   routing away from the current page:

     const { openAuthModal, openProducerOnboarding, openWriterOnboarding } = useAuthModal();
     openAuthModal();                          // plain sign-in
     openAuthModal({ redirect: "/upload" });   // sign in, then land on /upload
     openProducerOnboarding();                 // become a producer/director
     openWriterOnboarding();                   // become a writer
*/

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

export const useAuthModal = () => useContext(AuthModalContext);

export const AuthModalProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState({ open: false, redirect: "" });
  const [producerOpen, setProducerOpen] = useState(false);
  const [writerOpen, setWriterOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const openAuthModal = useCallback((opts = {}) => {
    setState({ open: true, redirect: opts.redirect || "" });
  }, []);

  const closeAuthModal = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const openProducerOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, open: false })); // never stack the surfaces
    setWriterOpen(false);
    setProducerOpen(true);
  }, []);

  const closeProducerOnboarding = useCallback(() => {
    setProducerOpen(false);
  }, []);

  const openWriterOnboarding = useCallback(() => {
    setState((prev) => ({ ...prev, open: false })); // never stack the surfaces
    setProducerOpen(false);
    setWriterOpen(true);
  }, []);

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
  const openPricingModal = useCallback(() => {
    setState((prev) => ({ ...prev, open: false })); // never stack the surfaces
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

  // Password recovery, as an overlay. Like pricing, the /forgot-password route
  // still works for deep links via ForgotPasswordRoute.
  const openForgotPasswordModal = useCallback(() => {
    setState((prev) => ({ ...prev, open: false })); // never stack on sign-in
    setForgotOpen(true);
  }, []);

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
    setForgotOpen(false);
    if (location.pathname === "/forgot-password") {
      navigate("/", { replace: true });
    }
    setState({ open: true, redirect: "" });
  }, [location.pathname, navigate]);

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
          navigate("/profile", { replace: true });
        }}
      />
      <AboutModal open={aboutOpen} onClose={closeAboutModal} />
      <PricingModal open={pricingOpen} onClose={closePricingModal} />
      <ForgotPasswordModal
        open={forgotOpen}
        onClose={closeForgotPasswordModal}
        onSignIn={goToSignInFromForgot}
      />
    </AuthModalContext.Provider>
  );
};

export default AuthModalContext;

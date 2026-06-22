import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthModal from "../components/AuthModal";
import ProducerOnboardingModal from "../components/ProducerOnboardingModal";
import WriterOnboardingModal from "../components/WriterOnboardingModal";
import AboutModal from "../components/AboutModal";

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
});

export const useAuthModal = () => useContext(AuthModalContext);

export const AuthModalProvider = ({ children }) => {
  const navigate = useNavigate();
  const [state, setState] = useState({ open: false, redirect: "" });
  const [producerOpen, setProducerOpen] = useState(false);
  const [writerOpen, setWriterOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

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
    }),
    [
      openAuthModal, closeAuthModal, state.open,
      openProducerOnboarding, closeProducerOnboarding, producerOpen,
      openWriterOnboarding, closeWriterOnboarding, writerOpen,
      openAboutModal, closeAboutModal, aboutOpen,
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
    </AuthModalContext.Provider>
  );
};

export default AuthModalContext;

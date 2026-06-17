import { createContext, useCallback, useContext, useMemo, useState } from "react";
import AuthModal from "../components/AuthModal";

/* Global controller for the Ckript auth modal. Any component can pop the
   sign-in / join surface without routing away from the current page:

     const { openAuthModal } = useAuthModal();
     openAuthModal();                       // plain sign-in
     openAuthModal({ redirect: "/upload" }); // sign in, then land on /upload
*/

const AuthModalContext = createContext({
  openAuthModal: () => {},
  closeAuthModal: () => {},
  isAuthModalOpen: false,
});

export const useAuthModal = () => useContext(AuthModalContext);

export const AuthModalProvider = ({ children }) => {
  const [state, setState] = useState({ open: false, redirect: "" });

  const openAuthModal = useCallback((opts = {}) => {
    setState({ open: true, redirect: opts.redirect || "" });
  }, []);

  const closeAuthModal = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const value = useMemo(
    () => ({ openAuthModal, closeAuthModal, isAuthModalOpen: state.open }),
    [openAuthModal, closeAuthModal, state.open]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <AuthModal open={state.open} redirect={state.redirect} onClose={closeAuthModal} />
    </AuthModalContext.Provider>
  );
};

export default AuthModalContext;

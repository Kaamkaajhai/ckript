import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "../../components/Icon";
import { ACCOUNT_MENU } from "../../data/dashboardData";
import "./AccountMenu.css";

/*
 * AccountMenu — the avatar dropdown (reference screen 05) plus a logout
 * confirmation dialog. Menu items other than Log out are desktop-only for
 * now and route through onSelect → the Dynamic Island. Log out is real: it
 * confirms, then calls the app's auth logout.
 */
export default function AccountMenu({ open, onClose, onSelect, onLogout, userName }) {
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    setConfirming(false);
    onClose?.();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="ckm-acct__layer">
          <motion.div
            className="ckm-acct__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
          />

          <motion.div
            className="ckm-acct"
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 460, damping: 32 }}
          >
            {ACCOUNT_MENU.map((m) => (
              <button
                key={m.id}
                type="button"
                className="ckm-acct__item"
                onClick={() => onSelect?.(m)}
              >
                <Icon name={m.icon} size={18} color="var(--ckm-text-2)" />
                <span>{m.label}</span>
              </button>
            ))}
            <div className="ckm-acct__sep" />
            <button type="button" className="ckm-acct__item is-danger" onClick={() => setConfirming(true)}>
              <Icon name="logout" size={18} color="var(--ckm-danger)" />
              <span>Log out</span>
            </button>
          </motion.div>

          <AnimatePresence>
            {confirming && (
              <motion.div
                className="ckm-acct__confirm-layer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <motion.div
                  className="ckm-acct__dialog"
                  initial={{ opacity: 0, scale: 0.94, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 440, damping: 34 }}
                >
                  <div className="ckm-acct__dialog-icon">
                    <Icon name="logout" size={24} color="var(--ckm-accent)" />
                  </div>
                  <h3 className="ckm-acct__dialog-title">Log out</h3>
                  <p className="ckm-acct__dialog-body">
                    Are you sure you want to log out{userName ? ` of ${userName}` : ""}?
                  </p>
                  <div className="ckm-acct__dialog-actions">
                    <button type="button" className="ckm-acct__dialog-cancel" onClick={() => setConfirming(false)}>
                      Cancel
                    </button>
                    <button type="button" className="ckm-acct__dialog-confirm" onClick={onLogout}>
                      Log out
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}

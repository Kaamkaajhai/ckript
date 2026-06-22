import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useFilmIndustryProfessionalCheckout from "../hooks/useFilmIndustryProfessionalCheckout";
import "./PricingModal.css";

/* ─────────────────────────────────────────────────────────────
   Ckript — Pricing modal.

   Port of "Pricing Modal.dc.html" · Design B (centered single column)
   from the Claude Design handoff. Opened from the landing "Pricing"
   nav + footer links instead of routing to the /pricing page.

   The plan is the ₹1999 / month "Film Industry Professional" membership —
   the same plan /pricing sells. Both surfaces share one Razorpay flow via
   useFilmIndustryProfessionalCheckout, so the modal is a real checkout, not
   a decorative card: it reflects signed-out, wrong-role, already-active,
   loading, error and success states, then updates the live session on
   success. The /pricing route is kept intact for deep links + SEO.
   ───────────────────────────────────────────────────────────── */

const FONT_LINK_ID = "ckript-authmodal-fonts";
function ensureModalFonts() {
  if (typeof document === "undefined" || document.getElementById(FONT_LINK_ID)) return;
  const pre1 = document.createElement("link");
  pre1.rel = "preconnect";
  pre1.href = "https://fonts.googleapis.com";
  const pre2 = document.createElement("link");
  pre2.rel = "preconnect";
  pre2.href = "https://fonts.gstatic.com";
  pre2.crossOrigin = "anonymous";
  const sheet = document.createElement("link");
  sheet.id = FONT_LINK_ID;
  sheet.rel = "stylesheet";
  sheet.href =
    "https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap";
  document.head.append(pre1, pre2, sheet);
}

/* 1:1 with the design's bullet copy. */
const FEATURES = [
  "15 verified writer contacts — email, LinkedIn & phone.",
  "Direct messaging with 15 writers for deals & IP.",
  "Up to 15 on-platform meetings with writers.",
  "Curated scripts mailed to you by genre.",
];

const LockIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="11" width="14" height="10" rx="1" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const daysLeftFrom = (expiresAt) => {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
};

function PricingModalInner({ onClose }) {
  const navigate = useNavigate();
  const titleId = useId();
  const cardRef = useRef(null);
  const previouslyFocused = useRef(null);

  const {
    user,
    authLoading,
    isEligibleRole,
    hasAccess,
    loading,
    error,
    message,
    startCheckout,
  } = useFilmIndustryProfessionalCheckout();

  // verifyData.redirectTo captured on success so "Continue" lands the new
  // member where the backend wants them.
  const [success, setSuccess] = useState(null); // null | { redirectTo }

  const roleLabel = String(user?.role || "").trim() || "guest";
  const daysLeft = hasAccess ? daysLeftFrom(user?.subscription?.accessExpiresAt) : null;

  const goTo = useCallback(
    (path) => {
      onClose();
      navigate(path || "/home");
    },
    [navigate, onClose]
  );

  const buy = useCallback(
    (isRenew = false) => {
      startCheckout({
        isRenew,
        signInRedirect: "/pricing",
        onSuccess: (verifyData) => setSuccess({ redirectTo: verifyData?.redirectTo || "/home" }),
        onAlreadyActive: () => goTo("/home"),
        // Close this modal before the auth surface opens — it renders last in
        // the provider and would otherwise stack on top of sign-in.
        onRequireAuth: onClose,
      });
    },
    [startCheckout, goTo, onClose]
  );

  // Primary button label mirrors the /pricing page so the two surfaces read
  // identically across every account state.
  const ctaLabel = useMemo(() => {
    if (authLoading) return "Checking session…";
    if (loading) return "Processing…";
    if (hasAccess) return "Go to your dashboard";
    if (!user) return "Sign in to continue";
    if (!isEligibleRole) return "Not available for your account type";
    return "Pay securely with Razorpay";
  }, [authLoading, loading, hasAccess, user, isEligibleRole]);

  const ctaDisabled = authLoading || loading || (Boolean(user) && !hasAccess && !isEligibleRole);

  const onPrimary = useCallback(() => {
    if (hasAccess) {
      goTo("/home");
      return;
    }
    buy(false);
  }, [hasAccess, goTo, buy]);

  // Modal chrome: fonts, scroll lock, Esc, focus restore.
  useEffect(() => {
    ensureModalFonts();
    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") prev.focus({ preventScroll: true });
    };
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      // Never let Esc dismiss mid-payment — the Razorpay popup owns the screen.
      if (e.key === "Escape" && !loading) {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose, loading]
  );

  return (
    <motion.div
      className="pm-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        ref={cardRef}
        className="pm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loading || undefined}
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {success ? (
          /* ── Success ─────────────────────────────────────────── */
          <div className="pm-success">
            <div className="pm-success-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="pm-success-kicker">Access granted</div>
            <h2 className="pm-success-title" id={titleId}>You're in, Professional.</h2>
            <p className="pm-success-body">
              Your Film Industry Professional membership is now active. Writer contacts, direct
              messaging and meetings are unlocked.
            </p>
            <button type="button" className="pm-cta pm-cta--active" onClick={() => goTo(success.redirectTo)}>
              Continue
            </button>
          </div>
        ) : (
          /* ── Plan ────────────────────────────────────────────── */
          <>
            <div className="pm-eyebrow">
              <i />
              <span>Membership</span>
            </div>

            <div className="pm-price">₹1999</div>
            <div className="pm-per">per month</div>

            {hasAccess && (
              <div>
                <span className="pm-status pm-status--active">
                  <i />
                  Active
                </span>
                {daysLeft !== null && <span className="pm-status pm-status--days">{daysLeft}d left</span>}
              </div>
            )}

            <h2 className="pm-title" id={titleId}>Film Industry Professional</h2>
            <p className="pm-sub">
              {hasAccess
                ? "Your membership is active — full access to the writer network."
                : "One plan, full access to the writer network."}
            </p>

            <div className="pm-rule" />

            <ul className="pm-features">
              {FEATURES.map((f) => (
                <li key={f}>
                  <i />
                  {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={`pm-cta${hasAccess ? " pm-cta--active" : ""}`}
              onClick={onPrimary}
              disabled={ctaDisabled}
            >
              {loading ? (
                <span className="pm-spinner" aria-hidden="true" />
              ) : (
                !hasAccess && !authLoading && (!user || isEligibleRole) && <LockIcon />
              )}
              {ctaLabel}
            </button>

            {hasAccess && (
              <button type="button" className="pm-secondary" onClick={() => buy(true)} disabled={loading}>
                {loading ? "Working…" : "Renew plan"}
              </button>
            )}

            {message && <div className="pm-msg pm-msg--info">{message}</div>}
            {error && <div className="pm-msg pm-msg--error">{error}</div>}

            {user && !isEligibleRole && !hasAccess ? (
              <div className="pm-msg pm-msg--warn">
                This plan is for film industry professionals. Your account type ({roleLabel}) is not
                eligible.
              </div>
            ) : (
              <p className="pm-note">For verified film-industry professionals.</p>
            )}
          </>
        )}

        <button type="button" className="pm-close" aria-label="Close" onClick={onClose} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function PricingModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && <PricingModalInner key="pricing-modal" onClose={onClose} />}
    </AnimatePresence>
  );
}

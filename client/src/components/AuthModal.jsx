import { useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import OTPVerification from "./OTPVerification";
import GoogleSignInButton from "./GoogleSignInButton";
import PasswordInput from "./PasswordInput";
import "./AuthModal.css";

/* ─────────────────────────────────────────────────────────────
   Ckript Sign-Up / Sign-In Modal
   Port of the "Ckript Sign Up Modal.dc.html" Claude Design handoff.

   It is a *combined* auth surface: returning users sign in inline
   (email/password + Google, with OTP fallback) while new users pick
   a role and hand off to the role-specific onboarding flow.

   Behaviour locked in from the design chat:
   - Hovering "Join as Writer" / "Join as Producer" crossfades the
     left photo to a relevant shot with a subtle in-frame zoom.
   - No red tint on hover (explicitly removed late in the design
     iteration) — just the picture swap + the role card turning red.

   Styling lives in AuthModal.css (bundled, so it applies on first
   paint). Fonts load separately via a non-blocking <link> so they
   can never delay the modal's layout. See ensureAuthModalFonts().
   ───────────────────────────────────────────────────────────── */

/* Left-image set — relevant Unsplash photos (each verified to return 200).
   Keys map to the role hovered; `default` is the resting frame: a cinema
   interior, echoing the "Where stories become films" subtitle. */
const UNSPLASH = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1000&q=80`;
const IMAGES = {
  default: { src: UNSPLASH("photo-1485846234645-a62644f84728"), alt: "Cinema auditorium" },
  writer: { src: UNSPLASH("photo-1455390582262-044cdead277a"), alt: "Writing a manuscript by hand" },
  producer: { src: UNSPLASH("photo-1478720568477-152d9b164e26"), alt: "Film reel for production" },
};

/* Role cards. Destinations match the existing /join (RoleSelection) flow so
   the heavy, role-specific onboarding (address/phone for producers, etc.)
   stays the single source of truth. */
const ROLE_CARDS = [
  {
    key: "writer",
    title: "JOIN AS WRITER",
    blurb: "Showcase scripts and connect with producers.",
    to: "/writer-onboarding",
  },
  {
    key: "producer",
    title: "JOIN AS PRODUCER",
    blurb: "Discover stories and secure your next production.",
    to: "/producer-director-onboarding",
  },
];

/* Load the landing page's webfonts once, lazily, via <link> tags so the modal
   reads as part of the same brand: Baskervville for the display heading and
   PT Serif for body copy (Helvetica Neue / Arial for UI text are system fonts).

   Why <link> and not an @import inside the modal's stylesheet: a sheet that
   begins with @import is "loading" until the fetch resolves, and the browser
   withholds *all* of that sheet's rules until then. Putting layout CSS behind
   such an import makes the modal paint unstyled (in normal flow) until fonts
   arrive. A separate <link> can't block AuthModal.css, so the modal lays out
   instantly and the text swaps to the brand fonts when they load (display=swap). */
const FONT_LINK_ID = "ckript-authmodal-fonts";
function ensureAuthModalFonts() {
  if (typeof document === "undefined" || document.getElementById(FONT_LINK_ID)) return;

  const preconnect1 = document.createElement("link");
  preconnect1.rel = "preconnect";
  preconnect1.href = "https://fonts.googleapis.com";

  const preconnect2 = document.createElement("link");
  preconnect2.rel = "preconnect";
  preconnect2.href = "https://fonts.gstatic.com";
  preconnect2.crossOrigin = "anonymous";

  const sheet = document.createElement("link");
  sheet.id = FONT_LINK_ID;
  sheet.rel = "stylesheet";
  sheet.href =
    "https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap";

  document.head.append(preconnect1, preconnect2, sheet);
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])';

const getSafeRedirectPath = (value = "") => {
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/")) return "";
  if (path.startsWith("//")) return "";
  if (path.startsWith("/login")) return "";
  return path;
};

const defaultPathForRole = (role) => {
  if (role === "reader") return "/reader";
  if (role === "investor") return "/home";
  return "/dashboard";
};

function AuthModalInner({ redirect, onClose }) {
  const { user, login, setUser } = useContext(AuthContext);
  const { openProducerOnboarding, openWriterOnboarding, openForgotPasswordModal } = useAuthModal();
  const navigate = useNavigate();
  const titleId = useId();

  const cardRef = useRef(null);
  const emailRef = useRef(null);
  const previouslyFocused = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(null); // null | "writer" | "producer"

  // OTP step state (mirrors Login.jsx).
  const [showOTP, setShowOTP] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpConfig, setOtpConfig] = useState({
    otpExpirySeconds: undefined,
    resendCooldownSeconds: undefined,
    startCooldownOnMount: false,
  });

  const finishAuth = useCallback(
    (userData = {}) => {
      onClose();
      const safeRedirect = getSafeRedirectPath(redirect);
      navigate(safeRedirect || defaultPathForRole(userData?.role), { replace: false });
    },
    [navigate, onClose, redirect]
  );

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const userData = await login(email, password);
      if (userData?.requiresVerification) {
        setOtpEmail(userData?.email || String(email).trim().toLowerCase());
        setOtpConfig({
          otpExpirySeconds: userData?.otpExpirySeconds,
          resendCooldownSeconds: userData?.resendCooldownSeconds,
          startCooldownOnMount: false,
        });
        setShowOTP(true);
        setLoading(false);
        return;
      }
      const stored = JSON.parse(localStorage.getItem("user") || "null");
      finishAuth(stored || userData || {});
    } catch (err) {
      const data = err.response?.data;
      if (data?.requiresVerification) {
        setOtpEmail(data.email || String(email).trim().toLowerCase());
        setOtpConfig({
          otpExpirySeconds: data?.otpExpirySeconds,
          resendCooldownSeconds: data?.resendCooldownSeconds,
          startCooldownOnMount: false,
        });
        setShowOTP(true);
        setLoading(false);
        return;
      }
      setError(
        data?.message ||
          (err.code === "ERR_NETWORK"
            ? "Unable to reach the server. Please try again."
            : "Sign in failed. Check your email and password.")
      );
      setLoading(false);
    }
  };

  const goToRole = (card) => {
    // Both roles now get the in-context onboarding modal (no page nav); the
    // dedicated routes still exist for deep links / SEO.
    if (card.key === "producer") {
      openProducerOnboarding();
      return;
    }
    if (card.key === "writer") {
      openWriterOnboarding();
      return;
    }
    onClose();
    navigate(card.to);
  };

  const goToForgot = () => {
    // Hand off to the recovery modal as an overlay — no route change. It closes
    // this surface first so the two never stack.
    openForgotPasswordModal();
  };

  // Esc to close + basic focus trap, scoped to the dialog while open.
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !cardRef.current) return;
      const nodes = Array.from(cardRef.current.querySelectorAll(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  // Lock body scroll, remember/restore focus, autofocus the email field.
  // preventScroll keeps focusing from nudging the viewport even on slow paints.
  useEffect(() => {
    ensureAuthModalFonts();
    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 60);
    return () => {
      document.body.style.overflow = overflow;
      clearTimeout(t);
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") prev.focus({ preventScroll: true });
    };
  }, []);

  // If the user becomes authenticated while open (e.g. Google popup), close.
  useEffect(() => {
    if (user && !showOTP) onClose();
  }, [user, showOTP, onClose]);

  if (showOTP) {
    return (
      <motion.div
        className="ckam-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ padding: 0, background: "#080e18" }}
      >
        <div style={{ width: "100%", height: "100%", overflowY: "auto" }}>
          <OTPVerification
            email={otpEmail}
            darkBackground
            otpExpirySeconds={otpConfig.otpExpirySeconds}
            initialResendCooldownSeconds={otpConfig.resendCooldownSeconds}
            startCooldownOnMount={otpConfig.startCooldownOnMount}
            onSuccess={(userData) => {
              setUser(userData);
              setShowOTP(false);
              finishAuth(userData);
            }}
            onBack={() => setShowOTP(false)}
          />
        </div>
      </motion.div>
    );
  }

  const activeImage = hovered || "default";

  return (
    <motion.div
      className="ckam-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        // Close only on a genuine backdrop click (not a drag ending on backdrop).
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        ref={cardRef}
        className="ckam-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.985 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {/* Left image — crossfades + subtly zooms on role hover. */}
        <div className="ckam-img-col" aria-hidden="true">
          <div className="ckam-img-frame">
            {Object.entries(IMAGES).map(([key, img]) => {
              const isActive = key === activeImage;
              return (
                <img
                  key={key}
                  className="ckam-img"
                  src={img.src}
                  alt=""
                  loading="eager"
                  draggable={false}
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: hovered && isActive ? "scale(1.05)" : "scale(1)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Right content */}
        <div className="ckam-content">
          <h1 className="ckam-title" id={titleId}>
            WELCOME
            <br />
            TO CKRIPT
          </h1>
          <p className="ckam-subtitle">Where stories become films.</p>
          <div className="ckam-square" aria-hidden="true" />

          {error && (
            <div className="ckam-error" role="alert">
              <AlertCircle size={16} style={{ flex: "none" }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignIn}>
            <label className="ckam-label" htmlFor={`${titleId}-email`} style={{ display: "block", marginTop: 12 }}>
              Email
            </label>
            <input
              id={`${titleId}-email`}
              ref={emailRef}
              className="ckam-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              required
            />

            <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <label className="ckam-label" htmlFor={`${titleId}-password`}>
                Password
              </label>
              <button type="button" className="ckam-forgot" onClick={goToForgot}>
                Forgot?
              </button>
            </div>
            <div className="ckam-password">
              <PasswordInput
                id={`${titleId}-password`}
                className="ckam-input"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                required
              />
            </div>

            <button type="submit" className="ckam-signin" disabled={loading}>
              {loading && <span className="ckam-spinner" />}
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="ckam-divider" aria-hidden="true">
            <i />
            <span>OR</span>
            <i />
          </div>

          <div className="ckam-google">
            <GoogleSignInButton
              text="continue_with"
              onSuccess={(userData) => finishAuth(userData || {})}
              onError={(msg, data) => {
                if (data?.accountNotFound) {
                  setError("No account found for that Google email. Create one below to get started.");
                  return;
                }
                setError(msg);
              }}
            />
          </div>

          {ROLE_CARDS.map((card) => (
            <button
              key={card.key}
              type="button"
              className="ckam-role"
              onClick={() => goToRole(card)}
              onMouseEnter={() => setHovered(card.key)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(card.key)}
              onBlur={() => setHovered(null)}
            >
              <span className="ckam-role-title">{card.title}</span>
              <span className="ckam-role-blurb">{card.blurb}</span>
            </button>
          ))}
        </div>

        <button type="button" className="ckam-close" aria-label="Close" onClick={onClose}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <line x1="5" y1="5" x2="19" y2="19" />
            <line x1="19" y1="5" x2="5" y2="19" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function AuthModal({ open, redirect = "", onClose }) {
  return (
    <AnimatePresence>
      {open && <AuthModalInner key="auth-modal" redirect={redirect} onClose={onClose} />}
    </AnimatePresence>
  );
}

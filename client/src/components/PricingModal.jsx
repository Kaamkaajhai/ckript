import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import useWriterPlanCheckout, { WRITER_TIERS } from "../hooks/useWriterPlanCheckout";
import useFilmIndustryProfessionalCheckout from "../hooks/useFilmIndustryProfessionalCheckout";
import { useAuthModal } from "../context/AuthModalContext";
import { useToast } from "../context/ToastContext";
import useScrollLock from "../hooks/useScrollLock";
import api from "../services/api";
import "./PricingModal.css";

/* ─────────────────────────────────────────────────────────────
   Ckript — Pricing modal · Design E ("Writer trio + industry ribbon").

   Port of "Pricing Modal v3.dc.html" from the Claude Design handoff. One
   editorial surface for the whole pricing story — the Free / Silver / Gold
   writer tiers as a three-up grid, with the ₹1999 Film Industry Professional
   plan as a ribbon beneath. It is the canonical pricing surface: opened as an
   overlay from anywhere via useAuthModal().openPricingModal(), and rendered by
   the /pricing route for deep links / new-tab opens.

   It is a real, account-aware checkout, not a static card. Writer plans run
   through useWriterPlanCheckout; the industry ribbon through
   useFilmIndustryProfessionalCheckout. Both share one Razorpay contract, so the
   button you see always matches what the backend will do — signed-out, wrong
   role, already-active, mid-payment, error and success states all included.
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

/* 1:1 with the design's copy. */
const WRITER_PLANS = [
  {
    key: "free",
    name: "Free",
    price: "₹0",
    per: "/ forever",
    feats: ["1 script upload.", "Search listing.", "AI synopsis & logline."],
  },
  {
    key: "silver",
    name: "Silver",
    price: "₹399",
    per: "/ month",
    feats: ["8 script uploads.", "Top script sections.", "AI evaluation & views."],
  },
  {
    key: "gold",
    name: "Gold",
    price: "₹699",
    per: "/ month",
    variant: "gold",
    chip: "Best",
    feats: ["20 script uploads.", "Featured section.", "Reader eval & pitch video."],
  },
];

const FIP = {
  name: "Film Industry Professional",
  desc: "10 verified writer contacts · direct messaging · 10 meetings · curated inbox.",
  price: "₹1999",
};

const LockIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="1" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

const Spinner = () => <span className="pmx-spinner" aria-hidden="true" />;

const FOCUSABLE =
  'a[href],button:not(:disabled),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/* ── A writer tier card ───────────────────────────────────────── */
function TierCard({ plan, state }) {
  const { variant, chip } = plan;
  const isGold = variant === "gold";
  const {
    active,
    daysLeft,
    quota,
    uploadedCount,
    primaryLabel,
    primaryKind,
    primaryDisabled,
    primaryLoading,
    primaryLock,
    onPrimary,
    onRenew,
    renewLoading,
  } = state;

  const remaining = quota != null && uploadedCount != null ? Math.max(0, quota - uploadedCount) : null;
  const quotaFull = quota != null && uploadedCount != null && uploadedCount >= quota;

  return (
    <div className={`pmx-tier${isGold ? " pmx-tier--gold" : ""}`}>
      {isGold && <span className="pmx-tier-bar" />}

      <div className="pmx-tier-top">
        <span className="pmx-tier-name">{plan.name}</span>
        {active ? (
          <span className="pmx-pill pmx-pill--active"><i />Active</span>
        ) : chip ? (
          <span className="pmx-chip pmx-chip--best">{chip}</span>
        ) : null}
      </div>

      <div className="pmx-tier-price">
        <b>{plan.price}</b>
        <span>{plan.per}</span>
      </div>

      {active && daysLeft > 0 && (
        <div className="pmx-pills">
          <span className="pmx-pill pmx-pill--days">{daysLeft} days left</span>
        </div>
      )}

      <div className="pmx-tier-divider" />

      <ul className="pmx-feats">
        {plan.feats.map((f) => (
          <li key={f}>
            <i />
            {f}
          </li>
        ))}
      </ul>

      {active && quota != null && uploadedCount != null && (
        <div className="pmx-quota">
          <div className="pmx-quota-row">
            <span>Scripts uploaded</span>
            <span>
              <b>{uploadedCount}</b> / {quota}
            </span>
          </div>
          <div className="pmx-quota-track">
            <div
              className={`pmx-quota-fill${quotaFull ? " pmx-quota-fill--full" : ""}`}
              style={{ width: `${Math.min(100, (uploadedCount / quota) * 100)}%` }}
            />
          </div>
          <div className="pmx-quota-row" style={{ marginTop: 5 }}>
            <span />
            <span>{remaining} more available</span>
          </div>
        </div>
      )}

      <div className="pmx-tier-actions">
        <button
          type="button"
          className={`pmx-btn pmx-btn--${primaryKind}`}
          onClick={onPrimary}
          disabled={primaryDisabled || primaryLoading}
        >
          {primaryLoading ? <Spinner /> : primaryLock ? <LockIcon /> : null}
          {primaryLabel}
        </button>
        {onRenew && (
          <button type="button" className="pmx-btn pmx-btn--ghost" onClick={onRenew} disabled={renewLoading}>
            {renewLoading ? "Working…" : "Renew plan"}
          </button>
        )}
      </div>
    </div>
  );
}

function PricingModalInner({ onClose }) {
  const navigate = useNavigate();
  const titleId = useId();
  const cardRef = useRef(null);
  const previouslyFocused = useRef(null);

  const writer = useWriterPlanCheckout();
  const fip = useFilmIndustryProfessionalCheckout();
  const { openAuthModal } = useAuthModal();
  const toast = useToast();

  // Unified success view: whichever plan was purchased, we land the new member
  // with one confident screen. null | { kicker, title, body, redirectTo }
  const [success, setSuccess] = useState(null);

  // Upload usage for active writers, to draw the quota meter (same source the
  // dashboard uses). Fetched lazily while the modal is open.
  const [uploadedCount, setUploadedCount] = useState(null);
  useEffect(() => {
    if (!writer.isWriter) return;
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/scripts/mine");
        const all = Array.isArray(res.data) ? res.data : [];
        const mine = all.filter((s) => !s?.isCollaborator);
        if (alive) setUploadedCount(mine.length);
      } catch {
        /* non-fatal — the meter just won't render */
      }
    })();
    return () => {
      alive = false;
    };
  }, [writer.isWriter]);

  const busy = !success && (Boolean(writer.loading) || Boolean(fip.loading));

  const goTo = useCallback(
    (path) => {
      onClose();
      navigate(path || "/home");
    },
    [navigate, onClose]
  );

  // ── Writer plan checkout wiring ───────────────────────────────
  const buyWriter = useCallback(
    (tier, isRenew = false) => {
      writer.startCheckout({
        tier,
        isRenew,
        signInRedirect: "/pricing",
        onRequireAuth: onClose, // never stack auth behind this modal
        onSuccess: () =>
          setSuccess({
            kicker: "Access granted",
            title: "You're all set.",
            body: `Your ${WRITER_TIERS[tier].label} plan is active. Upload more scripts and reach the top sections from your dashboard.`,
            redirectTo: "/dashboard",
          }),
      });
    },
    [writer, onClose]
  );

  // ── FIP checkout wiring ───────────────────────────────────────
  const buyFip = useCallback(
    (isRenew = false) => {
      fip.startCheckout({
        isRenew,
        signInRedirect: "/pricing",
        onRequireAuth: onClose,
        onAlreadyActive: () => goTo("/home"),
        onSuccess: (verifyData) =>
          setSuccess({
            kicker: "Access granted",
            title: "You're in, Professional.",
            body:
              "Your Film Industry Professional membership is now active. Writer contacts, direct messaging and meetings are unlocked.",
            redirectTo: verifyData?.redirectTo || "/home",
          }),
      });
    },
    [fip, onClose, goTo]
  );

  // ── Per-tier button derivation ────────────────────────────────
  // The free tier needs no payment, so its signed-out path opens the auth modal
  // directly (the checkout hook is payment-only). Silver/Gold defer to the hook.
  const tierState = useCallback(
    (key) => {
      const signedOut = !writer.user;
      const wrongRole = Boolean(writer.user) && !writer.isWriter;
      // Don't let anyone act until we know who they are — mirrors the gating the
      // old /pricing page added before it became this modal.
      const checkingSession = writer.authLoading;

      if (key === "free") {
        const active = writer.isWriter && !writer.hasSilverAccess && !writer.hasGoldAccess;
        return {
          active,
          quota: null,
          primaryLabel: checkingSession ? "Checking session…" : signedOut ? "Start free" : "Go to dashboard",
          primaryKind: active ? "active" : "outline",
          primaryDisabled: checkingSession,
          primaryLoading: false,
          primaryLock: false,
          onPrimary: () => {
            if (signedOut) {
              onClose();
              openAuthModal({ redirect: "/dashboard" });
            } else {
              goTo("/dashboard");
            }
          },
        };
      }

      const meta = WRITER_TIERS[key]; // silver | gold
      const active = key === "silver" ? writer.hasSilverAccess : writer.hasGoldAccess;
      const loadingThis = writer.loading === key;

      if (active) {
        return {
          active: true,
          daysLeft: writer.daysLeft,
          quota: meta.quota,
          uploadedCount,
          primaryLabel: "Go to dashboard",
          primaryKind: "active",
          primaryDisabled: false,
          primaryLoading: false,
          primaryLock: false,
          onPrimary: () => goTo("/dashboard"),
          onRenew: () => buyWriter(key, true),
          renewLoading: loadingThis,
        };
      }

      return {
        active: false,
        quota: null,
        primaryLabel: loadingThis
          ? "Processing…"
          : checkingSession
            ? "Checking session…"
            : wrongRole
              ? "For writers only"
              : "Choose",
        primaryKind: key === "gold" ? "accent" : "outline",
        primaryDisabled: wrongRole || checkingSession,
        primaryLoading: loadingThis,
        primaryLock: false,
        onPrimary: () => buyWriter(key, false),
      };
    },
    [writer, uploadedCount, goTo, buyWriter, onClose, openAuthModal]
  );

  const freeState = useMemo(() => tierState("free"), [tierState]);
  const silverState = useMemo(() => tierState("silver"), [tierState]);
  const goldState = useMemo(() => tierState("gold"), [tierState]);
  const stateByKey = { free: freeState, silver: silverState, gold: goldState };

  // ── FIP ribbon derivation ─────────────────────────────────────
  const fipState = useMemo(() => {
    if (fip.hasAccess) {
      const expiresAt = fip.user?.subscription?.accessExpiresAt;
      const dLeft = expiresAt
        ? Math.max(0, Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)))
        : null;
      return {
        active: true,
        daysLeft: dLeft,
        label: "Go to dashboard",
        kind: "active",
        disabled: false,
        loading: false,
        lock: false,
        onClick: () => goTo("/home"),
        onRenew: () => buyFip(true),
      };
    }
    if (fip.authLoading) {
      return { label: "Checking…", kind: "buy", disabled: true, loading: false, lock: false, onClick: () => {} };
    }
    if (Boolean(fip.user) && !fip.isEligibleRole) {
      return {
        label: "For industry pros",
        kind: "buy",
        disabled: true,
        loading: false,
        lock: false,
        onClick: () => {},
      };
    }
    return {
      label: fip.loading ? "Processing…" : "Get access",
      kind: "buy",
      disabled: false,
      loading: Boolean(fip.loading),
      lock: !fip.loading,
      onClick: () => buyFip(false),
    };
  }, [fip, goTo, buyFip]);

  useScrollLock();

  // ── Modal chrome: fonts, focus restore ────────────────────────
  useEffect(() => {
    ensureModalFonts();
    previouslyFocused.current = document.activeElement;
    // Move focus into the dialog for screen readers + keyboard users.
    const id = window.setTimeout(() => {
      const node = cardRef.current?.querySelector(FOCUSABLE);
      node?.focus?.({ preventScroll: true });
    }, 30);
    return () => {
      window.clearTimeout(id);
      const prev = previouslyFocused.current;
      if (prev && typeof prev.focus === "function") prev.focus({ preventScroll: true });
    };
  }, []);

  // Esc to close (never mid-payment) + a lightweight focus trap.
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape" && !busy) {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const nodes = cardRef.current?.querySelectorAll(FOCUSABLE);
        if (!nodes || nodes.length === 0) return;
        const list = Array.from(nodes);
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose, busy]
  );

  const globalMsg = writer.message || fip.message;
  const globalErr = writer.error || fip.error;

  // Checkout feedback surfaces as a toast above the modal, never as an in-card
  // banner — consistent with the auth surfaces. The terminal success *screen*
  // (a deliberate post-payment confirmation) is intentionally kept.
  useEffect(() => {
    if (globalErr) toast.error(globalErr);
  }, [globalErr, toast]);
  useEffect(() => {
    if (globalMsg) toast.info(globalMsg);
  }, [globalMsg, toast]);

  return (
    <motion.div
      className="pmx-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <motion.div
        ref={cardRef}
        className="pmx-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        initial={{ opacity: 0, y: 22, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.99 }}
        transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
      >
        {success ? (
          <div className="pmx-success">
            <div className="pmx-success-mark" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="pmx-success-kicker">{success.kicker}</div>
            <h2 className="pmx-success-title" id={titleId}>
              {success.title}
            </h2>
            <p className="pmx-success-body">{success.body}</p>
            <button type="button" className="pmx-success-cta" onClick={() => goTo(success.redirectTo)}>
              Continue
            </button>
          </div>
        ) : (
          <>
            <div className="pmx-head">
              <div>
                <div className="pmx-eyebrow">
                  <i />
                  <span>For Writers</span>
                </div>
                <h2 className="pmx-title" id={titleId}>
                  Get your pages seen.
                </h2>
              </div>
              <div className="pmx-head-aside">Choose a writer plan — or get industry access below.</div>
            </div>

            <div className="pmx-trio">
              {WRITER_PLANS.map((plan) => (
                <TierCard key={plan.key} plan={plan} state={stateByKey[plan.key]} />
              ))}
            </div>

            {/* ── Industry ribbon ── */}
            <div className="pmx-ribbon">
              <span className="pmx-ribbon-bar" />
              <div className="pmx-ribbon-id">
                <div className="pmx-ribbon-kicker">For the Industry</div>
                <div className="pmx-ribbon-name">{FIP.name}</div>
                {fipState.active && (
                  <div className="pmx-pills">
                    <span className="pmx-pill pmx-pill--active"><i />Active</span>
                    {fipState.daysLeft != null && fipState.daysLeft > 0 && (
                      <span className="pmx-pill pmx-pill--days">{fipState.daysLeft} days left</span>
                    )}
                  </div>
                )}
              </div>
              <div className="pmx-ribbon-desc">
                {fipState.active
                  ? "Your membership is active — full access to the writer network."
                  : FIP.desc}
              </div>
              <div className="pmx-ribbon-right">
                <div className="pmx-ribbon-price">
                  <b>{FIP.price}</b>
                  <span>/ month</span>
                </div>
                <button
                  type="button"
                  className={`pmx-ribbon-cta${fipState.kind === "active" ? " pmx-ribbon-cta--active" : ""}`}
                  onClick={fipState.onClick}
                  disabled={fipState.disabled || fipState.loading}
                >
                  {fipState.loading ? <Spinner /> : fipState.lock ? <LockIcon /> : null}
                  {fipState.label}
                </button>
                {fipState.onRenew && (
                  <button type="button" className="pmx-ribbon-renew" onClick={fipState.onRenew} disabled={Boolean(fip.loading)}>
                    {fip.loading ? "Working…" : "Renew"}
                  </button>
                )}
              </div>
            </div>

          </>
        )}

        <button type="button" className="pmx-close" aria-label="Close" onClick={onClose} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
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
    <AnimatePresence>{open && <PricingModalInner key="pricing-modal-v3" onClose={onClose} />}</AnimatePresence>
  );
}

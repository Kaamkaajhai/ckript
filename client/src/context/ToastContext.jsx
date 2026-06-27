import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import "../components/Toast.css";

/* ─────────────────────────────────────────────────────────────
   Ckript — global toast notifications.

   One feedback channel for the whole app. Any component can report the
   outcome of an action without rendering anything inside its own surface:

       const toast = useToast();
       toast.error("No account found for that email.");
       toast.success("Welcome back.");
       toast.info("Reset code on its way.");
       const id = toast.show({ type: "warning", title: "Heads up", message: "…" });
       toast.dismiss(id);

   The viewport is portalled to <body> and sits above every modal overlay,
   so a toast stays visible even as the modal that triggered it closes — the
   reason auth surfaces (sign-in, recovery, OTP, onboarding) no longer carry
   their own inline error/success banners.

   Design notes:
   - Compact card, one type-coloured Material Symbols glyph, thin progress
     rail that is the dismissal timer (pauses on hover/focus so a message is
     never yanked away mid-read).
   - Duplicate (type + message) toasts refresh the existing one instead of
     stacking, so a user mashing a button never gets a wall of identical
     toasts.
   - Newest appears nearest the corner; the stack is capped so it can never
     run off-screen.
   ───────────────────────────────────────────────────────────── */

const ToastContext = createContext({
  show: () => "",
  error: () => "",
  success: () => "",
  info: () => "",
  warning: () => "",
  dismiss: () => {},
  dismissAll: () => {},
});

export const useToast = () => useContext(ToastContext);

const MAX_VISIBLE = 4;

/* Per-type defaults: icon glyph + how long it lingers. Errors stay longest
   (they often need action); successes are the most fleeting. */
const TYPE_CONFIG = {
  error: { icon: "error", duration: 6000, role: "alert", live: "assertive" },
  success: { icon: "check_circle", duration: 4000, role: "status", live: "polite" },
  info: { icon: "info", duration: 4500, role: "status", live: "polite" },
  warning: { icon: "warning", duration: 5500, role: "status", live: "polite" },
};

const normalizeType = (type) => (TYPE_CONFIG[type] ? type : "info");

let counter = 0;
const nextId = () => {
  counter += 1;
  return `ckt-${Date.now().toString(36)}-${counter}`;
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const show = useCallback((input) => {
    const opts = typeof input === "string" ? { message: input } : input || {};
    const type = normalizeType(opts.type);
    const cfg = TYPE_CONFIG[type];
    const message = String(opts.message ?? "").trim();
    const title = opts.title ? String(opts.title).trim() : "";
    if (!message && !title) return "";

    const duration =
      opts.duration === 0 || opts.duration === Infinity
        ? Infinity
        : Number.isFinite(opts.duration) && opts.duration > 0
          ? opts.duration
          : cfg.duration;

    const id = nextId();
    const toast = { id, type, title, message, duration, icon: cfg.icon, role: cfg.role, live: cfg.live };

    setToasts((prev) => {
      // Collapse an identical, still-visible toast into a fresh one so rapid
      // repeats (e.g. clicking "Sign in" twice) refresh rather than pile up.
      const deduped = prev.filter((t) => !(t.type === type && t.message === message && t.title === title));
      const next = [...deduped, toast];
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });
    return id;
  }, []);

  const error = useCallback((message, opts) => show({ ...opts, type: "error", message }), [show]);
  const success = useCallback((message, opts) => show({ ...opts, type: "success", message }), [show]);
  const info = useCallback((message, opts) => show({ ...opts, type: "info", message }), [show]);
  const warning = useCallback((message, opts) => show({ ...opts, type: "warning", message }), [show]);

  const api = useMemo(
    () => ({ show, error, success, info, warning, dismiss, dismissAll }),
    [show, error, success, info, warning, dismiss, dismissAll]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/* ── Viewport (portalled to <body>) ───────────────────────────── */
function ToastViewport({ toasts, onDismiss }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <ul className="ckt-viewport" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </ul>,
    document.body
  );
}

/* ── A single toast ───────────────────────────────────────────── */
function ToastItem({ toast, onDismiss }) {
  const reduceMotion = useReducedMotion();
  const { id, type, title, message, duration, icon, role, live } = toast;
  const sticky = !Number.isFinite(duration);

  // Auto-dismiss is driven by a JS timer (not the CSS rail) so it stays
  // correct under prefers-reduced-motion, while still pausing on hover/focus.
  const timerRef = useRef(null);
  const remainingRef = useRef(duration);
  const startRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (sticky) return;
    clearTimer();
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => onDismiss(id), Math.max(0, remainingRef.current));
  }, [sticky, clearTimer, onDismiss, id]);

  const pause = useCallback(() => {
    if (sticky) return;
    clearTimer();
    remainingRef.current -= Date.now() - startRef.current;
  }, [sticky, clearTimer]);

  useEffect(() => {
    resume();
    return clearTimer;
  }, [resume, clearTimer]);

  const enter = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0, scale: 1 };
  const from = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: 16, scale: 0.96 };
  const leave = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.96, transition: { duration: 0.18 } };

  return (
    <motion.li
      layout
      className={`ckt ckt--${type}`}
      role={role}
      aria-live={live}
      initial={from}
      animate={enter}
      exit={leave}
      transition={{ duration: 0.26, ease: [0.2, 0.7, 0.2, 1] }}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <span className="ckt-icon" aria-hidden="true">
        <span className="material-symbols-rounded">{icon}</span>
      </span>

      <div className="ckt-body">
        {title && <p className="ckt-title">{title}</p>}
        {message && <p className="ckt-msg">{message}</p>}
      </div>

      <button type="button" className="ckt-close" aria-label="Dismiss notification" onClick={() => onDismiss(id)}>
        <span className="material-symbols-rounded">close</span>
      </button>

      {!sticky && (
        <span
          className="ckt-progress"
          aria-hidden="true"
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </motion.li>
  );
}

export default ToastContext;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// `motion` is aliased because the lint config does not count a JSX member
// expression (<Motion.div>) as a use; same symbol, no suppression comment.
import { AnimatePresence, motion as Motion } from "framer-motion";
import useReducedMotion from "../../hooks/useReducedMotion";
import Toast from "./Toast";
import {
  ToastContext,
  TOAST_TONE,
  toastDuration,
  toastIsAssertive,
  toastPersists,
} from "./toastContext";
import "./Toast.css";

/*
 * ToastProvider — the app's one transient-message surface (prefix: ckm-toast).
 *
 * ---------------------------------------------------------------------------
 * Where the host lives, and why it is not in MobileShell
 * ---------------------------------------------------------------------------
 * The obvious home is the shell: it already owns the one scroll surface, and a
 * shell-hosted layer could position itself above the bottom nav with plain CSS.
 * It was rejected for one concrete reason — the single most common toast in any
 * app is raised immediately *before* a navigation ("Project deleted", then back
 * to the list). A shell-hosted host unmounts with the outgoing screen, so that
 * message would be destroyed at the exact moment it is supposed to be read.
 *
 * So the queue and the host both live above the router, as a sibling of the
 * screen inside `.ckm-root`. The cost is that the layer no longer knows whether
 * the current screen has a bottom nav; Toast.css pays it with one `:has()` rule
 * whose no-`:has()` fallback is the commoner case.
 *
 * ---------------------------------------------------------------------------
 * Why the layer opts out of the inert walk
 * ---------------------------------------------------------------------------
 * `useInertBackground` marks everything outside the topmost overlay inert, and
 * inert removes a subtree from the accessibility tree. A toast layer swept up by
 * that walk would be announced to nobody. `data-ckm-live-region` is the narrow,
 * documented exemption; the reasoning and its cost are recorded in that hook.
 *
 * ---------------------------------------------------------------------------
 * One at a time
 * ---------------------------------------------------------------------------
 * Two stacked toasts on a 320px phone is most of the screen, and two live
 * regions changing at once is a screen reader talking over itself. So the queue
 * is FIFO and shows one. A persistent toast holds the queue until it is dealt
 * with, which is intended: only errors and actionable messages persist, and
 * those are the ones that must not scroll past unseen.
 */

/* Beyond this, the oldest *waiting acknowledgement* is discarded. An error or an
   actionable toast is never discarded to make room — a message the user must
   act on is not surplus, and a screen raising five of them has a bug that a
   silent drop would hide. */
const MAX_QUEUE = 4;

let nextId = 0;

export default function ToastProvider({ children }) {
  const [queue, setQueue] = useState([]);
  const reducedMotion = useReducedMotion();
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const dismiss = useCallback((id) => {
    setQueue((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback((options = {}) => {
    const tone = options.tone && TOAST_TONES_SET.has(options.tone) ? options.tone : TOAST_TONE.INFO;
    const toast = {
      id: `ckm-toast-${++nextId}`,
      tone,
      title: String(options.title ?? ""),
      description: options.description ? String(options.description) : "",
      action: options.action?.label && typeof options.action.onAction === "function"
        ? options.action
        : null,
    };
    toast.duration = options.duration ?? toastDuration(toast);

    if (import.meta.env?.DEV) {
      if (!toast.title.trim()) {
        console.error("[mobile] Toast needs a `title`: an empty toast announces nothing.");
      }
      if (options.duration != null && toastPersists(toast)) {
        console.warn(
          "[mobile] Toast `duration` ignored: a toast with an action, or an error, must not auto-dismiss. " +
          "When it vanishes the user's ability to read or act on it vanishes too (WCAG SC 2.2.1, ARIA APG alert)."
        );
      }
    }

    setQueue((current) => {
      if (current.length < MAX_QUEUE) return [...current, toast];
      // Never the visible one (index 0), and never one that must be dealt with.
      const victim = current.findIndex((item, index) => index > 0 && !toastPersists(item));
      if (victim === -1) return [...current, toast];
      return [...current.slice(0, victim), ...current.slice(victim + 1), toast];
    });

    return toast.id;
  }, []);

  const api = useMemo(() => ({
    show,
    dismiss,
    dismissAll: () => setQueue([]),
    info: (title, description) => show({ tone: TOAST_TONE.INFO, title, description }),
    success: (title, description) => show({ tone: TOAST_TONE.SUCCESS, title, description }),
    warning: (title, description) => show({ tone: TOAST_TONE.WARNING, title, description }),
    error: (title, description, action) => show({ tone: TOAST_TONE.ERROR, title, description, action }),
  }), [show, dismiss]);

  const current = queue[0] ?? null;

  /*
   * The auto-dismiss timer, with one behaviour a bare setTimeout does not have:
   * it stops while the page is hidden. Otherwise a toast raised as the user
   * switches to another app burns its whole life in the background and is gone
   * when they return — which is the same failure as never showing it.
   */
  useEffect(() => {
    if (!current || toastPersists(current)) return undefined;

    const doc = typeof document === "undefined" ? null : document;
    let remaining = current.duration;
    let startedAt = Date.now();
    let timer = null;

    const start = () => {
      startedAt = Date.now();
      timer = setTimeout(() => dismiss(current.id), Math.max(0, remaining));
    };
    const pause = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
      remaining -= Date.now() - startedAt;
    };
    const onVisibilityChange = () => {
      if (doc.hidden) pause();
      else if (!timer) start();
    };

    start();
    doc?.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      doc?.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [current, dismiss]);

  const runAction = useCallback((id) => {
    const toast = queueRef.current.find((item) => item.id === id);
    toast?.action?.onAction?.();
    dismiss(id);
  }, [dismiss]);

  const assertive = current && toastIsAssertive(current.tone) ? current : null;
  const polite = current && !toastIsAssertive(current.tone) ? current : null;

  const motionProps = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.001 } }
    : {
      initial: { opacity: 0, y: 16, scale: 0.97 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 8, scale: 0.98 },
      transition: { type: "spring", stiffness: 460, damping: 38, mass: 0.8 },
    };

  const renderToast = (toast) => (
    <AnimatePresence>
      {toast && (
        <Motion.div key={toast.id} className="ckm-toast__slot" {...motionProps}>
          <Toast toast={toast} onDismiss={dismiss} onAction={runAction} />
        </Motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/*
        Both regions are always in the DOM, empty. A live region created at the
        same moment its content arrives is frequently missed by screen readers;
        one that already exists and then changes is not.

        Deliberately NOT aria-atomic. It looks like the safer choice — read the
        whole region, not a fragment — but it is wrong here, and a test caught
        why: a dismissed toast stays mounted for the length of its exit
        animation, so for ~200ms the region holds the outgoing message *and* the
        next one from the queue. Atomic would read both as a single utterance.
        Left non-atomic, only the added subtree is announced, which is the new
        toast in full and nothing else; removals are not announced at all.
      */}
      <div className="ckm-toast__layer" data-ckm-live-region="">
        <div className="ckm-toast__region" role="status">
          {renderToast(polite)}
        </div>
        <div className="ckm-toast__region" role="alert">
          {renderToast(assertive)}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

const TOAST_TONES_SET = new Set(Object.values(TOAST_TONE));

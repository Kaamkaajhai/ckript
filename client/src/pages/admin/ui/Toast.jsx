import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Toasts — the admin's feedback channel for actions whose result isn't visible where you clicked.
 *
 *   const toast = useToast();
 *   toast.success("Competition published");
 *   toast.error("Export failed", { description: "The server did not respond." });
 *
 * Success and info announce politely (role="status"); errors interrupt (role="alert") — an error
 * that waits its turn behind three success messages is an error the admin acts on too late.
 * Errors also stay up longer and never auto-dismiss under a pointer.
 */

import { ToastContext } from "./toastContext.js";

const DURATION = { success: 3500, info: 4500, error: 7000 };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((tone, title, options = {}) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((list) => [...list.slice(-4), { id, tone, title, description: options.description || "" }]);
    const schedule = () => {
      timers.current.set(id, setTimeout(() => dismiss(id), options.duration ?? DURATION[tone]));
    };
    schedule();
    return {
      id,
      dismiss: () => dismiss(id),
      // Hovering pauses the clock so a long error can actually be read.
      hold: () => clearTimeout(timers.current.get(id)),
      release: schedule,
    };
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (title, options) => push("success", title, options),
    info: (title, options) => push("info", title, options),
    error: (title, options) => push("error", title, options),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        // Same scope-carrying trick as the overlays: the stack lives on body, outside .ckad.
        <div className="ckad adt-stack" data-theme={document.querySelector(".ckad")?.getAttribute("data-theme") || undefined}>
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`adt adt--${t.tone}`}
              role={t.tone === "error" ? "alert" : "status"}
              onMouseEnter={() => clearTimeout(timers.current.get(t.id))}
              onMouseLeave={() => timers.current.set(t.id, setTimeout(() => dismiss(t.id), 1500))}
            >
              <span className="adt-bar" aria-hidden="true" />
              <div className="adt-body">
                <p className="adt-title">{t.title}</p>
                {t.description ? <p className="adt-desc">{t.description}</p> : null}
              </div>
              <button type="button" className="adt-x" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                ✕
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}


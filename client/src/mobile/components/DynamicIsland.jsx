import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "./Icon";
import { DynamicIslandContext } from "../context/dynamicIsland";
import "./DynamicIsland.css";

/*
 * DynamicIsland — an iOS-style pill that morphs out of the top of the screen
 * to deliver a brief, non-blocking message, then collapses away. On mobile
 * Ckript, only the Dashboard is built; every other destination calls
 * `notify.desktopOnly(feature)` and this is what the user sees — a polished
 * "open this on desktop" hint instead of a dead end.
 *
 * The provider lives here; the `useDynamicIsland` hook + context object live
 * in ../context/dynamicIsland so any component can raise a hint without
 * prop-drilling.
 */

const AUTO_DISMISS_MS = 3000;

export function DynamicIslandProvider({ children }) {
  const [item, setItem] = useState(null);
  const timerRef = useRef(null);
  const seqRef = useRef(0);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (next) => {
      clear();
      const id = ++seqRef.current;
      setItem({ ...next, id });
      timerRef.current = setTimeout(() => {
        // Only dismiss if this is still the message we scheduled.
        setItem((cur) => (cur && cur.id === id ? null : cur));
      }, next.duration ?? AUTO_DISMISS_MS);
    },
    [clear]
  );

  const dismiss = useCallback(() => {
    clear();
    setItem(null);
  }, [clear]);

  // Convenience helpers so call-sites read intent, not styling.
  const notify = {
    show,
    dismiss,
    desktopOnly: (feature) =>
      show({
        icon: "desktop_windows",
        title: `${feature} is on desktop`,
        subtitle: "Open Ckript on your computer to use this",
        tone: "desktop",
      }),
    info: (title, subtitle, icon = "info") => show({ icon, title, subtitle, tone: "info" }),
    success: (title, subtitle, icon = "check_circle") => show({ icon, title, subtitle, tone: "success" }),
  };

  useEffect(() => clear, [clear]);

  return (
    <DynamicIslandContext.Provider value={notify}>
      {children}
      <IslandHost item={item} onDismiss={dismiss} />
    </DynamicIslandContext.Provider>
  );
}

function IslandHost({ item, onDismiss }) {
  return (
    <div className="ckm-island__layer" aria-live="polite">
      <AnimatePresence>
        {item && (
          <motion.button
            key={item.id}
            type="button"
            className={`ckm-island ckm-island--${item.tone || "info"}`}
            onClick={onDismiss}
            initial={{ opacity: 0, scale: 0.55, y: -14, width: 44 }}
            animate={{ opacity: 1, scale: 1, y: 0, width: "auto" }}
            exit={{ opacity: 0, scale: 0.7, y: -10 }}
            transition={{ type: "spring", stiffness: 480, damping: 34, mass: 0.7 }}
          >
            <span className="ckm-island__dot">
              <Icon name={item.icon} size={18} />
            </span>
            <span className="ckm-island__text">
              <span className="ckm-island__title">{item.title}</span>
              {item.subtitle && <span className="ckm-island__sub">{item.subtitle}</span>}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

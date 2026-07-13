import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./BottomSheet.css";

/*
 * BottomSheet — the app's modal primitive. A dimmed backdrop plus a rounded
 * sheet that springs up from the bottom and can be flicked down to dismiss
 * (the native gesture). Everything that overlays the dashboard — AI detail,
 * All Projects — is composed from this so motion + a11y stay consistent.
 */
export default function BottomSheet({ open, onClose, children, height = "88%", label }) {
  // Close on hardware/desktop back and Escape for good measure.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="ckm-sheet__layer" role="dialog" aria-modal="true" aria-label={label}>
          <motion.div
            className="ckm-sheet__scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />
          <motion.div
            className="ckm-sheet"
            style={{ height }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 700) onClose?.();
            }}
          >
            <div className="ckm-sheet__grip" />
            <div className="ckm-sheet__body ckm-scroll">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

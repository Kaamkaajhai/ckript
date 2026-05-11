import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const EVENT_SLUG = "ckript-global-scriptathon-2026";
const EVENT_PATH = `/events/${EVENT_SLUG}`;
const BANNER_SRC = "/events/ckript-scriptathon-2026-banner.svg";

const ALLOWED_PREFIXES = ["/dashboard", "/reader", "/home"];

const EventModal = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const shouldShow = useMemo(() => {
    if (!isOpen) return false;
    if (location.pathname === "/") return true;
    return ALLOWED_PREFIXES.some((prefix) => location.pathname.startsWith(prefix));
  }, [isOpen, location.pathname]);

  if (!shouldShow) return null;

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleNavigate = () => {
    navigate(EVENT_PATH);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 px-4 py-6"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#05070b] shadow-[0_35px_90px_rgba(0,0,0,0.6)]"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close event banner"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-black/80"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleNavigate}
          className="group block w-full text-left transition duration-200 ease-out hover:scale-[1.01]"
          aria-label="Open Scriptathon 2026 event"
        >
          <div className="relative">
            <img
              src={BANNER_SRC}
              alt="Ckript Global Scriptathon 2026 banner"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/30 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute bottom-6 left-6 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white">
              Tap to view event
            </div>
          </div>
        </button>
      </motion.div>
    </motion.div>
  );
};

export default EventModal;

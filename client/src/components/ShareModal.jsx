/**
 * ShareModal.jsx
 * ───────────────
 * Social sharing modal for scripts.
 * Uses the native Web Share API when available (mobile), falls back to
 * platform-specific deep-links + clipboard copy on desktop.
 *
 * Props:
 *   script  – { _id, title, genre, logline, description }
 *   onClose – () => void
 *   onShared – () => void  (called after any successful share, used to unlock badge)
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Share2, Twitter, ExternalLink } from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";

/* ── Helpers ── */
const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://ckript.com";

const scriptUrl = (id) => `${APP_URL}/share/project/${id}`;

const buildText = (script) =>
  `🎬 "${script.title}"${script.genre ? ` · ${script.genre}` : ""} — ${script.logline || script.description || "A great script on Ckript"}`;

/* ── Platform configs ── */
const platforms = (script) => {
  const url  = encodeURIComponent(scriptUrl(script._id));
  const text = encodeURIComponent(buildText(script));
  return [
    {
      id: "twitter",
      label: "Twitter / X",
      emoji: "𝕏",
      // gray-500, not gray-900: the five sibling platforms are mid-tone hues that read on both the
      // white and the #0d1829 sheet, and the near-black original collapsed into the dark one.
      color: "text-gray-500",
      bg: "bg-gray-500/10",
      border: "border-gray-500/15",
      href: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      emoji: "💬",
      color: "text-emerald-600",
      bg: "bg-emerald-600/10",
      border: "border-emerald-600/15",
      href: `https://wa.me/?text=${text}%20${url}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      emoji: "💼",
      color: "text-blue-600",
      bg: "bg-blue-600/10",
      border: "border-blue-600/15",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    },
    {
      id: "telegram",
      label: "Telegram",
      emoji: "✈️",
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      border: "border-sky-500/15",
      href: `https://t.me/share/url?url=${url}&text=${text}`,
    },
    {
      id: "reddit",
      label: "Reddit",
      emoji: "🤖",
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/15",
      href: `https://www.reddit.com/submit?url=${url}&title=${encodeURIComponent(script.title)}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      emoji: "👥",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/15",
      href: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    },
  ];
};

/* ── Component ── */
const ShareModal = ({ script, onClose, onShared }) => {
  const { isDarkMode: dark } = useDarkMode();
  const [copied, setCopied]           = useState(false);
  const [nativeSupported, setNativeSupported] = useState(false);
  const link = scriptUrl(script._id);

  useEffect(() => {
    setNativeSupported("share" in navigator);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onShared?.();
    } catch {
      /* clipboard blocked */
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: script.title,
        text: buildText(script),
        url: link,
      });
      onShared?.();
    } catch {
      /* user cancelled */
    }
  };

  const handlePlatformShare = (href) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
    onShared?.();
  };

  const platformList = platforms(script);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sheet */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        className={`relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ${
          dark ? "bg-[#0d1829] border border-[#1a3050]" : "bg-white border border-gray-100"
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-[#1a3050]" : "border-gray-100"}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${dark ? "bg-pink-500/15" : "bg-pink-50"}`}>
              <Share2 size={15} className="text-pink-500" />
            </div>
            <div>
              <h2 className={`text-sm font-extrabold ${dark ? "text-gray-100" : "text-gray-900"}`}>
                Share Script
              </h2>
              <p className={`text-[11px] font-medium line-clamp-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>
                {script.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
              dark ? "bg-white/[0.06] hover:bg-white/[0.1]" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <X size={15} strokeWidth={2.5} className="text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Native share (mobile) */}
          {nativeSupported && (
            <button
              onClick={handleNativeShare}
              className={`w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl border text-sm font-bold transition-all active:scale-[0.98] ${
                dark
                  ? "bg-white/[0.06] border-[#1a3050] text-gray-200 hover:bg-white/[0.1]"
                  : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Share2 size={16} />
              Share via…
            </button>
          )}

          {/* Platform grid */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2.5 ${dark ? "text-gray-600" : "text-gray-400"}`}>
              Share to
            </p>
            <div className="grid grid-cols-3 gap-2">
              {platformList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlatformShare(p.href)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border transition-all active:scale-[0.96] hover:-translate-y-0.5 ${
                    dark
                      ? `${p.bg} ${p.border} border`
                      : `${p.bg} ${p.border} border`
                  }`}
                >
                  <span className="text-xl leading-none">{p.emoji}</span>
                  <span className={`text-[10px] font-bold ${p.color}`}>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Copy link */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${dark ? "text-gray-600" : "text-gray-400"}`}>
              Copy link
            </p>
            <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${
              dark ? "bg-[#0a1623] border-[#1a3050]" : "bg-gray-50 border-gray-200"
            }`}>
              <span className={`flex-1 text-xs font-mono truncate ${dark ? "text-gray-400" : "text-gray-500"}`}>
                {link}
              </span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  copied
                    ? "bg-emerald-500/15 text-emerald-500"
                    : dark
                      ? "bg-white/[0.06] hover:bg-white/[0.1] text-gray-300"
                      : "bg-white hover:bg-gray-50 text-gray-600 border border-gray-200"
                }`}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Earn badge hint */}
          <p className={`text-center text-[10px] font-semibold ${dark ? "text-gray-600" : "text-gray-400"}`}>
            🦋 Share a script to earn the <strong className={dark ? "text-gray-400" : "text-gray-600"}>Social Butterfly</strong> achievement badge!
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ShareModal;

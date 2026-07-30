import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Share2,
  X,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";
import useScrollLock from "../hooks/useScrollLock";
import whatsappIcon from "../assets/share-icons/whatsapp.svg";
import linkedinIcon from "../assets/share-icons/linkedin.svg";
import instagramIcon from "../assets/share-icons/instagram.svg";
import xIcon from "../assets/share-icons/x.svg";
import facebookIcon from "../assets/share-icons/facebook.svg";
import telegramIcon from "../assets/share-icons/telegram.svg";
import emailIcon from "../assets/share-icons/email.svg";

const encode = (value) => encodeURIComponent(value || "");

const buildPlatformLinks = ({ url, title, text }) => {
  const joinedText = text ? `${text} ${url}`.trim() : url;
  return [
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encode(joinedText)}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encode(url)}`,
    },
    {
      id: "instagram",
      label: "Instagram",
      href: "https://www.instagram.com/",
      requiresCopy: true,
    },
    {
      id: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encode(text || title || "Check this out")}&url=${encode(url)}`,
    },
    {
      id: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,
    },
    {
      id: "telegram",
      label: "Telegram",
      href: `https://t.me/share/url?url=${encode(url)}&text=${encode(text || title || "Check this out")}`,
    },
    {
      id: "email",
      label: "Email",
      href: `mailto:?subject=${encode(title || "Shared from Ckript")}&body=${encode(`${text || ""}\n\n${url}`.trim())}`,
      openDirect: true,
    },
  ];
};

const getPlatformBrand = (id) => {
  switch (id) {
    case "whatsapp":
      return {
        iconSrc: whatsappIcon,
        badgeClass: "bg-[#25D366]/12 border-[#25D366]/30",
      };
    case "linkedin":
      return {
        iconSrc: linkedinIcon,
        badgeClass: "bg-[#0A66C2]/12 border-[#0A66C2]/30",
      };
    case "instagram":
      return {
        iconSrc: instagramIcon,
        badgeClass: "bg-[#E1306C]/12 border-[#E1306C]/30",
      };
    case "x":
      return {
        iconSrc: xIcon,
        badgeClass: "bg-slate-500/12 border-slate-400/25",
      };
    case "facebook":
      return {
        iconSrc: facebookIcon,
        badgeClass: "bg-[#1877F2]/12 border-[#1877F2]/30",
      };
    case "telegram":
      return {
        iconSrc: telegramIcon,
        badgeClass: "bg-[#229ED9]/12 border-[#229ED9]/30",
      };
    case "email":
      return {
        iconSrc: emailIcon,
        badgeClass: "bg-amber-500/12 border-amber-400/30",
      };
    default:
      return {
        iconSrc: emailIcon,
        badgeClass: "bg-gray-400/12 border-gray-300/30",
      };
  }
};

const safeClipboardWrite = async (value) => {
  if (!value) return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back to document copy command below.
  }

  try {
    const temp = document.createElement("textarea");
    temp.value = value;
    temp.setAttribute("readonly", "true");
    temp.style.position = "absolute";
    temp.style.left = "-9999px";
    document.body.appendChild(temp);
    temp.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(temp);
    return copied;
  } catch {
    return false;
  }
};

const SocialShareButton = ({
  share,
  className = "",
  buttonLabel = "Share",
  iconOnly = false,
  onShared,
}) => {
  const { isDarkMode: dark } = useDarkMode();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [infoText, setInfoText] = useState("");

  const url = share?.url || "";
  const title = String(share?.title || "Shared from Ckript").replace(/scriptbridge/gi, "Ckript");
  const text = String(share?.text || "").replace(/scriptbridge/gi, "Ckript");
  const payloadText = `${text} ${url}`.trim();
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const platforms = useMemo(() => buildPlatformLinks({ url, title, text }), [url, title, text]);

  useScrollLock(open);

  const markShared = (platform) => {
    if (typeof onShared === "function") {
      onShared(platform);
    }
  };

  const tryNativeShare = async () => {
    if (!canNativeShare) return false;
    try {
      await navigator.share({
        title,
        text: text || title,
        url,
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleCopy = async () => {
    const ok = await safeClipboardWrite(url);
    if (!ok) {
      setInfoText("Copy failed. Please copy manually.");
      return;
    }
    setCopied(true);
    setInfoText("Link copied.");
    markShared("copy");
    setTimeout(() => setCopied(false), 1800);
  };

  const handleNativeShare = async () => {
    if (!canNativeShare) {
      await handleCopy();
      return;
    }

    const nativeShared = await tryNativeShare();
    if (nativeShared) {
      markShared("native");
      setInfoText("Shared.");
      return;
    }

    // User cancelled native share, keep modal open.
  };

  const handlePlatform = async (platform) => {
    if (platform.id === "instagram") {
      const nativeShared = await tryNativeShare();
      if (nativeShared) {
        markShared("instagram-native");
        setInfoText("Shared from your app chooser.");
        return;
      }

      const copiedOk = await safeClipboardWrite(payloadText || url);
      if (copiedOk) {
        setInfoText("Instagram web cannot auto-post. Caption and link copied. Paste in Instagram.");
      } else {
        setInfoText("Instagram web cannot auto-post. Copy failed, please copy manually from below.");
      }

      window.open(platform.href, "_blank", "noopener,noreferrer,width=680,height=720");
      markShared(platform.id);
      return;
    }

    if (platform.requiresCopy) {
      const copiedOk = await safeClipboardWrite(payloadText || url);
      if (copiedOk) {
        setInfoText("Text copied. Paste it in Instagram.");
      } else {
        setInfoText("Opened Instagram. Copy/paste the link manually.");
      }
    }

    if (platform.openDirect) {
      window.location.assign(platform.href);
    } else {
      window.open(platform.href, "_blank", "noopener,noreferrer,width=680,height=720");
    }
    markShared(platform.id);
  };

  if (!url) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[10050] flex items-start sm:items-center justify-center p-3 sm:p-4 pt-10 sm:pt-4"
      onClick={() => setOpen(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {/* App chrome only. The per-platform brand hexes in getPlatformBrand above are
          trademarked marks and stay exactly as they are. */}
      <div
        className={`relative w-full max-w-[34rem] rounded-2xl border shadow-2xl ${dark ? "bg-[#141414] border-white/[0.08]" : "bg-white border-gray-100"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${dark ? "border-white/[0.08]" : "border-gray-100"}`}>
          <div>
            <p className={`text-sm font-bold ${dark ? "text-white" : "text-gray-900"}`}>Share</p>
            <p className={`text-xs ${dark ? "text-white/45" : "text-gray-500"}`}>Instagram, WhatsApp, LinkedIn, and more</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${dark ? "bg-white/[0.07] text-white/70" : "bg-gray-100 text-gray-500"}`}
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4 max-h-[82vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {platforms.map((platform) => (
              (() => {
                const brand = getPlatformBrand(platform.id);
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handlePlatform(platform)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-semibold text-left transition inline-flex items-center justify-between min-h-[52px] ${dark ? "bg-white/[0.04] border-white/[0.08] text-white/80 hover:bg-white/[0.08]" : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"}`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <span className={`w-7 h-7 rounded-lg border inline-flex items-center justify-center ${brand.badgeClass}`}>
                        <img src={brand.iconSrc} alt={`${platform.label} logo`} className="w-4 h-4" loading="lazy" />
                      </span>
                      <span>{platform.label}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {platform.id === "instagram" && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${dark ? "bg-white/[0.08] text-white/65" : "bg-gray-200 text-gray-600"}`}>
                          Copy
                        </span>
                      )}
                      <ExternalLink size={13} className={dark ? "text-white/45" : "text-gray-400"} />
                    </span>
                  </button>
                );
              })()
            ))}
          </div>

          <p className={`text-[11px] leading-relaxed ${dark ? "text-white/45" : "text-gray-500"}`}>
            Instagram on desktop does not support direct auto-post from websites. Use the copied text/link when prompted.
          </p>

          <div className={`rounded-xl border p-3 ${dark ? "border-white/[0.08] bg-[#1c1c1c]" : "border-gray-200 bg-gray-50"}`}>
            <p className={`text-[11px] font-semibold mb-2 ${dark ? "text-white/45" : "text-gray-500"}`}>Direct options</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${dark ? "border-white/[0.12] text-white/80 hover:bg-white/[0.08]" : "border-gray-200 text-gray-700 hover:bg-white"}`}
              >
                More Apps
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 ${dark ? "border-white/[0.12] text-white/80 hover:bg-white/[0.08]" : "border-gray-200 text-gray-700 hover:bg-white"}`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy Link"}
              </button>
            </div>
            <p className={`mt-2 text-[11px] break-all ${dark ? "text-white/35" : "text-gray-500"}`}>{url}</p>
          </div>

          {infoText && (
            <div className={`text-xs font-medium ${dark ? "text-sky-300" : "text-sky-700"}`}>{infoText}</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
          setInfoText("");
        }}
        className={className || `inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition ${dark ? "bg-white/[0.06] border-white/[0.12] text-white/80 hover:bg-white/[0.12]" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
        aria-label={buttonLabel}
      >
        <Share2 size={15} />
        {!iconOnly && <span>{buttonLabel}</span>}
      </button>

      {open && typeof document !== "undefined" && createPortal(modalContent, document.body)}
    </>
  );
};

export default SocialShareButton;
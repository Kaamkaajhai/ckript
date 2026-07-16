// Helper functions for rights/license labels
const RIGHTS_TYPE_LABELS = {
  full_rights_sale: "Full Rights Sale (Ownership Transfer)",
  exclusive_license: "Exclusive License",
  custom_negotiation_required: "Custom Negotiation Required",
};
const MODIFICATION_LABELS = {
  buyer_can_modify_freely: "Buyer can modify freely",
  buyer_must_consult_writer: "Buyer must consult writer",
  writer_retains_creative_approval_rights: "Writer retains creative approval rights",
};
const PAYMENT_LABELS = {
  one_time_upfront_payment: "One-time upfront payment",
  lower_upfront_plus_royalty_percent: "Lower upfront + royalty %",
  revenue_sharing_model: "Revenue sharing model",
  custom_deal: "Custom deal",
};
const NEGOTIATION_LABELS = {
  fixed_terms_non_negotiable: "Fixed terms (non-negotiable)",
  open_to_discussion_after_purchase: "Open to discussion after purchase",
  ckript_not_involved: "Ckript not involved",
};
import { useState, useEffect, useContext, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";
import { jsPDF } from "jspdf";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import { useDarkMode } from "../context/DarkModeContext";
import { Film, BadgeCheck, MessageCircle } from "lucide-react";
import RazorpayScriptPayment from "../components/RazorpayScriptPayment";
import SocialShareButton from "../components/SocialShareButton";
import ScreenplayReadOnly from "../components/ScreenplayReadOnly";
import ScreenplayPdfViewer from "../components/ScreenplayPdfViewer";
import MeetingModal from "../components/MeetingModal";
import { formatCurrency } from "../utils/currency";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { formatScreenplayLikeText } from "../utils/screenplayText";
import { countPages } from "../components/screenplay/paginate";
import { splitScreenplayIntoPages } from "../components/screenplay/pages";
import ProducerRatingCard from "../components/ProducerRatingCard";
import { getScriptCanonicalPath } from "../utils/scriptPath";
import { getProfileCanonicalPath } from "../utils/profilePath";
import {
  hasBusinessEmail,
  hasActiveFilmIndustryProfessionalAccess,
  getRemainingContacts,
  getContactsLimit,
  getRevealedContactCount,
  getRemainingMessageWriters,
  getMessageWritersLimit,
  getMessagedWritersCount,
  hasMessagedWriter,
  getRemainingMeetings,
  getMeetingsLimit,
  getScheduledMeetingsCount,
  hasScheduledMeeting,
} from "../utils/industryAccess";
import {
  getScriptCompletionBadgeClasses,
  getScriptCompletionFuturePlans,
  getScriptCompletionProgressText,
  getScriptCompletionStatusLabel,
} from "../utils/scriptCompletion";
import { getApiBaseUrl, isSocketSupported } from "../utils/apiOrigin";

const BUYER_COMMISSION_RATE = 0.05;
const SOCKET_ORIGIN = getApiBaseUrl().replace(/\/api\/?$/, "").replace(/\/$/, "");
const RAZORPAY_SDK_SRC = "https://checkout.razorpay.com/v1/checkout.js";
const getBuyerCheckoutTotal = (baseAmount) => {
  const base = Number(baseAmount || 0);
  return Math.round((base + base * BUYER_COMMISSION_RATE) * 100) / 100;
};

const loadRazorpaySdk = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Browser environment unavailable"));
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector('script[data-razorpay-sdk="true"]');
    if (existingScript) {
      const handleLoad = () => resolve(true);
      const handleError = () => reject(new Error("Failed to load Razorpay SDK"));
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", handleError, { once: true });
      return;
    }

    const sdkScript = document.createElement("script");
    sdkScript.src = RAZORPAY_SDK_SRC;
    sdkScript.async = true;
    sdkScript.setAttribute("data-razorpay-sdk", "true");
    sdkScript.onload = () => resolve(true);
    sdkScript.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(sdkScript);
  });

const normalizePreviewPdfPageText = (value = "") =>
  formatScreenplayLikeText(
    String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim()
  );

const buildPreviewPdfBlob = ({ title = "Script", pageBlocks = [], fallbackText = "" } = {}) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });
  doc.setProperties({ title });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 42;
  const marginTop = 40;
  const marginBottom = 40;
  const usableWidth = pageWidth - marginX * 2;
  const sourcePages = pageBlocks.length
    ? pageBlocks.map((page, index) => ({
        pageNumber: Number(page?.pageNumber || index + 1),
        text: normalizePreviewPdfPageText(page?.displayText || page?.text || ""),
      }))
    : [{
        pageNumber: 1,
        text: normalizePreviewPdfPageText(fallbackText),
      }];

  sourcePages.forEach((page, index) => {
    if (index > 0) doc.addPage("a4", "portrait");

    const lines = [];
    String(page.text || "")
      .split("\n")
      .forEach((segment) => {
        const trimmed = String(segment || "").trimEnd();
        if (!trimmed.trim()) {
          if (lines.length && lines[lines.length - 1] !== "") lines.push("");
          return;
        }

        lines.push(...doc.splitTextToSize(trimmed, usableWidth));
      });

    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(lines.length ? lines : [""], marginX, marginTop, {
      baseline: "top",
      lineHeightFactor: 1.32,
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Page ${page.pageNumber} / ${sourcePages.length}`, pageWidth - marginX, pageHeight - marginBottom, {
      align: "right",
    });
  });

  return doc.output("blob");
};

const ScriptDetail = () => {
  const { id, projectHeading, writerUsername } = useParams();
  const { user, setUser } = useContext(AuthContext);
  const { openPricingModal } = useAuthModal();
  const { isDarkMode } = useDarkMode();
  const navigate = useNavigate();
  const location = useLocation();

  const [script, setScript] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessMessage, setAccessMessage] = useState("");
  const [accessRequiresBusinessEmail, setAccessRequiresBusinessEmail] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [trailerError, setTrailerError] = useState(false);
  const [trailerSourceIndex, setTrailerSourceIndex] = useState(0);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [wantsTrailer, setWantsTrailer] = useState(false);
  const [trailerCurrencyChoice, setTrailerCurrencyChoice] = useState("");
  const [trailerDurationChoice, setTrailerDurationChoice] = useState("60");
  const [trailerQualityChoice, setTrailerQualityChoice] = useState("720");
  const [trailerFormatChoice, setTrailerFormatChoice] = useState("landscape");
  const [showTrailerPaymentModal, setShowTrailerPaymentModal] = useState(false);
  const [trailerPaymentSubmitting, setTrailerPaymentSubmitting] = useState(false);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [hasRecordedSynopsisRead, setHasRecordedSynopsisRead] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]); // for creator view on this script
  const [pendingReqLoading, setPendingReqLoading] = useState(false);
  const [pendingReqActionId, setPendingReqActionId] = useState(null);
  const [rejectNoteModal, setRejectNoteModal] = useState(null); // { id, investorName }
  const [rejectNoteText, setRejectNoteText] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [notice, setNotice] = useState(null); // { type: "success" | "error", message: string }
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [myReview, setMyReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [showWriterInfo, setShowWriterInfo] = useState(false);
  const [revealedContact, setRevealedContact] = useState(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState("");
  const [revealStats, setRevealStats] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingSent, setMeetingSent] = useState(false);
  const [meetingStats, setMeetingStats] = useState(null);
  const viewStartRef = useRef(Date.now());
  const noticeTimerRef = useRef(null);
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const activeScriptId = script?._id || id;
  const currentUserId = String(user?._id || "");
  const rawMyPendingRequest = script?.myPendingRequest || null;
  const myPendingRequest =
    rawMyPendingRequest &&
    String(rawMyPendingRequest?.investor || "") === currentUserId
      ? rawMyPendingRequest
      : null;
  const pendingRequestBaseAmount = Number(myPendingRequest?.amount || script?.price || 0);
  const pendingRequestCheckoutTotal = getBuyerCheckoutTotal(pendingRequestBaseAmount);
  const pendingRequestBadgeCount = Math.max(
    Number(script?.pendingRequestsCount || 0),
    pendingRequests.length
  );
  const writerCustomConditions = String(script?.legal?.customInvestorTerms || "").trim();
  const hasWriterCustomConditions = writerCustomConditions.length > 0;
  const canViewWriterCustomConditions = Boolean(!script?.isCreator && script?.canPurchase);
  const isIndustryRole = !script?.isCreator &&
    user?._id &&
    ["investor", "producer", "director", "industry", "professional"].includes(String(user?.role || "").toLowerCase());
  const viewerHasBusinessEmail = isIndustryRole && hasBusinessEmail(user?.email);
  const viewerHasProAccess = isIndustryRole && hasActiveFilmIndustryProfessionalAccess(user);
  const canViewWriterInfo = viewerHasProAccess;

  const revealStatus = script?.writerContactRevealStatus || null;
  // Use locally revealed contact (after clicking reveal) or the contact from the API response
  const activeWriterContact = revealedContact || script?.writerContact || {};
  const writerContact = activeWriterContact;
  const contactAlreadyRevealed = Boolean(
    revealedContact ||
    revealStatus?.alreadyRevealed
  );
  const contactRevealBlocked = viewerHasProAccess && !contactAlreadyRevealed &&
    (revealStats ? revealStats.remainingContacts <= 0 : revealStatus?.remainingContacts <= 0);
  const remainingContacts = revealStats?.remainingContacts ?? revealStatus?.remainingContacts ?? getRemainingContacts(user);
  const contactsLimit = revealStats?.contactsLimit ?? revealStatus?.contactsLimit ?? getContactsLimit(user);
  const contactsUsed = revealStats?.contactsUsed ?? revealStatus?.contactsUsed ?? getRevealedContactCount(user);

  const writerAlreadyMessaged = hasMessagedWriter(user, script?.creator?._id);
  const remainingMessageWriters = getRemainingMessageWriters(user);
  const messageWritersLimit = getMessageWritersLimit(user);
  const messageWritersUsed = getMessagedWritersCount(user);
  const messageWriterBlocked = viewerHasProAccess && !writerAlreadyMessaged && remainingMessageWriters <= 0;

  const meetingAlreadyScheduled = hasScheduledMeeting(user, script?.creator?._id);
  const remainingMeetings = meetingStats?.remainingMeetings ?? getRemainingMeetings(user);
  const meetingsLimit = meetingStats?.meetingsLimit ?? getMeetingsLimit(user);
  const meetingsUsed = meetingStats?.meetingsUsed ?? getScheduledMeetingsCount(user);
  const meetingsBlocked = viewerHasProAccess && !meetingAlreadyScheduled && remainingMeetings <= 0;

  const trailerPriceMap = {
    "30-480": { inr: 399, usd: 5 },
    "30-720": { inr: 499, usd: 6 },
    "60-480": { inr: 539, usd: 6 },
    "60-720": { inr: 649, usd: 7 },
    "90-480": { inr: 549, usd: 6.3 },
    "90-720": { inr: 799, usd: 9 },
  };
  const trailerPriceKey = `${trailerDurationChoice}-${trailerQualityChoice}`;
  const trailerPrice = trailerPriceMap[trailerPriceKey] || { inr: 0, usd: 0 };
  const selectedTrailerAmount = trailerCurrencyChoice === "usd" ? trailerPrice.usd : trailerPrice.inr;
  const selectedTrailerPrefix = trailerCurrencyChoice === "usd" ? "$" : "INR";
  const formatTrailerAmount = (amount) => Number.isInteger(amount) ? String(amount) : String(amount).replace(/\.0+$/, "");
  const trailerCurrencyLabel = trailerCurrencyChoice === "usd" ? "USD" : trailerCurrencyChoice === "inr" ? "INR" : "";
  const trailerSelectionSummary = [
    `Duration: ${trailerDurationChoice} sec`,
    `Quality: ${trailerQualityChoice}px`,
    `Layout: ${trailerFormatChoice.charAt(0).toUpperCase() + trailerFormatChoice.slice(1)}`,
    `Display currency: ${trailerCurrencyLabel}`,
    `Price: ${selectedTrailerPrefix} ${formatTrailerAmount(selectedTrailerAmount)}`,
  ].join(" | ");

  const writerLinks = writerContact?.links || script?.creator?.writerProfile?.links || {};
  const availableWriterLinks = [
    { key: "portfolio", label: "Portfolio", href: writerLinks.portfolio },
    { key: "linkedin", label: "LinkedIn", href: writerLinks.linkedin },
    { key: "imdb", label: "IMDb", href: writerLinks.imdb },
    { key: "instagram", label: "Instagram", href: writerLinks.instagram },
    { key: "twitter", label: "X / Twitter", href: writerLinks.twitter },
    { key: "facebook", label: "Facebook", href: writerLinks.facebook },
  ].filter((item) => Boolean(String(item.href || "").trim()));

  const scriptShare = {
    url: script?.shareMeta?.url || (script?._id ? `${browserOrigin}/share/project/${script._id}` : ""),
    title: script?.shareMeta?.title || `${script?.title || "Project"} | Ckript`,
    text: script?.shareMeta?.text || (script?.logline || script?.synopsis || "Check out this project on Ckript."),
  };
  const previewRawText = typeof script?.previewExcerpt === "string" ? script.previewExcerpt : "";
  const hasViewableScript = Boolean(script?.viewableScript);
  const beautifyPreviewPageText = (value = "") => {
    const text = String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();

    if (!text) return "";

    return text
      .replace(/\s+(Page\s*\|\s*\d+)\s+/gi, "\n$1\n")
      .replace(/\s+(Genre:\s*[^\n]+)\s+(?=(?:Pilot Episode|Episode Title:|Written by:|SWA Membership:|Page\s*\|\s*\d+|Opening|INT\.|EXT\.))/gi, "\n$1\n")
      .replace(/\s+(Pilot Episode\s*\d+[^\n]*)\s+(?=(?:Episode Title:|Written by:|SWA Membership:|Page\s*\|\s*\d+|Opening|INT\.|EXT\.))/gi, "\n$1\n")
      .replace(/\s+(Episode Title:\s*[^\n]*)\s+(?=(?:Written by:|SWA Membership:|Page\s*\|\s*\d+|Opening|INT\.|EXT\.))/gi, "\n$1\n")
      .replace(/\s+(Written by:\s*[^\n]*)\s+(?=(?:SWA Membership:|Page\s*\|\s*\d+|Opening|INT\.|EXT\.))/gi, "\n$1\n")
      .replace(/\s+(SWA Membership:\s*\d+[^\n]*)\s+(?=(?:Page\s*\|\s*\d+|Opening|INT\.|EXT\.))/gi, "\n$1\n")
      .replace(/\s+(Opening)\s+/gi, "\n$1\n")
      .replace(/([.!?])\s+(?=[A-Z0-9"'(])/g, "$1\n")
      .replace(/\b(EXTERIOR\.|INTERIOR\.|EXT\.|INT\.|LAHORE|Lahore|April \d{4})\b/g, "\n$1\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n[ \t]+\n/g, "\n\n")
      .trim();
  };
  const previewPageTexts = hasViewableScript && Array.isArray(script?.scriptPreviewPageTexts)
    ? script.scriptPreviewPageTexts.map((pageText) => String(pageText || "").trim()).filter(Boolean)
    : [];
  const previewStartPage = hasViewableScript ? Math.max(1, Number(script?.scriptPreviewAccess?.start || 1)) : 1;
  const previewEndPage = hasViewableScript ? Math.max(previewStartPage, Number(script?.scriptPreviewAccess?.end || previewStartPage)) : 1;
  const previewRangeText = previewPageTexts.length
    ? previewPageTexts.slice(Math.max(0, previewStartPage - 1), Math.max(0, previewEndPage)).join("\n\n")
    : "";
  const previewPageBlocks = previewPageTexts.length
    ? previewPageTexts
        .slice(Math.max(0, previewStartPage - 1), Math.max(0, previewEndPage))
      .map((pageText, index) => ({
          pageNumber: previewStartPage + index,
          text: String(pageText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim(),
          displayText: formatScreenplayLikeText(pageText) || beautifyPreviewPageText(pageText),
        }))
        .filter((page) => page.text.trim())
    : [];
  const previewSourceText = previewRangeText || previewRawText;
  const previewFormattedText = formatScreenplayLikeText(previewSourceText);
  const previewPdfSourceText = previewPageBlocks.length
    ? previewPageBlocks.map((page) => page.displayText || page.text).join("\n\n")
    : (previewFormattedText || previewSourceText || previewRawText || "");
  const hasPreviewDownload = Boolean(previewPdfSourceText.trim());
  const showNotice = (message, type = "success") => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice({ type, message });
    noticeTimerRef.current = setTimeout(() => setNotice(null), 4500);
  };

  /* ── Handlers ─────────────────────────────────────────── */

  const handleDeleteScript = async () => {
    if (!activeScriptId) return;
    try {
      setDeleteLoading(true);
      await api.delete(`/scripts/${activeScriptId}`);
      window.dispatchEvent(new CustomEvent("scriptDeleted", { detail: { id: activeScriptId } }));
      setShowDeleteModal(false);
      navigate(
        getProfileCanonicalPath(user, {
          viewerId: user?._id,
          viewerRole: user?.role,
        })
      );
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleteLoading(false);
    }
  };

  const resolveImage = resolveMediaUrl;

  // The /pdf proxy only serves scripts that have an uploaded file (it 404s when script.fileUrl is
  // empty). Editor-authored projects store textContent, not a file — so only point the viewer at the
  // PDF when there really is one; otherwise it renders the structured screenplay pages directly
  // (no failed fetch, no "PDF rendering failed" banner).
  const uploadedScriptPdfUrl = activeScriptId 
    ? Boolean(String(script?.fileUrl || "").trim())
      ? resolveMediaUrl(`/api/scripts/${activeScriptId}/pdf`)
      : ""
    : "";
  const handlePrint = async () => {
    const uploadedPdfUrl = resolveMediaUrl(script?.fileUrl || "");
    // Stored PDF (uploaded original OR canonical merge) → open it for printing.
    if (uploadedPdfUrl) {
      window.open(uploadedPdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    const raw = typeof script?.textContent === "string" ? script.textContent : "";
    const normalizedRaw = raw.trimStart();
    const isHtml = normalizedRaw.startsWith("<");

    // Screenplay editor script → print the SAME canonical formatted PDF the editor/viewer produce.
    // Open the tab synchronously (popup rules) then point it at the fetched PDF; fall back to the HTML
    // print below on any failure. Prose/book content (isHtml) always uses the HTML path.
    if (!isHtml && activeScriptId) {
      const win = window.open("", "_blank");
      try {
        const response = await api.get(`/scripts/${activeScriptId}/export/pdf`, { responseType: "blob" });
        const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        if (win) win.location.href = url; else window.open(url, "_blank");
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      } catch (error) {
        console.error("Print via canonical PDF failed, using HTML fallback:", error);
        if (win) win.close();
      }
    }
    const formattedPlain = formatScreenplayLikeText(raw);
    const bodyContent = isHtml
      ? normalizedRaw
      : formattedPlain
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br/>");
    const win = window.open("", "_blank", "width=800,height=900");
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${script?.title || "Script"}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Courier+Prime&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #000; font-family: 'Courier Prime', 'Courier New', Courier, monospace; font-size: 14px; line-height: 1.7; padding: 60px 80px; max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; font-size: 20px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
    .meta { text-align: center; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #555; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 1px solid #ccc; }
    .content { white-space: pre-wrap; }
    @media print { body { padding: 40px 60px; } }
  </style>
</head>
<body>
  <h1>${script?.title || ""}</h1>
  <div class="meta">${script?.format || ""}</div>
  <div class="content">${isHtml ? bodyContent : `<p class="content">${bodyContent}</p>`}</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`);
    win.document.close();
  };

  const handleDownload = async () => {
    const safeTitle = (script?.title || "script").replace(/[^a-z0-9]/gi, "_");
    const uploadedPdfUrl = resolveMediaUrl(script?.fileUrl || "");
    // Stored PDF (uploaded original OR the canonical merge PDF) → download it as-is.
    if (uploadedPdfUrl) {
      const link = document.createElement("a");
      link.href = uploadedPdfUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = `${safeTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    const raw = script?.textContent || "";
    const isProse = String(raw).trimStart().startsWith("<");
    // Screenplay editor script → the SAME canonical PDF the editor/viewer produce (full element +
    // emphasis layout), not a flat text dump. Prose/book content has no screenplay layout, so it keeps
    // the plain-text export below.
    if (!isProse && activeScriptId) {
      try {
        const response = await api.get(`/scripts/${activeScriptId}/export/pdf?download=1`, { responseType: "blob" });
        const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        return;
      } catch (error) {
        console.error("Canonical PDF download failed, falling back to text:", error);
      }
    }

    const plain = formatScreenplayLikeText(String(raw).replace(/<[^>]*>/g, "\n"));
    const blob = new Blob([`${script?.title || "Script"}\n${'='.repeat((script?.title || '').length)}\n\n${plain}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPreview = async () => {
    const safeTitle = String(script?.title || "script").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
    if (!hasPreviewDownload) return;

    if (uploadedScriptPdfUrl) {
      try {
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("user") : "";
        const token = stored ? JSON.parse(stored)?.token : "";
        const response = await fetch(uploadedScriptPdfUrl, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${safeTitle || "script"}_viewable_preview.pdf`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 1500);
          return;
        }
      } catch (error) {
        console.error("Preview PDF download failed, falling back to generated preview:", error);
      }
    }

    const blob = buildPreviewPdfBlob({
      title: script?.title || "Script",
      pageBlocks: previewPageBlocks,
      fallbackText: previewPdfSourceText,
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle || "script"}_viewable_preview.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const handleInvoicePdfAction = async (invoice, action = "open") => {
    if (!invoice?._id) return;

    const { data } = await api.get(`/invoices/${invoice._id}/pdf`, {
      params: action === "download" ? { download: 1 } : {},
      responseType: "blob",
    });

    const blobUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
    if (action === "download") {
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${invoice.invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }

    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  };

  useEffect(() => {
    fetchScript();
    setCoverError(false);
    setTrailerError(false);
    setHasRecordedSynopsisRead(false);
  }, [id, projectHeading, writerUsername, user?._id]);

  useEffect(() => {
    if (!script?._id || activeTab !== "synopsis" || hasRecordedSynopsisRead || script?.isCreator) return;

    api
      .post(`/scripts/${script._id}/read`)
      .then(() => setHasRecordedSynopsisRead(true))
      .catch(() => null);
  }, [activeTab, hasRecordedSynopsisRead, script?._id, script?.isCreator]);

  useEffect(() => {
    setTrailerError(false);
    setTrailerSourceIndex(0);
  }, [script?.trailerUrl, script?.uploadedTrailerUrl, script?.trailerSource]);

  useEffect(() => {
    if (!script?._id) return;
    if (script?.evaluationStatus !== "requested" || script?.scriptScore?.overall) return;

    let attempts = 0;
    const maxAttempts = 36; // 3 minutes
    const timer = setInterval(async () => {
      attempts += 1;
      await fetchScript({ silent: true });
      if (attempts >= maxAttempts) clearInterval(timer);
    }, 5000);

    return () => clearInterval(timer);
  }, [script?._id, script?.evaluationStatus, script?.scriptScore?.overall]);

  useEffect(() => {
    if (!activeScriptId) return;

    viewStartRef.current = Date.now();

    return () => {
      const elapsed = Date.now() - viewStartRef.current;
      if (elapsed < 2000) return;
      api
        .post(`/scripts/${activeScriptId}/interactions`, {
          type: "time_spent",
          timeSpentMs: elapsed,
          source: "script_detail_page",
        })
        .catch(() => null);
    };
  }, [activeScriptId]);

  useEffect(() => {
    setShowWriterInfo(false);
  }, [script?._id]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const favoriteIds = user?.favoriteScripts || [];
    const hasBookmark = Array.isArray(favoriteIds)
      ? favoriteIds.some((item) => (typeof item === "string" ? item : item?._id) === activeScriptId)
      : false;
    setIsBookmarked(hasBookmark);
  }, [user?.favoriteScripts, activeScriptId]);

  useEffect(() => {
    if (script?.isCreator) {
      fetchPendingRequestsForScript();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script?._id, script?.isCreator]);

  useEffect(() => {
    if (!script?._id) return;
    fetchReviews({ page: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script?._id, user?._id]);

  useEffect(() => {
    if (!user?.token || !activeScriptId || !isSocketSupported()) return undefined;

    const socket = io(SOCKET_ORIGIN, {
      auth: { token: user.token },
    });

    const handleCollaboratorRemoved = async (payload = {}) => {
      if (String(payload.scriptId || "") !== String(activeScriptId)) return;
      await fetchScript({ silent: true });
      showNotice("Your collaboration access was removed.", "error");
    };

    const handleRoleOrMembershipChanged = async (payload = {}) => {
      if (String(payload.scriptId || "") !== String(activeScriptId)) return;
      await fetchScript({ silent: true });
    };

    socket.on("collaborator_removed", handleCollaboratorRemoved);
    socket.on("collab_role_changed", handleRoleOrMembershipChanged);
    socket.on("collab_membership_changed", handleRoleOrMembershipChanged);

    return () => {
      socket.off("collaborator_removed", handleCollaboratorRemoved);
      socket.off("collab_role_changed", handleRoleOrMembershipChanged);
      socket.off("collab_membership_changed", handleRoleOrMembershipChanged);
      socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScriptId, user?.token]);

  useEffect(() => {
    if (activeTab !== "reviews" || !script?._id) return;
    fetchReviews({ page: 1 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, script?._id, user?._id]);

  const fetchScript = async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setAccessMessage("");
      const hasCanonicalPathParams = Boolean(projectHeading && writerUsername);
      const endpoint = hasCanonicalPathParams
        ? `/scripts/path/${encodeURIComponent(projectHeading)}/${encodeURIComponent(writerUsername)}`
        : `/scripts/${id}`;
      const { data } = await api.get(endpoint);
      setScript(data);

      const canonicalPath = getScriptCanonicalPath(data || {});
      if (canonicalPath && canonicalPath !== location.pathname) {
        navigate(canonicalPath, { replace: true });
      }
    } catch (error) {
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message || "").toLowerCase();
      const isAccessBlocked =
        status === 403 ||
        message.includes("company email") ||
        message.includes("purchase a plan") ||
        message.includes("login with a company") ||
        message.includes("business email");

      if (isAccessBlocked) {
        setScript(null);
        setAccessMessage(error?.response?.data?.message || "You need a business email or a plan to access this.");
        setAccessRequiresBusinessEmail(Boolean(error?.response?.data?.requiresBusinessEmail));
        return;
      }

      /* demo fallback */
      setScript({
        _id: activeScriptId || "demo-script",
        title: "The Last Detective",
        logline:
          "A retired detective is drawn back into one final case that will challenge everything he believes.",
        description:
          "A gripping thriller about a retired detective drawn back into one final case.",
        synopsis:
          "When a serial killer resurfaces after 20 years, retired detective Marcus Cole is the only one who can stop them.",
        genre: "Thriller",
        primaryGenre: "Thriller",
        contentType: "feature_film",
        format: "feature",
        pageCount: 110,
        classification: {
          primaryGenre: "Thriller",
          secondaryGenre: "Crime",
          tones: ["Dark", "Suspenseful", "Gritty"],
          themes: ["Revenge", "Redemption", "Justice"],
          settings: ["Urban", "Contemporary", "New York"],
        },
        contentIndicators: {
          bechdelTest: true,
          basedOnTrueStory: false,
          adaptation: false,
        },
        creator: { _id: "demo", name: "Sarah Mitchell", profileImage: "" },
        price: 149.99,
        premium: true,
        trailerUrl: "",
        trailerStatus: "none",
        scriptScore: {
          overall: 87,
          plot: 90,
          characters: 85,
          dialogue: 88,
          pacing: 82,
          marketability: 92,
          feedback:
            "Strong commercial potential with a compelling protagonist and tight plot structure.",
          scoredAt: new Date().toISOString(),
        },
        roles: [
          {
            _id: "r1",
            characterName: "Det. Marcus Cole",
            type: "Rough, older, like Liam Neeson",
            description: "Retired detective, haunted by his past",
            ageRange: { min: 45, max: 65 },
            gender: "Male",
          },
          {
            _id: "r2",
            characterName: "Agent Williams",
            type: "Professional, sharp",
            description: "FBI agent assigned to the case",
            ageRange: { min: 30, max: 50 },
            gender: "Female",
          },
        ],
        holdStatus: "available",
        holdFee: 200,
        views: 342,
        tags: ["thriller", "detective", "serial-killer"],
        budget: "medium",
        createdAt: new Date().toISOString(),
        auditionCount: 13,
        services: { hosting: true, evaluation: true, aiTrailer: false },
        rating: 4.2,
        reviewCount: 8,
        readsCount: 56,
      });
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleHold = async () => {
    setShowHoldModal(true);
  };

  const handlePaymentSuccess = async (paymentData) => {
    // Refresh script data after successful payment
    await fetchScript();

    alert(`Hold placed successfully! ${paymentData.message || ""}`);

    // Close modal
    setShowHoldModal(false);
  };

  const handleGenerateTrailer = async () => {
    if (!script?._id || trailerLoading) return;
    setTrailerLoading(true);
    try {
      await loadRazorpaySdk();

      const { data: orderData } = await api.post(`/scripts/${script._id}/request-ai-trailer/create-order`, {
        duration: trailerDurationChoice,
        quality: trailerQualityChoice,
        format: trailerFormatChoice,
        currency: trailerCurrencyLabel || "INR",
      });

      const paymentObject = new window.Razorpay({
        key: orderData.key || orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_live_SWgJpCDuk8M4ap",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ckript",
        description: `AI Trailer: ${script.title}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            const { data } = await api.post(`/scripts/${script._id}/request-ai-trailer`, {
              note: `Payment completed via Razorpay. ${trailerSelectionSummary}`,
              duration: trailerDurationChoice,
              quality: trailerQualityChoice,
              format: trailerFormatChoice,
              currency: trailerCurrencyLabel || "INR",
              amount: selectedTrailerAmount,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setScript((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                services: {
                  ...(prev.services || {}),
                  aiTrailer: true,
                },
                trailerStatus: "requested",
                trailerWriterFeedback: data?.script?.trailerWriterFeedback || {
                  status: "pending",
                  note: `Payment completed via Razorpay. ${trailerSelectionSummary}`,
                  updatedAt: new Date().toISOString(),
                },
              };
            });

            await fetchScript({ silent: true });
            setShowTrailerPaymentModal(false);
            alert(data?.message || "AI trailer request received! Your trailer is now queued for admin approval.");
          } catch (err) {
            alert(err.response?.data?.message || "Payment verification failed");
          } finally {
            setTrailerPaymentSubmitting(false);
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#1e3a5f",
        },
        modal: {
          ondismiss: () => {
            setTrailerPaymentSubmitting(false);
          },
        },
      });

      setShowTrailerPaymentModal(false);
      paymentObject.open();
    } catch (err) {
      console.error("Trailer payment error:", err);
      alert(err.response?.data?.message || err.message || "Failed to generate trailer");
    } finally {
      setTrailerLoading(false);
    }
  };

  const handleGenerateScore = async () => {
    if (!script?._id || scoreLoading) return;
    setActiveTab("evaluation");
    setScoreLoading(true);
    try {
      const { data } = await api.post("/ai/script-score", { scriptId: script._id });

      // Keep UI in sync immediately so both trigger buttons feel consistent.
      if (data?.score) {
        setScript((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            scriptScore: data.score,
            services: {
              ...(prev.services || {}),
              evaluation: true,
            },
            evaluationStatus: "completed",
          };
        });
      } else if (data?.pending) {
        setScript((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            services: {
              ...(prev.services || {}),
              evaluation: true,
            },
            evaluationStatus: "requested",
            evaluationRequestedAt: new Date().toISOString(),
          };
        });
      }

      await fetchScript({ silent: true });
      if (data?.message) {
        alert(data.message);
      } else {
        alert("Evaluation request submitted. Opened Evaluation tab to view progress.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to generate score");
    } finally {
      setScoreLoading(false);
    }
  };

  const handleActivateSpotlight = async () => {
    if (!script?._id) return;

    if (isSoldScript) {
      showNotice("Spotlight cannot be activated after a script is sold.", "error");
      return;
    }

    if (!isOwner) {
      showNotice("Only the script creator can activate spotlight.", "error");
      return;
    }

    if (script?.status !== "published") {
      showNotice("Publish the project before activating spotlight.", "error");
      return;
    }

    setSpotlightLoading(true);
    try {
      const endpointAttempts = [
        { url: `/scripts/${script._id}/activate-spotlight`, body: {} },
        { url: "/scripts/activate-spotlight", body: { scriptId: script._id } },
        { url: "/scripts/spotlight/activate", body: { scriptId: script._id } },
      ];

      let data = null;
      let lastError = null;

      for (const attempt of endpointAttempts) {
        try {
          const response = await api.post(attempt.url, attempt.body);
          data = response.data;
          break;
        } catch (error) {
          lastError = error;
          if (error?.response?.status !== 404) {
            throw error;
          }
        }
      }

      if (!data && lastError) {
        throw lastError;
      }

      await fetchScript();

      if (data?.credits?.balance !== undefined) {
        setUser((prev) => {
          if (!prev) return prev;
          const updated = {
            ...prev,
            credits: {
              ...(prev.credits || {}),
              balance: data.credits.balance,
            },
          };
          localStorage.setItem("user", JSON.stringify(updated));
          return updated;
        });
      }

      const refunded = Number(data?.package?.creditsRefunded || 0);
      const refundNote = refunded > 0 ? ` Refunded ${refunded} AI trailer credits based on spotlight policy.` : "";
      const isExtension = Boolean(data?.package?.isExtension);
      const spotlightScript = data?.script || {};
      const spotlightHasAnyTrailer = Boolean(spotlightScript.trailerUrl || spotlightScript.uploadedTrailerUrl);
      const spotlightQueuedAiTrailer =
        ["requested", "generating"].includes(spotlightScript.trailerStatus) && !spotlightHasAnyTrailer;
      showNotice(
        isExtension
          ? `Project Spotlight extended: featured top placement is extended for 1 month.${refundNote}`
          : `Project Spotlight activated: verified badge is now permanent, free evaluation started${spotlightQueuedAiTrailer ? ", AI trailer queued (2-3 business days)" : ""}, and featured top placement is live for 1 month.${refundNote}`,
        "success"
      );
    } catch (err) {
      const status = err?.response?.status;
      let message = err?.response?.data?.message || "Failed to activate or extend Project Spotlight";

      if (status === 404) {
        message = "Project Spotlight is not available on this backend version yet. Deploy latest backend routes and try again.";
      } else if (!err?.response) {
        message = "Unable to reach backend. Please check API URL/server status.";
      }

      showNotice(message, "error");
    } finally {
      setSpotlightLoading(false);
    }
  };

  const handleUnlockSynopsis = async () => {
    setUnlockLoading(true);
    try {
      await api.post("/scripts/unlock", { scriptId: script._id });
      await fetchScript();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to unlock script");
    } finally {
      setUnlockLoading(false);
    }
  };

  const handleRevealContact = async () => {
    const writerId = String(script?.creator?._id || "");
    if (!writerId || revealLoading) return;
    setRevealError("");
    setRevealLoading(true);
    try {
      const { data } = await api.post(`/payment/reveal-contact/${writerId}`);
      setRevealedContact(data.contact);
      setRevealStats({
        contactsUsed: data.contactsUsed,
        contactsLimit: data.contactsLimit,
        remainingContacts: data.remainingContacts,
      });
      setShowWriterInfo(true);
      if (data.contactsUsed !== undefined && user) {
        setUser((prev) => {
          if (!prev) return prev;
          const updatedSubscription = {
            ...(prev.subscription || {}),
            revealedContacts: [
              ...(Array.isArray(prev.subscription?.revealedContacts) ? prev.subscription.revealedContacts : []),
              { writerId, revealedAt: new Date().toISOString() },
            ],
          };
          return { ...prev, subscription: updatedSubscription };
        });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to reveal contact.";
      setRevealError(msg);
    } finally {
      setRevealLoading(false);
    }
  };

  const handleMessageWriter = async () => {
    const writerId = String(script?.creator?._id || "");
    if (!writerId) return;

    if (!script?.isUnlocked && !writerAlreadyMessaged) {
      try {
        const { data } = await api.post(`/payment/message-writer/${writerId}`);
        if (data.messagesUsed !== undefined && user) {
          setUser((prev) => {
            if (!prev) return prev;
            const updatedSubscription = {
              ...(prev.subscription || {}),
              messagedWriters: [
                ...(Array.isArray(prev.subscription?.messagedWriters) ? prev.subscription.messagedWriters : []),
                { writerId, messagedAt: new Date().toISOString() },
              ],
            };
            return { ...prev, subscription: updatedSubscription };
          });
        }
      } catch (err) {
        setRevealError(err?.response?.data?.message || "Failed to initiate message.");
        return;
      }
    }

    navigate(`/messages?recipientId=${writerId}&recipientName=${encodeURIComponent(script?.creator?.name || "Writer")}`);
  };

  const handleToggleBookmark = async () => {
    if (!user?._id || !script?._id || script?.creator?._id === user?._id) return;
    try {
      const { data } = await api.post(`/scripts/${script._id}/favorite`);
      const nextFavorited = Boolean(data?.favorited);
      setIsBookmarked(nextFavorited);

      setUser((prev) => {
        if (!prev) return prev;
        const currentIds = Array.isArray(prev.favoriteScripts)
          ? prev.favoriteScripts.map((item) => (typeof item === "string" ? item : item?._id)).filter(Boolean)
          : [];
        const updatedIds = nextFavorited
          ? Array.from(new Set([...currentIds, script._id]))
          : currentIds.filter((item) => item !== script._id);
        const updatedUser = { ...prev, favoriteScripts: updatedIds };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      });

      window.dispatchEvent(new CustomEvent("bookmarkUpdated", {
        detail: { scriptId: script._id, bookmarked: nextFavorited },
      }));
    } catch {
      // silent fail for bookmark toggle
    }
  };

  const handleRequestPurchase = async () => {
    setRequestLoading(true);
    try {
      await api.post("/scripts/purchase-request", {
        scriptId: script._id,
        note: "I like your preview and I want to buy your project.",
      });
      setShowRequestModal(false);
      await fetchScript();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit purchase request");
    } finally {
      setRequestLoading(false);
    }
  };

  const fetchPendingRequestsForScript = async () => {
    if (!script?.isCreator) return;
    setPendingReqLoading(true);
    try {
      const { data } = await api.get("/scripts/purchase-requests/mine");
      const currentScriptId = String(script?._id || "");
      const pendingForScript = (Array.isArray(data) ? data : [])
        .filter((r) => {
          const requestScriptId = String(r?.script?._id || r?.script || "");
          return requestScriptId === currentScriptId && r.status === "pending";
        })
        .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));

      setPendingRequests(pendingForScript);
    } catch {
      // silent
    } finally {
      setPendingReqLoading(false);
    }
  };

  useEffect(() => {
    if (!script?.isCreator || !script?._id) return;

    const intervalId = setInterval(() => {
      fetchPendingRequestsForScript();
    }, 15000);

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script?._id, script?.isCreator]);

  const fetchReviews = async ({ page = 1 } = {}) => {
    if (!script?._id) return;
    setReviewsLoading(true);
    try {
      const { data } = await api.get(`/reviews/${script._id}?page=${page}&limit=8`);
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      setReviewsPage(Number(data?.page || page));
      setReviewsTotalPages(Number(data?.totalPages || 1));
      setReviewsTotal(Number(data?.total || 0));
      setMyReview(data?.myReview || null);
    } catch {
      setReviews([]);
      setReviewsPage(1);
      setReviewsTotalPages(1);
      setReviewsTotal(0);
      setMyReview(null);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!canSubmitReview) return;

    const trimmedComment = String(reviewComment || "").trim();
    if (!reviewRating) {
      showNotice("Please select a rating before submitting.", "error");
      return;
    }
    if (trimmedComment.length < 5) {
      showNotice("Please write at least 5 characters for your review.", "error");
      return;
    }

    setReviewSubmitting(true);
    try {
      await api.post("/reviews", {
        script: script._id,
        rating: reviewRating,
        comment: trimmedComment,
      });

      setReviewRating(0);
      setReviewComment("");

      await Promise.all([
        fetchScript({ silent: true }),
        fetchReviews({ page: 1 }),
      ]);

      showNotice("Review submitted successfully.", "success");
    } catch (err) {
      showNotice(err?.response?.data?.message || "Failed to submit review.", "error");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleApproveRequest = async (reqId) => {
    setPendingReqActionId(reqId);
    try {
      await api.put(`/scripts/purchase-request/${reqId}/approve`);
      showNotice("Request approved. Buyer was notified to complete payment.", "success");
      await fetchScript();
      await fetchPendingRequestsForScript();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to approve request";
      showNotice(message, "error");
      if (err?.response?.status === 409) {
        await fetchScript({ silent: true });
        await fetchPendingRequestsForScript();
      }
    } finally {
      setPendingReqActionId(null);
    }
  };

  const handleRejectRequestSubmit = async () => {
    if (!rejectNoteModal) return;
    setPendingReqActionId(rejectNoteModal.id);
    try {
      await api.put(`/scripts/purchase-request/${rejectNoteModal.id}/reject`, { note: rejectNoteText });
      setRejectNoteModal(null);
      setRejectNoteText("");
      await fetchScript();
      await fetchPendingRequestsForScript();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject request");
    } finally {
      setPendingReqActionId(null);
    }
  };

  /* ── Formatters ───────────────────────────────────────── */

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
      : "N/A";

  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      : "N/A";

  const fmtFormat = (f) => {
    const map = {
      feature: "Feature Film",
      tv_1hr: "TV (1 Hour)",
      tv_halfhr: "TV (Half Hour)",
      short: "Short Film",
      feature_film: "Feature Film",
      tv_1hour: "TV (1 Hour)",
      tv_pilot_1hour: "TV Pilot (1 Hour)",
      tv_halfhour: "TV (Half Hour)",
      tv_pilot_halfhour: "TV Pilot (Half Hour)",
      short_film: "Short Film",
      web_series: "Web Series",
      fiction_novel: "Fiction Novel",
      play: "Play",
      songs: "Songs",
      standup_comedy: "Standup Comedy",
      dialogues: "Dialogues",
      poet: "Poet",
    };
    return (
      map[f] ||
      f?.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) ||
      "\u2014"
    );
  };

  const fmtBudget = (b) => {
    const map = {
      micro: "Micro (<₹1Cr)",
      low: "Low (₹1Cr\u2013₹10Cr)",
      medium: "Medium (₹10Cr\u2013₹150Cr)",
      high: "High (₹150Cr\u2013₹750Cr)",
      blockbuster: "Blockbuster (₹750Cr+)",
    };
    return map[b] || b?.charAt(0).toUpperCase() + b?.slice(1) || "\u2014";
  };

  const scoreColor = (v = 0) =>
    v >= 80 ? "text-emerald-500" : v >= 60 ? "text-amber-500" : "text-rose-500";

  const scoreBg = (v = 0) =>
    v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-amber-500" : "bg-rose-500";

  /* ── Theme helpers ─────────────────────────────────────── */
  const t = {
    page: isDarkMode ? "bg-[#070e1a]" : "bg-gray-50",
    card: isDarkMode ? "bg-[#0d1829] border-white/[0.06]" : "bg-white border-gray-200",
    cardHov: isDarkMode ? "hover:border-white/[0.12]" : "hover:border-gray-300",
    tabs: isDarkMode ? "bg-[#0a1220] border-white/[0.04]" : "bg-gray-100/80 border-gray-200",
    tabAct: isDarkMode ? "bg-[#1e3a5f] text-white"
      : "bg-white text-[#1e3a5f]",
    tabInact: isDarkMode ? "text-neutral-500 hover:text-neutral-300 hover:bg-white/[0.04]"
      : "text-gray-400 hover:text-gray-700 hover:bg-white/60",
    title: isDarkMode ? "text-white" : "text-gray-900",
    sub: isDarkMode ? "text-neutral-400" : "text-gray-600",
    muted: isDarkMode ? "text-neutral-500" : "text-gray-400",
    label: isDarkMode ? "text-neutral-500" : "text-gray-400",
    chip: isDarkMode ? "bg-white/[0.06] border-white/[0.08] text-white/80"
      : "bg-gray-100 border-gray-200 text-gray-700",
    chipBlue: isDarkMode ? "bg-[#1e3a5f]/40 border-[#1e3a5f]/60 text-blue-300"
      : "bg-blue-50 border-blue-200 text-blue-700",
    row: isDarkMode ? "border-white/[0.04]" : "border-gray-100",
    divider: isDarkMode ? "border-white/[0.06]" : "border-gray-100",
    inset: isDarkMode ? "bg-white/[0.03] border-white/[0.05]"
      : "bg-gray-50 border-gray-200",
    btnPrim: isDarkMode ? "bg-[#1e3a5f] hover:bg-[#254a75] text-white"
      : "bg-[#1e3a5f] hover:bg-[#254a75] text-white",
    btnSec: isDarkMode ? "bg-white/[0.06] border-white/[0.08] text-white hover:bg-white/[0.1]"
      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
    btnGhost: isDarkMode ? "bg-[#1a3050] border-white/[0.06] text-white hover:bg-[#213d64]"
      : "bg-blue-50 border-blue-200 text-[#1e3a5f] hover:bg-blue-100",
    btnDel: isDarkMode ? "bg-red-500/8 border-red-500/15 text-red-400 hover:bg-red-500/15 hover:text-red-300"
      : "bg-red-50 border-red-200 text-red-500 hover:bg-red-100",
    logline: isDarkMode ? "from-white/[0.03] border-l-[#1e3a5f]"
      : "from-blue-50 border-l-[#1e3a5f]",
    tag: isDarkMode ? "bg-white/[0.04] text-neutral-500 ring-white/[0.06] hover:ring-white/[0.12]"
      : "bg-gray-100 text-gray-500 ring-gray-200 hover:ring-gray-300",
    priceSub: isDarkMode ? "bg-white/[0.03] border-white/[0.06]"
      : "bg-gray-50 border-gray-200",
    dot: isDarkMode ? "bg-[#2a4060]" : "bg-gray-300",
  };

  /* ── Loading / Error ──────────────────────────────────── */

  if (loading)
    return (
      <div className={`flex justify-center items-center h-[60vh] ${t.page}`}>
        <div className={`w-10 h-10 border-2 rounded-full animate-spin ${isDarkMode ? "border-white/10 border-t-white/60" : "border-gray-200 border-t-gray-500"}`} />
      </div>
    );

  if (accessMessage)
    return (
      <div className={`flex justify-center items-center min-h-[60vh] px-4 ${t.page}`}>
        <div className={`max-w-md w-full rounded-2xl border p-6 sm:p-8 ${t.card}`}>
          <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4 border ${t.inset}`}>
            <svg className={`w-5 h-5 ${t.label}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className={`text-base font-extrabold mb-1 text-center ${t.title}`}>Access Restricted</h2>
          {accessRequiresBusinessEmail ? (
            <>
              <p className={`text-[13px] text-center leading-relaxed mb-5 ${t.muted}`}>
                Your account uses a personal email. Choose an option below to continue.
              </p>
              <div className="space-y-3">
                <div className={`rounded-xl border p-4 ${t.inset}`}>
                  <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${t.label}`}>Free Access</p>
                  <p className={`text-sm font-semibold mb-0.5 ${t.title}`}>Sign up with a business email</p>
                  <p className={`text-[12px] leading-relaxed mb-3 ${t.muted}`}>
                    Use a company email address to browse scripts and view writer profiles at no cost.
                  </p>
                  <Link
                    to="/industry-onboarding"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition ${t.btnSec}`}
                  >
                    Sign up as Film Industry Professional
                  </Link>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide mb-1 text-amber-500">Premium Plan</p>
                  <p className={`text-sm font-semibold mb-0.5 ${t.title}`}>Film Industry Professional</p>
                  <p className={`text-[12px] leading-relaxed mb-3 ${t.muted}`}>
                    Full access to scripts, writer profiles, and verified contact details (email, phone &amp; links) for up to 15 writers per month.
                  </p>
                  <button
                    type="button"
                    onClick={() => openPricingModal()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Get the Plan
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className={`text-sm text-center leading-relaxed mt-2 ${t.muted}`}>{accessMessage}</p>
          )}
        </div>
      </div>
    );

  if (!script)
    return (
      <div className={`text-center py-20 ${t.page}`}>
        <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4 border ${t.card}`}>
          <Film size={28} strokeWidth={1.5} className={t.muted} />
        </div>
        <h2 className={`text-lg font-bold mb-1 ${t.title}`}>Script not found</h2>
        <Link to="/search" className="text-[#1e3a5f] hover:underline text-sm font-semibold">
          Browse scripts
        </Link>
      </div>
    );

  /* ── Computed values ──────────────────────────────────── */

  const score = script.scriptScore || {};
  const creatorId = script?.creator?._id || script?.creator;
  const viewerId = user?._id || user?.id;
  const isOwner = Boolean(script?.isCreator || (creatorId && viewerId && String(creatorId) === String(viewerId)));
  const currentCollaborator = Array.isArray(script?.collaborators) ? script.collaborators.find((entry) => {
    const collaboratorId = entry?.userId?._id || entry?.userId;
    return entry?.isActive !== false && entry?.status === "accepted" && collaboratorId && viewerId && String(collaboratorId) === String(viewerId);
  }) : null;
  const isAcceptedCollaborator = Boolean(script?.isCollaborator || currentCollaborator);
  const collaboratorRole = String(script?.collaboratorRole || currentCollaborator?.role || "").toLowerCase();
  const canViewFullScript = Boolean(isOwner || isAcceptedCollaborator || script?.isUnlocked || script?.isAdmin || script?.canViewFullScript);
  const canEditScript = Boolean(script?._id && (isOwner || script?.canEditScript || collaboratorRole === "editor"));
  const canOpenCollaborationHub = Boolean(script?._id && (isOwner || isAcceptedCollaborator));
  const isReaderReviewer = String(user?.role || "").toLowerCase() === "reader";
  const isSoldScript = Boolean(script?.isSold || script?.holdStatus === "sold");
  const canBookmark = Boolean(user?._id && !isOwner && !isAcceptedCollaborator);
  const isPro = ["investor", "producer", "director"].includes(user?.role);
  const canSubmitReview = Boolean(
    user?._id &&
    isReaderReviewer &&
    !isOwner &&
    !isAcceptedCollaborator &&
    script?.status === "published"
  );
  const reviewUnavailableMessage = isOwner
    ? "You cannot review your own project."
    : !isReaderReviewer
      ? "Only readers can submit reviews."
      : "Reviews are available after the project is published.";
  const trailerSources = (() => {
    const aiTrailerUrl = script?.trailerUrl || "";
    const uploadedTrailerUrl = script?.uploadedTrailerUrl || "";

    let ordered = [];

    if (script?.trailerSource === "ai") ordered = [aiTrailerUrl, uploadedTrailerUrl];
    else if (script?.trailerSource === "uploaded") ordered = [uploadedTrailerUrl, aiTrailerUrl];
    else ordered = [aiTrailerUrl, uploadedTrailerUrl];

    const uniqueSources = [...new Set(ordered.filter(Boolean))];
    return uniqueSources.map((url) => resolveImage(url)).filter(Boolean);
  })();

  const trailerSourceUrl =
    trailerSources[Math.min(trailerSourceIndex, Math.max(trailerSources.length - 1, 0))] || "";

  const handleTrailerPlaybackError = () => {
    if (trailerSourceIndex < trailerSources.length - 1) {
      setTrailerSourceIndex((prev) => prev + 1);
      setTrailerError(false);
      return;
    }

    setTrailerError(true);
  };

  const trailerPlaybackUrl = trailerSourceUrl;
  const hasTrailer = trailerSources.length > 0;
  const canPlayTrailer = hasTrailer && !trailerError;
  // Prefer fountainContent (the canonical screenplay source of truth for editor projects); fall back
  // to textContent (which also carries prose/book HTML). Keeps the view from ever coming up empty when
  // only fountainContent is populated, and never mislabels a screenplay as prose.
  const scriptRawContent = (typeof script?.fountainContent === "string" && script.fountainContent.trim())
    ? script.fountainContent
    : (typeof script?.textContent === "string" ? script.textContent : "");
  const uploadedScriptUrl = resolveImage(script?.fileUrl || "");
  const hasScriptTextContent = Boolean(scriptRawContent.trim());
  const hasUploadedScriptPdf = Boolean(uploadedScriptUrl);
  const normalizedScriptHtml = scriptRawContent.trimStart();
  const hasHtmlScriptContent = normalizedScriptHtml.startsWith("<");
  const formattedPlainScriptText = hasHtmlScriptContent ? "" : formatScreenplayLikeText(scriptRawContent);
  const fullScriptSourceText = typeof script?.fullContent === "string" && script.fullContent.trim()
    ? script.fullContent
    : scriptRawContent;
  // Screenplay text is split on REAL page boundaries (=== breaks + line-based pagination, via the
  // shared paginator) so the fallback viewer's page numbers match the editor and the PDF. HTML/book
  // content has no screenplay pagination, so it keeps the paragraph-run split.
  const scriptPages = hasHtmlScriptContent
    ? String(fullScriptSourceText || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split(/\n{2,}/)
        .map((pageText) => String(pageText || "").trim())
        .filter(Boolean)
    : splitScreenplayIntoPages(formattedPlainScriptText || fullScriptSourceText);
  const heroImage = script.trailerThumbnail || script.coverImage || "";
  const resolvedHeroImage = resolveImage(heroImage);
  const showCoverPlaceholder = !resolvedHeroImage || coverError;
  const spotlightEndsAt = script?.promotion?.spotlightEndAt ? new Date(script.promotion.spotlightEndAt) : null;
  const isApprovedOrPublished = ["published", "approved"].includes(String(script?.status || ""));
  const spotlightActive = Boolean(spotlightEndsAt && spotlightEndsAt >= new Date());
  const spotlightPendingApproval = Boolean(script?.promotion?.pendingSpotlightActivation && script?.status !== "published");
  const spotlightPaidAtUpload = Number(script?.billing?.spotlightCreditsChargedAtUpload || 0) > 0;
  const shouldEditInTextEditor = script?.projectSource === "editor" || (!script?.fileUrl && Boolean(script?.textContent));
  const isEditApprovalPending = script?.status === "pending_approval" && script?.approvalRequestType === "edit_submission";
  const spotlightIncludesAiTrailer = Boolean(
    spotlightActive || spotlightPendingApproval || spotlightPaidAtUpload || script?.services?.spotlight
  );
  const hasAiTrailerService = Boolean(
    spotlightIncludesAiTrailer
    || script?.services?.aiTrailer
    || Number(script?.billing?.aiTrailerCreditsChargedAtUpload || 0) > 0
    || Number(script?.billing?.aiTrailerCreditsCharged || 0) > 0
  );
  const hasEvaluationService = Boolean(
    script?.services?.evaluation
    || Number(script?.billing?.evaluationCreditsChargedAtUpload || 0) > 0
    || Number(script?.billing?.evaluationCreditsCharged || 0) > 0
    || ["silver", "gold", "pro", "premium"].includes(String(user?.subscription?.plan).toLowerCase())
  );
  const evaluationRequestedAtMs = script?.evaluationRequestedAt
    ? new Date(script.evaluationRequestedAt).getTime()
    : 0;
  const evaluationRequestInFlight =
    !score?.overall &&
    script?.evaluationStatus === "requested" &&
    evaluationRequestedAtMs > 0 &&
    Date.now() - evaluationRequestedAtMs < 10 * 60 * 1000;
  const evaluationPending = !score?.overall && (script?.evaluationStatus === "requested" || hasEvaluationService);
  const cl = script.classification || {};
  const ci = script.contentIndicators || {};
  const fd = script.filmDetails || {};
  const previewStart = hasViewableScript ? Number(script?.scriptPreviewAccess?.start || 1) : 0;
  const previewEnd = hasViewableScript ? Number(script?.scriptPreviewAccess?.end || previewStart) : 0;
  const viewablePagesLabel = !hasViewableScript
    ? "Hidden"
    : previewStart === previewEnd
    ? `${previewStart}`
    : `${previewStart}-${previewEnd}`;
  const writerRoleLabel = [
    fd.wantToDirect ? "I also want to direct my script" : null,
    fd.wantToProduce ? "I also want to produce my script" : null,
  ].filter(Boolean).join(" and ") || undefined;
  const completionLabel = getScriptCompletionStatusLabel(script);
  const completionProgress = getScriptCompletionProgressText(script);
  const completionFuturePlans = getScriptCompletionFuturePlans(script);
  const publishedAtValue = script?.publishedAt || script?.createdAt;
  const collaborationStats = script?.collaborationStats || {};

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "classification", label: "Classification" },
    { id: "evaluation", label: "Evaluation" },
    { id: "roles", label: "Roles" },
    ...(hasViewableScript ? [{ id: "synopsis", label: "Viewable Script" }] : []),
    ...(canViewFullScript && (hasScriptTextContent || hasUploadedScriptPdf)
      ? [{ id: "content", label: isOwner ? "My Script" : "Full Script" }]
      : []),
  ];

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */

  return (
    <div className={`min-h-screen ${t.page}`}>
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-[120] max-w-md"
          >
            <div className={`rounded-2xl border shadow-2xl px-4 py-3 backdrop-blur-md ${notice.type === "success" ? (isDarkMode ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-100" : "bg-emerald-50 border-emerald-200 text-emerald-900") : (isDarkMode ? "bg-rose-500/15 border-rose-400/30 text-rose-100" : "bg-rose-50 border-rose-200 text-rose-900")}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${notice.type === "success" ? "bg-emerald-400" : "bg-rose-400"}`} />
                <p className="text-sm font-medium leading-relaxed">{notice.message}</p>
                <button
                  onClick={() => setNotice(null)}
                  className={`ml-1 text-xs font-semibold transition-colors ${isDarkMode ? "text-white/70 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}
                  aria-label="Close notification"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* ── Back ──────────────────────────────────────── */}
          <button
            onClick={() => navigate(-1)}
            className={`inline-flex items-center gap-1.5 text-sm mb-5 transition font-medium group ${t.muted} hover:${isDarkMode ? "text-white" : "text-gray-800"}`}
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* ══════════════  HERO CARD  ══════════════════════ */}
          <div className={`rounded-2xl border overflow-hidden mb-6 ${t.card}`}>

            {/* Cover / Trailer */}
            <div className={`relative h-52 sm:h-72 ${isDarkMode ? "bg-gradient-to-br from-[#060c17] via-[#0c1a2d] to-[#0f2035]" : "bg-gradient-to-br from-slate-100 via-blue-50 to-slate-200"}`}>
              {canPlayTrailer ? (
                <>
                  <video
                    src={trailerPlaybackUrl}
                    poster={resolvedHeroImage || undefined}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    onError={handleTrailerPlaybackError}
                    className="w-full h-full object-cover absolute inset-0"
                  />
                  <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t ${isDarkMode ? "from-black/35 via-black/10" : "from-white/25 via-transparent"} to-transparent`} />
                </>
              ) : showCoverPlaceholder ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border mb-4 ${isDarkMode ? "border-white/[0.08] bg-white/[0.03]" : "border-gray-200 bg-white/60"}`}>
                    <Film size={28} strokeWidth={1.5} className={isDarkMode ? "text-white/30" : "text-gray-400"} />
                  </div>
                  <p className={`text-lg font-semibold ${isDarkMode ? "text-white/60" : "text-gray-500"}`}>{script.title}</p>
                  {script.genre && (
                    <p className={`text-xs font-medium mt-1 uppercase tracking-[0.2em] ${isDarkMode ? "text-white/20" : "text-gray-400"}`}>{script.genre}</p>
                  )}
                </div>
              ) : (
                <img
                  src={resolvedHeroImage}
                  alt={script.title}
                  onError={() => setCoverError(true)}
                  className="w-full h-full object-cover absolute inset-0"
                />
              )}

              {/* Play overlay */}
              {canPlayTrailer && (
                <button onClick={() => setShowTrailer(true)} className="absolute inset-0 flex items-center justify-center group">
                  <div className="px-4 py-2 rounded-full bg-black/50 backdrop-blur-md inline-flex items-center gap-2 ring-1 ring-white/15">
                    <span className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                    <span className="text-[11px] font-semibold tracking-wide uppercase text-white/90">Watch Trailer</span>
                  </div>
                </button>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                {script.verifiedBadge && (
                  <span
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 p-[1.5px] shadow-[0_8px_20px_rgba(30,64,175,0.45)]"
                    title="Verified Project"
                    aria-label="Verified Project"
                  >
                    <span className="w-full h-full rounded-full bg-slate-950/15 border border-white/35 flex items-center justify-center backdrop-blur-sm">
                      <BadgeCheck size={14} strokeWidth={2.35} className="text-white" />
                    </span>
                  </span>
                )}
                {script.holdStatus === "held" && (
                  <span className="px-3 py-1 bg-red-500/90 text-white rounded-lg text-[11px] font-bold">Held</span>
                )}
                {script.isFeatured && (
                  <span className="px-3 py-1 bg-purple-500/90 text-white rounded-lg text-[11px] font-bold">Featured</span>
                )}
              </div>

              {/* Bottom overlay chips */}
              <div className={`absolute bottom-0 left-0 right-0 pt-12 pb-4 px-5 bg-gradient-to-t ${isDarkMode ? "from-black/45 via-black/15" : "from-white/75 via-white/25"} to-transparent`}>
                <div className="flex items-end justify-between">
                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 backdrop-blur-md rounded-lg text-[11px] font-semibold border ${t.chip}`}>
                      {fmtFormat(script.format)}
                    </span>
                    {(script.primaryGenre || script.genre) && (
                      <span className={`px-2.5 py-1 backdrop-blur-md rounded-lg text-[11px] font-semibold border ${t.chip}`}>
                        {script.primaryGenre || script.genre}
                      </span>
                    )}
                    {cl.secondaryGenre && (
                      <span className={`px-2.5 py-1 backdrop-blur-md rounded-lg text-[11px] font-semibold border ${t.chip}`}>
                        {cl.secondaryGenre}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 backdrop-blur-md rounded-lg text-[11px] font-semibold ${getScriptCompletionBadgeClasses(script, isDarkMode)}`}>
                      {completionLabel}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ${isDarkMode ? "bg-black/30 text-white/80" : "bg-white/80 text-gray-600 border border-gray-200"}`}>
                      {script.views || 0} views
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Script Info Area ──────────────────────────── */}
            <div className="p-5 sm:p-7">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 lg:gap-8">

                {/* Left column */}

                <div className="flex-1 min-w-0 space-y-4">


                  {/* Project Overview and rest below */}
                  <div className={`rounded-2xl border p-5 sm:p-6 ${t.card}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 ${t.label}`}>Project Overview</p>
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight leading-tight ${t.title}`}>{script.title}</h1>
                      <div className="flex flex-wrap items-center gap-2">
                        <SocialShareButton
                          share={scriptShare}
                          buttonLabel="Share"
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition w-fit ${isDarkMode ? "bg-white/[0.04] border-white/[0.09] text-white/80 hover:bg-white/[0.08]" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                        />
                      </div>
                    </div>

                    <div className={`flex flex-wrap items-center gap-2.5 text-xs mb-5 ${t.muted}`}>
                      <span className={`px-2.5 py-1 rounded-lg border ${t.chip}`}>{fmtFormat(script.format)}</span>
                      {(script.primaryGenre || script.genre) && (
                        <span className={`px-2.5 py-1 rounded-lg border ${t.chip}`}>{script.primaryGenre || script.genre}</span>
                      )}
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold ${getScriptCompletionBadgeClasses(script, isDarkMode)}`}>
                        {completionProgress ? `${completionLabel} · ${completionProgress}` : completionLabel}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg border ${t.chip}`}>{script.views || 0} views</span>
                    </div>

                    {/* Author */}
                    <Link to={getProfileCanonicalPath(script.creator)} className="inline-flex items-center gap-2.5 group">
                      {script.creator?.profileImage && !coverError ? (
                        <img
                          src={resolveImage(script.creator.profileImage)}
                          alt=""
                          className={`w-8 h-8 rounded-full object-cover ring-2 ${isDarkMode ? "ring-white/10" : "ring-gray-200"}`}
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ring-2 ${isDarkMode ? "bg-gradient-to-br from-[#1e3a5f] to-[#2a5080] ring-white/10" : "bg-gradient-to-br from-[#1e3a5f] to-[#2d5a8e] ring-gray-200"}`}>
                          {script.creator?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="leading-tight">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${t.label}`}>Writer</p>
                        <p className={`text-sm font-semibold transition group-hover:text-[#1e3a5f] ${t.sub}`}>{script.creator?.name}</p>
                      </div>
                    </Link>
                  </div>

                  {script.logline && (
                    <div className={`rounded-2xl border p-5 sm:p-6 ${t.card}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 ${t.label}`}>Logline</p>
                      <div className="max-h-28 overflow-y-auto sidebar-scroll pr-2">
                        <p className={`text-[15px] leading-relaxed italic whitespace-pre-wrap break-words ${t.sub}`}>
                          &ldquo;{script.logline}&rdquo;
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Synopsis preview */}
                  {script.synopsis && (
                    <div className={`rounded-2xl p-5 sm:p-6 border ${t.inset}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 ${t.label}`}>Synopsis</p>
                      <div className="max-h-56 overflow-y-auto sidebar-scroll pr-2">
                        <p className={`text-[14px] leading-relaxed whitespace-pre-wrap break-words ${t.sub}`}>{script.synopsis}</p>
                      </div>

                    </div>
                  )}

                  <div className={`rounded-2xl border p-5 sm:p-6 ${t.card}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 ${t.label}`}>Completion Status</p>
                    <p className={`text-sm font-semibold ${t.sub}`}>
                      {completionProgress ? `${completionLabel} - ${completionProgress}` : completionLabel}
                    </p>
                    {completionFuturePlans && (
                      <p className={`mt-3 text-sm leading-relaxed whitespace-pre-wrap ${t.sub}`}>{completionFuturePlans}</p>
                    )}
                  </div>

                  {(ci.bechdelTest || ci.basedOnTrueStory || ci.adaptation || script.tags?.length > 0) && (
                    <div className={`rounded-2xl border p-5 sm:p-6 ${t.card}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 ${t.label}`}>Metadata</p>

                      {(ci.bechdelTest || ci.basedOnTrueStory || ci.adaptation) && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {ci.bechdelTest && (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[11px] font-bold border border-emerald-500/20">
                              &#10003; Bechdel Test
                            </span>
                          )}
                          {ci.basedOnTrueStory && (
                            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-lg text-[11px] font-bold border border-blue-500/20">
                              Based on True Story
                            </span>
                          )}
                          {ci.adaptation && (
                            <span className="px-2.5 py-1 bg-purple-500/10 text-purple-600 rounded-lg text-[11px] font-bold border border-purple-500/20">
                              Adaptation{ci.adaptationSource ? `: ${ci.adaptationSource}` : ""}
                            </span>
                          )}
                        </div>
                      )}

                      {script.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto sidebar-scroll pr-2">
                          {script.tags.map((tag) => (
                            <span key={tag} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium ring-1 transition ${t.tag}`}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Right Sidebar ─────────────────────────── */}
                <div className="lg:w-72 space-y-3 flex-shrink-0 lg:sticky lg:top-4 self-start">

                  {/* Price card */}
                  <div className={`rounded-2xl p-5 border ${t.priceSub}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${t.label}`}>Script Pricing</p>
                    <p className={`text-3xl font-extrabold mb-4 ${t.title}`}>
                      {formatCurrency(script.price)}
                      <span className={`text-sm font-medium ml-1 ${t.muted}`}>INR</span>
                    </p>
                    <div className={`grid grid-cols-2 gap-3 pt-3 border-t ${t.divider}`}>
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${t.label}`}>Pages</p>
                        <p className={`text-lg font-extrabold tabular-nums ${t.title}`}>{script.pageCount || "\u2014"}</p>
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${t.label}`}>Viewable Pages</p>
                        <p className={`text-[13px] font-bold capitalize ${t.title}`}>{viewablePagesLabel || "\u2014"}</p>
                      </div>

                      {script.rating > 0 && (
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${t.label}`}>AI Generated Rating</p>
                          <p className="text-lg font-extrabold text-amber-500 tabular-nums">&#9733; {script.rating.toFixed(1)}</p>
                        </div>
                      )}

                      {script.producerRating?.count > 0 && (
                        <div>
                          <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${t.label}`}>Producer Rating</p>
                          <p className="text-lg font-extrabold text-emerald-500 tabular-nums">&#9733; {Number(script.producerRating.average).toFixed(1)} <span className={`text-[11px] font-semibold ${t.muted}`}>({script.producerRating.count})</span></p>
                        </div>
                      )}
                    </div>
                  </div>

                  {isIndustryRole && (
                    <div className={`rounded-2xl border overflow-hidden ${t.priceSub}`}>
                      {!canViewWriterInfo && (
                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                          <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${t.label}`}>Writer Contact</p>
                          <button
                            type="button"
                            onClick={() => openPricingModal()}
                            className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition"
                          >
                            Get Plan
                          </button>
                        </div>
                      )}
                      {canViewWriterInfo && (
                        <>
                      {/* Header */}
                      <div className="px-4 pt-4 pb-3">
                        {/* Row 1: label + premium badge */}
                        <div className="flex items-center gap-2 mb-2">
                          <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${t.label}`}>Writer Contact</p>
                          {viewerHasProAccess && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
                              <span className="h-[4px] w-[4px] rounded-full bg-amber-400" />
                              Premium
                            </span>
                          )}
                        </div>

                        {/* Row 3: action buttons — full width, side by side */}
                        <div className="flex gap-2">
                          {(writerAlreadyMessaged || (viewerHasProAccess && !messageWriterBlocked) || script?.isUnlocked) && script?.creator?._id && (
                            <div className="flex-1 flex flex-col items-center">
                              <button
                                type="button"
                                onClick={handleMessageWriter}
                                className={`flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border ${
                                  isDarkMode
                                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                                    : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
                                }`}
                              >
                                <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                                Message Writer
                              </button>
                              {viewerHasProAccess && !writerAlreadyMessaged && !script?.isUnlocked && (
                                <p className={`mt-1.5 text-[9px] ${remainingMessageWriters === 0 ? "text-rose-400" : remainingMessageWriters <= Math.ceil(messageWritersLimit * 0.3) ? "text-amber-400" : t.muted}`}>
                                  {remainingMessageWriters === 0 ? `All ${messageWritersLimit} msgs used` : `${messageWritersUsed}/${messageWritersLimit} msgs used`}
                                </p>
                              )}
                            </div>
                          )}

                          {contactAlreadyRevealed ? (
                            <div className="flex-1 flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => setShowWriterInfo((prev) => !prev)}
                                className={`flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border ${t.btnSec}`}
                              >
                                {showWriterInfo ? "Hide Details" : "View Details"}
                              </button>
                            </div>
                          ) : contactRevealBlocked ? (
                            <div className="flex-1 flex flex-col items-center">
                              <span className={`flex w-full items-center justify-center px-3 py-2 rounded-xl text-[11px] font-semibold border ${
                                isDarkMode ? "border-white/10 text-white/30 bg-white/5" : "border-gray-200 text-gray-400 bg-gray-50"
                              }`}>
                                Limit Reached
                              </span>
                            </div>
                          ) : viewerHasProAccess ? (
                            <div className="flex-1 flex flex-col items-center">
                              <button
                                type="button"
                                onClick={handleRevealContact}
                                disabled={revealLoading}
                                className={`flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border disabled:opacity-60 ${t.btnPri}`}
                              >
                                {revealLoading ? (
                                  <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                                ) : null}
                                Reveal Details
                              </button>
                              <p className={`mt-1.5 text-[9px] ${remainingContacts === 0 ? "text-rose-400" : remainingContacts <= Math.ceil(contactsLimit * 0.3) ? "text-amber-400" : t.muted}`}>
                                {remainingContacts === 0 ? `All ${contactsLimit} reveals used` : `${contactsUsed}/${contactsLimit} reveals used`}
                              </p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={handleRevealContact}
                              disabled={revealLoading}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all disabled:opacity-60"
                            >
                              {revealLoading ? (
                                <>
                                  <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                                  Revealing...
                                </>
                              ) : (
                                <>
                                  <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                                  Reveal Contact
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        {(meetingAlreadyScheduled || (viewerHasProAccess && !meetingsBlocked) || script?.isUnlocked) && script?.creator?._id && (
                          <div className="mt-2 flex flex-col items-center">
                            <button
                              type="button"
                              disabled={meetingSent}
                              onClick={() => !meetingSent && setShowMeetingModal(true)}
                              className={`flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all border ${
                                isDarkMode
                                  ? "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20"
                                  : "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100"
                              } ${meetingSent ? "opacity-80" : ""}`}
                            >
                              {meetingSent ? (
                                <>
                                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  Sent
                                </>
                              ) : (
                                <>
                                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Schedule Meeting
                                </>
                              )}
                            </button>
                            {viewerHasProAccess && !meetingAlreadyScheduled && !script?.isUnlocked && (
                              <p className={`mt-1.5 text-[9px] ${remainingMeetings === 0 ? "text-rose-400" : remainingMeetings <= Math.ceil(meetingsLimit * 0.3) ? "text-amber-400" : t.muted}`}>
                                {remainingMeetings === 0 ? `All ${meetingsLimit} meetings used` : `${meetingsUsed}/${meetingsLimit} meetings used`}
                              </p>
                            )}
                          </div>
                        )}

                        {revealError && (
                          <p className="mt-2 text-[11px] text-rose-400">{revealError}</p>
                        )}
                      </div>

                      {/* Usage bar — all pro subscribers */}
                      {viewerHasProAccess && (
                        <div className="px-4 pb-3">
                          <div className={`h-[3px] w-full rounded-full overflow-hidden ${isDarkMode ? "bg-white/8" : "bg-gray-100"}`}>
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                contactsUsed >= contactsLimit
                                  ? "bg-rose-500"
                                  : contactsUsed >= contactsLimit * 0.8
                                    ? "bg-amber-500"
                                    : "bg-amber-400"
                              }`}
                              style={{ width: `${Math.min(100, (contactsUsed / contactsLimit) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Limit reached — upgrade prompt */}
                      {contactRevealBlocked && (
                        <div className={`mx-4 mb-4 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3`}>
                          <p className="text-[11px] font-semibold text-rose-400">
                            You've used all {contactsLimit} writer contact reveals for this subscription period.
                            Renew your Film Industry Professional plan to get 15 more.
                          </p>
                        </div>
                      )}

                      {/* Revealed contact details */}
                      {contactAlreadyRevealed && showWriterInfo && (
                        <div className={`px-4 pb-4 pt-3 border-t space-y-3 ${t.divider}`}>



                          <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${t.label}`}>Email</p>
                            {writerContact?.email ? (
                              <a href={`mailto:${writerContact.email}`} className={`text-sm font-semibold break-all ${t.title}`}>
                                {writerContact.email}
                              </a>
                            ) : (
                              <p className={`text-sm ${t.muted}`}>No email available</p>
                            )}
                          </div>
                          <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${t.label}`}>Phone</p>
                            {writerContact?.phone ? (
                              <a href={`tel:${writerContact.phone}`} className={`text-sm font-semibold break-all ${t.title}`}>
                                {writerContact.phone}
                              </a>
                            ) : (
                              <p className={`text-sm ${t.muted}`}>No phone available</p>
                            )}
                          </div>
                          <div>
                            <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${t.label}`}>Links</p>
                            {availableWriterLinks.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {availableWriterLinks.map((link) => (
                                  <a
                                    key={link.key}
                                    href={link.href}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${t.btnSec}`}
                                  >
                                    {link.label}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <p className={`text-sm ${t.muted}`}>No links available</p>
                            )}
                          </div>
                        </div>
                      )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Trailer generation */}
                  <div className={`rounded-2xl p-5 border mb-3 transition-all duration-300 ${wantsTrailer ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5' : t.priceSub}`}>
                    {["requested", "generating"].includes(script?.trailerStatus) ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-2 text-center animate-in fade-in duration-500">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-1">
                          <Film className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h3 className={`text-base font-semibold ${t.title}`}>Trailer is Generating</h3>
                        <p className={`text-xs ${t.muted} max-w-[250px]`}>
                          Your trailer payment is confirmed. It takes 3 working days to generate.
                        </p>
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                          Processing (~3 Days)
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col gap-1.5">
                            <h3 className={`text-base font-semibold ${t.title}`}>Generate trailer</h3>
                            <p className={`text-xs ${t.muted}`}>It takes 3 working days to generate.</p>
                          </div>
                          <div className="flex bg-black/5 dark:bg-white/5 rounded-lg p-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setWantsTrailer(true)}
                              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${wantsTrailer ? 'bg-emerald-500 text-white shadow-md' : `text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300`}`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setWantsTrailer(false)}
                              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${!wantsTrailer ? 'bg-emerald-500 text-white shadow-md' : `text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300`}`}
                            >
                              No
                            </button>
                          </div>
                        </div>

                    {wantsTrailer && (
                      <div className="mt-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2.5">
                          <p className={`text-[11px] font-semibold uppercase tracking-wider ${t.label}`}>Length</p>
                          <div className="grid grid-cols-3 gap-2">
                            {["30", "60", "90"].map((value) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setTrailerDurationChoice(value)}
                                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                                  trailerDurationChoice === value 
                                    ? "bg-emerald-500 text-white border-emerald-500 shadow-md" 
                                    : `hover:bg-black/5 dark:hover:bg-white/5 ${t.btnSec}`
                                }`}
                              >
                                {value} sec
                              </button>
                            ))}
                          </div>
                        </div>

                        {trailerDurationChoice && (
                          <div className="space-y-2.5 animate-in fade-in duration-300">
                            <p className={`text-[11px] font-semibold uppercase tracking-wider ${t.label}`}>Quality</p>
                            <div className="grid grid-cols-2 gap-2">
                              {["480", "720"].map((value) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setTrailerQualityChoice(value)}
                                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    trailerQualityChoice === value 
                                      ? "bg-emerald-500 text-white border-emerald-500 shadow-md" 
                                      : `hover:bg-black/5 dark:hover:bg-white/5 ${t.btnSec}`
                                  }`}
                                >
                                  {value}p
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {trailerDurationChoice && trailerQualityChoice && (
                          <div className="space-y-2.5 animate-in fade-in duration-300">
                            <p className={`text-[11px] font-semibold uppercase tracking-wider ${t.label}`}>Format</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: "landscape", label: "Landscape (16:9)" },
                                { value: "portrait", label: "Portrait (9:16)" },
                              ].map((item) => (
                                <button
                                  key={item.value}
                                  type="button"
                                  onClick={() => setTrailerFormatChoice(item.value)}
                                  className={`py-2 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 ${
                                    trailerFormatChoice === item.value 
                                      ? "bg-emerald-500 text-white border-emerald-500 shadow-md" 
                                      : `hover:bg-black/5 dark:hover:bg-white/5 ${t.btnSec}`
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {trailerDurationChoice && trailerQualityChoice && trailerFormatChoice && (
                          <div className="space-y-2.5 animate-in fade-in duration-300">
                            <p className={`text-[11px] font-semibold uppercase tracking-wider ${t.label}`}>Currency</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: "inr", label: "INR (₹)" },
                                { value: "usd", label: "USD ($)" },
                              ].map((item) => (
                                <button
                                  key={item.value}
                                  type="button"
                                  onClick={() => setTrailerCurrencyChoice(item.value)}
                                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                                    trailerCurrencyChoice === item.value 
                                      ? "bg-emerald-500 text-white border-emerald-500 shadow-md" 
                                      : `hover:bg-black/5 dark:hover:bg-white/5 ${t.btnSec}`
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {trailerCurrencyChoice && trailerDurationChoice && trailerQualityChoice && trailerFormatChoice && (
                          <div className="pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="rounded-2xl p-5 border bg-gradient-to-br from-emerald-50/80 to-transparent dark:from-emerald-500/10 dark:to-transparent border-emerald-100 dark:border-emerald-500/20 flex flex-col gap-5 shadow-sm">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1.5">Order Summary</p>
                                  <div className="flex flex-wrap gap-2 text-xs font-medium text-emerald-900/70 dark:text-emerald-100/70">
                                    <span className="bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">{trailerDurationChoice}s</span>
                                    <span className="bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">{trailerQualityChoice}p</span>
                                    <span className="bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md capitalize">{trailerFormatChoice}</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-400/70 mb-0.5">Total</p>
                                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-tight">
                                    {trailerCurrencyChoice === "usd" ? "$" : "₹"}{formatTrailerAmount(selectedTrailerAmount)}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setShowTrailerPaymentModal(true)}
                                disabled={trailerLoading || trailerPaymentSubmitting}
                                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform active:scale-[0.98]"
                              >
                                {trailerPaymentSubmitting ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <Film size={16} />
                                    <span>Generate Trailer Now</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

                  {/* Action buttons */}
                  <div className={`rounded-2xl p-4 border space-y-2 ${t.priceSub}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${t.label}`}>Actions</p>

                    {canBookmark && (
                      <button
                        onClick={handleToggleBookmark}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${isBookmarked
                          ? "bg-amber-500/12 text-amber-400 border-amber-400/30"
                          : t.btnSec
                        }`}
                      >
                        <svg className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current" : ""}`} viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5h13.5a.75.75 0 01.75.75v15.69a.75.75 0 01-1.219.594L12 16.34l-6.281 5.194a.75.75 0 01-1.219-.594V5.25a.75.75 0 01.75-.75z" />
                        </svg>
                        {isBookmarked ? "Saved Script" : "Save Script"}
                      </button>
                    )}

                    {isOwner && isEditApprovalPending && (
                      <div className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border text-center ${t.inset}`}>
                        Edit approval pending with admin. Editing is locked until review is complete.
                      </div>
                    )}

                    {canEditScript && (!isOwner || !isEditApprovalPending) && (
                      <Link
                        to={isOwner
                          ? (shouldEditInTextEditor ? `/create-project/${script._id}` : `/upload?edit=${script._id}`)
                          : `/script/${script._id}/branch/edit`}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border ${t.btnSec}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                        {isOwner ? "Edit Project" : "Edit my branch"}
                      </Link>
                    )}

                    {/* Spotlight manual activation removed (credits deprecated) */}

                    {isOwner && isSoldScript && (
                      <div className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border text-center ${t.inset}`}>
                        Spotlight unavailable after sale
                      </div>
                    )}

                    {isOwner && spotlightPendingApproval && (
                      <div className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border text-center ${t.inset}`}>
                        Spotlight already purchased at upload. It will auto-activate after admin approval.
                      </div>
                    )}

                    {isOwner && spotlightPaidAtUpload && !spotlightActive && script?.status === "published" && (
                      <div className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border text-center ${t.inset}`}>
                        Spotlight package already paid at upload. Activation is being synced without additional credits.
                      </div>
                    )}

                    {/* Spotlight info box removed */}



                    {/* Already Purchased Badge + Message Writer CTA */}
                    {!isOwner && script.isUnlocked && (
                      <>
                        <div className="w-full px-4 py-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold text-center border border-emerald-200 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Purchased
                        </div>
                        {user?.role === "investor" && script.creator?._id && (
                          <button
                            onClick={() =>
                              navigate(
                                `/messages?recipientId=${script.creator._id}&recipientName=${encodeURIComponent(script.creator.name || "Writer")}`
                              )
                            }
                            className={`w-full px-4 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 border ${t.btnSec}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                            Message Writer
                          </button>
                        )}
                      </>
                    )}

                    {script.holdStatus === "held" && (
                      <div className="w-full px-4 py-2.5 bg-red-50 text-red-500 rounded-xl text-xs font-bold text-center border border-red-200">
                        Currently Held
                      </div>
                    )}

                    {/* Evaluation manual button removed */}

                    {isOwner && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border mt-1 ${t.btnDel}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        Delete Project
                      </button>
                    )}
                  </div>

                  {/* Pitch Video */}
                  {script?.pitchVideoUrl && (
                    <div className={`rounded-2xl border overflow-hidden ${t.priceSub}`}>
                      <div className={`px-4 pt-3 pb-2`}>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${t.label}`}>Pitch Video</p>
                      </div>
                      <video
                        src={script.pitchVideoUrl}
                        controls
                        controlsList="nodownload"
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[220px] object-contain bg-black"
                      />
                    </div>
                  )}

                  <div className={`rounded-2xl p-3 border text-center ${t.priceSub}`}>
                    <p className={`text-[11px] font-medium ${t.muted}`}>Published {formatDateTime(publishedAtValue)}</p>
                    {script?.sid && (
                      <p className={`text-[10px] font-semibold mt-1 ${t.sub}`}>SID: {script.sid}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════  TABS BAR  ═════════════════════════ */}
          <div className={`flex gap-1 mb-6 rounded-xl p-1 overflow-x-auto border ${t.tabs}`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 text-[13px] font-bold rounded-lg transition-all whitespace-nowrap px-4 ${activeTab === tab.id ? t.tabAct : t.tabInact}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ══════════════  TAB CONTENT  ═════════════════════ */}
          <AnimatePresence mode="wait">

            {/* ── Overview ─────────────────────────────────── */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

                {/* Details table */}
                <div className={`rounded-xl border p-6 ${t.card}`}>
                  <h3 className={`text-[13px] font-bold mb-4 flex items-center gap-2 ${t.title}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-white/[0.06]" : "bg-gray-100"}`}>
                      <svg className={`w-3.5 h-3.5 ${t.muted}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                    Project Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                    {[
                      { label: "Company Name", value: script.companyName },
                      { label: "Format", value: fmtFormat(script.format) },
                      { label: "Primary Genre", value: cl.primaryGenre || script.primaryGenre || script.genre },
                      { label: "Views", value: Number(script.views || 0).toLocaleString("en-IN") },
                      { label: "Secondary Genre", value: cl.secondaryGenre },
                      { label: "Completion", value: completionProgress ? `${completionLabel} · ${completionProgress}` : completionLabel },
                      { label: "Page Count", value: script.pageCount },
                      { label: "Viewable Pages", value: viewablePagesLabel },
                      { label: "Published", value: formatDateTime(publishedAtValue) },
                      { label: "Film Language", value: fd.filmLanguage },
                      { label: "Dialogues", value: fd.dialoguesPresent === "yes" ? "Full Dialogues" : fd.dialoguesPresent === "partial" ? "Partial" : fd.dialoguesPresent === "no" ? "Action Only" : undefined },
                      { label: "Writer's Role", value: writerRoleLabel },
                    ]
                      .filter((i) => i.value && i.value !== "\u2014")
                      .map((item, idx) => (
                        <div key={idx} className={`flex justify-between items-center py-2.5 border-b last:border-0 ${t.row}`}>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${t.label}`}>{item.label}</span>
                          <span className={`text-sm font-semibold ${t.sub}`}>{item.value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Classification ───────────────────────────── */}
            {activeTab === "classification" && (
              <motion.div key="classification" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={`rounded-3xl border ${t.card} p-5 sm:p-8 flex flex-col divide-y ${isDarkMode ? "divide-white/[0.06]" : "divide-gray-100"}`}>
                {[
                  { label: "Tones", items: cl.tones, color: isDarkMode ? "bg-white/[0.06] text-white/80 border border-white/[0.08]" : "bg-gray-100 text-gray-700 border border-gray-200" },
                  { label: "Themes", items: cl.themes, color: isDarkMode ? "bg-blue-500/10 text-blue-300 border border-blue-500/15" : "bg-blue-50 text-blue-700 border border-blue-200" },
                  { label: "Settings", items: cl.settings, color: isDarkMode ? "bg-white/[0.04] text-neutral-300 border border-white/[0.06]" : "bg-slate-50 text-slate-700 border border-slate-200" },
                ]
                  .filter((c) => c.items?.length > 0)
                  .map((cat) => (
                    <div key={cat.label} className="py-6 first:pt-0 last:pb-0">
                      <h3 className={`text-[13px] font-bold mb-3 ${t.title}`}>{cat.label}</h3>
                      <div className="flex flex-wrap gap-2">
                        {cat.items.map((item, i) => (
                          <span key={i} className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold ${cat.color}`}>{item}</span>
                        ))}
                      </div>
                    </div>
                  ))}

                {!cl.tones?.length && !cl.themes?.length && !cl.settings?.length && (
                  <div className="text-center py-12">
                    <h3 className={`text-base font-bold mb-1 ${t.title}`}>No Classification Data</h3>
                    <p className={`text-sm ${t.muted}`}>
                      {isOwner ? "Add tones, themes, and settings when editing your script" : "Classification data hasn't been added yet"}
                    </p>
                  </div>
                )}

                {/* Film Production Details */}
                {(fd.filmLanguage || fd.dialoguesPresent || fd.wantToDirect || fd.wantToProduce || fd.scriptStyle?.length > 0) && (
                  <div className="py-6 first:pt-0">
                    <h3 className={`text-[13px] font-bold mb-4 ${t.title}`}>Film Production Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fd.filmLanguage && (
                        <div className={`rounded-xl border p-3.5 ${isDarkMode ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50"}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Film Language</p>
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>{fd.filmLanguage}</p>
                        </div>
                      )}
                      {fd.dialoguesPresent && (
                        <div className={`rounded-xl border p-3.5 ${isDarkMode ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50"}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Dialogues</p>
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                            {fd.dialoguesPresent === "yes" ? "Full Dialogues Included" : fd.dialoguesPresent === "partial" ? "Partial Dialogues" : "Action / Direction Only"}
                          </p>
                        </div>
                      )}
                      {(fd.wantToDirect || fd.wantToProduce) && (
                        <div className={`rounded-xl border p-3.5 sm:col-span-2 ${isDarkMode ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50"}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Writer's Role</p>
                          <div className="flex flex-wrap gap-2">
                            {fd.wantToDirect && (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${isDarkMode ? "bg-violet-500/10 border-violet-500/20 text-violet-300" : "bg-violet-50 border-violet-200 text-violet-700"}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h7.5" /></svg>
                                Writer-Director
                              </span>
                            )}
                            {fd.wantToProduce && (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${isDarkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>
                                Writer-Producer
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {fd.scriptStyle?.length > 0 && (
                        <div className={`rounded-xl border p-3.5 sm:col-span-2 ${isDarkMode ? "border-[#1d3350] bg-[#0b1626]" : "border-gray-200 bg-gray-50"}`}>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDarkMode ? "text-gray-500" : "text-gray-400"}`}>Script Style</p>
                          <div className="flex flex-wrap gap-2">
                            {fd.scriptStyle.map((s) => (
                              <span key={s} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${isDarkMode ? "bg-white/[0.06] text-white/80 border-white/[0.08]" : "bg-gray-100 text-gray-700 border-gray-200"}`}>{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Evaluation ─────────────────────── */}
            {activeTab === "evaluation" && (() => {
              const dk = isDarkMode;

              /* Dimension definitions — each has a distinct semantic color */
              const dims = [
                { key: "plot", label: "Plot", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: dk ? "#818cf8" : "#4f46e5" },
                { key: "characters", label: "Characters", icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", color: dk ? "#a78bfa" : "#7c3aed" },
                { key: "dialogue", label: "Dialogue", icon: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z", color: dk ? "#34d399" : "#059669" },
                { key: "pacing", label: "Pacing", icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z", color: dk ? "#fbbf24" : "#d97706" },
                { key: "marketability", label: "Marketability", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941", color: dk ? "#fb923c" : "#ea580c" },
              ];

              /* Score → grade helpers */
              const gradeLabel = (v) => v >= 90 ? "S" : v >= 80 ? "A" : v >= 70 ? "B" : v >= 60 ? "C" : v >= 50 ? "D" : "F";
              const gradeColor = (v) =>
                v >= 90 ? (dk ? "#c084fc" : "#9333ea") :
                  v >= 80 ? (dk ? "#34d399" : "#059669") :
                    v >= 70 ? (dk ? "#60a5fa" : "#2563eb") :
                      v >= 60 ? (dk ? "#fbbf24" : "#d97706") :
                        (dk ? "#f87171" : "#dc2626");
              const gradeText = (v) => v >= 90 ? "Exceptional" : v >= 80 ? "Excellent" : v >= 70 ? "Strong" : v >= 60 ? "Promising" : v >= 50 ? "Developing" : "Needs Work";
              const gradeBand = (v) =>
                v >= 90 ? (dk ? "bg-purple-400/10 border-purple-400/20 text-purple-300" : "bg-purple-50 border-purple-200 text-purple-700") :
                  v >= 80 ? (dk ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700") :
                    v >= 70 ? (dk ? "bg-blue-400/10 border-blue-400/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700") :
                      v >= 60 ? (dk ? "bg-amber-400/10 border-amber-400/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700") :
                        (dk ? "bg-red-400/10 border-red-400/20 text-red-300" : "bg-red-50 border-red-200 text-red-700");

              /* Radar geometry */
              const cx = 110, cy = 110, rr = 80;
              const angleStep = (2 * Math.PI) / dims.length;
              const radarPts = dims.map((d, i) => {
                const v = (score[d.key] || 0) / 100;
                const a = angleStep * i - Math.PI / 2;
                return { x: cx + rr * v * Math.cos(a), y: cy + rr * v * Math.sin(a) };
              });
              const gridLevels = [0.25, 0.5, 0.75, 1];
              const overallColor = gradeColor(score.overall || 0);

              return (
                <motion.div key="evaluation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                  {score?.overall ? (
                    <>
                      {/* ── 1. Score Hero ── */}
                      <div className={`rounded-2xl border overflow-hidden ${t.card}`}>
                        <div className="flex flex-col sm:flex-row items-center gap-0 divide-y sm:divide-y-0 sm:divide-x"
                          style={{ divideColor: dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>

                          {/* Overall gauge */}
                          <div className="flex flex-col items-center justify-center gap-3 px-8 py-7 sm:w-56 shrink-0">
                            <div className="relative w-28 h-28">
                              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                <circle cx="50" cy="50" r="42" fill="none"
                                  stroke={dk ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="7" />
                                <circle cx="50" cy="50" r="42" fill="none"
                                  stroke={overallColor} strokeWidth="7" strokeLinecap="round"
                                  strokeDasharray={`${(score.overall / 100) * 263.9} 263.9`}
                                  style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }} />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-3xl font-black tabular-nums leading-none ${dk ? "text-white" : "text-gray-900"}`}>{score.overall}</span>
                                <span className={`text-[9px] font-semibold uppercase tracking-widest mt-1 ${dk ? "text-white/30" : "text-gray-400"}`}>score</span>
                              </div>
                            </div>
                            {/* Grade badge */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${gradeBand(score.overall)}`}>
                              <span className="text-base font-black leading-none">{gradeLabel(score.overall)}</span>
                              <span>{gradeText(score.overall)}</span>
                            </div>
                          </div>

                          {/* Dimension pills grid */}
                          <div className="flex-1 px-6 py-6">
                            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-4 ${dk ? "text-white/25" : "text-gray-400"}`}>
                              Dimension Scores{score.scoredAt ? ` · ${formatDate(score.scoredAt)}` : ""}
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                              {dims.map(d => {
                                const val = score[d.key] || 0;
                                return (
                                  <div key={d.key}
                                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border ${dk ? "bg-white/[0.03] border-white/[0.07]" : "bg-gray-50/80 border-gray-200/60"}`}>
                                    <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
                                      style={{ backgroundColor: `${d.color}${dk ? "18" : "10"}` }}>
                                      <svg className="w-4 h-4" style={{ color: d.color }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d={d.icon} />
                                      </svg>
                                    </div>
                                    <div className="min-w-0">
                                      <p className={`text-[10px] font-medium truncate ${dk ? "text-white/35" : "text-gray-400"}`}>{d.label}</p>
                                      <p className="text-sm font-black tabular-nums leading-tight" style={{ color: d.color }}>{val}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── 2. Radar + Breakdown ── */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

                        {/* Radar */}
                        <div className={`rounded-2xl border p-5 ${t.card}`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${dk ? "text-white/25" : "text-gray-400"}`}>Performance Radar</p>
                          <svg viewBox="0 0 220 220" className="w-full max-w-xs mx-auto">
                            <defs>
                              <radialGradient id="evalRadarFill" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor={overallColor} stopOpacity={dk ? "0.22" : "0.16"} />
                                <stop offset="100%" stopColor={overallColor} stopOpacity="0" />
                              </radialGradient>
                            </defs>
                            {/* Grid rings */}
                            {gridLevels.map((lv, gi) => {
                              const pts = dims.map((_, j) => {
                                const a = angleStep * j - Math.PI / 2;
                                return `${cx + rr * lv * Math.cos(a)},${cy + rr * lv * Math.sin(a)}`;
                              }).join(" ");
                              return <polygon key={gi} points={pts} fill="none"
                                stroke={dk ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"} strokeWidth="1" />;
                            })}
                            {/* Axis spokes */}
                            {dims.map((_, i) => {
                              const a = angleStep * i - Math.PI / 2;
                              return <line key={i} x1={cx} y1={cy} x2={cx + rr * Math.cos(a)} y2={cy + rr * Math.sin(a)}
                                stroke={dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="1" />;
                            })}
                            {/* Data shape */}
                            <polygon points={radarPts.map(p => `${p.x},${p.y}`).join(" ")}
                              fill="url(#evalRadarFill)" stroke={overallColor} strokeWidth="2" strokeLinejoin="round" />
                            {/* Dimension dots + labels */}
                            {radarPts.map((p, i) => {
                              const a = angleStep * i - Math.PI / 2;
                              const lx = cx + (rr + 22) * Math.cos(a);
                              const ly = cy + (rr + 22) * Math.sin(a);
                              const axisX = Math.cos(a);
                              const labelAnchor = axisX > 0.2 ? "end" : axisX < -0.2 ? "start" : "middle";
                              const labelX = lx + (axisX > 0.2 ? -4 : axisX < -0.2 ? 4 : 0);
                              return (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r="4" fill={dims[i].color}
                                    stroke={dk ? "#0d1829" : "#ffffff"} strokeWidth="2" />
                                  <text x={labelX} y={ly} textAnchor={labelAnchor} dominantBaseline="middle"
                                    style={{ fontSize: 8.5, fontWeight: 700, fill: dk ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}>
                                    {dims[i].label}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>

                        {/* Bar Chart */}
                        <div className={`rounded-2xl border p-5 ${t.card}`}>
                          <p className={`text-[11px] font-semibold uppercase tracking-wider mb-4 ${dk ? "text-white/25" : "text-gray-400"}`}>Score Overview</p>
                          {(() => {
                            const barH = 180;
                            const bars = [{ key: "overall", label: "Overall", color: overallColor }, ...dims];
                            const gridLines = [0, 25, 50, 75, 100];
                            const gridColor = dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
                            const labelColor = dk ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
                            const chartWidth = 308;
                            const chartPadLeft = 26;
                            const chartPadRight = 8;
                            const plotWidth = chartWidth - chartPadLeft - chartPadRight;
                            const slotW = plotWidth / bars.length;
                            const barW = Math.min(slotW * 0.56, 30);
                            return (
                              <svg viewBox={`0 0 ${chartWidth} ${barH + 56}`} className="w-full">
                                {gridLines.map(v => {
                                  const y = barH - (v / 100) * barH + 4;
                                  return (
                                    <g key={v}>
                                      <line x1={chartPadLeft} y1={y} x2={chartWidth - chartPadRight} y2={y} stroke={gridColor} strokeWidth={v === 0 ? "1.5" : "1"} strokeDasharray={v === 0 ? "" : "3,3"} />
                                      <text x={chartPadLeft - 6} y={y + 3.5} textAnchor="end" style={{ fontSize: 8, fontWeight: 600, fill: labelColor }}>{v}</text>
                                    </g>
                                  );
                                })}
                                {bars.map((d, i) => {
                                  const val = score[d.key] || 0;
                                  const filledH = (val / 100) * barH;
                                  const slotCenterX = chartPadLeft + i * slotW + slotW / 2;
                                  const x = slotCenterX - barW / 2;
                                  const y = barH - filledH + 4;
                                  const isFirst = i === 0;
                                  const isLast = i === bars.length - 1;
                                  const labelAnchor = isFirst ? "start" : isLast ? "end" : "middle";
                                  const labelX = isFirst ? slotCenterX - 8 : isLast ? slotCenterX + 8 : slotCenterX;
                                  const labelY = barH + 18 + (i % 2 === 0 ? 0 : 10);
                                  return (
                                    <g key={d.key}>
                                      <rect x={x} y={4} width={barW} height={barH} rx="4"
                                        fill={dk ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)"} />
                                      <rect x={x} y={y} width={barW} height={filledH} rx="4" fill={d.color}>
                                        <animate attributeName="height" from="0" to={filledH} dur="0.75s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                        <animate attributeName="y" from={barH + 4} to={y} dur="0.75s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" />
                                      </rect>
                                      <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                                        style={{ fontSize: 8, fontWeight: 800, fill: dk ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)" }}>{val}</text>
                                      <text x={labelX} y={labelY} textAnchor={labelAnchor}
                                        style={{ fontSize: 8, fontWeight: 700, fill: d.color }}>{d.label}</text>
                                    </g>
                                  );
                                })}
                              </svg>
                            );
                          })()}
                        </div>
                      </div>

                      {/* ── 3. Ckript Score (platform/admin evaluation) ── */}
                      {script.platformScore?.overall > 0 && (() => {
                        const ps = script.platformScore;
                        const psDims = [
                          { key: "content", label: "Main Content", color: "#6366f1", track: dk ? "rgba(99,102,241,0.15)" : "#ede9fe" },
                          { key: "trailer", label: "Trailer", color: "#8b5cf6", track: dk ? "rgba(139,92,246,0.15)" : "#ede9fe" },
                          { key: "title", label: "Title", color: "#f59e0b", track: dk ? "rgba(245,158,11,0.15)" : "#fef3c7" },
                          { key: "synopsis", label: "Synopsis", color: "#10b981", track: dk ? "rgba(16,185,129,0.15)" : "#d1fae5" },
                          { key: "tags", label: "Tag & Meta", color: "#f97316", track: dk ? "rgba(249,115,22,0.15)" : "#ffedd5" },
                        ];
                        const ov = ps.overall ?? 0;
                        const gc = ov >= 85 ? "#8b5cf6" : ov >= 70 ? "#10b981" : ov >= 55 ? "#3b82f6" : ov >= 40 ? "#f59e0b" : "#ef4444";
                        const gl = ov >= 85 ? "S" : ov >= 70 ? "A" : ov >= 55 ? "B" : ov >= 40 ? "C" : "D";
                        return (
                          <div className={`rounded-2xl border overflow-hidden ${t.card}`}>
                            {/* Header */}
                            <div className={`flex items-center justify-between gap-3 px-5 py-4 border-b ${dk ? "bg-[#0d1b2e]/60 border-white/[0.06]" : "bg-gray-50/80 border-gray-100"}`}>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`text-[10px] font-bold uppercase tracking-widest ${dk ? "text-white/25" : "text-gray-400"}`}>Ckript Score</span>
                                </div>
                                <h4 className={`text-[14px] font-bold truncate ${dk ? "text-gray-100" : "text-gray-900"}`}>{script.title}</h4>
                                {ps.scoredAt && (
                                  <p className={`text-[11px] mt-0.5 ${dk ? "text-gray-500" : "text-gray-400"}`}>
                                    Reviewed {new Date(ps.scoredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] font-black px-2.5 py-1 rounded-lg" style={{ color: gc, backgroundColor: gc + "22" }}>Grade {gl}</span>
                                <div className="text-right">
                                  <span className="text-[28px] font-black tabular-nums leading-none" style={{ color: gc }}>{ov}</span>
                                  <span className={`text-[10px] block font-semibold ${dk ? "text-gray-500" : "text-gray-400"}`}>/ 100</span>
                                </div>
                              </div>
                            </div>
                            {/* Score bars */}
                            <div className={`px-5 py-5 space-y-3.5 ${dk ? "bg-[#0a1628]/40" : "bg-white"}`}>
                              {psDims.map(d => {
                                const val = ps[d.key] ?? 0;
                                const pct = Math.min(100, Math.max(0, val));
                                return (
                                  <div key={d.key} className="flex items-center gap-3">
                                    <span className={`text-[12px] font-semibold shrink-0 w-[100px] ${dk ? "text-gray-400" : "text-gray-500"}`}>{d.label}</span>
                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: d.track }}>
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${pct}%` }}
                                        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: d.color }}
                                      />
                                    </div>
                                    <span className="text-[13px] font-black tabular-nums w-16 text-right" style={{ color: d.color }}>
                                      {val}<span className={`text-[10px] font-normal ${dk ? "text-gray-600" : "text-gray-300"}`}>/100</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Admin feedback */}
                            {ps.feedback && (
                              <div className={`px-5 py-3.5 border-t text-[12px] leading-relaxed ${dk ? "border-white/[0.06] bg-[#0a1628]/60 text-gray-400" : "border-gray-100 bg-gray-50/60 text-gray-500"}`}>
                                <span className={`font-semibold mr-1.5 ${dk ? "text-gray-300" : "text-gray-700"}`}>Feedback:</span>
                                {ps.feedback}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ── 4. AI Analysis ── */}
                      {score.feedback && (
                        <div className={`rounded-2xl border overflow-hidden ${t.card}`}>
                          {/* Header */}
                          <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${dk ? "border-white/[0.06]" : "border-gray-100"}`}>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${dk ? "bg-violet-400/10 border-violet-400/20 text-violet-300" : "bg-violet-50 border-violet-200 text-violet-700"}`}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                              </svg>
                              AI Analysis
                            </span>
                            <span className={`ml-auto text-[10px] font-medium ${dk ? "text-white/20" : "text-gray-300"}`}>Powered by Gemini AI</span>
                          </div>

                          {/* Main Feedback */}
                          <div className="px-5 pt-4 pb-2">
                            <p className={`text-sm leading-relaxed ${dk ? "text-white/70" : "text-gray-600"}`}>{score.feedback}</p>
                          </div>

                          {/* Strengths */}
                          {Array.isArray(score.strengths) && score.strengths.length > 0 && (
                            <div className={`mx-5 mb-3 rounded-xl border p-4 ${dk ? "bg-emerald-400/[0.05] border-emerald-400/15" : "bg-emerald-50 border-emerald-100"}`}>
                              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${dk ? "text-emerald-400" : "text-emerald-600"}`}>Strengths</p>
                              <ul className="space-y-1.5">
                                {score.strengths.map((s, i) => (
                                  <li key={i} className={`flex items-start gap-2 text-sm ${dk ? "text-white/65" : "text-gray-600"}`}>
                                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${dk ? "bg-emerald-400/20" : "bg-emerald-100"}`}>
                                      <svg className={`w-2.5 h-2.5 ${dk ? "text-emerald-300" : "text-emerald-600"}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    </span>
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Weaknesses */}
                          {Array.isArray(score.weaknesses) && score.weaknesses.length > 0 && (
                            <div className={`mx-5 mb-3 rounded-xl border p-4 ${dk ? "bg-amber-400/[0.05] border-amber-400/15" : "bg-amber-50 border-amber-100"}`}>
                              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${dk ? "text-amber-400" : "text-amber-600"}`}>Areas for Improvement</p>
                              <ul className="space-y-1.5">
                                {score.weaknesses.map((w, i) => (
                                  <li key={i} className={`flex items-start gap-2 text-sm ${dk ? "text-white/65" : "text-gray-600"}`}>
                                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${dk ? "bg-amber-400/20" : "bg-amber-100"}`}>
                                      <svg className={`w-2.5 h-2.5 ${dk ? "text-amber-300" : "text-amber-600"}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                                      </svg>
                                    </span>
                                    {w}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Recommendations */}
                          {Array.isArray(score.improvements) && score.improvements.length > 0 && (
                            <div className={`mx-5 mb-3 rounded-xl border p-4 ${dk ? "bg-blue-400/[0.05] border-blue-400/15" : "bg-blue-50 border-blue-100"}`}>
                              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2.5 ${dk ? "text-blue-400" : "text-blue-600"}`}>Recommendations</p>
                              <ul className="space-y-1.5">
                                {score.improvements.map((imp, i) => (
                                  <li key={i} className={`flex items-start gap-2 text-sm ${dk ? "text-white/65" : "text-gray-600"}`}>
                                    <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${dk ? "bg-blue-400/20" : "bg-blue-100"}`}>
                                      <span className={`text-[9px] font-bold ${dk ? "text-blue-300" : "text-blue-600"}`}>{i + 1}</span>
                                    </span>
                                    {imp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Audience Fit + Comparables */}
                          {(score.audienceFit || score.comparables) && (
                            <div className={`mx-5 mb-4 grid gap-3 ${score.audienceFit && score.comparables ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                              {score.audienceFit && (
                                <div className={`rounded-xl border p-3.5 ${dk ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-100 bg-gray-50"}`}>
                                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk ? "text-white/30" : "text-gray-400"}`}>Audience &amp; Market</p>
                                  <p className={`text-xs leading-relaxed ${dk ? "text-white/60" : "text-gray-600"}`}>{score.audienceFit}</p>
                                </div>
                              )}
                              {score.comparables && (
                                <div className={`rounded-xl border p-3.5 ${dk ? "border-white/[0.08] bg-white/[0.02]" : "border-gray-100 bg-gray-50"}`}>
                                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${dk ? "text-white/30" : "text-gray-400"}`}>Comparable Titles</p>
                                  <p className={`text-xs leading-relaxed ${dk ? "text-white/60" : "text-gray-600"}`}>{score.comparables}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── 4. Ckript Score editorial sections ── */}
                      {(() => {
                        const ps = script.platformScore || {};
                        const sections = [
                          { key: "strengths", label: "Strengths", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", band: dk ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700" },
                          { key: "weaknesses", label: "Weaknesses", icon: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z", band: dk ? "bg-red-400/10 border-red-400/20 text-red-300" : "bg-red-50 border-red-200 text-red-700" },
                          { key: "prospects", label: "Prospects", icon: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941", band: dk ? "bg-indigo-400/10 border-indigo-400/20 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-700" },
                        ];
                        return (
                          <div className="space-y-3">
                            {sections.map(s => (
                              <div key={s.key} className={`rounded-2xl border overflow-hidden ${t.card}`}>
                                <div className={`flex items-center gap-2.5 px-5 py-3.5 border-b ${dk ? "border-white/[0.06]" : "border-gray-100"}`}>
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${s.band}`}>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                                    </svg>
                                    {s.label}
                                  </span>
                                  <span className={`ml-auto text-[10px] font-medium ${dk ? "text-white/20" : "text-gray-300"}`}>Ckript Score</span>
                                </div>
                                <div className="px-5 py-4">
                                  {ps[s.key] ? (
                                    <p className={`text-sm leading-relaxed whitespace-pre-line ${dk ? "text-white/65" : "text-gray-600"}`}>{ps[s.key]}</p>
                                  ) : (
                                    <p className={`text-sm italic ${dk ? "text-white/20" : "text-gray-300"}`}>Not yet reviewed by the platform.</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    <div className={`text-center py-16 rounded-2xl border ${t.card}`}>
                      <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4 ${dk ? "bg-white/[0.04]" : "bg-gray-100"}`}>
                        <svg className={`w-6 h-6 ${t.muted}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                      </div>
                      <h3 className={`text-base font-bold mb-1.5 ${t.title}`}>{evaluationPending ? "Evaluation In Progress" : "No Evaluation Yet"}</h3>
                      <p className={`text-sm mb-5 max-w-xs mx-auto ${t.muted}`}>
                        {evaluationPending
                          ? "Evaluation service is active for this project. Generate or refresh the included report now."
                          : isOwner
                          ? "Get an AI-powered score across 5 dimensions with detailed feedback."
                          : "This project hasn't been evaluated yet."}
                      </p>
                      {/* Empty state evaluation button removed */}
                    </div>
                  )}

                  {/* Producer ratings — industry credibility, shown alongside the AI evaluation and
                      Ckript Score. Visible to everyone; producers can rate. Renders itself only when
                      there are ratings or the viewer can rate. */}
                  <ProducerRatingCard
                    script={script}
                    user={user}
                    dark={isDarkMode}
                    onAggregate={(agg) => setScript((s) => (s ? { ...s, producerRating: agg } : s))}
                  />
                </motion.div>
              );
            })()}

            {/* ── Roles ────────────────────────────────────── */}
            {activeTab === "roles" && (
              <motion.div key="roles" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                {script.roles?.length > 0 ? (
                  script.roles.map((role) => (
                    <div key={role._id} className={`rounded-xl border p-5 transition ${t.card} ${t.cardHov}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`text-base font-bold tracking-tight ${t.title}`}>{role.characterName}</h3>
                        {role.gender && (
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${isDarkMode ? "bg-white/[0.04] text-neutral-500 border-white/[0.06]" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {role.gender}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm font-semibold mb-1.5 ${t.sub}`}>{role.type}</p>
                      {role.description && <p className={`text-sm leading-relaxed mb-3 ${t.muted}`}>{role.description}</p>}
                      {role.ageRange && <span className={`text-xs font-medium ${t.muted}`}>Age: {role.ageRange.min}&ndash;{role.ageRange.max}</span>}
                    </div>
                  ))
                ) : (
                  <div className={`text-center py-16 rounded-xl border ${t.card}`}>
                    <h3 className={`text-base font-bold mb-1 ${t.title}`}>No Roles Defined</h3>
                    <p className={`text-sm ${t.muted}`}>{isOwner ? "Add character roles to attract talent" : "No roles have been added yet"}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Full Script (owner or purchased) ────────── */}
            {activeTab === "content" && canViewFullScript && (hasScriptTextContent || hasUploadedScriptPdf) && (
              <motion.div key="content" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className={`mb-4 rounded-xl border px-3 py-3 sm:px-5 ${t.card}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? "bg-white/[0.05]" : "bg-gray-100"}`}>
                      <Film size={16} className={t.muted} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[13px] font-bold truncate ${t.title}`}>{script.title}</p>
                      <p className={`text-[11px] ${t.muted}`}>
                        {(() => {
                          const raw = hasHtmlScriptContent ? script.textContent || "" : formattedPlainScriptText;
                          const plain = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
                          const words = plain ? plain.split(" ").filter(Boolean).length : 0;
                          // Prefer the stored (line-based) pageCount; fall back to LINE-based pagination
                          // for screenplay text, or the old word estimate for book/HTML content.
                          const pages = script.pageCount || (hasHtmlScriptContent ? Math.ceil(words / 250) : countPages(formattedPlainScriptText));
                          if (words > 0) {
                            return `${words.toLocaleString()} words \u00B7 ~${pages} pages`;
                          }
                          if (hasUploadedScriptPdf) {
                            return `Uploaded PDF \u00B7 ~${pages || "?"} pages`;
                          }
                          return `0 words \u00B7 ~${pages} pages`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full sm:w-auto items-center gap-2 overflow-x-auto pb-1 sm:pb-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      onClick={() => {
                        const raw = script.textContent || "";
                        const plain = hasHtmlScriptContent
                          ? raw.replace(/<[^>]*>/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
                          : formattedPlainScriptText;
                        navigator.clipboard.writeText(plain);
                      }}
                      disabled={!hasScriptTextContent}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDarkMode ? "bg-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.08]" : "bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200"}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </button>
                    <button
                      onClick={handlePrint}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDarkMode ? "bg-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.08]" : "bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200"}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      {hasScriptTextContent ? "Print" : "Open PDF"}
                    </button>
                    <button
                      onClick={handleDownload}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isDarkMode ? "bg-white/[0.05] text-neutral-400 hover:text-white hover:bg-white/[0.08]" : "bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200"}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      {hasScriptTextContent ? "Download" : "Download PDF"}
                    </button>
                  </div>
                  </div>
                </div>

                <div className={`rounded-xl border overflow-hidden ${t.card}`}>
                  {hasScriptTextContent ? (
                    <div className="py-10 max-[640px]:py-6">
                      <div className={`max-w-2xl mx-auto px-8 sm:px-16 text-center mb-10 pb-8 border-b ${t.divider}`}>
                        <h2 className={`text-2xl font-bold tracking-tight mb-1 ${t.title}`}>{script.title}</h2>
                        {script.format && <p className={`text-[11px] font-bold uppercase tracking-widest ${t.muted}`}>{fmtFormat(script.format)}</p>}
                      </div>
                      {hasUploadedScriptPdf ? (
                        <div className="max-w-2xl mx-auto px-8 sm:px-16">
                          <ScreenplayPdfViewer
                            pdfUrl={uploadedScriptPdfUrl}
                            title={script?.title || "Script"}
                            showHeader={false}
                            showAllPages
                            fallbackPages={scriptPages.map((pageText, index) => ({
                              pageNumber: index + 1,
                              text: pageText,
                            }))}
                            fallbackText={formattedPlainScriptText || scriptRawContent}
                          />
                        </div>
                      ) : hasHtmlScriptContent ? (
                        <div className="max-w-2xl mx-auto px-8 sm:px-16 script-content" dangerouslySetInnerHTML={{ __html: normalizedScriptHtml }} />
                      ) : (
                        <ScreenplayReadOnly text={formattedPlainScriptText || scriptRawContent} dark={isDarkMode} />
                      )}
                    </div>
                  ) : hasUploadedScriptPdf ? (
                    <div className="p-4 sm:p-6 space-y-4">
                      <div className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${isDarkMode ? "border-blue-400/20 bg-blue-500/10" : "border-blue-200 bg-blue-50"}`}>
                        <div>
                          <p className={`text-sm font-semibold ${isDarkMode ? "text-blue-100" : "text-blue-900"}`}>Uploaded PDF available</p>
                          <p className={`text-xs ${isDarkMode ? "text-blue-100/75" : "text-blue-800/75"}`}>
                            This project was uploaded as a PDF. No extracted text is available here, but you can preview and download the original file below.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.open(uploadedScriptUrl, "_blank", "noopener,noreferrer")}
                          className={`shrink-0 px-3 py-2 rounded-lg text-xs font-bold border transition ${isDarkMode ? "border-blue-300/30 bg-blue-500/20 hover:bg-blue-500/30 text-blue-50" : "border-blue-200 bg-white hover:bg-blue-100 text-blue-700"}`}
                        >
                          Open PDF
                        </button>
                      </div>
                      <div className="overflow-hidden rounded-xl border border-black/5 bg-white">
                        <iframe
                          src={uploadedScriptUrl}
                          title={`${script.title || "Script"} PDF`}
                          className="w-full h-[720px]"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {isOwner && (
                  <div className={`mt-3 flex items-center justify-center gap-2 text-[11px] ${t.muted}`}>
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    This content is private and only visible to you as the creator
                  </div>
                )}
                {!isOwner && script.isUnlocked && (
                  <div className="mt-4 space-y-2">
                    <div className={`flex items-center justify-center gap-2 text-[11px] text-emerald-500`}>
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Full script unlocked — purchased on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    {user?.role === "investor" && script.creator?._id && (
                      <div className="flex justify-center">
                        <button
                          onClick={() =>
                            navigate(
                              `/messages?recipientId=${script.creator._id}&recipientName=${encodeURIComponent(script.creator.name || "Writer")}`
                            )
                          }
                          className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold border transition ${t.btnSec}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          Message Writer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Viewable Script ─────────────────────────────────── */}
            {activeTab === "synopsis" && (
              <motion.div key="synopsis" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`rounded-xl border p-6 ${t.card}`}>
                {script.previewExcerpt || script.scriptPreviewSummary ? (
                  <>
                    {(fd.filmLanguage || fd.dialoguesPresent || fd.wantToDirect || fd.wantToProduce || fd.scriptStyle?.length > 0) && (
                      <div className={`flex flex-wrap items-center gap-2 mb-4 pb-4 border-b ${t.divider}`}>
                        {fd.filmLanguage && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${isDarkMode ? "bg-blue-500/10 border-blue-500/20 text-blue-300" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                            Lang: {fd.filmLanguage}
                          </span>
                        )}
                        {fd.dialoguesPresent && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${isDarkMode ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                            {fd.dialoguesPresent === "yes" ? "Full Dialogues" : fd.dialoguesPresent === "partial" ? "Partial Dialogues" : "Action Only"}
                          </span>
                        )}
                        {fd.wantToDirect && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${isDarkMode ? "bg-violet-500/10 border-violet-500/20 text-violet-300" : "bg-violet-50 border-violet-200 text-violet-700"}`}>
                            Writer-Director
                          </span>
                        )}
                        {fd.wantToProduce && (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${isDarkMode ? "bg-amber-500/10 border-amber-500/20 text-amber-300" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                            Writer-Producer
                          </span>
                        )}
                        {fd.scriptStyle?.map((s) => (
                          <span key={s} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${isDarkMode ? "bg-white/[0.05] border-white/[0.08] text-gray-300" : "bg-gray-50 border-gray-200 text-gray-600"}`}>{s}</span>
                        ))}
                      </div>
                    )}
                    <ScreenplayPdfViewer
                      pdfUrl={uploadedScriptPdfUrl}
                      title={script?.title || "Script"}
                      startPage={previewStartPage}
                      endPage={previewEndPage}
                      fallbackPages={previewPageBlocks}
                      fallbackText={previewFormattedText || previewSourceText || previewRawText || ""}
                      onDownload={handleDownloadPreview}
                    />
                    {script.isSynopsisLocked && (
                      <div className={`pt-5 border-t ${t.divider}`}>
                        <div className={`rounded-xl p-6 text-center border ${t.inset}`}>
                          <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3 ${isDarkMode ? "bg-white/[0.06]" : "bg-gray-100"}`}>
                            <svg className={`w-5 h-5 ${t.muted}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                          </div>
                          <h4 className={`text-base font-bold mb-2 ${t.title}`}>Full Script Locked</h4>
                          {script.isWriter ? (
                            <p className={`text-sm ${t.muted}`}>Writers can review the preview window, but only qualified industry professionals can unlock the full script.</p>
                          ) : (
                            <p className={`text-sm ${t.muted}`}>Sign in as a producer or director to unlock.</p>
                          )}
                        </div>
                      </div>
                    )}
                    {!script.isSynopsisLocked && !script.isCreator && (
                      <div className="mt-4 flex items-center gap-2 text-emerald-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-bold">Full script unlocked</span>
                      </div>
                    )}
                    {/* Creator: pending purchase requests for this script */}
                    {script.isCreator && (
                      <div className={`mt-5 pt-5 border-t ${t.divider}`}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={`text-sm font-bold ${t.title}`}>
                            Purchase Requests
                            {pendingRequestBadgeCount > 0 && (
                              <span className="ml-2 inline-flex items-center justify-center bg-amber-500 text-white text-xs rounded-full w-5 h-5 font-bold">
                                {pendingRequestBadgeCount}
                              </span>
                            )}
                          </h4>
                        </div>
                        {pendingReqLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                            Loading requests...
                          </div>
                        ) : pendingRequests.length === 0 ? (
                          <p className={`text-xs ${t.muted}`}>No pending requests.</p>
                        ) : (
                          <div className="space-y-3">
                            {pendingRequests.map((pr) => (
                              <div key={pr._id} className={`rounded-xl border px-4 py-3 flex items-center max-[380px]:items-stretch max-[380px]:flex-col gap-3 ${t.inset}`}>
                                {pr.investor?.profileImage ? (
                                  <img src={pr.investor.profileImage} alt={pr.investor.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-bold">{pr.investor?.name?.charAt(0)?.toUpperCase()}</span>
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold truncate ${t.title}`}>{pr.investor?.name}</p>
                                  <p className={`text-xs ${t.muted}`}>
                                    {`₹${pr.amount} offered`}
                                    {" · "}
                                    {new Date(pr.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 max-[380px]:w-full max-[380px]:flex-wrap">
                                  <button
                                    onClick={() => handleApproveRequest(pr._id)}
                                    disabled={pendingReqActionId === pr._id}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50 max-[380px]:flex-1 max-[380px]:text-center"
                                  >
                                    {pendingReqActionId === pr._id ? "..." : "Approve"}
                                  </button>
                                  <button
                                    onClick={() => setRejectNoteModal({ id: pr._id, investorName: pr.investor?.name })}
                                    disabled={pendingReqActionId === pr._id}
                                    className="px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 text-xs font-semibold transition disabled:opacity-50 max-[380px]:flex-1 max-[380px]:text-center"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <h3 className={`text-base font-bold mb-1 ${t.title}`}>No Viewable Script Available</h3>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>

      {/* ══════════════  MODALS  ═════════════════════════════ */}

      {/* Purchase Request confirmation modal */}
      {showRequestModal && script && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !requestLoading && setShowRequestModal(false)}
        >
          <div
            className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 border ${t.card}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className={`text-lg font-extrabold text-center mb-1 ${t.title}`}>Request to Purchase</h2>
            <p className={`text-sm text-center mb-4 ${t.muted}`}>
              You are requesting to purchase{" "}
              <span className={`font-semibold ${t.sub}`}>"{script.title}"</span>.
              {script.price > 0
                ? ` If the writer approves, checkout will be ₹${getBuyerCheckoutTotal(script.price).toLocaleString("en-IN")} (script fee ₹${Number(script.price || 0).toLocaleString("en-IN")} + 5% platform commission).`
                : " The writer will be notified and can approve your access."}
            </p>
            <div className={`rounded-xl border px-4 py-3 mb-4 text-center ${t.inset}`}>
              <p className={`text-xs ${t.muted}`}>Amount</p>
              <p className={`text-2xl font-bold mt-1 ${t.title}`}>{script.price > 0 ? `₹${getBuyerCheckoutTotal(script.price).toLocaleString("en-IN")}` : "Free"}</p>
              {script.price > 0 && <p className={`text-xs ${t.muted} mt-0.5`}>Includes 5% platform commission • Request first • Pay after writer approval • Access unlocks immediately after successful payment.</p>}
            </div>
            {canViewWriterCustomConditions && (
              <div className={`rounded-xl border px-4 py-3 mb-4 ${t.inset}`}>
                <p className={`text-[10px] font-bold uppercase tracking-[0.16em] mb-1.5 ${t.label}`}>
                  Writer Custom Conditions
                </p>
                {hasWriterCustomConditions ? (
                  <p className={`text-xs leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto sidebar-scroll pr-1 ${t.sub}`}>
                    {writerCustomConditions}
                  </p>
                ) : (
                  <p className={`text-xs ${t.muted}`}>
                    Writer has not added custom conditions for film industry professionals.
                  </p>
                )}
              </div>
            )}
            <button
              onClick={handleRequestPurchase}
              disabled={requestLoading}
              className={`w-full py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 ${t.btnPrim}`}
            >
              {requestLoading ? "Submitting..." : "Submit Request"}
            </button>
            <button
              onClick={() => setShowRequestModal(false)}
              disabled={requestLoading}
              className={`w-full mt-2 py-2.5 rounded-xl text-sm font-medium border ${t.divider} ${t.muted} hover:opacity-70 transition`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Decline request modal (for creator on this script) */}
      {rejectNoteModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPendingReqActionId(null) || setRejectNoteModal(null)}
        >
          <div
            className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 border ${t.card}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-base font-bold mb-1 ${t.title}`}>Decline Purchase Request</h3>
            <p className={`text-sm mb-4 ${t.muted}`}>
              Declining <strong>{rejectNoteModal.investorName}</strong>'s request. They will be notified that the request was denied.
            </p>
            <label className={`block text-xs font-semibold mb-1 ${t.muted}`}>Reason (optional)</label>
            <textarea
              rows={3}
              className={`w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${t.inset} ${t.sub}`}
              placeholder="Let the investor know why you're declining..."
              value={rejectNoteText}
              onChange={(e) => setRejectNoteText(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRejectNoteModal(null); setRejectNoteText(""); }}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium ${t.muted} ${t.divider} hover:opacity-70 transition`}
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRequestSubmit}
                disabled={pendingReqActionId === rejectNoteModal.id}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition disabled:opacity-50"
              >
                {pendingReqActionId === rejectNoteModal.id ? "Declining..." : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )} 

      {/* Trailer payment modal */}
      <AnimatePresence>
        {showTrailerPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !(trailerPaymentSubmitting || trailerLoading) && setShowTrailerPaymentModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-2xl shadow-2xl max-w-md w-full p-6 border ${t.card}`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${t.label}`}>Razorpay Payment</p>
                  <h2 className={`text-lg font-extrabold ${t.title}`}>Pay to generate trailer</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTrailerPaymentModal(false)}
                  disabled={trailerPaymentSubmitting || trailerLoading}
                  className={`p-1.5 rounded-lg transition ${t.btnSec}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className={`rounded-xl border px-4 py-3 mb-4 ${t.inset}`}>
                <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${t.label}`}>Selected package</p>
                <p className={`text-sm font-semibold ${t.title}`}>{trailerSelectionSummary}</p>
              </div>

              <div className={`rounded-xl border px-4 py-3 mb-4 ${t.inset}`}>
                <p className={`text-xs font-bold uppercase tracking-wide ${t.label}`}>Amount to pay</p>
                <p className={`text-2xl font-extrabold mt-1 ${t.title}`}>
                  {trailerCurrencyChoice === "usd" ? "$" : "INR"} {formatTrailerAmount(selectedTrailerAmount)}
                </p>
                <p className={`text-[11px] mt-1 ${t.muted}`}>
                  Secure payment through Razorpay.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTrailerPaymentModal(false)}
                  disabled={trailerPaymentSubmitting || trailerLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 border ${t.btnSec}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGenerateTrailer}
                  disabled={trailerPaymentSubmitting || trailerLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 border ${t.btnPrim}`}
                >
                  {trailerPaymentSubmitting || trailerLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Film size={14} />
                      Pay & Generate
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trailer modal */}
      {showTrailer && hasTrailer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[160] p-4" onClick={() => setShowTrailer(false)}>
          <div className="max-w-4xl w-full max-h-[88vh] rounded-2xl border border-white/20 bg-[#050b16] shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.03]">
              <p className="text-sm font-semibold text-white/90">Trailer Preview</p>
              <button
                onClick={() => setShowTrailer(false)}
                className="w-9 h-9 rounded-lg border border-white/25 bg-white/10 text-white/85 hover:text-white hover:bg-white/15 transition flex items-center justify-center"
                aria-label="Close trailer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 overflow-auto">
              <div className="rounded-xl overflow-hidden ring-1 ring-white/15 border border-white/10">
                {trailerError ? (
                  resolvedHeroImage ? (
                    <img
                      src={resolvedHeroImage}
                      alt={script.title}
                      className="w-full max-h-[calc(88vh-150px)] object-contain bg-black"
                    />
                  ) : (
                    <div className="w-full max-h-[calc(88vh-150px)] min-h-[220px] flex items-center justify-center bg-black text-white/70 text-sm px-6 text-center">
                      Trailer is unavailable on this device. Please try another browser.
                    </div>
                  )
                ) : (
                  <video
                    src={trailerPlaybackUrl}
                    poster={resolvedHeroImage || undefined}
                    controls
                    controlsList="nodownload"
                    autoPlay
                    playsInline
                    preload="metadata"
                    onError={handleTrailerPlaybackError}
                    className="w-full max-h-[calc(88vh-150px)] object-contain bg-black"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !deleteLoading && setShowDeleteModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-2xl shadow-2xl max-w-sm w-full p-6 border ${t.card}`}>
              <div className="w-12 h-12 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </div>
              <h2 className={`text-lg font-extrabold mb-1 tracking-tight text-center ${t.title}`}>Delete Project?</h2>
              <p className={`text-sm mb-1 text-center ${t.muted}`}>
                &ldquo;<span className={`font-semibold ${t.sub}`}>{script.title}</span>&rdquo; will be removed from your profile and all listings.
              </p>
              <p className={`text-xs text-center mb-6 ${t.label}`}>This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 border ${t.btnSec}`}>
                  Cancel
                </button>
                <button onClick={handleDeleteScript} disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleteLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Deleting...</>
                  ) : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hold modal */}
      <RazorpayScriptPayment
        isOpen={showHoldModal}
        onClose={() => setShowHoldModal(false)}
        script={script}
        type="hold"
        onSuccess={handlePaymentSuccess}
      />

      <MeetingModal
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        writerId={script?.creator?._id}
        scriptId={script?._id}
        writerName={script?.creator?.name || "Writer"}
        scriptName={script?.title}
        onMeetingScheduled={(data) => {
          setMeetingSent(true);
          setTimeout(() => {
            setMeetingSent(false);
          }, 5000);
          if (data.meetingsUsed !== undefined && data.meetingsLimit !== undefined && data.remainingMeetings !== undefined) {
            setMeetingStats({
              meetingsUsed: data.meetingsUsed,
              meetingsLimit: data.meetingsLimit,
              remainingMeetings: data.remainingMeetings,
            });
          }
        }}
      />
    </div>
  );
};

export default ScriptDetail;


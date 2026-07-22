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
import { resolveMediaUrl } from "../utils/mediaUrl";
import { formatScreenplayLikeText } from "../utils/screenplayText";
import { addCkriptWatermarkToJsPdf, buildWatermarkedPdfFromPdfBlob } from "../utils/pdfWatermark";
import { splitScreenplayIntoPages } from "../components/screenplay/pages";
import ProducerRatingCard from "../components/ProducerRatingCard";
import { getScriptCanonicalPath } from "../utils/scriptPath";
import { getProfileCanonicalPath } from "../utils/profilePath";
import {
  hasBusinessEmail,
  hasActiveFilmIndustryProfessionalAccess,
  hasAnyFipAccess,
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
  getScriptCompletionFuturePlans,
  getScriptCompletionProgressText,
  getScriptCompletionStatusLabel,
} from "../utils/scriptCompletion";
import { getApiBaseUrl, isSocketSupported } from "../utils/apiOrigin";
import ScriptDetailCinematic from "./script-detail/ScriptDetailCinematic";
import {
  deriveScriptJourney,
  getRecommendedAction,
  getViewerCapabilities,
} from "./script-detail/scriptDetailModel";

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
    addCkriptWatermarkToJsPdf(doc);

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
  const [loadError, setLoadError] = useState("");
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
    pendingRequests.filter((request) => request?.status === "pending").length
  );
  const writerCustomConditions = String(script?.legal?.customInvestorTerms || "").trim();
  const hasWriterCustomConditions = writerCustomConditions.length > 0;
  const canViewWriterCustomConditions = Boolean(!script?.isCreator && script?.canPurchase);
  const isIndustryRole = !script?.isCreator &&
    user?._id &&
    ["investor", "producer", "director", "industry", "professional"].includes(String(user?.role || "").toLowerCase());
  const viewerHasBusinessEmail = isIndustryRole && hasBusinessEmail(user?.email);
  const viewerHasProAccess = isIndustryRole && hasAnyFipAccess(user);
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
  // NB: do NOT drop empty pages here. The splitter preserves them so array index maps 1:1 to page
  // number (page N === pages[N-1]); filtering them out shifts every later page and makes the
  // preview window return fewer — and mislabelled — pages than the writer selected.
  const previewPageTexts = hasViewableScript && Array.isArray(script?.scriptPreviewPageTexts)
    ? script.scriptPreviewPageTexts.map((pageText) => String(pageText || "").trim())
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
    ? String(script?.fileUrl || "").trim()
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
  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`);
    win.document.close();
  };

  const handleDownload = async () => {
    const safeTitle = (script?.title || "script").replace(/[^a-z0-9]/gi, "_");
    const uploadedPdfUrl = resolveMediaUrl(script?.fileUrl || "");
    if (uploadedPdfUrl) {
      try {
        const response = await api.get(`/scripts/${activeScriptId}/pdf`, { responseType: "blob" });
        const watermarkedBlob = await buildWatermarkedPdfFromPdfBlob(
          new Blob([response.data], { type: "application/pdf" }),
          { title: script?.title || "Script" }
        );
        const url = URL.createObjectURL(watermarkedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1500);
        return;
      } catch (error) {
        console.error("Uploaded PDF watermark download failed, trying canonical export:", error);
      }
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
          const watermarkedBlob = await buildWatermarkedPdfFromPdfBlob(blob, {
            title: script?.title || "Script",
            startPage: previewStartPage,
            endPage: previewEndPage,
          });
          const url = URL.createObjectURL(watermarkedBlob);
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
      setLoadError("");
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
      setScript(null);
      setLoadError(error?.response?.data?.message || "Unable to load this project right now.");
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

  const handleRequestPurchase = async (note = "") => {
    setRequestLoading(true);
    try {
      await api.post("/scripts/purchase-request", {
        scriptId: script._id,
        note: String(note || "").trim() || "I reviewed the project and would like to request purchase access.",
      });
      setShowRequestModal(false);
      await fetchScript();
      showNotice("Purchase request sent to the writer.", "success");
      return true;
    } catch (err) {
      showNotice(err.response?.data?.message || "Failed to submit purchase request", "error");
      return false;
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
      const requestsForScript = (Array.isArray(data) ? data : [])
        .filter((r) => {
          const requestScriptId = String(r?.script?._id || r?.script || "");
          return requestScriptId === currentScriptId;
        })
        .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));

      setPendingRequests(requestsForScript);
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

  const handleApproveRequest = async (reqId, { quiet = false } = {}) => {
    setPendingReqActionId(reqId);
    try {
      await api.put(`/scripts/purchase-request/${reqId}/approve`);
      if (!quiet) showNotice("Request approved. Buyer was notified to complete payment.", "success");
      await fetchScript();
      await fetchPendingRequestsForScript();
      return true;
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to approve request";
      if (!quiet) showNotice(message, "error");
      if (err?.response?.status === 409) {
        await fetchScript({ silent: true });
        await fetchPendingRequestsForScript();
      }
      return false;
    } finally {
      setPendingReqActionId(null);
    }
  };

  const handleRejectRequest = async (requestId, note = "") => {
    if (!requestId) return false;
    setPendingReqActionId(requestId);
    try {
      await api.put(`/scripts/purchase-request/${requestId}/reject`, { note: String(note || "").trim() });
      await fetchScript();
      await fetchPendingRequestsForScript();
      showNotice("Purchase request declined.", "success");
      return true;
    } catch (err) {
      showNotice(err.response?.data?.message || "Failed to reject request", "error");
      return false;
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
        <h2 className={`text-lg font-bold mb-1 ${t.title}`}>{loadError ? "Unable to load project" : "Script not found"}</h2>
        {loadError && <p className={`max-w-md mx-auto mt-2 mb-5 text-sm ${t.muted}`}>{loadError}</p>}
        <div className="flex items-center justify-center gap-3">
          {loadError && <button type="button" onClick={() => fetchScript()} className={`px-4 py-2 rounded-xl text-sm font-semibold border ${t.btnPrim}`}>Retry</button>}
          <Link to="/search" className="text-[#1e3a5f] hover:underline text-sm font-semibold">Browse scripts</Link>
        </div>
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

  // Keep the existing controller-only capabilities type-checked while the
  // selected cinematic view intentionally does not expose their retired UI.
  const LegacyControllerReferences = [
    motion,
    showHoldModal,
    wantsTrailer,
    setWantsTrailer,
    showTrailerPaymentModal,
    trailerPaymentSubmitting,
    showTrailer,
    setShowTrailer,
    showRequestModal,
    showWriterInfo,
    meetingSent,
    hasWriterCustomConditions,
    canViewWriterCustomConditions,
    remainingContacts,
    holdLoading,
    setHoldLoading,
    spotlightLoading,
    unlockLoading,
    pendingRequestCheckoutTotal,
    viewerHasBusinessEmail,
    handleHold,
    handlePaymentSuccess,
    handleGenerateScore,
    handleActivateSpotlight,
    handleUnlockSynopsis,
    handleRejectRequestSubmit,
    fmtBudget,
    scoreColor,
    scoreBg,
    canOpenCollaborationHub,
    isPro,
    reviewUnavailableMessage,
    isApprovedOrPublished,
    hasAiTrailerService,
    evaluationRequestInFlight,
    collaborationStats,
    canEditScript,
    canBookmark,
    scriptPages,
    evaluationPending,
    cl,
    ci,
    viewablePagesLabel,
    writerRoleLabel,
    publishedAtValue,
    tabs,
  ];

  const cinematicCapabilities = getViewerCapabilities({ script, user });
  const cinematicJourney = deriveScriptJourney({ script, capabilities: cinematicCapabilities });
  const cinematicRecommended = getRecommendedAction({
    script,
    capabilities: cinematicCapabilities,
    journey: cinematicJourney,
  });
  const openWriterProfile = () => navigate(getProfileCanonicalPath(script?.creator || {}, {
    viewerId: user?._id,
    viewerRole: user?.role,
  }));
  const openProjectEditor = () => {
    if (isOwner && isEditApprovalPending) {
      showNotice("Editing is locked while the current submission is awaiting admin approval.", "error");
      return;
    }
    // Everyone with edit rights co-writes the same script: the live scene-locked editor for
    // editor-format projects, the upload editor for uploaded PDFs. There is no separate branch.
    navigate(shouldEditInTextEditor
      ? `/create-project/${script._id}`
      : `/upload?edit=${script._id}`);
  };
  const handleMeetingScheduled = (payload = {}) => {
    setMeetingSent(true);
    setTimeout(() => setMeetingSent(false), 3000);
    if (payload?.remainingMeetings !== undefined) {
      setMeetingStats({
        meetingsUsed: payload.meetingsUsed,
        meetingsLimit: payload.meetingsLimit,
        remainingMeetings: payload.remainingMeetings,
      });
    }
  };

  // Keep the mature controller and endpoint wiring centralized while the
  // cinematic component owns the route's single production presentation.
  return (
    <ScriptDetailCinematic
        vm={{
          script,
          user,
          dark: isDarkMode,
          capabilities: cinematicCapabilities,
          journey: cinematicJourney,
          recommended: cinematicRecommended,
          notice,
          setNotice,
          showNotice,
          loading,
          loadError,
          formatDate,
          formatDateTime,
          fmtFormat,
          completionLabel,
          completionProgress,
          completionFuturePlans,
          scriptShare,
          resolvedHeroImage,
          showCoverPlaceholder,
          setCoverError,
          canPlayTrailer,
          trailerPlaybackUrl,
          handleTrailerPlaybackError,
          isBookmarked,
          handleToggleBookmark,
          openProfile: openWriterProfile,
          openEdit: openProjectEditor,
          canOpenCollaborationHub,
          openCollaborationHub: () => navigate(`/script/${script._id}/collaborate`),
          openPayment: () => navigate(`/script/${script._id}/pay`),
          openPricing: () => openPricingModal(),
          recordPreviewOpen: () => setActiveTab("synopsis"),
          hasUploadedScriptPdf,
          uploadedScriptPdfUrl,
          previewPageBlocks,
          previewSourceText,
          previewStart,
          previewEnd,
          hasHtmlScriptContent,
          formattedPlainScriptText,
          fullScriptSourceText,
          handleDownloadPreview,
          handleDownload,
          handlePrint,
          reviews,
          reviewsLoading,
          reviewsPage,
          reviewsTotalPages,
          reviewsTotal,
          myReview,
          canSubmitReview,
          reviewRating,
          setReviewRating,
          reviewComment,
          setReviewComment,
          reviewSubmitting,
          handleSubmitReview,
          fetchReviews,
          onProducerAggregate: (aggregate) => setScript((current) => current ? { ...current, producerRating: aggregate } : current),
          pendingRequests,
          pendingReqLoading,
          pendingReqActionId,
          pendingRequestBadgeCount,
          handleApproveRequest,
          handleRejectRequest,
          requestLoading,
          handleRequestPurchase,
          writerCustomConditions,
          writerContact,
          availableWriterLinks,
          canViewWriterInfo,
          contactAlreadyRevealed,
          contactRevealBlocked,
          contactsUsed,
          contactsLimit,
          revealLoading,
          revealError,
          handleRevealContact,
          messageWriterBlocked,
          messageWritersUsed,
          messageWritersLimit,
          handleMessageWriter,
          meetingsBlocked,
          meetingsUsed,
          meetingsLimit,
          showMeetingModal,
          setShowMeetingModal,
          openMeeting: () => setShowMeetingModal(true),
          handleMeetingScheduled,
          showDeleteModal,
          setShowDeleteModal,
          deleteLoading,
          handleDeleteScript,
          handleInvoicePdfAction,
          trailerDurationChoice,
          setTrailerDurationChoice,
          trailerQualityChoice,
          setTrailerQualityChoice,
          trailerFormatChoice,
          setTrailerFormatChoice,
          trailerCurrencyChoice,
          setTrailerCurrencyChoice,
          selectedTrailerPrefix,
          selectedTrailerAmount,
          formatTrailerAmount,
          trailerLoading,
          handleGenerateTrailer,
        }}
      />
  );

};

export default ScriptDetail;


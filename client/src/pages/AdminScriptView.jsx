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
const FORMAT_LABELS = {
  feature: "Feature",
  feature_film: "Feature Film",
  tv_1hour: "TV 1-Hour",
  tv_pilot_1hour: "TV Pilot 1-Hour",
  tv_halfhour: "TV Half-Hour",
  tv_pilot_halfhour: "TV Pilot Half-Hour",
  play: "Play",
  short: "Short",
  short_film: "Short Film",
  web_series: "Web Series",
  limited_series: "Limited Series",
  fiction_novel: "Fiction Novel",
  documentary: "Documentary",
  drama_school: "Drama School",
  anime: "Anime",
  movie: "Movie",
  tv_serial: "TV Serial",
  cartoon: "Cartoon",
  micro_drama: "Micro Drama",
  songs: "Songs",
  standup_comedy: "Standup Comedy",
  dialogues: "Dialogues",
  poet: "Poet",
  other: "Other",
};

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { getApiBaseUrl } from "../utils/apiOrigin";
import ScreenplayPdfViewer from "../components/ScreenplayPdfViewer";
import PasswordInput from "../components/PasswordInput";
import { formatCurrency } from "../utils/currency";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { formatScreenplayLikeText } from "../utils/screenplayText";
import { formatScriptCredit } from "../utils/writerCredits";
import {
  getScriptCompletionFuturePlans,
  getScriptCompletionProgressText,
  getScriptCompletionStatusLabel,
} from "../utils/scriptCompletion";
import {
  attachAdminScriptAccessHeader,
  clearAdminScriptAccess,
  getStoredAdminScriptAccess,
  storeAdminScriptAccess,
} from "../utils/adminScriptAccess";

const SCRIPT_LINES_PER_PAGE = 42;

const adminApi = axios.create({ baseURL: getApiBaseUrl() });

adminApi.interceptors.request.use((config) => {
  const adminSession = sessionStorage.getItem("admin-session");
  if (adminSession) {
    try {
      const { token } = JSON.parse(adminSession);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Ignore malformed admin session and allow request to fail with 401.
    }
  }
  return attachAdminScriptAccessHeader(config);
});

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getPlainTextFromScriptContent = (content) => {
  const source = String(content || "");
  if (!source) return "";

  const maybeHtml = source.trimStart().startsWith("<");
  if (!maybeHtml) return source;

  // Convert common HTML boundaries to line breaks, then strip tags.
  return source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n");
};

const AdminScriptView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [script, setScript] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scriptAccessReady, setScriptAccessReady] = useState(() => Boolean(getStoredAdminScriptAccess()?.token));
  const [scriptAccessPassword, setScriptAccessPassword] = useState("");
  const [scriptAccessError, setScriptAccessError] = useState("");
  const [scriptAccessLoading, setScriptAccessLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);

  const hasAdminSession = useMemo(() => {
    const raw = sessionStorage.getItem("admin-session");
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return Boolean(parsed?.token);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!hasAdminSession) {
      navigate("/admin", { replace: true });
      return;
    }

    const existingAccess = getStoredAdminScriptAccess();
    if (!existingAccess?.token) {
      setScriptAccessReady(false);
      setLoading(false);
      return;
    }

    setScriptAccessReady(true);

    const fetchScript = async () => {
      try {
        setLoading(true);
        setError("");
        setScriptAccessError("");
        const { data } = await adminApi.get(`/admin/scripts/${id}`);
        setScript(data);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          if (err?.response?.data?.code === "ADMIN_SCRIPT_SECTION_PASSWORD_REQUIRED") {
            clearAdminScriptAccess();
            setScriptAccessReady(false);
            setScript(null);
            setScriptAccessError("Enter the script-section password to continue.");
            return;
          }
          navigate("/admin", { replace: true });
          return;
        }
        setError(err?.response?.data?.message || "Failed to load project details.");
      } finally {
        setLoading(false);
      }
    };

    fetchScript();
  }, [hasAdminSession, id, navigate, scriptAccessReady]);

  const handleUnlockScriptAccess = async (event) => {
    event.preventDefault();
    setScriptAccessError("");

    if (!scriptAccessPassword) {
      setScriptAccessError("Password is required.");
      return;
    }

    try {
      setScriptAccessLoading(true);
      const { data } = await adminApi.post("/admin/script-access/verify", {
        password: scriptAccessPassword,
      });
      storeAdminScriptAccess(data);
      setScriptAccessPassword("");
      setScriptAccessReady(true);
      setLoading(true);
    } catch (err) {
      clearAdminScriptAccess();
      setScriptAccessReady(false);

      if (err?.response?.status === 401) {
        navigate("/admin", { replace: true });
        return;
      }

      setScriptAccessError(err?.response?.data?.message || "Failed to unlock script details.");
    } finally {
      setScriptAccessLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!script?._id || script?.isDeleted) return;
    const confirmed = window.confirm("Delete this project from platform listings?");
    if (!confirmed) return;

    try {
      setDeleteLoading(true);
      setNotice("");
      const { data } = await adminApi.delete(`/admin/scripts/${script._id}`);
      setScript((prev) => (prev ? { ...prev, isDeleted: true, deletedAt: new Date().toISOString() } : prev));
      setNotice(data?.message || "Project deleted successfully.");
    } catch (err) {
      if (err?.response?.data?.code === "ADMIN_SCRIPT_SECTION_PASSWORD_REQUIRED") {
        clearAdminScriptAccess();
        setScriptAccessReady(false);
        setScriptAccessError("Enter the script-section password to continue.");
        return;
      }
      setError(err?.response?.data?.message || "Failed to delete project.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const buildDraftFromScript = (s) => ({
    title: s?.title || "",
    companyName: s?.companyName || "",
    logline: s?.logline || "",
    description: s?.description || "",
    synopsis: s?.synopsis || "",
    textContent: typeof s?.textContent === "string" ? s.textContent : "",
    genre: s?.genre || "",
    contentType: s?.contentType || "movie",
    format: s?.format || "feature_film",
    formatOther: s?.formatOther || "",
    primaryGenre: s?.primaryGenre || "",
    price: typeof s?.price === "number" ? s.price : 0,
    legal: {
      customInvestorTerms: s?.legal?.customInvestorTerms || "",
    },
    rightsLicensing: {
      rightsType: s?.rightsLicensing?.rightsType || "custom_negotiation_required",
      exclusivity: Boolean(s?.rightsLicensing?.exclusivity),
      modificationRights: s?.rightsLicensing?.modificationRights || "buyer_must_consult_writer",
      paymentStructure: s?.rightsLicensing?.paymentStructure || "one_time_upfront_payment",
      negotiationMode: s?.rightsLicensing?.negotiationMode || "fixed_terms_non_negotiable",
      customConditions: s?.rightsLicensing?.customConditions || "",
      royaltySettings: {
        percentage: s?.rightsLicensing?.royaltySettings?.percentage || 0,
        durationType: s?.rightsLicensing?.royaltySettings?.durationType || "none",
        durationYears: s?.rightsLicensing?.royaltySettings?.durationYears || 0,
      },
      timeBound: {
        licenseDurationMonths: s?.rightsLicensing?.timeBound?.licenseDurationMonths || 0,
        autoRevertToWriter: Boolean(s?.rightsLicensing?.timeBound?.autoRevertToWriter),
      },
    },
  });

  const handleStartEdit = () => {
    if (!script) return;
    setDraft(buildDraftFromScript(script));
    setEditMode(true);
    setError("");
    setNotice("");
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setDraft(null);
  };

  const updateDraft = (updater) => {
    setDraft((prev) => (prev ? updater(prev) : prev));
  };

  const handleSaveEdit = async () => {
    if (!script?._id || !draft) return;
    try {
      setSavingEdit(true);
      setError("");
      const { data } = await adminApi.put(`/admin/scripts/${script._id}/edit`, draft);
      setScript(data.script || data);
      setEditMode(false);
      setDraft(null);
      setNotice("Script updated successfully.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to save changes.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleApprove = async () => {
    if (!script?._id) return;
    if (!window.confirm("Approve and publish this script?")) return;
    try {
      setApproveLoading(true);
      setError("");
      const { data } = await adminApi.put(`/admin/scripts/${script._id}/approve`);
      setScript(data.script || data);
      setNotice(data?.message || "Script approved.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve script.");
    } finally {
      setApproveLoading(false);
    }
  };

  const handleReject = async () => {
    if (!script?._id) return;
    const reason = window.prompt("Optional reason for rejection (leave blank to skip):", "") || "";
    if (!window.confirm("Reject this script?")) return;
    try {
      setRejectLoading(true);
      setError("");
      const { data } = await adminApi.put(`/admin/scripts/${script._id}/reject`, { reason: reason.trim() });
      setScript(data.script || data);
      setNotice(data?.message || "Script rejected.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reject script.");
    } finally {
      setRejectLoading(false);
    }
  };

  // Canonical source order matches the server (fountainContent is the screenplay source of truth for
  // editor projects), so the admin view never comes up empty when only fountainContent is populated.
  const rawContent = (typeof script?.fountainContent === "string" && script.fountainContent.trim())
    ? script.fountainContent
    : (typeof script?.fullContent === "string" && script.fullContent.trim())
      ? script.fullContent
      : (typeof script?.textContent === "string" ? script.textContent : "");
  const uploadedPdfUrl = resolveMediaUrl(script?.fileUrl || "");
  const hasUploadedPdf = Boolean(uploadedPdfUrl);
  const derivedPdfUrl = hasUploadedPdf 
    ? script?._id ? resolveMediaUrl(`/api/scripts/${script._id}/pdf?download=0`) : uploadedPdfUrl
    : script?._id ? resolveMediaUrl(`/api/scripts/${script._id}/export/pdf?download=0`) : "";

  const formatLabel = script?.format === "other"
    ? (String(script?.formatOther || "").trim() || "Other")
    : (FORMAT_LABELS[script?.format] || script?.format || "-");
  const headingValue = String(script?.title || "").trim() || "Untitled";
  const writerName = formatScriptCredit(script) || String(script?.creator?.name || "").trim() || "Unknown";
  const companyName = String(script?.companyName || "").trim();
  const primaryGenre = script?.primaryGenre || script?.classification?.primaryGenre || script?.genre || "-";
  const tags = Array.isArray(script?.tags) ? script.tags.filter(Boolean) : [];
  const tones = Array.isArray(script?.classification?.tones) ? script.classification.tones.filter(Boolean) : [];
  const themes = Array.isArray(script?.classification?.themes) ? script.classification.themes.filter(Boolean) : [];
  const settings = Array.isArray(script?.classification?.settings) ? script.classification.settings.filter(Boolean) : [];
  const roles = Array.isArray(script?.roles) ? script.roles.filter((role) => role?.characterName || role?.type || role?.description) : [];
  const filmDetails = script?.filmDetails || {};
  const creativeRoleLabels = [
    filmDetails.wantToDirect ? "Director" : null,
    filmDetails.wantToProduce ? "Producer" : null,
  ].filter(Boolean);
  const dialoguesLabel = filmDetails.dialoguesPresent === "yes"
    ? "Full Dialogues"
    : filmDetails.dialoguesPresent === "partial"
      ? "Partial Dialogues"
      : filmDetails.dialoguesPresent === "no"
        ? "Action / Direction Only"
        : "-";
  const filmLanguageLabel = String(filmDetails.filmLanguage || "").trim() || "-";
  const completionStatusLabel = getScriptCompletionStatusLabel(script);
  const completionProgressText = getScriptCompletionProgressText(script);
  const completionFuturePlans = getScriptCompletionFuturePlans(script);
  const coverImageUrl = resolveMediaUrl(script?.coverImage || "");
  const trailerThumbnailUrl = resolveMediaUrl(script?.trailerThumbnail || "");
  const trailerVideoUrl = resolveMediaUrl(script?.uploadedTrailerUrl || script?.trailerUrl || "");
  const accessMode = "Premium Access";


  const plainScriptText = useMemo(
    () => formatScreenplayLikeText(getPlainTextFromScriptContent(rawContent)),
    [rawContent]
  );
  const scriptPages = useMemo(() => {
    const normalized = plainScriptText.replace(/\r\n/g, "\n").trim();
    if (!normalized) return [];

    const lines = normalized.split("\n");
    const pages = [];
    for (let i = 0; i < lines.length; i += SCRIPT_LINES_PER_PAGE) {
      pages.push(lines.slice(i, i + SCRIPT_LINES_PER_PAGE).join("\n").trimEnd());
    }
    return pages;
  }, [plainScriptText]);

  // scriptPreviewPageTexts from server is already clean plain-text (newline-preserved).
  // Prefer it over re-parsing textContent HTML when building main content fallback pages.
  const serverPreviewPageTexts = useMemo(() => {
    const pts = script?.scriptPreviewPageTexts;
    if (!Array.isArray(pts) || !pts.some(Boolean)) return [];
    return pts.map((t) => String(t || "").trim());
  }, [script?.scriptPreviewPageTexts]);

  const mainContentFallbackPages = useMemo(() => {
    const source = serverPreviewPageTexts.length > 0 ? serverPreviewPageTexts : scriptPages;
    return source.map((pageText, index) => ({ pageNumber: index + 1, text: pageText }));
  }, [serverPreviewPageTexts, scriptPages]);

  const hasFullScriptText = Boolean(
    plainScriptText.trim() || serverPreviewPageTexts.some(Boolean)
  );

  // Download the SAME PDF the script renders as everywhere else — never an ad-hoc flat rebuild. A
  // script missing both fileUrl AND fountainContent won't have a valid PDF at /export/pdf either,
  // but button is disabled in that case.
  const handleDownloadScript = async () => {
    if (!derivedPdfUrl || !script?._id) return;

    const safeTitle = String(script?.title || "script")
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "") || "script";

    try {
      const response = await adminApi.get(
        hasUploadedPdf ? `/scripts/${script._id}/pdf` : `/scripts/${script._id}/export/pdf?download=1`,
        { responseType: "blob" }
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const finalBlob = hasUploadedPdf
        ? await buildWatermarkedPdfFromPdfBlob(blob, { title: script?.title || "Script" })
        : blob;
      downloadPdfBlob(finalBlob, `${safeTitle}.pdf`);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to download watermarked script PDF.");
    }
  };

  const handleOpenSubmissionSummaryPdf = () => {
    const pdfUrl = resolveMediaUrl(script?.submissionSummaryPdf?.url || "");
    if (!pdfUrl) return;
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadSubmissionSummaryPdf = async () => {
    if (!script?._id) return;

    try {
      const response = await adminApi.get(`/scripts/${script._id}/submission-summary-pdf?download=1`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = window.URL.createObjectURL(blob);
      const safeTitle = String(script?.title || "script")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "") || "script";

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${safeTitle}_submission_summary.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to download submission PDF.");
    }
  };

  const openPdfBlob = (blob) => {
    const objectUrl = window.URL.createObjectURL(blob);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 15000);
  };

  const downloadPdfBlob = (blob, filename) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
  };

  const handlePurchaseAcceptancePdf = async (requestId, title, action = "open") => {
    if (!requestId) return;

    try {
      const response = await adminApi.get(`/scripts/purchase-request/${requestId}/acceptance-pdf${action === "download" ? "?download=1" : ""}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const safeTitle = String(title || "purchase-request")
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "") || "purchase-request";

      if (action === "download") {
        downloadPdfBlob(blob, `${safeTitle}_buyer_acceptance.pdf`);
        return;
      }

      openPdfBlob(blob);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to open buyer acceptance PDF.");
    }
  };

  const handleAgreementPdf = async (agreementId, party = "buyer", action = "open") => {
    if (!agreementId) return;

    try {
      const suffix = action === "download" ? "&download=1" : "";
      const response = await adminApi.get(`/agreements/${agreementId}/pdf?party=${party}${suffix}`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const filename = `agreement_${agreementId}_${party}.pdf`;

      if (action === "download") {
        downloadPdfBlob(blob, filename);
        return;
      }

      openPdfBlob(blob);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to open agreement PDF.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050b16] text-white flex items-center justify-center px-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/15 border-t-white/80 animate-spin" />
      </div>
    );
  }

  if (!scriptAccessReady) {
    return (
      <div className="min-h-screen bg-[#050b16] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-[#1a3050] bg-[#0c1527] p-7 shadow-2xl">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
              <svg className="h-7 w-7 text-blue-300" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 10.5h10.5A2.25 2.25 0 0019.5 18.75v-6a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 12.75v6A2.25 2.25 0 006.75 21z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold">Protected Script Section</h1>
            <p className="mt-2 text-sm text-white/60">
              Enter the script-section password to open this admin script page.
            </p>
          </div>

          <form onSubmit={handleUnlockScriptAccess} className="space-y-4">
            <PasswordInput
              value={scriptAccessPassword}
              onChange={(event) => {
                setScriptAccessPassword(event.target.value);
                setScriptAccessError("");
              }}
              placeholder="Section password"
              autoFocus
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/20"
            />
            {scriptAccessError && (
              <p className="text-sm font-medium text-red-300">{scriptAccessError}</p>
            )}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate("/admin", { replace: true })}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:bg-white/5"
              >
                Back to Admin
              </button>
              <button
                type="submit"
                disabled={scriptAccessLoading || !scriptAccessPassword}
                className="px-5 py-2.5 rounded-xl bg-[#1e3a5f] text-sm font-bold text-white hover:bg-[#2a4b77] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scriptAccessLoading ? "Unlocking..." : "Unlock"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (error && !script) {
    return (
      <div className="min-h-screen bg-[#050b16] text-white px-4 py-10">
        <div className="max-w-4xl mx-auto rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <p className="text-red-200 text-sm font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-semibold"
          >
            Back to Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050b16] text-white px-4 py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold"
            >
              Back
            </button>
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold"
            >
              Admin Dashboard
            </Link>
          </div>

          {!script?.isDeleted && (
            <div className="flex flex-wrap items-center gap-2">
              {!editMode ? (
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-4 py-2 rounded-lg border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 text-xs sm:text-sm font-bold"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="px-4 py-2 rounded-lg border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs sm:text-sm font-bold disabled:opacity-60"
                  >
                    {savingEdit ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={savingEdit}
                    className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs sm:text-sm font-bold disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </>
              )}
              {script?.status === "pending_approval" && (
                <>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={editMode || approveLoading || rejectLoading}
                    className="px-4 py-2 rounded-lg border border-emerald-400/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 text-xs sm:text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    title={editMode ? "Save or cancel edits first" : ""}
                  >
                    {approveLoading ? "Approving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={editMode || approveLoading || rejectLoading}
                    className="px-4 py-2 rounded-lg border border-orange-400/40 bg-orange-500/20 hover:bg-orange-500/30 text-orange-100 text-xs sm:text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    title={editMode ? "Save or cancel edits first" : ""}
                  >
                    {rejectLoading ? "Rejecting..." : "Reject"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading || editMode}
                className="px-4 py-2 rounded-lg border border-red-400/30 bg-red-500/15 hover:bg-red-500/25 text-red-100 text-xs sm:text-sm font-bold disabled:opacity-60"
              >
                {deleteLoading ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          )}
        </div>

        {notice && (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {editMode && draft && (
          <div className="rounded-2xl border border-blue-400/30 bg-blue-500/[0.06] p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-blue-200 mb-1">Admin Edit Mode</p>
                <p className="text-xs text-white/70">Edit any field below. Changes to script body are recorded in history with you as the editor.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Title</span>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => updateDraft((d) => ({ ...d, title: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Company Name</span>
                <input
                  type="text"
                  value={draft.companyName}
                  onChange={(e) => updateDraft((d) => ({ ...d, companyName: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
              <label className="block lg:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Logline</span>
                <input
                  type="text"
                  value={draft.logline}
                  onChange={(e) => updateDraft((d) => ({ ...d, logline: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
              <label className="block lg:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Synopsis</span>
                <textarea
                  rows={4}
                  value={draft.synopsis}
                  onChange={(e) => updateDraft((d) => ({ ...d, synopsis: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
              <label className="block lg:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Description</span>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => updateDraft((d) => ({ ...d, description: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Format</span>
                <input
                  type="text"
                  value={draft.format}
                  onChange={(e) => updateDraft((d) => ({ ...d, format: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Content Type</span>
                <input
                  type="text"
                  value={draft.contentType}
                  onChange={(e) => updateDraft((d) => ({ ...d, contentType: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Primary Genre</span>
                <input
                  type="text"
                  value={draft.primaryGenre}
                  onChange={(e) => updateDraft((d) => ({ ...d, primaryGenre: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Price (INR)</span>
                <input
                  type="number"
                  min={0}
                  value={draft.price}
                  onChange={(e) => updateDraft((d) => ({ ...d, price: Number(e.target.value) || 0 }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Script Body (textContent)</span>
              <textarea
                rows={18}
                value={draft.textContent}
                onChange={(e) => updateDraft((d) => ({ ...d, textContent: e.target.value }))}
                className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                style={{ fontFamily: '"Courier Prime", "Courier New", Courier, monospace' }}
              />
            </label>

            <div className="border-t border-white/10 pt-4">
              <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/55 mb-3">Rights & Licensing</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Rights Type</span>
                  <select
                    value={draft.rightsLicensing.rightsType}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, rightsType: e.target.value } }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    <option value="full_rights_sale">Full Rights Sale</option>
                    <option value="exclusive_license">Exclusive License</option>
                    <option value="custom_negotiation_required">Custom Negotiation Required</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Modification Rights</span>
                  <select
                    value={draft.rightsLicensing.modificationRights}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, modificationRights: e.target.value } }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    <option value="buyer_can_modify_freely">Buyer can modify freely</option>
                    <option value="buyer_must_consult_writer">Buyer must consult writer</option>
                    <option value="writer_retains_creative_approval_rights">Writer retains creative approval rights</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Payment Structure</span>
                  <select
                    value={draft.rightsLicensing.paymentStructure}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, paymentStructure: e.target.value } }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    <option value="one_time_upfront_payment">One-time upfront payment</option>
                    <option value="lower_upfront_plus_royalty_percent">Lower upfront + royalty %</option>
                    <option value="revenue_sharing_model">Revenue sharing model</option>
                    <option value="custom_deal">Custom deal</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Negotiation Mode</span>
                  <select
                    value={draft.rightsLicensing.negotiationMode}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, negotiationMode: e.target.value } }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    <option value="fixed_terms_non_negotiable">Fixed terms (non-negotiable)</option>
                    <option value="open_to_discussion_after_purchase">Open to discussion after purchase</option>
                    <option value="ckript_not_involved">Ckript not involved</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Royalty %</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.rightsLicensing.royaltySettings.percentage}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, royaltySettings: { ...d.rightsLicensing.royaltySettings, percentage: Number(e.target.value) || 0 } } }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Royalty Duration Type</span>
                  <select
                    value={draft.rightsLicensing.royaltySettings.durationType}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, royaltySettings: { ...d.rightsLicensing.royaltySettings, durationType: e.target.value } } }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  >
                    <option value="none">None</option>
                    <option value="years">Years</option>
                    <option value="project_lifetime">Project lifetime</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Royalty Duration (Years)</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.rightsLicensing.royaltySettings.durationYears}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, royaltySettings: { ...d.rightsLicensing.royaltySettings, durationYears: Number(e.target.value) || 0 } } }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">License Duration (Months)</span>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={draft.rightsLicensing.timeBound.licenseDurationMonths}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, timeBound: { ...d.rightsLicensing.timeBound, licenseDurationMonths: Number(e.target.value) || 0 } } }))}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                  />
                </label>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={draft.rightsLicensing.exclusivity}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, exclusivity: e.target.checked } }))}
                    className="w-4 h-4"
                  />
                  <span className="text-xs text-white/85 font-semibold">Exclusivity</span>
                </label>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={draft.rightsLicensing.timeBound.autoRevertToWriter}
                    onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, timeBound: { ...d.rightsLicensing.timeBound, autoRevertToWriter: e.target.checked } } }))}
                    className="w-4 h-4"
                  />
                  <span className="text-xs text-white/85 font-semibold">Auto-revert to writer</span>
                </label>
              </div>
              <label className="block mt-3">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Custom Conditions</span>
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={draft.rightsLicensing.customConditions}
                  onChange={(e) => updateDraft((d) => ({ ...d, rightsLicensing: { ...d.rightsLicensing, customConditions: e.target.value } }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/55 mb-3">Legal / Writer Terms</p>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/55">Custom Terms For Film Industry Professionals</span>
                <textarea
                  rows={4}
                  maxLength={3000}
                  value={draft.legal.customInvestorTerms}
                  onChange={(e) => updateDraft((d) => ({ ...d, legal: { ...d.legal, customInvestorTerms: e.target.value } }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-400/60"
                />
              </label>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] overflow-hidden">
          {(script?.coverImage || script?.trailerThumbnail) && (
            <div className="h-52 sm:h-72 bg-black/30">
              <img
                src={resolveMediaUrl(script?.trailerThumbnail || script?.coverImage)}
                alt={script?.title || "Project cover"}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-5 sm:p-7 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight break-words">{headingValue}</h1>
                <p className="text-sm text-white/65 mt-1">
                  Writer: {writerName}
                  {companyName ? ` | Company: ${companyName}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5">{script?.status || "-"}</span>
                <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5">{formatLabel}</span>
                <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5">{accessMode}</span>
                <span className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/5">{formatCurrency(script?.price || 0)} INR</span>
                {script?.isDeleted && (
                  <span className="px-2.5 py-1 rounded-lg border border-red-400/35 bg-red-500/20 text-red-100">Deleted</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-2">Logline</p>
              <p className="text-sm text-white/85 italic">{script?.logline || "No logline provided."}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {[
                { label: "Writer Name", value: writerName },
                { label: "Company Name", value: companyName || "-" },
                { label: "Heading", value: headingValue },
                { label: "Format", value: formatLabel },
                { label: "Estimated Pages", value: script?.pageCount ? `${script.pageCount} pages` : "-" },
                { label: "Primary Genre", value: primaryGenre },
                { label: "Project ID", value: script?.sid || script?._id || "-" },
                { label: "Created", value: formatDateTime(script?.createdAt) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">{item.label}</p>
                  <p className="text-xs text-white/80 break-words">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7">
          <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-3">Full Synopsis</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/90">
            {script?.synopsis || "No synopsis provided."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Submission Details</p>
            <p className="text-xs text-white/60">Core story metadata submitted by the writer for admin review.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/45 mb-2">Tags</p>
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/85">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">No tags added.</p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/45 mb-2">Published</p>
              <p className="text-sm text-white/90">{formatDateTime(script?.publishedAt)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Script Completion</p>
            <p className="text-xs text-white/60">Completion status and remaining work submitted by the writer.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Status</p>
              <p className="text-sm font-semibold text-white/90">{completionStatusLabel}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Progress</p>
              <p className="text-sm font-semibold text-white/90">{completionProgressText || "-"}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Future Plans</p>
              <p className="text-sm text-white/90 whitespace-pre-wrap">{completionFuturePlans || "Not provided"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Film Production Details</p>
            <p className="text-xs text-white/60">Writer involvement, language, and dialogue setup submitted with the project.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Your Creative Role</p>
              <div className="flex flex-wrap gap-2">
                {creativeRoleLabels.length > 0 ? (
                  creativeRoleLabels.map((label) => (
                    <span key={label} className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/85">
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-white/60">Not provided</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Film Language</p>
              <p className="text-sm text-white/90">{filmLanguageLabel}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Dialogues</p>
              <p className="text-sm text-white/90">{dialoguesLabel}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Tones, Themes, Settings</p>
            <p className="text-xs text-white/60">Deep classification selected by the writer.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Tones", values: tones },
              { label: "Themes", values: themes },
              { label: "Settings", values: settings },
            ].map((group) => (
              <div key={group.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/45 mb-2">{group.label}</p>
                {group.values.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((value) => (
                      <span key={value} className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/85">
                        {value}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-white/60">No {group.label.toLowerCase()} selected.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Role Studio</p>
            <p className="text-xs text-white/60">Casting or character notes added by the writer.</p>
          </div>

          {roles.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {roles.map((role, index) => (
                <div key={role?._id || `${role.characterName || "role"}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white/90">{role.characterName || `Role ${index + 1}`}</p>
                      <p className="text-xs text-white/55 mt-1">{role.type || "Type not specified"}</p>
                    </div>
                    <span className="px-2 py-1 rounded-full border border-white/10 bg-white/[0.04] text-[11px] text-white/70">
                      {role.gender || "Any"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-white/45 uppercase tracking-[0.14em] font-bold mb-1">Age Range</p>
                      <p className="text-white/85">
                        {role?.ageRange?.min != null || role?.ageRange?.max != null
                          ? `${role?.ageRange?.min ?? "-"} - ${role?.ageRange?.max ?? "-"}`
                          : "-"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-white/45 uppercase tracking-[0.14em] font-bold mb-1 text-[11px]">Description</p>
                    <p className="text-sm text-white/85 whitespace-pre-wrap">{role.description || "No role description provided."}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/60">No role studio details were added.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Visual Assets</p>
            <p className="text-xs text-white/60">Cover image, trailer thumbnail, and trailer media submitted with the project.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/45">Cover Image</p>
              {coverImageUrl ? (
                <img src={coverImageUrl} alt="Cover" className="w-full h-48 object-cover rounded-lg border border-white/10" />
              ) : (
                <p className="text-sm text-white/60">No cover image uploaded.</p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/45">Trailer Thumbnail</p>
              {trailerThumbnailUrl ? (
                <img src={trailerThumbnailUrl} alt="Trailer thumbnail" className="w-full h-48 object-cover rounded-lg border border-white/10" />
              ) : (
                <p className="text-sm text-white/60">No trailer thumbnail available.</p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/45">Trailer Video</p>
              {trailerVideoUrl ? (
                <video src={trailerVideoUrl} controls className="w-full h-48 rounded-lg border border-white/10 bg-black" />
              ) : (
                <p className="text-sm text-white/60">No trailer video uploaded.</p>
              )}
              <div className="text-xs text-white/65 space-y-1">
                <p>Source: {script?.trailerSource || "none"}</p>
                <p>Status: {script?.trailerStatus || "none"}</p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/45">Pitch Video</p>
              {script?.pitchVideoUrl ? (
                <video src={resolveMediaUrl(script.pitchVideoUrl)} controls className="w-full h-48 rounded-lg border border-white/10 bg-black" />
              ) : (
                <p className="text-sm text-white/60">No pitch video uploaded.</p>
              )}
              {script?.pitchVideoUrl && (
                <p className="text-[11px] text-white/50">Writer-submitted pitch · max 1:30 min · max 90MB</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Access & Monetization</p>
            <p className="text-xs text-white/60">Submission access mode and pricing selected by the writer.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Selected Access", value: accessMode },
              { label: "Premium Enabled", value: script?.premium ? "Yes" : "No" },
              { label: "Price", value: formatCurrency(script?.price || 0) },
              { label: "Public Discovery", value: script?.services?.hosting ?? true ? "Enabled" : "Disabled" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">{item.label}</p>
                <p className="text-xs text-white/85">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Rights & Licensing</p>
            <p className="text-xs text-white/60">Intellectual property terms set by the writer.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Rights Type", value: RIGHTS_TYPE_LABELS[script?.rightsLicensing?.rightsType] || script?.rightsLicensing?.rightsType || "-" },
              { label: "Modification Rights", value: MODIFICATION_LABELS[script?.rightsLicensing?.modificationRights] || script?.rightsLicensing?.modificationRights || "-" },
              { label: "Payment Structure", value: PAYMENT_LABELS[script?.rightsLicensing?.paymentStructure] || script?.rightsLicensing?.paymentStructure || "-" },
              { label: "Royalty Settings", value: script?.rightsLicensing?.royaltySettings?.percentage ? `${script?.rightsLicensing?.royaltySettings?.percentage}% (${script?.rightsLicensing?.royaltySettings?.durationType})` : "-" },
              { label: "License Duration", value: script?.rightsLicensing?.timeBound?.licenseDurationMonths ? `${script?.rightsLicensing?.timeBound?.licenseDurationMonths} months` : "Perpetual" },
              { label: "Negotiation Mode", value: NEGOTIATION_LABELS[script?.rightsLicensing?.negotiationMode] || script?.rightsLicensing?.negotiationMode || "-" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">{item.label}</p>
                <p className="text-xs text-white/85">{item.value}</p>
              </div>
            ))}
          </div>
          {script?.rightsLicensing?.customConditions && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mt-2">
              <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Custom Conditions</p>
              <p className="text-sm text-white/90 whitespace-pre-wrap">{script.rightsLicensing.customConditions}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c1527] p-5 sm:p-7 space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Legal PDF Records</p>
            <p className="text-xs text-white/60">Dedicated admin section for saved writer terms PDFs and film industry professional acceptance PDFs.</p>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white/90">Writer Terms & Conditions PDF</p>
                  <p className="text-xs text-white/55 mt-1">Saved from the writer side while uploading the script, including pricing, rights, licensing, and legal acceptance.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSubmissionSummaryPdf}
                    disabled={!script?.submissionSummaryPdf?.url}
                    className="px-3 py-1.5 rounded-lg border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Open Writer PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSubmissionSummaryPdf}
                    disabled={!script?.submissionSummaryPdf?.url}
                    className="px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Download Writer PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-white/10 bg-[#0b1322] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Status</p>
                  <p className="text-xs text-white/85">{script?.submissionSummaryPdf?.url ? "Saved in admin records" : "Not available"}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0b1322] p-3.5">
                  <p className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/45 mb-1">Generated At</p>
                  <p className="text-xs text-white/85">{formatDateTime(script?.submissionSummaryPdf?.generatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-4">
                <p className="text-sm font-semibold text-white/90">Film Industry Professional Terms Acceptance PDFs</p>
                <p className="text-xs text-white/55 mt-1">Saved after the investor / producer / director / professional accepts terms and conditions for full script access.</p>
              </div>

              {Array.isArray(script?.settledPurchaseRequests) && script.settledPurchaseRequests.length > 0 ? (
                <div className="space-y-3">
                  {script.settledPurchaseRequests.map((request) => (
                    <div key={request._id} className="rounded-xl border border-white/10 bg-[#0b1322] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white/90">{request?.investor?.name || "Buyer"}</p>
                          <p className="text-xs text-white/55 mt-1">
                            {request?.investor?.email || "-"} · {request?.investor?.role || "-"}
                          </p>
                          <p className="text-xs text-white/45 mt-1">
                            Settled {formatDateTime(request?.settledAt || request?.updatedAt)} · {formatCurrency(request?.amount || 0)} INR
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handlePurchaseAcceptancePdf(request._id, script?.title, "open")}
                            disabled={!request?.acceptancePdf?.url}
                            className="px-3 py-1.5 rounded-lg border border-blue-400/30 bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Open Accepted Terms PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePurchaseAcceptancePdf(request._id, script?.title, "download")}
                            disabled={!request?.acceptancePdf?.url}
                            className="px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Download Accepted Terms PDF
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAgreementPdf(request?.agreement?._id, "buyer", "open")}
                            disabled={!request?.agreement?._id || !request?.agreement?.buyerPdfUrl}
                            className="px-3 py-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Open Final Agreement
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">No film industry professional acceptance PDFs are available for this script yet.</p>
              )}
            </div>
          </div>
        </div>

        {(uploadedPdfUrl || hasFullScriptText) && script?.viewableScript && (
          <div className="rounded-[22px] border border-white/10 bg-[#0c1527] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-emerald-400/70">Script Preview</p>
                <p className="text-xs text-white/45 mt-0.5">
                  {script?.viewableScript
                    ? "Visible to producers before purchasing"
                    : "Not currently visible to producers"}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {script?.viewableScript ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                    Visible to Producers
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-white/8 text-white/40 border border-white/10">
                    Hidden from Producers
                  </span>
                )}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/20">
                  Pages {Number(script?.scriptPreviewAccess?.start || 1)} – {Number(script?.scriptPreviewAccess?.end || 8)}
                </span>
              </div>
            </div>
            <div className="max-w-[920px] mx-auto">
              <ScreenplayPdfViewer
                pdfUrl={derivedPdfUrl}
                title={script?.title || "Script"}
                startPage={Number(script?.scriptPreviewAccess?.start || 1)}
                endPage={Number(script?.scriptPreviewAccess?.end || 8)}
                fallbackPages={Array.isArray(script?.scriptPreviewPageTexts) && script.scriptPreviewPageTexts.length > 0
                  ? script.scriptPreviewPageTexts.slice(
                      Math.max(0, Number(script?.scriptPreviewAccess?.start || 1) - 1),
                      Number(script?.scriptPreviewAccess?.end || 8)
                    ).map((pageText, index) => ({
                      pageNumber: Number(script?.scriptPreviewAccess?.start || 1) + index,
                      text: String(pageText || ""),
                    }))
                  : []}
                fallbackText={script?.previewExcerpt || plainScriptText}
              />
            </div>
          </div>
        )}

        <div className="rounded-[22px] border border-white/10 bg-[#0c1527] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-white/45">Main Content</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadScript}
                disabled={!hasFullScriptText && !hasUploadedPdf}
                className="px-3 py-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasFullScriptText ? "Download" : "Open PDF"}
              </button>
            </div>
          </div>

          {hasFullScriptText ? (
            <div className="max-w-[920px] mx-auto">
              <ScreenplayPdfViewer
                pdfUrl={derivedPdfUrl}
                title={script?.title || "Script"}
                fallbackPages={mainContentFallbackPages}
                fallbackText={plainScriptText}
                showAllPages
              />
            </div>
          ) : hasUploadedPdf ? (
            <div className="max-w-[920px] mx-auto">
              <ScreenplayPdfViewer
                pdfUrl={derivedPdfUrl}
                title={script?.title || "Script"}
                fallbackPages={[]}
                fallbackText=""
                showAllPages
              />
            </div>
          ) : (
            <p className="text-sm text-white/55">No script body found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminScriptView;

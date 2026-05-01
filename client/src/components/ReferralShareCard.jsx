import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

const ReferralShareCard = ({ dark = false, compact = false, className = "" }) => {
  const { user } = useContext(AuthContext);
  const [referralSummary, setReferralSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");

  const isWriterUser = ["creator", "writer"].includes(String(user?.role || "").toLowerCase());

  const formatNumber = useCallback(
    (value) => new Intl.NumberFormat("en-IN").format(Number(value) || 0),
    []
  );

  const referralCode = useMemo(
    () => String(referralSummary?.referralCode || user?.referralCode || "").trim(),
    [referralSummary?.referralCode, user?.referralCode]
  );

  const referralShareLink = useMemo(() => {
    const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
    const fallbackReferralLink = referralCode
      ? `${browserOrigin}/${encodeURIComponent(referralCode)}`
      : "";
    return String(referralSummary?.referralLink || "").trim() || fallbackReferralLink;
  }, [referralCode, referralSummary?.referralLink]);

  useEffect(() => {
    if (!isWriterUser) {
      setReferralSummary(null);
      setLoading(false);
      setError("");
      setCopyFeedback("");
      return;
    }

    let isActive = true;

    const loadReferralSummary = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/auth/referral-summary");
        if (!isActive) return;
        setReferralSummary(data || null);
      } catch {
        if (!isActive) return;
        setReferralSummary(null);
        setError("Unable to load referral details right now.");
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadReferralSummary();

    return () => {
      isActive = false;
    };
  }, [isWriterUser]);

  useEffect(() => {
    if (!copyFeedback) return undefined;
    const timer = window.setTimeout(() => setCopyFeedback(""), 2200);
    return () => window.clearTimeout(timer);
  }, [copyFeedback]);

  const copyToClipboard = useCallback(async (value) => {
    if (!value) return false;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return true;
      }
    } catch {
      // Fallback below.
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
  }, []);

  const handleCopyReferralLink = useCallback(async () => {
    if (!referralShareLink) return;
    const copied = await copyToClipboard(referralShareLink);
    setCopyFeedback(copied ? "Referral link copied" : "Copy failed. Please copy manually.");
  }, [copyToClipboard, referralShareLink]);

  if (!isWriterUser) return null;

  const shellClass = compact
    ? dark
      ? "rounded-2xl border border-[#151f2e] bg-[#0d1520] p-3"
      : "rounded-2xl border border-gray-200/80 bg-gray-50/80 p-3"
    : dark
      ? "rounded-3xl border border-[#1a2e48] bg-[#0d1b2e] p-4 sm:p-5"
      : "rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.28)] sm:p-5";

  return (
    <div className={`${shellClass} ${className}`.trim()}>
      <div className={`flex items-start justify-between gap-3 ${compact ? "flex-col" : "flex-col sm:flex-row"}`}>
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-[0.22em] ${dark ? "text-slate-500" : "text-slate-400"}`}>
            Share Link
          </p>
          <h2 className={`mt-1 font-black tracking-tight ${compact ? "text-base" : "text-lg sm:text-xl"} ${dark ? "text-white" : "text-slate-900"}`}>
            Writer Referral
          </h2>
          <p className={`mt-1 text-sm leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Share your referral link. If a writer signs up and verifies their account, both writers get 15 credits.
          </p>
        </div>
        {!compact && (
          <button
            type="button"
            onClick={handleCopyReferralLink}
            disabled={!referralShareLink}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${dark ? "bg-white/[0.08] text-white hover:bg-white/[0.14]" : "bg-slate-100 text-slate-800 hover:bg-slate-200"}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7a2 2 0 012-2h8a2 2 0 012 2v8m-4 4H8a2 2 0 01-2-2V9a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2z" />
            </svg>
            Copy Link
          </button>
        )}
      </div>

      <div className={`mt-4 flex flex-wrap items-center gap-2 ${compact ? "flex-col items-stretch" : ""}`}>
        <div className={`inline-flex items-center rounded-2xl px-4 py-2 text-sm font-black tracking-[0.14em] ${dark ? "bg-white/[0.06] text-white" : "bg-slate-100 text-slate-900"}`}>
          {referralCode || "--"}
        </div>
        <div className={`inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold ${dark ? "bg-emerald-500/12 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>
          Bonus: {formatNumber(referralSummary?.totalBonusCredits || 0)} credits
        </div>
        {compact && (
          <button
            type="button"
            onClick={handleCopyReferralLink}
            disabled={!referralShareLink}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${dark ? "bg-white/[0.08] !text-white hover:bg-white/[0.14]" : "bg-white text-slate-800 hover:bg-slate-100"}`}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7a2 2 0 012-2h8a2 2 0 012 2v8m-4 4H8a2 2 0 01-2-2V9a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2z" />
            </svg>
            Copy Link
          </button>
        )}
      </div>

      <div className="mt-4">
        <p className={`mb-1.5 text-[11px] font-bold uppercase tracking-[0.22em] ${dark ? "text-slate-500" : "text-slate-400"}`}>
          Referral Link
        </p>
        <div className={`rounded-2xl border px-4 py-3 text-sm break-all ${dark ? "border-[#1a2e48] bg-white/[0.02] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          {loading ? "Loading referral link..." : referralShareLink || "Referral link unavailable"}
        </div>
        {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        {copyFeedback && <p className={`mt-1.5 text-xs ${dark ? "text-emerald-300" : "text-emerald-600"}`}>{copyFeedback}</p>}
      </div>
    </div>
  );
};

export default ReferralShareCard;

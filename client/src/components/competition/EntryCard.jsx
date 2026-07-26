import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Award, Download } from "lucide-react";
import api from "../../services/api";
import PhaseTimeline from "./PhaseTimeline";

/**
 * One competition entry of your own — status, award, key numbers, timeline and certificate.
 *
 * Lifted out of MyCompetitions so the Challenge hub's "My Challenges" tab can show the real thing
 * rather than a link to another page. Both surfaces render the same card, so the certificate
 * download and award badge cannot drift apart.
 */

const AWARD_LABELS = {
  winner: "Winner",
  runner_up: "Runner-Up",
  special: "Special Award",
  participant: "Participated",
  none: "Did not submit",
};

const STATUS_LABELS = {
  registered: "Registered",
  writing: "Writing",
  submitted: "Submitted",
  ai_processed: "In judging",
  judged: "Complete",
};

const EntryCard = ({ item, serverNow }) => {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const { entry, competition, phase } = item;

  // The PDF must come through `api` — the bearer token is added by an axios interceptor, so a plain
  // <a href> would hit the endpoint unauthenticated and get bounced to login.
  const downloadCertificate = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      const { data } = await api.get(`/competitions/${competition._id}/certificate`, {
        params: { download: 1 },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${competition.name} certificate.pdf`.replace(/[\\/]/g, "-");
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // responseType blob means the error body is a Blob too, so the message has to be read out of it.
      let message = "Could not download your certificate.";
      try {
        const text = await err?.response?.data?.text?.();
        if (text) message = JSON.parse(text).message || message;
      } catch { /* keep the generic message */ }
      setDownloadError(message);
    } finally {
      setDownloading(false);
    }
  };
  const year = new Date(competition?.dates?.startsAt || entry.createdAt).getFullYear();
  const declared = Boolean(competition?.resultsDeclaredAt);
  const award = entry.result?.award || "none";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {competition?.name} <span className="font-normal text-gray-500 dark:text-gray-400">{year}</span>
          </h2>
          <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">{entry.eventId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            {STATUS_LABELS[entry.status] || entry.status}
          </span>
          {declared && award !== "none" ? (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              ["winner", "runner_up", "special"].includes(award)
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
            }`}>
              {entry.result?.specialTitle || AWARD_LABELS[award]}
            </span>
          ) : null}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          ["Registered", new Date(entry.createdAt).toLocaleDateString()],
          ["Submitted", entry.submittedAt ? new Date(entry.submittedAt).toLocaleDateString() : "—"],
          ["Pages", entry.snapshot?.pageCount || "—"],
          ["Words", entry.snapshot?.wordCount || "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{value}</dd>
          </div>
        ))}
      </dl>

      {entry.snapshot?.title ? (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Script: <strong className="text-gray-900 dark:text-white">{entry.snapshot.title}</strong>
        </p>
      ) : null}

      {entry.rewardsGranted?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {entry.rewardsGranted.map((reward, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Award className="h-3 w-3" aria-hidden="true" /> {reward.type.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#D14D37] dark:text-gray-300"
        >
          {open ? "Hide" : "Show"} timeline
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {phase !== "results" ? (
          <Link to="/challenge/dashboard" className="text-sm font-medium text-[#D14D37] hover:underline">
            Open competition dashboard
          </Link>
        ) : null}
        {/* Certificates exist only once an entry has actually been judged. */}
        {entry.status === "judged" ? (
          <button
            type="button"
            onClick={downloadCertificate}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#D14D37] hover:underline disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {downloading ? "Preparing…" : "Download certificate"}
          </button>
        ) : null}
      </div>
      {downloadError ? <p className="mt-2 text-sm text-[#D14D37]">{downloadError}</p> : null}

      {open ? (
        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
          <PhaseTimeline steps={item.timeline || []} serverNow={serverNow} compact />
        </div>
      ) : null}
    </div>
  );
};

export default EntryCard;

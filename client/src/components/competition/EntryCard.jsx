import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Award, Download } from "lucide-react";
import api from "../../services/api";
import PhaseTimeline from "./PhaseTimeline";
import { rewardLabel } from "./labels";

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

// The awards that are an honour rather than a record of attendance. Only these get the accent, and
// only as text — a placing is not a live thing, so it earns emphasis, not a coral fill.
const HONOURS = ["winner", "runner_up", "special"];

// The controls under the card are inline actions in a row, not a toolbar of buttons, so the
// <button>s are reset to read as text and colour alone carries the emphasis.
//
// No `border: 0` here on purpose: Tailwind's preflight already zeroes it, and setting it inline
// would outrank .ckc-link's transparent bottom border and kill the hover underline.
const textAction = {
  background: "none",
  padding: 0,
  cursor: "pointer",
  fontFamily: "var(--ckc-sans)",
  fontSize: 14,
  fontWeight: 500,
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
  const isHonour = HONOURS.includes(award);

  return (
    <div className="ckc-card ckc-card-pad">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="ckc-title ckc-h3">
            {competition?.name} <span style={{ color: "var(--ckc-muted)" }}>{year}</span>
          </h2>
          {/* The event ID is a reference number. It reads as one. */}
          <p className="ckc-meta mt-1.5">{entry.eventId}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="ckc-chip">{STATUS_LABELS[entry.status] || entry.status}</span>
          {declared && award !== "none" ? (
            <span className="ckc-chip" style={isHonour ? { color: "var(--ckc-accent-text)" } : undefined}>
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
            <dt className="ckc-meta">{label}</dt>
            <dd
              className="mt-1"
              style={{ fontSize: 14, fontWeight: 500, color: "var(--ckc-ink)", fontVariantNumeric: "tabular-nums" }}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {entry.snapshot?.title ? (
        <p className="mt-4" style={{ fontSize: 14, color: "var(--ckc-muted)" }}>
          Script:{" "}
          {/* A script title is set in the display italic everywhere else on this surface. */}
          <strong
            style={{
              fontFamily: "var(--ckc-display)",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: 16,
              color: "var(--ckc-ink)",
            }}
          >
            {entry.snapshot.title}
          </strong>
        </p>
      ) : null}

      {entry.rewardsGranted?.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Named awards keep their name, and the internal `notified` key stays hidden. */}
          {entry.rewardsGranted
            .map((reward) => rewardLabel(reward.type, { specialTitle: entry.result?.specialTitle }))
            .filter(Boolean)
            .map((label, i) => (
              <span key={i} className="ckc-chip">
                <Award className="h-3 w-3" aria-hidden="true" /> {label}
              </span>
            ))}
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-4 pt-4" style={{ borderTop: "1px solid var(--ckc-rule)" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 hover:opacity-70"
          style={{ ...textAction, color: "var(--ckc-ink)" }}
        >
          {open ? "Hide" : "Show"} timeline
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        {phase !== "results" ? (
          <Link to="/challenge/dashboard" className="ckc-link" style={{ fontSize: 14 }}>
            Open competition dashboard
          </Link>
        ) : null}
        {/* Certificates exist only once an entry has actually been judged. */}
        {entry.status === "judged" ? (
          <button
            type="button"
            onClick={downloadCertificate}
            disabled={downloading}
            className="ckc-link inline-flex items-center gap-1.5 disabled:opacity-50"
            style={textAction}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {downloading ? "Preparing…" : "Download certificate"}
          </button>
        ) : null}
      </div>
      {downloadError ? (
        <p className="mt-2" style={{ fontSize: 14, color: "var(--ckc-accent-text)" }}>{downloadError}</p>
      ) : null}

      {open ? (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--ckc-rule)" }}>
          <PhaseTimeline steps={item.timeline || []} serverNow={serverNow} compact />
        </div>
      ) : null}
    </div>
  );
};

export default EntryCard;

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDot,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  MoreHorizontal,
  X,
} from "lucide-react";
import api from "../../../services/api";
import {
  formatDate,
  formatNumber,
  getAwardLabel,
  getRewardLabels,
  getScores,
  HONOUR_AWARDS,
  STATUS_LABELS,
  toYear,
} from "../competitionRecord";

const Timeline = ({ steps = [] }) => (
  <ol className="competition-record-page__timeline">
    {steps.map((step) => {
      const isDone = step.status === "done";
      const isCurrent = step.status === "current";
      const Icon = isDone ? CheckCircle2 : isCurrent ? CircleDot : Circle;
      return (
        <li
          key={step.key}
          className={[
            "competition-record-page__timeline-item",
            isDone && "competition-record-page__timeline-item--done",
            isCurrent && "competition-record-page__timeline-item--current",
          ].filter(Boolean).join(" ")}
        >
          <Icon aria-hidden="true" />
          <span>
            <strong>{step.label}</strong>
            {step.date ? <small>{formatDate(step.date, true)}</small> : null}
          </span>
        </li>
      );
    })}
  </ol>
);

const Metric = ({ label, value }) => (
  <div className="competition-record-page__snapshot-metric">
    <strong>{formatNumber(value)}</strong>
    <span>{label}</span>
  </div>
);

const RegistrationSummary = ({ entry }) => {
  const registration = entry?.registration || {};
  const facts = [
    registration.country,
    registration.language,
    ...(registration.genres || []),
    registration.experienceLevel
      ? registration.experienceLevel[0].toUpperCase() + registration.experienceLevel.slice(1)
      : "",
    registration.portfolioUrl ? "Portfolio linked" : "",
  ].filter(Boolean);

  if (!facts.length && !entry?.acceptedRulesAt) return null;
  return (
    <p className="competition-record-page__registration">
      {facts.join(" · ")}
      {entry?.acceptedRulesAt ? ` · Rules and copyright accepted ${formatDate(entry.acceptedRulesAt)}` : ""}
    </p>
  );
};

const Evaluation = ({ entry }) => {
  const scores = getScores(entry);
  const rewards = getRewardLabels(entry);
  const aiReady = Boolean(entry?.ai?.processedAt);

  return (
    <div className="competition-record-page__detail-column">
      <p className="competition-record-page__section-label">Rewards &amp; AI review</p>

      {rewards.length ? (
        <div className="competition-record-page__rewards">
          {rewards.map((reward) => (
            <span key={reward}><Award aria-hidden="true" />{reward}</span>
          ))}
        </div>
      ) : (
        <p className="competition-record-page__muted-copy">No rewards granted.</p>
      )}

      {scores.length ? (
        <div className="competition-record-page__scores">
          {scores.map((score) => (
            <div key={score.key}>
              <div>
                <span>{score.label}</span>
                <strong>{score.value}</strong>
              </div>
              <span className="competition-record-page__score-track">
                <span style={{ width: `${score.value}%` }} />
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="competition-record-page__muted-copy">
          {aiReady
            ? "This entry has no score breakdown on record."
            : "AI review is released after a submitted entry is processed."}
        </p>
      )}
    </div>
  );
};

const CompetitionRecordRow = ({
  item,
  index,
  expanded,
  menuOpen,
  onToggle,
  onToggleMenu,
  onCloseMenu,
  onNotice,
}) => {
  const [downloading, setDownloading] = useState(false);
  const { entry, competition, phase, timeline } = item;
  const snapshot = entry?.snapshot || {};
  const award = entry?.result?.award || "none";
  const awardLabel = getAwardLabel(item);
  const canDownload = entry?.status === "judged";
  const title = snapshot.title || "No submission on record";
  const logline = snapshot.logline || entry?.ai?.logline || "";

  const downloadCertificate = async () => {
    if (!canDownload || downloading) return;
    setDownloading(true);
    onCloseMenu();
    try {
      const { data } = await api.get(`/competitions/${competition._id}/certificate`, {
        params: { download: 1 },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${competition.name} certificate ${entry.eventId}.pdf`.replace(/[\\/]/g, "-");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      onNotice("Certificate downloaded.");
    } catch (error) {
      let message = "Could not download your certificate.";
      try {
        const text = await error?.response?.data?.text?.();
        if (text) message = JSON.parse(text).message || message;
      } catch {
        // A malformed error body should not hide the safe fallback.
      }
      onNotice(message, true);
    } finally {
      setDownloading(false);
    }
  };

  const copyEventId = async () => {
    onCloseMenu();
    try {
      await navigator.clipboard.writeText(entry.eventId);
      onNotice("Event ID copied.");
    } catch {
      onNotice("Could not copy the Event ID.", true);
    }
  };

  return (
    <article
      className={[
        "competition-record-page__entry",
        expanded && "competition-record-page__entry--expanded",
      ].filter(Boolean).join(" ")}
    >
      <div className="competition-record-page__entry-row">
        <div className="competition-record-page__entry-title">
          <div>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h3>{competition?.name}{toYear(item) && !competition?.name?.includes(toYear(item)) ? ` ${toYear(item)}` : ""}</h3>
            {entry?.status === "writing" ? <em><span />Writing</em> : null}
          </div>
          <p>
            “{title}” · registered {formatDate(entry?.createdAt)}
            {entry?.submittedAt ? ` · submitted ${formatDate(entry.submittedAt)}` : " · never submitted"}
          </p>
          <small>{entry?.eventId}</small>
        </div>

        <div className="competition-record-page__entry-status">
          <span>{STATUS_LABELS[entry?.status] || entry?.status}</span>
          <strong className={HONOUR_AWARDS.has(award) ? "competition-record-page__award--honour" : ""}>
            {awardLabel}
          </strong>
        </div>

        <div className="competition-record-page__entry-figures">
          <Metric label="pages" value={snapshot.pageCount} />
          <Metric label="words" value={snapshot.wordCount} />
        </div>

        <div className="competition-record-page__entry-actions" onPointerDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} details for ${competition?.name}`}
          >
            <ChevronDown className={expanded ? "competition-record-page__chevron--open" : ""} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onToggleMenu}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More actions for ${competition?.name}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </button>

          {menuOpen ? (
            <div className="competition-record-page__menu" role="menu">
              {canDownload ? (
                <button type="button" role="menuitem" onClick={downloadCertificate} disabled={downloading}>
                  <Download aria-hidden="true" />{downloading ? "Preparing…" : "Download certificate"}
                </button>
              ) : null}
              <button type="button" role="menuitem" onClick={onToggle}>
                <ChevronDown aria-hidden="true" />{expanded ? "Hide detail" : "Show detail"}
              </button>
              {phase !== "results" ? (
                <Link to={competition?.slug ? `/challenge/dashboard?c=${competition.slug}` : "/challenge/dashboard"} role="menuitem" onClick={onCloseMenu}>
                  <ExternalLink aria-hidden="true" />Open competition dashboard
                </Link>
              ) : null}
              {competition?.slug ? (
                <Link to={`/challenge/c/${competition.slug}`} role="menuitem" onClick={onCloseMenu}>
                  <FileText aria-hidden="true" />About this challenge
                </Link>
              ) : null}
              {entry?.scriptId && entry?.status === "judged" ? (
                <Link to="/dashboard" role="menuitem" onClick={onCloseMenu}>
                  <FolderOpen aria-hidden="true" />Open your drafts
                </Link>
              ) : null}
              <button type="button" role="menuitem" onClick={copyEventId}>
                <Clipboard aria-hidden="true" />Copy Event ID
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="competition-record-page__detail">
          <div className="competition-record-page__detail-grid">
            <div className="competition-record-page__detail-column">
              <p className="competition-record-page__section-label">Timeline · server-derived</p>
              <Timeline steps={timeline || []} />
            </div>

            <div className="competition-record-page__detail-column">
              <p className="competition-record-page__section-label">Submission snapshot</p>
              <h4>{title}</h4>
              {logline ? <p className="competition-record-page__logline">{logline}</p> : null}
              <div className="competition-record-page__snapshot-metrics">
                <Metric label="words" value={snapshot.wordCount} />
                <Metric label="pages" value={snapshot.pageCount} />
                <Metric label="scenes" value={snapshot.sceneCount} />
                <Metric label="characters" value={snapshot.charCount} />
              </div>
              <RegistrationSummary entry={entry} />
            </div>

            <Evaluation entry={entry} />
          </div>

          <div className="competition-record-page__detail-footer">
            {canDownload ? (
              <button
                type="button"
                className="competition-record-page__primary-action"
                onClick={downloadCertificate}
                disabled={downloading}
              >
                <Download aria-hidden="true" />{downloading ? "Preparing…" : "Download certificate"}
              </button>
            ) : (
              <p>
                {entry?.status === "registered"
                  ? "No certificate is available because this entry has not been judged."
                  : "Your certificate will be available once results are announced."}
              </p>
            )}
            <button type="button" className="competition-record-page__text-action" onClick={onToggle}>
              <X aria-hidden="true" />Close detail
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
};

export default CompetitionRecordRow;

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Film,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Play,
  Printer,
  Star,
  Users,
  X,
} from "lucide-react";
import SocialShareButton from "../../components/SocialShareButton";
import ProducerRatingCard from "../../components/ProducerRatingCard";
import ScreenplayPdfViewer from "../../components/ScreenplayPdfViewer";
import ScreenplayReadOnly from "../../components/ScreenplayReadOnly";
import MeetingModal from "../../components/MeetingModal";
import { formatCurrency } from "../../utils/currency";
import { getScriptWriters, formatWriterNames, getCreditTypeLabel as creditLabel } from "../../utils/writerCredits";
import { useScrollLock } from "../../hooks/useScrollLock";
import "./scriptDetailCinematic.css";

const RIGHTS_LABELS = {
  full_rights_sale: "Full rights sale",
  exclusive_license: "Exclusive license",
  custom_negotiation_required: "Custom negotiation",
};

const MODIFICATION_LABELS = {
  buyer_can_modify_freely: "Buyer can modify freely",
  buyer_must_consult_writer: "Buyer must consult writer",
  writer_retains_creative_approval_rights: "Writer retains creative approval",
};

const money = (value) => formatCurrency(Number(value || 0), "INR");
const initials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "CK";
const text = (value, fallback = "Not provided") => String(value || "").trim() || fallback;

function Overlay({ open, onClose, title, eyebrow = "Project context", kind = "drawer", children }) {
  const titleId = useId();
  const surfaceRef = useRef(null);
  const triggerRef = useRef(null);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return undefined;
    triggerRef.current = document.activeElement;
    const surface = surfaceRef.current;
    const focusable = surface?.querySelector("button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex='0']");
    focusable?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !surface) return;
      const nodes = [...surface.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex='0']")];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.setTimeout(() => triggerRef.current?.focus?.(), 0);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className={`sd3-overlay sd3-overlay--${kind}`} role="presentation">
      <button type="button" className="sd3-overlay__backdrop" onClick={onClose} aria-label={`Close ${title}`} />
      <section ref={surfaceRef} className="sd3-overlay__surface" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="sd3-overlay__header">
          <div>
            <p className="sd3-eyebrow">{eyebrow}</p>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="sd3-icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="sd3-overlay__body">{children}</div>
      </section>
    </div>,
    document.body
  );
}

function StatusPill({ children, tone = "neutral" }) {
  return <span className={`sd3-status sd3-status--${tone}`}><span aria-hidden="true" />{children}</span>;
}

function JourneyCard({ stage, status, description, actionLabel, onOpen }) {
  return (
    <article className={`sd3-journey-card sd3-journey-card--${stage.tone}`}>
      <span className="sd3-journey-card__number">{stage.number}</span>
      <div className="sd3-journey-card__copy">
        <small>{status}</small>
        <h3>{stage.title}</h3>
        <p>{description}</p>
      </div>
      <button type="button" className={stage.tone === "current" ? "sd3-button sd3-button--accent" : "sd3-button"} onClick={onOpen}>
        {actionLabel}<ChevronRight size={14} />
      </button>
    </article>
  );
}

function ScoreBars({ score = {} }) {
  const dimensions = [
    ["Plot", score.plot],
    ["Characters", score.characters],
    ["Dialogue", score.dialogue],
    ["Pacing", score.pacing],
    ["Market", score.marketability],
  ];
  return (
    <div className="sd3-score-bars">
      {dimensions.map(([label, value]) => (
        <div key={label} className="sd3-score-row">
          <span>{label}</span>
          <i><b style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }} /></i>
          <strong>{Number(value || 0)}</strong>
        </div>
      ))}
    </div>
  );
}

function StoryDrawer({ vm }) {
  const { script, formatDate, fmtFormat } = vm;
  const classification = script?.classification || {};
  const film = script?.filmDetails || {};
  const roles = Array.isArray(script?.roles) ? script.roles : [];
  const tags = [...(classification.tones || []), ...(classification.themes || []), ...(classification.settings || [])];
  return (
    <>
      <blockquote className="sd3-story-quote">{text(script?.logline, "The writer has not added a logline yet.")}</blockquote>
      <p className="sd3-prose">{text(script?.synopsis || script?.description, "The writer has not added a synopsis yet.")}</p>
      {tags.length > 0 && <div className="sd3-chip-list">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      <section className="sd3-drawer-section">
        <h3>Project details</h3>
        <dl className="sd3-detail-list">
          <div><dt>Format</dt><dd>{fmtFormat(script?.format)}</dd></div>
          <div><dt>Language</dt><dd>{text(film?.filmLanguage)}</dd></div>
          <div><dt>Completion</dt><dd>{text(vm.completionLabel)}{vm.completionProgress ? ` · ${vm.completionProgress}` : ""}</dd></div>
          <div><dt>Published</dt><dd>{formatDate(script?.publishedAt || script?.createdAt)}</dd></div>
          <div><dt>Writer intent</dt><dd>{film?.wantToDirect ? "Attached to direct" : film?.wantToProduce ? "Attached to produce" : "Not specified"}</dd></div>
          <div><dt>Company</dt><dd>{text(script?.companyName || script?.creator?.writerProfile?.company)}</dd></div>
        </dl>
        {vm.completionFuturePlans && <p className="sd3-note"><strong>Future plans</strong>{vm.completionFuturePlans}</p>}
      </section>
      <section className="sd3-drawer-section">
        <h3>Castable roles</h3>
        {roles.length ? (
          <div className="sd3-role-grid">
            {roles.map((role) => (
              <article key={role?._id || role?.characterName}>
                <span>{initials(role?.characterName)}</span>
                <div><b>{text(role?.characterName)}</b><small>{text(role?.type)} · {role?.ageRange?.min || "?"}–{role?.ageRange?.max || "?"} · {text(role?.gender, "Any gender")}</small></div>
                <p>{text(role?.description)}</p>
              </article>
            ))}
          </div>
        ) : <div className="sd3-empty-inline">No roles have been added to this project.</div>}
      </section>
    </>
  );
}

function ReadDrawer({ vm }) {
  const {
    script,
    capabilities,
    hasUploadedScriptPdf,
    uploadedScriptPdfUrl,
    previewPageBlocks,
    previewSourceText,
    previewStart,
    previewEnd,
    hasHtmlScriptContent,
    formattedPlainScriptText,
    handleDownloadPreview,
    handleDownload,
    handlePrint,
  } = vm;
  const [full, setFull] = useState(Boolean(capabilities.fullScript));
  const canShowFull = capabilities.fullScript && vm.journey.hasFullSource;
  const showFull = full && canShowFull;

  const handleCopy = async () => {
    const source = showFull ? vm.fullScriptSourceText : previewSourceText;
    try {
      await navigator.clipboard.writeText(String(source || ""));
      vm.showNotice("Script text copied.", "success");
    } catch {
      vm.showNotice("Copy failed. Try the download action instead.", "error");
    }
  };

  return (
    <>
      <div className="sd3-section-toolbar">
        <div className="sd3-segmented" aria-label="Script access mode">
          <button type="button" className={!showFull ? "is-active" : ""} onClick={() => setFull(false)}>Preview</button>
          {canShowFull && <button type="button" className={showFull ? "is-active" : ""} onClick={() => setFull(true)}>{capabilities.owner ? "My script" : "Full script"}</button>}
        </div>
        <div className="sd3-toolbar-actions">
          <button type="button" onClick={handleCopy} disabled={!String(showFull ? vm.fullScriptSourceText : previewSourceText).trim()}><Copy size={14} />Copy</button>
          {showFull && <button type="button" onClick={handlePrint}><Printer size={14} />Print</button>}
          <button type="button" onClick={showFull ? handleDownload : handleDownloadPreview}><Download size={14} />Download</button>
        </div>
      </div>
      {!showFull && !vm.journey.hasPreviewSource ? (
        <div className="sd3-empty-state"><LockKeyhole size={28} /><h3>Preview unavailable</h3><p>The writer has not configured public preview pages for this project.</p></div>
      ) : showFull ? (
        hasUploadedScriptPdf ? (
          <ScreenplayPdfViewer pdfUrl={uploadedScriptPdfUrl} title={script?.title} showAllPages showHeader={false} onDownload={handleDownload} className="sd3-script-viewer" />
        ) : hasHtmlScriptContent ? (
          <div className="script-content sd3-prose-viewer" dangerouslySetInnerHTML={{ __html: script?.textContent || "" }} />
        ) : (
          <ScreenplayReadOnly text={formattedPlainScriptText || vm.fullScriptSourceText} dark={vm.dark} className="sd3-script-viewer" />
        )
      ) : (
        <ScreenplayPdfViewer
          pdfUrl={uploadedScriptPdfUrl}
          title={`${script?.title || "Script"} preview`}
          startPage={previewStart || 1}
          endPage={previewEnd || previewStart || 1}
          fallbackPages={previewPageBlocks}
          fallbackText={previewSourceText}
          showHeader={false}
          onDownload={handleDownloadPreview}
          className="sd3-script-viewer"
        />
      )}
      {!canShowFull && vm.journey.hasPreviewSource && (
        <div className="sd3-lock-note"><LockKeyhole size={18} /><div><b>Full screenplay protected</b><p>Full access unlocks only through the approved purchase workflow.</p></div>{capabilities.canPurchase && <button type="button" className="sd3-button" onClick={vm.openPurchase}>Review deal</button>}</div>
      )}
    </>
  );
}

function EvidenceDrawer({ vm }) {
  const { script, reviews, reviewsLoading, reviewsPage, reviewsTotalPages } = vm;
  const score = script?.scriptScore || {};
  const platform = script?.platformScore || {};
  return (
    <>
      {score?.overall ? (
        <section className="sd3-evaluation-hero">
          <div className="sd3-score-orbit"><strong>{score.overall}</strong><span>/100</span><small>AI evaluation</small></div>
          <ScoreBars score={score} />
        </section>
      ) : (
        <div className="sd3-empty-state"><CircleAlert size={28} /><h3>{script?.evaluationStatus === "requested" ? "Evaluation in progress" : "No evaluation yet"}</h3><p>{script?.evaluationStatus === "requested" ? "The report will appear here when processing finishes." : "No AI evaluation is available for this project."}</p></div>
      )}
      {score?.feedback && <p className="sd3-note"><strong>Evaluation summary</strong>{score.feedback}</p>}
      <div className="sd3-evidence-columns">
        <section><h3>Strengths</h3>{score?.strengths?.length ? <ul>{score.strengths.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No strengths supplied.</p>}</section>
        <section><h3>Improvements</h3>{score?.improvements?.length ? <ul>{score.improvements.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No recommendations supplied.</p>}</section>
      </div>
      {platform?.overall !== undefined && platform?.overall !== null && (
        <section className="sd3-platform-score"><div><span>Ckript score</span><strong>{platform.overall}/100</strong></div><p>{text(platform.feedback, "No editorial feedback supplied.")}</p></section>
      )}
      <section className="sd3-drawer-section">
        <ProducerRatingCard script={script} user={vm.user} dark={vm.dark} onAggregate={vm.onProducerAggregate} />
      </section>
      <section className="sd3-drawer-section">
        <div className="sd3-section-heading"><div><p className="sd3-eyebrow">Reader feedback</p><h3>{Number(script?.rating || 0).toFixed(1)} from {vm.reviewsTotal} review{vm.reviewsTotal === 1 ? "" : "s"}</h3></div></div>
        {vm.canSubmitReview && (
          <form className="sd3-review-form" onSubmit={vm.handleSubmitReview}>
            <fieldset><legend>Your rating</legend><div>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} stars`} aria-pressed={vm.reviewRating === value} onClick={() => vm.setReviewRating(value)}><Star size={19} fill={vm.reviewRating >= value ? "currentColor" : "none"} /></button>)}</div></fieldset>
            <label htmlFor="sd3-reader-comment">Review<textarea id="sd3-reader-comment" value={vm.reviewComment} onChange={(event) => vm.setReviewComment(event.target.value)} maxLength={2000} placeholder="Share a thoughtful reader review…" /></label>
            <button type="submit" className="sd3-button sd3-button--primary" disabled={vm.reviewSubmitting}>{vm.reviewSubmitting ? "Saving…" : vm.myReview ? "Update review" : "Publish review"}</button>
          </form>
        )}
        {reviewsLoading ? <div className="sd3-loading-inline" role="status">Loading reader reviews…</div> : reviews.length ? (
          <div className="sd3-review-list">{reviews.map((review) => <article key={review?._id}><span className="sd3-avatar">{initials(review?.user?.name)}</span><div><b>{text(review?.user?.name, "Reader")}</b><small>{"★".repeat(Number(review?.rating || 0))}</small><p>{text(review?.comment)}</p></div></article>)}</div>
        ) : <div className="sd3-empty-inline">No reader reviews yet.</div>}
        {reviewsTotalPages > 1 && <div className="sd3-pager"><button type="button" disabled={reviewsPage <= 1} onClick={() => vm.fetchReviews({ page: reviewsPage - 1 })}>Previous</button><span>Page {reviewsPage} of {reviewsTotalPages}</span><button type="button" disabled={reviewsPage >= reviewsTotalPages} onClick={() => vm.fetchReviews({ page: reviewsPage + 1 })}>Next</button></div>}
      </section>
    </>
  );
}

function DealDrawer({ vm }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const requests = Array.isArray(vm.pendingRequests) ? vm.pendingRequests : [];
  const rows = requests.filter((request) => filter === "all" || request?.status === filter);
  const pendingSelected = requests.filter((request) => request?.status === "pending" && selected.has(request?._id));
  const rights = vm.script?.rightsLicensing || {};

  const toggle = (id) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const bulkApprove = async () => {
    if (!pendingSelected.length || bulkBusy) return;
    setBulkBusy(true);
    let successes = 0;
    for (const request of pendingSelected) {
      // Sequential calls preserve the server's conflicting-request safeguards.
      const ok = await vm.handleApproveRequest(request._id, { quiet: true });
      if (ok) successes += 1;
    }
    setSelected(new Set());
    setBulkBusy(false);
    vm.showNotice(
      successes === pendingSelected.length
        ? `${successes} request${successes === 1 ? "" : "s"} approved.`
        : `${successes} of ${pendingSelected.length} requests approved. Review conflicts before retrying.`,
      successes ? "success" : "error"
    );
  };

  return (
    <>
      <section className="sd3-deal-summary">
        <div><small>Script price</small><strong>{money(vm.script?.price)}</strong></div>
        <dl>
          <div><dt>Rights</dt><dd>{RIGHTS_LABELS[rights?.rightsType] || "Not specified"}</dd></div>
          <div><dt>Modification</dt><dd>{MODIFICATION_LABELS[rights?.modificationRights] || "Not specified"}</dd></div>
          <div><dt>Buyer commission</dt><dd>5%</dd></div>
          <div><dt>Payment window</dt><dd>72 hours after approval</dd></div>
        </dl>
      </section>
      {vm.capabilities.owner ? (
        <section className="sd3-drawer-section">
          <div className="sd3-section-toolbar">
            <div className="sd3-segmented">{["all", "pending", "approved", "rejected"].map((value) => <button key={value} type="button" className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
            <button type="button" className="sd3-button" onClick={bulkApprove} disabled={!pendingSelected.length || bulkBusy}>{bulkBusy ? "Approving…" : `Approve selected${pendingSelected.length ? ` (${pendingSelected.length})` : ""}`}</button>
          </div>
          {vm.pendingReqLoading ? <div className="sd3-loading-inline">Loading purchase requests…</div> : rows.length ? (
            <div className="sd3-request-list">{rows.map((request) => <article key={request?._id}>
              <label><input type="checkbox" checked={selected.has(request?._id)} disabled={request?.status !== "pending"} onChange={() => toggle(request?._id)} /><span className="sr-only">Select request from {request?.investor?.name}</span></label>
              <span className="sd3-avatar">{initials(request?.investor?.name)}</span>
              <div><b>{text(request?.investor?.name, "Industry professional")}</b><small>{text(request?.investor?.role, "Buyer")}{request?.investor?.company ? ` · ${request.investor.company}` : ""}</small>{request?.note && <p>{request.note}</p>}</div>
              <div className="sd3-request-amount"><strong>{money(request?.amount)}</strong><StatusPill tone={request?.status === "pending" ? "warning" : request?.status === "approved" ? "good" : "neutral"}>{request?.status}</StatusPill></div>
              {request?.status === "pending" && <div className="sd3-request-actions"><button type="button" onClick={() => vm.handleApproveRequest(request?._id)} disabled={vm.pendingReqActionId === request?._id}>Approve</button><button type="button" className="is-danger" onClick={() => vm.openDecline(request)}>Decline</button></div>}
            </article>)}</div>
          ) : <div className="sd3-empty-inline">No {filter === "all" ? "" : `${filter} `}purchase requests.</div>}
          <p className="sd3-note"><strong>Conflict safeguard</strong>Approvals remain server-authoritative. Conflicting requests may be rejected or locked when the 72-hour payment window starts.</p>
        </section>
      ) : vm.script?.myPendingRequest?.status === "approved" ? (
        <div className="sd3-action-banner"><Check size={20} /><div><b>Your request was approved</b><p>Complete payment within the server-provided payment window to unlock the full script.</p></div><button type="button" className="sd3-button sd3-button--primary" onClick={vm.openPayment}>Continue to payment</button></div>
      ) : vm.script?.myPendingRequest ? (
        <div className="sd3-action-banner"><FileText size={20} /><div><b>Request {vm.script.myPendingRequest.status}</b><p>The writer controls approval. Payment terms are accepted only on the secure payment page.</p></div></div>
      ) : vm.capabilities.canPurchase ? (
        <div className="sd3-action-banner"><FileText size={20} /><div><b>Request purchase access</b><p>Review the rights and writer conditions, then send an optional note. No payment is taken until the writer approves.</p></div><button type="button" className="sd3-button sd3-button--primary" onClick={vm.openPurchase}>Start request</button></div>
      ) : (
        <div className="sd3-empty-state"><LockKeyhole size={28} /><h3>Deal access restricted</h3><p>Purchase controls are available only to eligible industry accounts.</p></div>
      )}
    </>
  );
}

function ContactDrawer({ vm }) {
  const contact = vm.writerContact || {};
  const links = vm.availableWriterLinks || [];
  const contactCredits = getScriptWriters(vm.script);
  return (
    <>
      <div className="sd3-contact-identity"><span className="sd3-avatar sd3-avatar--large">{initials(vm.script?.creator?.name)}</span><div><h3>{text(vm.script?.creator?.name, "Writer")}</h3><p>{text(vm.script?.companyName || vm.script?.creator?.writerProfile?.company, "Ckript writer")}</p></div></div>
      {/* Every credited writer is listed, so a producer can see who actually worked on the script.
          Contact actions below apply to the project owner — the point of contact for the project. */}
      {contactCredits.length > 1 && (
        <section className="sd3-drawer-section">
          <h3>Credited writers ({contactCredits.length})</h3>
          <ul className="sd3-writer-credits__list">
            {contactCredits.map((w, i) => (
              <li key={`${w.id || w.name}-${i}`}>
                <span className="sd3-avatar sd3-avatar--tiny">{initials(w.name)}</span>
                <span>{w.name}{i === 0 ? " · point of contact" : ""}</span>
                <em>{creditLabel(w.creditType)}</em>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!vm.canViewWriterInfo ? (
        <div className="sd3-empty-state"><LockKeyhole size={28} /><h3>Professional contact access</h3><p>Private contact details require an active Film Industry Professional plan. Public writer identity remains available.</p><button type="button" className="sd3-button sd3-button--primary" onClick={vm.openPricing}>View plans</button></div>
      ) : (
        <>
          <div className="sd3-quota"><div><span>Contact reveals</span><b>{vm.contactsUsed} / {vm.contactsLimit}</b></div><i><b style={{ width: `${vm.contactsLimit ? Math.min(100, (vm.contactsUsed / vm.contactsLimit) * 100) : 0}%` }} /></i></div>
          {!vm.contactAlreadyRevealed ? <button type="button" className="sd3-button sd3-button--primary sd3-full" onClick={vm.handleRevealContact} disabled={vm.revealLoading || vm.contactRevealBlocked}>{vm.revealLoading ? "Revealing…" : vm.contactRevealBlocked ? "Contact quota reached" : "Reveal email and phone"}</button> : (
            <dl className="sd3-contact-details"><div><dt>Email</dt><dd><a href={`mailto:${contact.email}`}>{text(contact.email)}</a></dd></div><div><dt>Phone</dt><dd><a href={`tel:${contact.phone}`}>{text(contact.phone)}</a></dd></div></dl>
          )}
          {vm.revealError && <p className="sd3-field-error" role="alert">{vm.revealError}</p>}
          <div className="sd3-contact-actions"><button type="button" onClick={vm.handleMessageWriter} disabled={vm.messageWriterBlocked}><MessageCircle size={15} />Message · {vm.messageWritersUsed}/{vm.messageWritersLimit}</button><button type="button" onClick={vm.openMeeting} disabled={vm.meetingsBlocked}><Users size={15} />Meeting · {vm.meetingsUsed}/{vm.meetingsLimit}</button></div>
        </>
      )}
      {links.length > 0 && <section className="sd3-drawer-section"><h3>Professional links</h3><div className="sd3-professional-links">{links.map((link) => <a key={link.key} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<ExternalLink size={13} /></a>)}</div></section>}
    </>
  );
}

function TrailerDialog({ vm, open, onClose }) {
  const choices = {
    duration: [["30", "30 sec"], ["60", "60 sec"], ["90", "90 sec"]],
    quality: [["480", "480p"], ["720", "720p"]],
    format: [["landscape", "Landscape · 16:9"], ["portrait", "Portrait · 9:16"]],
    currency: [["inr", "INR · ₹"], ["usd", "USD · $"]],
  };
  return (
    <Overlay open={open} onClose={onClose} kind="modal" title="Configure your trailer" eyebrow="Promotional asset">
      <p className="sd3-prose">Choose the production package. Pricing and payment remain server-authoritative through the existing Razorpay workflow.</p>
      {Object.entries(choices).map(([group, items]) => {
        const current = group === "duration" ? vm.trailerDurationChoice : group === "quality" ? vm.trailerQualityChoice : group === "format" ? vm.trailerFormatChoice : vm.trailerCurrencyChoice;
        const setter = group === "duration" ? vm.setTrailerDurationChoice : group === "quality" ? vm.setTrailerQualityChoice : group === "format" ? vm.setTrailerFormatChoice : vm.setTrailerCurrencyChoice;
        return <fieldset key={group} className="sd3-choice-field"><legend>{group}</legend><div className={items.length === 3 ? "is-three" : ""}>{items.map(([value, label]) => <button key={value} type="button" className={current === value ? "is-selected" : ""} onClick={() => setter(value)}>{label}</button>)}</div></fieldset>;
      })}
      <div className="sd3-order-summary"><div><small>Selected package</small><b>{vm.trailerDurationChoice}s · {vm.trailerQualityChoice}p · {vm.trailerFormatChoice}</b></div><strong>{vm.selectedTrailerPrefix} {vm.formatTrailerAmount(vm.selectedTrailerAmount)}</strong></div>
      <button type="button" className="sd3-button sd3-button--accent sd3-full" disabled={!vm.trailerCurrencyChoice || vm.trailerLoading} onClick={async () => { await vm.handleGenerateTrailer(); onClose(); }}>{vm.trailerLoading ? "Opening payment…" : "Continue to secure payment"}</button>
    </Overlay>
  );
}

function PurchaseDialog({ vm, open, onClose }) {
  const [step, setStep] = useState(1);
  const [note, setNote] = useState("");
  const closeDialog = () => {
    setStep(1);
    setNote("");
    onClose();
  };
  const rights = vm.script?.rightsLicensing || {};
  return (
    <Overlay open={open} onClose={closeDialog} kind="modal" title={step === 1 ? "Request to purchase" : "Review rights and conditions"} eyebrow={`Step ${step} of 2`}>
      {step === 1 ? <>
        <p className="sd3-prose">You are asking {text(vm.script?.creator?.name, "the writer")} to approve purchase access to “{text(vm.script?.title)}”. No payment is taken now.</p>
        <div className="sd3-purchase-amount"><small>After approval</small><strong>{money(Number(vm.script?.price || 0) * 1.05)}</strong><span>Script {money(vm.script?.price)} + 5% buyer commission</span></div>
        <dl className="sd3-detail-list"><div><dt>Rights</dt><dd>{RIGHTS_LABELS[rights?.rightsType] || "Not specified"}</dd></div><div><dt>Payment window</dt><dd>72 hours</dd></div><div><dt>Full access</dt><dd>After verified payment</dd></div></dl>
        <button type="button" className="sd3-button sd3-button--primary sd3-full" onClick={() => setStep(2)}>Review conditions<ChevronRight size={14} /></button>
      </> : <>
        <div className="sd3-terms-scroll"><h3>Rights summary</h3><p>{RIGHTS_LABELS[rights?.rightsType] || "Rights type not specified"}. {MODIFICATION_LABELS[rights?.modificationRights] || "Modification rights not specified"}.</p><h3>Writer conditions</h3><p>{text(vm.writerCustomConditions, "No additional writer conditions.")}</p><h3>Payment terms</h3><p>The secure payment page collects the binding platform, writer, custom-condition, and rights acknowledgements after owner approval.</p></div>
        <label className="sd3-field" htmlFor="sd3-purchase-note">Message to the writer <span>Optional</span><textarea id="sd3-purchase-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Why is this project a fit for you?" /></label>
        <div className="sd3-modal-actions"><button type="button" className="sd3-button" onClick={() => setStep(1)}>Back</button><button type="button" className="sd3-button sd3-button--primary" disabled={vm.requestLoading} onClick={async () => { const ok = await vm.handleRequestPurchase(note); if (ok) closeDialog(); }}>{vm.requestLoading ? "Sending…" : "Send request"}</button></div>
      </>}
    </Overlay>
  );
}

function ConfirmDialog({ open, onClose, title, description, confirmLabel, busy, danger = false, onConfirm, children }) {
  return <Overlay open={open} onClose={onClose} kind="modal" title={title} eyebrow="Confirmation"><p className="sd3-prose">{description}</p>{children}<div className="sd3-modal-actions"><button type="button" className="sd3-button" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className={`sd3-button ${danger ? "sd3-button--danger" : "sd3-button--primary"}`} onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</button></div></Overlay>;
}

export default function ScriptDetailCinematic({ vm }) {
  const [panel, setPanel] = useState("");
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [declineRequest, setDeclineRequest] = useState(null);
  const [declineNote, setDeclineNote] = useState("");
  const { script, capabilities, journey, recommended } = vm;
  const creator = script?.creator || {};
  // Credits fall back to the owner for pre-credits scripts, so these are always safe to render.
  const credits = getScriptWriters(script);
  const scriptCredit = formatWriterNames(credits.map((w) => w.name));
  const producer = Number(script?.producerRating?.average || 0);
  const readerRating = Number(script?.rating || 0);
  const ai = Number(script?.scriptScore?.overall || 0);

  const openPanel = (id) => {
    if (id === "trailer") { setTrailerOpen(true); return; }
    if (id === "payment") { vm.openPayment(); return; }
    if (id === "edit") { vm.openEdit(); return; }
    if (id === "read") vm.recordPreviewOpen();
    setPanel(id);
  };
  const action = () => openPanel(recommended.id);

  const stages = useMemo(() => Object.fromEntries(journey.stages.map((stage) => [stage.id, stage])), [journey.stages]);
  const journeyCopy = {
    story: [stages.story.ready ? "Story ready" : "Needs information", "The emotional hook, synopsis, writer identity, production details and castable roles.", "Open story"],
    read: [capabilities.fullScript ? "Full access" : journey.hasPreviewSource ? "Preview ready" : "Preview unavailable", capabilities.fullScript ? "Your role has governed access to the full screenplay." : "Review the configured preview while the full screenplay remains protected.", capabilities.fullScript ? "Read full script" : "Read preview"],
    evidence: [script?.evaluationStatus === "requested" ? "Evaluation pending" : ai ? `${ai} · report ready` : "No evaluation", "AI analysis, Ckript score, producer endorsements and reader feedback.", "Review evidence"],
    discovery: [journey.hasTrailer ? "Promotion ready" : "Action suggested", journey.hasTrailer ? "Classification and trailer assets are ready for discovery." : "Classification is visible; the promotional trailer is still missing.", capabilities.owner && !journey.hasTrailer ? "Add trailer" : "View discovery"],
    deal: [capabilities.owner ? `${vm.pendingRequestBadgeCount} pending` : capabilities.canPurchase ? "Available" : capabilities.buyer ? "Purchased" : "Role gated", capabilities.owner ? "Review incoming requests and preserve the server approval safeguards." : "Review rights, writer conditions, commission, payment and access state.", capabilities.owner ? "Review requests" : "View deal terms"],
  };

  return (
    <main className={`sd3-page${vm.dark ? " is-dark" : ""}`} id="main-content">
      {vm.notice && <div className={`sd3-local-notice sd3-local-notice--${vm.notice.type}`} role={vm.notice.type === "error" ? "alert" : "status"}><span>{vm.notice.type === "error" ? "!" : "✓"}</span><p>{vm.notice.message}</p><button type="button" onClick={() => vm.setNotice(null)} aria-label="Dismiss"><X size={14} /></button></div>}

      <section className="sd3-hero" aria-labelledby="sd3-project-title">
        {vm.resolvedHeroImage && !vm.showCoverPlaceholder ? <img src={vm.resolvedHeroImage} alt="" onError={() => vm.setCoverError(true)} /> : <div className="sd3-hero__fallback" aria-hidden="true"><i /><i /><i /><span>{initials(script?.title)}</span></div>}
        <div className="sd3-hero__overlay">
          <div className="sd3-hero__top">
            <button type="button" className="sd3-inverse-link" onClick={vm.openProfile}><ArrowLeft size={15} />{creator?.name ? `${creator.name}'s profile` : "Writer profile"}</button>
            <div>{script?.verifiedBadge && <StatusPill tone="good">Verified project</StatusPill>}<StatusPill tone={script?.status === "published" ? "good" : "warning"}>{script?.status || "Draft"}</StatusPill></div>
          </div>
          <div className="sd3-hero__copy">
            <p className="sd3-eyebrow">{script?.sid || "Ckript project"} · {text(script?.classification?.primaryGenre || script?.primaryGenre || script?.genre, "Unclassified")}</p>
            <h1 id="sd3-project-title">{text(script?.title, "Untitled project")}</h1>
            <p>{text(script?.logline, "The writer has not added a logline yet.")}</p>
            {/* Authorship credit — reads "Written by A & B" so every co-writer is named up front. */}
            {scriptCredit && <p className="sd3-hero__credit">Written by {scriptCredit}</p>}
            <div className="sd3-hero__meta"><span>{script?.pageCount ? `${script.pageCount} pages` : "Page count pending"}</span><span>{text(script?.filmDetails?.filmLanguage, "Language pending")}</span><span>{Number(script?.views || 0).toLocaleString("en-IN")} views</span><span><Star size={11} fill="currentColor" />{producer ? producer.toFixed(1) : "—"} producer rating</span></div>
          </div>
          <div className="sd3-hero__dock">
            {capabilities.canEdit && <button type="button" className="sd3-hero-action" onClick={vm.openEdit}><Pencil size={15} />{capabilities.owner ? "Edit project" : "Co-write"}</button>}
            {vm.canOpenCollaborationHub && <button type="button" className="sd3-hero-action" onClick={vm.openCollaborationHub}><Users size={15} />Collaborate</button>}
            {vm.canPlayTrailer && <button type="button" className="sd3-hero-action" onClick={() => setMediaOpen(true)}><Play size={15} />Play trailer</button>}
            {capabilities.canBookmark && <button type="button" className="sd3-hero-action" aria-pressed={vm.isBookmarked} onClick={vm.handleToggleBookmark}><Bookmark size={15} fill={vm.isBookmarked ? "currentColor" : "none"} />{vm.isBookmarked ? "Saved" : "Save"}</button>}
            <SocialShareButton share={vm.scriptShare} className="sd3-hero-action" buttonLabel="Share" />
          </div>
        </div>
      </section>

      <section className="sd3-guide-strip" aria-label="Project readiness">
        <div><p className="sd3-eyebrow">{capabilities.owner ? "Your project today" : "Project access today"}</p><h2>{capabilities.owner ? (journey.readiness === 100 ? "Your listing is ready for its next opportunity" : `${100 - journey.readiness} points from a complete listing`) : recommended.label}</h2></div>
        <div className="sd3-guide-score"><span>{journey.readiness}</span><div><b>Readiness</b><small>{journey.stages.filter((stage) => stage.ready).length} of 5 stages ready</small></div></div>
        <button type="button" className="sd3-button sd3-button--accent" onClick={action}>{recommended.label}<ChevronRight size={15} /></button>
      </section>

      <div className="sd3-content">
        <section className="sd3-journey" aria-labelledby="sd3-journey-title">
          <header className="sd3-section-heading"><div><p className="sd3-eyebrow">Guided project journey</p><h2 id="sd3-journey-title">Open only what you need</h2></div><button type="button" className="sd3-button" onClick={() => setPanel("tools")}><MoreHorizontal size={15} />Project tools</button></header>
          {journey.stages.map((stage) => {
            const [status, description, actionLabel] = journeyCopy[stage.id];
            return <JourneyCard key={stage.id} stage={stage} status={status} description={description} actionLabel={actionLabel} onOpen={() => stage.id === "discovery" && capabilities.owner && !journey.hasTrailer ? setTrailerOpen(true) : openPanel(stage.id)} />;
          })}
        </section>

        <aside className="sd3-aside" aria-label="Project summary">
          <article className="sd3-aside-card sd3-commercial-card"><p className="sd3-eyebrow">Commercial snapshot</p><strong>{money(script?.price)}</strong><span>{RIGHTS_LABELS[script?.rightsLicensing?.rightsType] || "Rights not specified"}</span><div><section><b>{producer ? producer.toFixed(1) : "—"}</b><small>Producer</small></section><section><b>{readerRating ? readerRating.toFixed(1) : "—"}</b><small>Readers</small></section><section><b>{ai || "—"}</b><small>AI score</small></section></div></article>
          <article className="sd3-aside-card sd3-signal-card"><header><p className="sd3-eyebrow">Strongest signals</p><button type="button" onClick={() => setPanel("evidence")}>Details</button></header>{[["Plot", script?.scriptScore?.plot], ["Market", script?.scriptScore?.marketability], ["Dialogue", script?.scriptScore?.dialogue]].map(([label, value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${Number(value || 0)}%` }} /></i><em>{Number(value || 0) || "—"}</em></div>)}</article>
          <article className="sd3-aside-card sd3-writer-card">
            <div className="sd3-contact-identity"><span className="sd3-avatar sd3-avatar--large">{initials(creator?.name)}</span><div><b>{text(creator?.name, "Writer")}</b><small>{text(script?.companyName || creator?.writerProfile?.company, "Ckript writer")}</small></div></div>
            {/* Co-writers get named here too — the owner is only the first credit, not the sole author. */}
            {credits.length > 1 && (
              <div className="sd3-writer-credits">
                <p className="sd3-eyebrow">{credits.length} writers credited</p>
                <ul>
                  {credits.map((w, i) => (
                    <li key={`${w.id || w.name}-${i}`}>
                      <span className="sd3-avatar sd3-avatar--tiny">{initials(w.name)}</span>
                      <span>{w.name}</span>
                      <em>{creditLabel(w.creditType)}</em>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p>{text(creator?.writerProfile?.bio, "Open the writer profile or contact options for more context.")}</p>
            <button type="button" className="sd3-button sd3-full" onClick={() => vm.canViewWriterInfo ? setPanel("contact") : vm.openProfile()}>{vm.canViewWriterInfo ? "Open contact options" : "View writer profile"}</button>
          </article>
          <article className="sd3-aside-card sd3-tool-card"><button type="button" onClick={() => setPanel("tools")}>Project tools & permissions<ChevronRight size={14} /></button><button type="button" onClick={() => setPanel("story")}>Metadata & publication<ChevronRight size={14} /></button><button type="button" onClick={() => setPanel("contact")}>Writer & contact<ChevronRight size={14} /></button>{capabilities.owner && <button type="button" className="is-danger" onClick={() => vm.setShowDeleteModal(true)}>Danger zone<ChevronRight size={14} /></button>}</article>
        </aside>
      </div>

      <Overlay open={panel === "story"} onClose={() => setPanel("")} title="Story and identity"><StoryDrawer vm={vm} /></Overlay>
      <Overlay open={panel === "read"} onClose={() => setPanel("")} title={capabilities.fullScript ? "Screenplay access" : "Viewable script"}><ReadDrawer vm={{ ...vm, openPurchase: () => setPurchaseOpen(true) }} /></Overlay>
      <Overlay open={panel === "evidence"} onClose={() => setPanel("")} title="Evaluation evidence"><EvidenceDrawer vm={vm} /></Overlay>
      <Overlay open={panel === "discovery"} onClose={() => setPanel("")} title="Discovery and promotion"><StoryDrawer vm={vm} />{capabilities.owner && !journey.hasTrailer && <button type="button" className="sd3-button sd3-button--accent sd3-full" onClick={() => { setPanel(""); setTrailerOpen(true); }}>Configure AI trailer</button>}</Overlay>
      <Overlay open={panel === "deal"} onClose={() => setPanel("")} title="Deal desk"><DealDrawer vm={{ ...vm, openPurchase: () => setPurchaseOpen(true), openDecline: (request) => { setDeclineRequest(request); setDeclineNote(""); } }} /></Overlay>
      <Overlay open={panel === "contact"} onClose={() => setPanel("")} title="Writer and contact"><ContactDrawer vm={{ ...vm, openMeeting: () => { setPanel(""); vm.openMeeting(); } }} /></Overlay>
      <Overlay open={panel === "tools"} onClose={() => setPanel("")} title="Project tools and permissions" eyebrow="Supported actions">
        <div className="sd3-tool-list">
          {capabilities.canEdit && <button type="button" onClick={vm.openEdit}><Pencil size={17} /><span><b>{capabilities.owner ? "Edit project" : "Co-write this script"}</b><small>{capabilities.owner ? "Open the editor with current permissions." : "Write live alongside the other writers, one scene each."}</small></span><ChevronRight size={15} /></button>}
          {vm.canOpenCollaborationHub && <button type="button" onClick={vm.openCollaborationHub}><Users size={17} /><span><b>Collaboration hub</b><small>Invite writers, manage requests, review and merge pull requests.</small></span><ChevronRight size={15} /></button>}
          <button type="button" onClick={() => openPanel("read")}><FileText size={17} /><span><b>Script access</b><small>Preview, copy, print and download according to access.</small></span><ChevronRight size={15} /></button>
          {capabilities.buyer && vm.script?.myPendingRequest?.invoice && <button type="button" onClick={() => vm.handleInvoicePdfAction(vm.script.myPendingRequest.invoice, "open")}><Download size={17} /><span><b>Open invoice</b><small>View the verified purchase invoice.</small></span><ChevronRight size={15} /></button>}
          <button type="button" onClick={() => setPanel("story")}><Film size={17} /><span><b>Metadata and publication</b><small>View SID, completion, classifications and roles.</small></span><ChevronRight size={15} /></button>
        </div>
      </Overlay>
      <TrailerDialog vm={vm} open={trailerOpen} onClose={() => setTrailerOpen(false)} />
      <PurchaseDialog vm={vm} open={purchaseOpen} onClose={() => setPurchaseOpen(false)} />
      <ConfirmDialog open={Boolean(declineRequest)} onClose={() => setDeclineRequest(null)} title={`Decline ${text(declineRequest?.investor?.name, "request")}?`} description="The buyer will be notified. A reason is optional." confirmLabel="Decline request" danger busy={vm.pendingReqActionId === declineRequest?._id} onConfirm={async () => { const ok = await vm.handleRejectRequest(declineRequest?._id, declineNote); if (ok) setDeclineRequest(null); }}><label className="sd3-field" htmlFor="sd3-decline-note">Reason <span>Optional</span><textarea id="sd3-decline-note" value={declineNote} onChange={(event) => setDeclineNote(event.target.value)} maxLength={500} /></label></ConfirmDialog>
      <ConfirmDialog open={vm.showDeleteModal} onClose={() => vm.setShowDeleteModal(false)} title={`Delete “${text(script?.title)}”?`} description="The project will be removed from the writer profile and listings. Governed purchased/admin access may remain available." confirmLabel="Delete project" danger busy={vm.deleteLoading} onConfirm={vm.handleDeleteScript} />
      <Overlay open={mediaOpen} onClose={() => setMediaOpen(false)} kind="modal" title="Trailer preview" eyebrow="Project media"><div className="sd3-video-frame">{vm.canPlayTrailer ? <video src={vm.trailerPlaybackUrl} controls autoPlay playsInline onError={vm.handleTrailerPlaybackError} /> : <div><Film size={28} /><p>Trailer playback is unavailable.</p></div>}</div></Overlay>
      <MeetingModal isOpen={vm.showMeetingModal} onClose={() => vm.setShowMeetingModal(false)} writerId={script?.creator?._id} scriptId={script?._id} writerName={script?.creator?.name} scriptName={script?.title} onMeetingScheduled={vm.handleMeetingScheduled} />
    </main>
  );
}

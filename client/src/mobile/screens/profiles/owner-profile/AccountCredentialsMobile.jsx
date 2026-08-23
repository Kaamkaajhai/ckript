import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPTY_PAYOUT_DRAFT,
  MEMBERSHIP_PROOF_MAX_BYTES,
  PAYOUT_ACCOUNT_TYPES,
  buildPayoutSubmission,
  loadMembershipProofAccessUrl,
  loadPayoutDetails,
  normalizeMembershipReviews,
  submitMembershipProof,
  submitPayoutDetails,
  validateMembershipProof,
} from "../../../../pages/profile/accountCredentials";
import Button from "../../../components/buttons/Button";
import InlineMessage from "../../../components/feedback/InlineMessage";
import SkeletonGroup, { SkeletonShape } from "../../../components/feedback/Skeletons";
import FilePicker from "../../../components/forms/FilePicker";
import SelectField from "../../../components/forms/SelectField";
import TextField from "../../../components/forms/TextField";

const dateTime = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleString();
};

const reviewMessage = (state) => {
  if (state.security.isLocked) return { tone: "error", title: "Payout updates locked", body: "Too many invalid attempts were recorded. Contact support to unlock payout changes." };
  if (state.review.status === "pending") return {
    tone: "warning",
    title: "Under review",
    body: `${state.approved ? "Your active account remains unchanged. " : "No payout account becomes active until approval. "}${state.review.dueAt ? `Expected by ${dateTime(state.review.dueAt)}.` : "Review normally completes within two days."}`,
  };
  if (state.review.status === "approved") return { tone: "success", title: "Payout account approved", body: "Future withdrawals use this approved account." };
  if (state.review.status === "rejected") return { tone: "error", title: "Changes requested", body: `${state.review.adminNote || "Update the payout details and submit them again."}${state.approved ? " Your previously approved account remains active." : ""}` };
  return { tone: "info", title: "No payout account", body: "Add an account before requesting a withdrawal." };
};

const PayoutSummary = ({ title, details }) => details ? (
  <div className="ckm-account-settings__credential-summary-wrap">
    <p>{title}</p>
    <div className="ckm-account-settings__credential-summary">
      <div><span>Account holder</span><strong>{details.accountHolderName || "Not set"}</strong></div>
      <div><span>Bank</span><strong>{details.bankName || "Not set"}</strong></div>
      <div><span>Account</span><strong>{details.accountNumber || "Masked"}</strong></div>
      <div><span>{details.country === "IN" ? "IFSC" : "Routing"}</span><strong>{details.routingNumber || "Not set"}</strong></div>
      <div><span>Account type</span><strong>{details.accountType || "checking"}</strong></div>
      <div><span>Currency</span><strong>{details.currency || "INR"}</strong></div>
    </div>
  </div>
) : null;

export function PayoutCredentialSettings({ onSuccess = undefined }) {
  const [state, setState] = useState(null);
  const [status, setStatus] = useState("loading");
  const [draft, setDraft] = useState({ ...EMPTY_PAYOUT_DRAFT });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const applyLoadedPayout = useCallback((result) => {
    if (!result.ok) {
      setStatus("error");
      setError(result.message);
      return;
    }
    setState(result.data);
    setDraft(result.data.draft);
    setEditing(!result.data.display && result.data.review.status === "not_submitted");
    setStatus("ready");
  }, []);

  const load = useCallback(async () => {
    setStatus("loading");
    setError("");
    const result = await loadPayoutDetails();
    applyLoadedPayout(result);
  }, [applyLoadedPayout]);

  useEffect(() => {
    let cancelled = false;
    loadPayoutDetails().then((result) => {
      if (!cancelled) applyLoadedPayout(result);
    });
    return () => { cancelled = true; };
  }, [applyLoadedPayout]);

  const change = (key, value) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const validation = buildPayoutSubmission(draft);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors || {});
      setError(validation.message);
      return;
    }
    setBusy(true);
    setError("");
    const result = await submitPayoutDetails(validation.data);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors || {});
      if (result.status === 403) setState((current) => current ? { ...current, security: { ...current.security, isLocked: true } } : current);
      return;
    }
    setState(result.data);
    setDraft(result.data.draft);
    setEditing(false);
    setFieldErrors({});
    onSuccess?.(result.message);
  };

  if (status === "loading") return <SkeletonGroup label="Loading payout details"><SkeletonShape height={116} /><SkeletonShape height={48} /></SkeletonGroup>;
  if (status === "error") return <InlineMessage variant="panel" title="Payout details unavailable" onRetry={load}>{error}</InlineMessage>;

  const message = reviewMessage(state);
  const display = state.display;
  return (
    <div className="ckm-account-settings__credential-stack">
      <InlineMessage tone={message.tone} title={message.title}>{message.body}</InlineMessage>
      {!editing ? <PayoutSummary title={state.approved ? "Active payout account" : "Submitted payout account"} details={state.approved || display} /> : null}
      {!editing && state.approved && state.review.requestedDetails && ["pending", "rejected"].includes(state.review.status) ? <PayoutSummary title={state.review.status === "pending" ? "Replacement under review" : "Rejected replacement"} details={state.review.requestedDetails} /> : null}
      {!editing && !state.security.isLocked ? <Button variant="secondary" fullWidth onClick={() => { setDraft(state.draft); setError(""); setEditing(true); }}>Change payout account</Button> : null}
      {editing && !state.security.isLocked ? (
        <form className="ckm-account-settings__credential-form" onSubmit={submit}>
          {error ? <InlineMessage>{error}</InlineMessage> : null}
          <TextField label="Account holder name" purpose="name" required value={draft.accountHolderName} error={fieldErrors.accountHolderName} autoComplete="name" onChange={(event) => change("accountHolderName", event.target.value)} />
          <TextField label="Bank name" required value={draft.bankName} error={fieldErrors.bankName} autoComplete="organization" onChange={(event) => change("bankName", event.target.value)} />
          <TextField label="Full account number" purpose="number" required value={draft.accountNumber} error={fieldErrors.accountNumber} maxLength={20} hint={display?.accountNumber ? `Current account: ${display.accountNumber}. Enter the full number to authorize any change.` : "8–20 digits. This value is masked after submission."} autoComplete="off" onChange={(event) => change("accountNumber", event.target.value.replace(/\D/g, "").slice(0, 20))} />
          <TextField label={draft.country === "IN" ? "IFSC code" : "Routing number"} required value={draft.routingNumber} error={fieldErrors.routingNumber} maxLength={draft.country === "IN" ? 11 : 20} autoCapitalize="characters" onChange={(event) => change("routingNumber", event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))} />
          <div className="ckm-account-settings__credential-grid">
            <SelectField label="Account type" value={draft.accountType} error={fieldErrors.accountType} options={PAYOUT_ACCOUNT_TYPES} onChange={(event) => change("accountType", event.target.value)} />
            <TextField label="Country code" required value={draft.country} error={fieldErrors.country} maxLength={2} autoCapitalize="characters" onChange={(event) => change("country", event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} />
          </div>
          <TextField label="Currency code" required value={draft.country === "IN" ? "INR" : draft.currency} error={fieldErrors.currency} maxLength={3} disabled={draft.country === "IN"} autoCapitalize="characters" onChange={(event) => change("currency", event.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} />
          <div className="ckm-account-settings__credential-grid">
            <TextField label="SWIFT code" optional value={draft.swiftCode} maxLength={11} autoCapitalize="characters" onChange={(event) => change("swiftCode", event.target.value.toUpperCase().replace(/\s/g, ""))} />
            <TextField label="IBAN" optional value={draft.iban} maxLength={34} autoCapitalize="characters" onChange={(event) => change("iban", event.target.value.toUpperCase().replace(/\s/g, ""))} />
          </div>
          <p className="ckm-account-settings__credential-note">Payout values are visible here only in masked form after submission. An administrator must approve each change before it replaces the active account.</p>
          <div className="ckm-account-settings__credential-actions">
            {display ? <Button type="button" variant="secondary" disabled={busy} onClick={() => { setDraft(state.draft); setFieldErrors({}); setError(""); setEditing(false); }}>Cancel</Button> : null}
            <Button type="submit" fullWidth={!display} pending={busy}>Submit for review</Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

const MEMBERSHIPS = Object.freeze([
  { type: "wga", label: "Writers Guild of America (WGA)" },
  { type: "swa", label: "Screenwriters Association (SWA)" },
]);

const membershipMessage = (review) => {
  if (review.status === "approved") return { tone: "success", text: "Membership approved." };
  if (review.status === "pending") return { tone: "warning", text: review.submittedAt ? `Submitted ${dateTime(review.submittedAt)}. Review is pending.` : "Review is pending." };
  if (review.status === "rejected") return { tone: "error", text: review.adminNote ? `Changes requested: ${review.adminNote}` : "The proof was rejected. Upload a current document to try again." };
  return { tone: "info", text: "No proof submitted." };
};

export function MembershipCredentialSettings({ writerProfile = {}, onUpdate = undefined, onSuccess = undefined }) {
  const reviews = useMemo(() => normalizeMembershipReviews(writerProfile), [writerProfile]);
  const [files, setFiles] = useState({ wga: null, swa: null });
  const [errors, setErrors] = useState({ wga: "", swa: "" });
  const [busy, setBusy] = useState("");
  const [progress, setProgress] = useState({ wga: 0, swa: 0 });
  const [access, setAccess] = useState({ wga: "", swa: "" });

  const choose = (type, selected) => {
    const file = selected[0] || null;
    const validation = validateMembershipProof(file);
    setFiles((current) => ({ ...current, [type]: validation.ok ? file : null }));
    setErrors((current) => ({ ...current, [type]: validation.ok ? "" : validation.message }));
    setProgress((current) => ({ ...current, [type]: 0 }));
  };

  const upload = async (type) => {
    const validation = validateMembershipProof(files[type]);
    if (!validation.ok) {
      setErrors((current) => ({ ...current, [type]: validation.message }));
      return;
    }
    setBusy(type);
    setErrors((current) => ({ ...current, [type]: "" }));
    const result = await submitMembershipProof({
      membershipType: type,
      file: files[type],
      onProgress: (value) => setProgress((current) => ({ ...current, [type]: value })),
    });
    setBusy("");
    if (!result.ok) {
      setErrors((current) => ({ ...current, [type]: result.message }));
      return;
    }
    setFiles((current) => ({ ...current, [type]: null }));
    setProgress((current) => ({ ...current, [type]: 0 }));
    setAccess((current) => ({ ...current, [type]: "" }));
    onUpdate?.(result.data);
    onSuccess?.(result.message);
  };

  const prepareAccess = async (type) => {
    setBusy(`access-${type}`);
    setErrors((current) => ({ ...current, [type]: "" }));
    const result = await loadMembershipProofAccessUrl(type);
    setBusy("");
    if (!result.ok) {
      setErrors((current) => ({ ...current, [type]: result.message }));
      return;
    }
    setAccess((current) => ({ ...current, [type]: result.data.url }));
  };

  return (
    <div className="ckm-account-settings__membership-list">
      {MEMBERSHIPS.map(({ type, label }) => {
        const review = reviews[type];
        const message = membershipMessage(review);
        return (
          <article className="ckm-account-settings__membership" key={type}>
            <header><div><h3>{label}</h3><p>{message.text}</p></div><span data-status={review.status}>{review.status.replace("_", " ")}</span></header>
            {review.hasProof ? (
              <div className="ckm-account-settings__proof-access">
                <span>{review.proofFileName || "Latest proof on file"}</span>
                {access[type] ? <a href={access[type]} target="_blank" rel="noopener noreferrer">Open proof</a> : <Button variant="tertiary" pending={busy === `access-${type}`} onClick={() => prepareAccess(type)}>Get secure link</Button>}
              </div>
            ) : null}
            {review.status === "approved" && errors[type] ? <InlineMessage>{errors[type]}</InlineMessage> : null}
            {message.tone === "error" ? <InlineMessage>{message.text}</InlineMessage> : null}
            {review.status !== "approved" ? (
              <>
                <FilePicker
                  label={`${type.toUpperCase()} membership proof`}
                  hint={`PDF, JPG, PNG, or WebP · up to ${MEMBERSHIP_PROOF_MAX_BYTES / 1024 / 1024} MB`}
                  error={errors[type]}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  files={files[type] ? [files[type]] : []}
                  disabled={busy === type}
                  buttonLabel={review.hasProof ? "Choose replacement" : "Choose proof"}
                  onSelect={(selected) => choose(type, selected)}
                  onRemove={() => { setFiles((current) => ({ ...current, [type]: null })); setProgress((current) => ({ ...current, [type]: 0 })); }}
                />
                {busy === type ? <p className="ckm-account-settings__upload-progress" role="status">Uploading {progress[type]}%</p> : null}
                <Button fullWidth disabled={!files[type]} pending={busy === type} onClick={() => upload(type)}>{review.status === "rejected" ? "Resubmit proof" : "Submit proof"}</Button>
              </>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

import { createElement, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, RotateCcw, Upload, X } from "lucide-react";
import { EXTERNAL_EVENT_PROVIDERS, getProvider } from "../../data/externalEventProviders";
import ProviderMark from "../../components/ProviderMark";
import { MAX_EXTERNAL_SCREENSHOT_BYTES } from "./challengeRegistration";

const CONTROL = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid var(--ckc-rule)",
  borderRadius: 3,
  background: "var(--ckc-card)",
  color: "var(--ckc-ink)",
  fontFamily: "var(--ckc-sans)",
  fontSize: "0.9375rem",
};

const StatusBanner = ({ tone, icon: Icon, title, children }) => (
  <div className={`ckc-card flex gap-3 px-4 py-4 is-${tone}`}>
    {createElement(Icon, { size: 18, style: { flexShrink: 0, marginTop: 2 }, "aria-hidden": true })}
    <div><p style={{ fontWeight: 600 }}>{title}</p><div style={{ fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>{children}</div></div>
  </div>
);

/** Desktop presentation for the shared third-party-claim state in useChallengeRegistration. */
export default function ExternalRegistrationPanel({ state }) {
  const [open, setOpen] = useState(Boolean(state?.request && state.request.status !== "approved"));
  const fileRef = useRef(null);
  const fields = state?.fields || {};
  const request = state?.request || null;
  const provider = useMemo(() => getProvider(fields.provider), [fields.provider]);
  const isPending = request?.status === "pending";
  const isApproved = request?.status === "approved";
  const isRejected = request?.status === "rejected";

  if (!state || state.loading) return null;

  const setField = (key, value) => {
    state.setFields((current) => ({ ...current, [key]: value }));
    state.setError("");
  };
  const pickScreenshot = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (file.size > MAX_EXTERNAL_SCREENSHOT_BYTES) {
      state.setError("Screenshot must be 8MB or smaller.");
      event.target.value = "";
      return;
    }
    state.setScreenshot(file);
    state.setError("");
  };
  const clearScreenshot = () => {
    state.setScreenshot(null);
    if (fileRef.current) fileRef.current.value = "";
  };
  const onPlatformKeyDown = (event) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const current = EXTERNAL_EVENT_PROVIDERS.findIndex((item) => item.slug === fields.provider);
    const last = EXTERNAL_EVENT_PROVIDERS.length - 1;
    let next = 0;
    if (event.key === "End") next = last;
    else if (event.key === "Home") next = 0;
    else if (["ArrowRight", "ArrowDown"].includes(event.key)) next = current < 0 ? 0 : (current + 1) % (last + 1);
    else next = current <= 0 ? last : current - 1;
    setField("provider", EXTERNAL_EVENT_PROVIDERS[next].slug);
    document.getElementById(`ext-platform-${EXTERNAL_EVENT_PROVIDERS[next].slug}`)?.focus();
  };
  const submit = (event) => {
    event.preventDefault();
    state.submit();
  };

  if (isApproved) {
    return <div className="mt-6"><StatusBanner tone="approved" icon={CheckCircle2} title="Registration confirmed">We verified your registration on <strong>{request.providerName}</strong>. No payment is needed — your entry is active.</StatusBanner></div>;
  }

  return (
    <section className="mt-7" aria-labelledby="external-registration-title">
      {!open && !isPending ? <button type="button" onClick={() => setOpen(true)} className="ckc-link">Already registered through another platform?</button> : null}
      {isPending ? <StatusBanner tone="pending" icon={Clock} title="With our team for review">We&apos;re checking your <strong>{request.providerName}</strong> registration{request.externalRef ? <> (<span className="ckc-mono">{request.externalRef}</span>)</> : null}. You&apos;ll receive an email after the decision; do not pay again meanwhile.</StatusBanner> : null}
      {isRejected ? <div className="mb-5"><StatusBanner tone="rejected" icon={RotateCcw} title="We could not confirm that — try again">{request.reviewNote ? <p>{request.reviewNote}</p> : null}<p>Correct the details below and send it again.</p></StatusBanner></div> : null}

      {open && !isPending ? (
        <div className="ckc-card ckc-card-pad mt-4">
          <div className="flex items-start justify-between gap-4"><div><h2 id="external-registration-title" className="ckc-title ckc-h3">Registered somewhere else?</h2><p style={{ marginTop: 4 }}>If you already paid on another platform, send the details for manual verification. No second payment.</p></div>{!isRejected ? <button type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18} /></button> : null}</div>
          <form onSubmit={submit} className="mt-5 space-y-5">
            <fieldset><legend className="ckc-meta">Where did you register?</legend><div className="mt-3 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))" }} role="radiogroup" aria-label="Platform" onKeyDown={onPlatformKeyDown}>{EXTERNAL_EVENT_PROVIDERS.map((item) => { const selected = fields.provider === item.slug; return <button key={item.slug} id={`ext-platform-${item.slug}`} type="button" role="radio" aria-checked={selected} tabIndex={selected || (!fields.provider && item.slug === EXTERNAL_EVENT_PROVIDERS[0].slug) ? 0 : -1} onClick={() => setField("provider", item.slug)} className="flex items-center gap-2.5 px-3 py-2.5 text-left" style={{ border: `1px solid ${selected ? "var(--ckc-accent)" : "var(--ckc-rule)"}`, background: selected ? "var(--ckc-blush)" : "transparent" }}><ProviderMark slug={item.slug} size={24} /><span>{item.name}</span></button>; })}</div></fieldset>
            <label className="block"><span className="ckc-meta">Name on that registration</span><input style={CONTROL} value={fields.fullName || ""} onChange={(event) => setField("fullName", event.target.value)} /></label>
            <label className="block"><span className="ckc-meta">Phone number used</span><input style={CONTROL} inputMode="tel" value={fields.phone || ""} onChange={(event) => setField("phone", event.target.value)} /></label>
            <label className="block"><span className="ckc-meta">{provider?.refLabel || "Registration or booking ID"}</span><input style={CONTROL} value={fields.externalRef || ""} onChange={(event) => setField("externalRef", event.target.value)} placeholder={provider?.hint || ""} /></label>
            <div><p className="ckc-meta">Proof screenshot (optional)</p><p style={{ marginTop: 4, fontSize: 13 }}>JPG, PNG, WebP or HEIC, up to 8MB.</p><div className="mt-3 flex flex-wrap items-center gap-3"><label className="inline-flex min-h-11 items-center gap-2 px-3 py-2" style={{ border: "1px solid var(--ckc-rule)" }}><Upload size={16} />{state.screenshot ? "Change file" : "Choose file"}<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={pickScreenshot} className="sr-only" /></label>{state.screenshot ? <span>{state.screenshot.name} <button type="button" aria-label="Remove screenshot" onClick={clearScreenshot}><X size={14} /></button></span> : null}</div></div>
            {state.error ? <div role="alert" className="px-4 py-3" style={{ background: "var(--ckc-blush)", color: "var(--ckc-accent-text)" }}>{state.error}</div> : null}
            <div className="flex items-center gap-4"><button type="submit" className="ckc-btn" disabled={state.submitting}>{state.submitting ? "Sending…" : isRejected ? "Send again" : "Send for verification"}</button><span style={{ fontSize: 13 }}>{request?.attempt > 1 ? `Attempt ${request.attempt}` : "Usually reviewed within a day"}</span></div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock, RotateCcw, Upload, X } from "lucide-react";
import api from "../../services/api";
import { EXTERNAL_EVENT_PROVIDERS, getProvider } from "../../data/externalEventProviders";
import ProviderMark from "../../components/ProviderMark";

/**
 * "I already paid to enter this on another platform."
 *
 * Every other route into a challenge proves itself — a Razorpay signature says a payment happened.
 * This one cannot, so it is not a checkout: it is a claim that a person reviews. The panel therefore
 * has to do two jobs that a payment form does not. It must collect enough for a stranger to VERIFY
 * the claim (the name and number used on that platform, which are often not the ones on the Ckript
 * account, plus the reference and optionally a screenshot), and it must show the entrant where the
 * claim stands afterwards, because there is nothing instant to confirm.
 *
 * A rejection is a fork in the road, not a wall: the reason is shown and the form comes back
 * pre-filled, because someone who genuinely paid and mistyped a booking ID must not lose their entry
 * over a typo.
 */

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

const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;

const StatusBanner = ({ tone, icon: Icon, title, children }) => {
  const palette = {
    pending: { bg: "var(--ckc-blush)", border: "var(--ckc-accent)", ink: "var(--ckc-accent-text)" },
    approved: { bg: "var(--ckc-cream)", border: "var(--ckc-rule)", ink: "var(--ckc-ink)" },
    rejected: { bg: "var(--ckc-blush)", border: "var(--ckc-accent)", ink: "var(--ckc-accent-text)" },
  }[tone];

  return (
    <div
      className="flex gap-3 px-4 py-4"
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: 3 }}
    >
      <Icon size={18} style={{ color: palette.ink, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontWeight: 600, color: palette.ink, fontSize: 14 }}>{title}</p>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ckc-body)", marginTop: 4 }}>{children}</div>
      </div>
    </div>
  );
};

export default function ExternalRegistrationPanel({
  competitionId,
  form,
  acceptRules,
  acceptCopyright,
  validateRegistration,
  onApprovedAlready,
}) {
  const [open, setOpen] = useState(false);
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState({ provider: "", fullName: "", phone: "", externalRef: "" });
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotName, setScreenshotName] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (!competitionId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/competitions/${competitionId}/external-registration`);
        if (cancelled) return;
        setRequest(data?.request || null);
        if (data?.request) {
          // Rejected claims come back pre-filled: the usual cause is one wrong character, and making
          // someone retype everything to fix it is how you lose an entrant who actually paid.
          setFields({
            provider: data.request.provider || "",
            fullName: data.request.fullName || "",
            phone: data.request.phone || "",
            externalRef: data.request.externalRef || "",
          });
          if (data.request.status !== "approved") setOpen(true);
        }
      } catch {
        // No claim on file is the normal case and arrives as an error on some deployments; the panel
        // simply starts empty rather than showing a failure for something that is not one.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [competitionId]);

  const provider = useMemo(() => getProvider(fields.provider), [fields.provider]);
  const isPending = request?.status === "pending";
  const isApproved = request?.status === "approved";
  const isRejected = request?.status === "rejected";

  useEffect(() => {
    if (isApproved && onApprovedAlready) onApprovedAlready(request);
  }, [isApproved, request, onApprovedAlready]);

  // Roving tabindex: arrows move between platforms, Home/End jump to the ends, and only the
  // selected option (or the first, before anything is chosen) sits in the tab order.
  const onPlatformKeyDown = (event) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = EXTERNAL_EVENT_PROVIDERS.findIndex((p) => p.slug === fields.provider);
    const last = EXTERNAL_EVENT_PROVIDERS.length - 1;
    let next;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % (last + 1);
    else next = index <= 0 ? last : index - 1;
    const slug = EXTERNAL_EVENT_PROVIDERS[next].slug;
    setFields((f) => ({ ...f, provider: slug }));
    document.getElementById(`ext-platform-${slug}`)?.focus();
  };

  const pickScreenshot = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SCREENSHOT_BYTES) {
      setError("Screenshot must be 8MB or smaller.");
      event.target.value = "";
      return;
    }
    setError("");
    setScreenshot(file);
    setScreenshotName(file.name);
  };

  const clearScreenshot = () => {
    setScreenshot(null);
    setScreenshotName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    // The challenge form above still has to be valid — approval turns this claim straight into an
    // entry, so the answers an entry needs are collected once, here, not asked for again afterwards.
    if (!validateRegistration()) return;
    if (!acceptRules || !acceptCopyright) {
      setError("Accept the rules and copyright policy above first.");
      return;
    }
    if (!fields.provider) return setError("Choose the platform you registered on.");
    if (!fields.fullName.trim()) return setError("Enter the name you registered with.");
    if (!/^[+\d][\d\s()-]{6,}$/.test(fields.phone.trim())) return setError("Enter a valid phone number.");
    if (fields.externalRef.trim().length < 3) return setError("Enter your registration or booking ID.");

    setSubmitting(true);
    try {
      // Multipart because of the optional screenshot; the registration answers ride along so the
      // server can build the entry the moment an admin approves.
      const body = new FormData();
      body.append("provider", fields.provider);
      body.append("fullName", fields.fullName.trim());
      body.append("phone", fields.phone.trim());
      body.append("externalRef", fields.externalRef.trim());
      body.append("country", form.country || "");
      body.append("language", form.language || "");
      (form.genres || []).forEach((g) => body.append("genres", g));
      body.append("experienceLevel", form.experienceLevel || "");
      body.append("portfolioUrl", (form.portfolioUrl || "").trim());
      body.append("acceptRules", String(Boolean(acceptRules)));
      body.append("acceptCopyright", String(Boolean(acceptCopyright)));
      if (screenshot) body.append("screenshot", screenshot);

      // NO Content-Type header. Setting "multipart/form-data" by hand omits the boundary parameter,
      // and the boundary is what marks where each part starts — without it the server cannot parse
      // the body at all, so the claim never arrives and the screenshot takes the whole submission
      // down with it. Left alone, axios reads the FormData and sets
      // "multipart/form-data; boundary=----WebKitFormBoundary…" itself.
      const { data } = await api.post(`/competitions/${competitionId}/external-registration`, body);
      setRequest(data?.request || null);
      clearScreenshot();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send your request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (isApproved) {
    return (
      <div className="mt-6">
        <StatusBanner tone="approved" icon={CheckCircle2} title="Registration confirmed">
          We verified your registration on <strong>{request.providerName}</strong>. No payment is needed —
          your entry is active.
        </StatusBanner>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {!open && !isPending ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ckc-link"
          style={{ fontSize: 14, background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          Already registered through another platform?
        </button>
      ) : null}

      {isPending ? (
        <StatusBanner tone="pending" icon={Clock} title="With our team for review">
          We're checking your <strong>{request.providerName}</strong> registration
          {request.externalRef ? <> (<span className="ckc-mono">{request.externalRef}</span>)</> : null}.
          You'll get an email as soon as it's decided — no payment needed in the meantime.
        </StatusBanner>
      ) : null}

      {isRejected ? (
        <div className="mb-5">
          <StatusBanner tone="rejected" icon={RotateCcw} title="We couldn't confirm that — try again">
            {request.reviewNote ? <p style={{ marginBottom: 6 }}>{request.reviewNote}</p> : null}
            <p>Correct the details below and send it again. Your place isn't lost.</p>
          </StatusBanner>
        </div>
      ) : null}

      {open && !isPending ? (
        <div
          className="mt-4 p-5"
          style={{ border: "1px solid var(--ckc-rule)", borderRadius: 3, background: "var(--ckc-card)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="ckc-h3" style={{ fontSize: "1.05rem" }}>Registered somewhere else?</h3>
              <p style={{ fontSize: 14, color: "var(--ckc-muted)", marginTop: 4, maxWidth: "58ch" }}>
                If you already paid to enter on one of these platforms, send us the details and we'll
                confirm it by hand. No second payment.
              </p>
            </div>
            {!isRejected ? (
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ckc-muted)" }}
              >
                <X size={18} />
              </button>
            ) : null}
          </div>

          <div className="mt-5">
            <p className="ckc-meta">Where did you register? <span style={{ color: "var(--ckc-accent-text)" }}>*</span></p>
            <div
              className="mt-3 grid gap-2"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 150px), 1fr))" }}
              role="radiogroup"
              aria-label="Platform"
              aria-required="true"
              onKeyDown={onPlatformKeyDown}
            >
              {EXTERNAL_EVENT_PROVIDERS.map((p) => {
                const selected = fields.provider === p.slug;
                return (
                  <button
                    key={p.slug}
                    id={`ext-platform-${p.slug}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    /* One tab stop for the whole group, as a native radio group behaves. */
                    tabIndex={selected || (!fields.provider && p.slug === EXTERNAL_EVENT_PROVIDERS[0].slug) ? 0 : -1}
                    onClick={() => setFields((f) => ({ ...f, provider: p.slug }))}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-left"
                    style={{
                      border: `1px solid ${selected ? "var(--ckc-accent)" : "var(--ckc-rule)"}`,
                      borderRadius: 3,
                      background: selected ? "var(--ckc-blush)" : "transparent",
                      cursor: "pointer",
                      transition: "border-color 140ms ease, background 140ms ease",
                    }}
                  >
                    <ProviderMark slug={p.slug} size={26} />
                    <span style={{ fontSize: 14, fontWeight: selected ? 600 : 500, color: "var(--ckc-ink)" }}>
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-5">
            <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))" }}>
              <div>
                <label htmlFor="ext-name" className="ckc-meta block">
                  Name on that registration <span style={{ color: "var(--ckc-accent-text)" }}>*</span>
                </label>
                <input
                  id="ext-name"
                  value={fields.fullName}
                  onChange={(e) => setFields((f) => ({ ...f, fullName: e.target.value }))}
                  style={{ ...CONTROL, marginTop: 10 }}
                  placeholder="As it appears on the ticket"
                />
              </div>
              <div>
                <label htmlFor="ext-phone" className="ckc-meta block">
                  Phone used there <span style={{ color: "var(--ckc-accent-text)" }}>*</span>
                </label>
                <input
                  id="ext-phone"
                  value={fields.phone}
                  onChange={(e) => setFields((f) => ({ ...f, phone: e.target.value }))}
                  style={{ ...CONTROL, marginTop: 10 }}
                  placeholder="+91 98765 43210"
                  inputMode="tel"
                />
              </div>
            </div>

            <div>
              <label htmlFor="ext-ref" className="ckc-meta block">
                {provider ? provider.refLabel : "Registration or booking ID"}{" "}
                <span style={{ color: "var(--ckc-accent-text)" }}>*</span>
              </label>
              {provider?.hint ? (
                <p style={{ marginTop: 5, fontSize: 13, color: "var(--ckc-muted)" }}>{provider.hint}</p>
              ) : null}
              <input
                id="ext-ref"
                value={fields.externalRef}
                onChange={(e) => setFields((f) => ({ ...f, externalRef: e.target.value }))}
                style={{ ...CONTROL, marginTop: 10 }}
                placeholder="Paste it exactly as shown"
              />
            </div>

            <div>
              <p className="ckc-meta">Screenshot <span style={{ color: "var(--ckc-muted)" }}>(optional)</span></p>
              <p style={{ marginTop: 5, fontSize: 13, color: "var(--ckc-muted)" }}>
                A photo of the ticket or confirmation settles it fastest. JPG, PNG, WebP or HEIC, up to 8MB.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label
                  className="inline-flex items-center gap-2 px-3 py-2"
                  style={{ border: "1px solid var(--ckc-rule)", borderRadius: 3, cursor: "pointer", fontSize: 14 }}
                >
                  <Upload size={15} aria-hidden="true" />
                  {screenshotName ? "Change file" : "Choose file"}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    onChange={pickScreenshot}
                    className="sr-only"
                  />
                </label>
                {screenshotName ? (
                  <span className="inline-flex items-center gap-2" style={{ fontSize: 13, color: "var(--ckc-body)" }}>
                    <span style={{ maxWidth: "28ch", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {screenshotName}
                    </span>
                    <button
                      type="button"
                      onClick={clearScreenshot}
                      aria-label="Remove screenshot"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ckc-muted)", lineHeight: 0 }}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ) : null}
              </div>
            </div>

            {error ? (
              <div
                className="px-4 py-3"
                style={{
                  background: "var(--ckc-blush)",
                  border: "1px solid var(--ckc-accent)",
                  borderRadius: 3,
                  fontSize: 14,
                  color: "var(--ckc-accent-text)",
                }}
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <div className="flex items-center gap-4">
              <button type="submit" className="ckc-btn" disabled={submitting}>
                {submitting ? "Sending…" : isRejected ? "Send again" : "Send for verification"}
              </button>
              <span style={{ fontSize: 13, color: "var(--ckc-muted)" }}>
                {request?.attempt > 1 ? `Attempt ${request.attempt}` : "Usually reviewed within a day"}
              </span>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

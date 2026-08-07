import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Copy, Check, Laptop } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import api from "../../services/api";
import useCompetition from "../../components/competition/useCompetition";
import PhaseTimeline from "../../components/competition/PhaseTimeline";
import TagSelect from "../../components/TagSelect";
import { genres as GENRE_OPTIONS, CP_FILM_LANGUAGE_OPTIONS } from "../CreateProject/constants";
import { COUNTRIES, EXPERIENCE_LEVELS } from "./constants";
import useIsMobile from "../../mobile/hooks/useIsMobile";
import ExternalRegistrationPanel from "./ExternalRegistrationPanel";
import "./challenge.css";

// A form field is labelled in the slug-line voice, like every other label on these pages.
const Field = ({ label, htmlFor, required, hint, error, children }) => (
  <div>
    <label htmlFor={htmlFor} className="ckc-meta block">
      {label} {required ? <span style={{ color: "var(--ckc-accent-text)" }}>*</span> : <span>(optional)</span>}
    </label>
    {hint ? <p style={{ marginTop: 5, fontSize: 13, color: "var(--ckc-muted)" }}>{hint}</p> : null}
    <div className="mt-2.5">{children}</div>
    {error ? <p style={{ marginTop: 7, fontSize: 13, color: "var(--ckc-accent-text)" }}>{error}</p> : null}
  </div>
);

// Native controls, drawn from the tokens instead of Tailwind's grey ramp. Focus is deliberately NOT
// set here: `.ckc :focus-visible` already draws the accent ring, and the `outline-none` utility the
// generic version carried was suppressing it. An invalid field takes the accent on its border so
// aria-invalid is visible as well as announced.
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

const control = (invalid) => ({ ...CONTROL, borderColor: invalid ? "var(--ckc-accent)" : "var(--ckc-rule)" });

const CompetitionRegister = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const { isDarkMode } = useDarkMode();
  const isMobile = useIsMobile();
  // This page has no slug of its own — it is one route for every competition — so the competition
  // it belongs to travels in `?c=`, put there by whichever page sent us here. Without it we resolve
  // "the active one", which is how you end up registering for a competition you never opened.
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("c") || "";
  const { competition, entry, phase, timeline, serverNow, loading } = useCompetition({ poll: false, slug });

  // Every hop onward carries the competition with it, for the same reason.
  const dashboardPath = competition?.slug
    ? `/challenge/dashboard?c=${competition.slug}`
    : (slug ? `/challenge/dashboard?c=${slug}` : "/challenge/dashboard");

  const [form, setForm] = useState({ country: "", language: "", genres: [], experienceLevel: "", portfolioUrl: "" });
  const [acceptRules, setAcceptRules] = useState(false);
  const [acceptCopyright, setAcceptCopyright] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);

  /**
   * Fetch the entry-fee invoice as a blob and save it.
   *
   * Streamed through the authenticated client rather than linked directly: the endpoint is behind
   * `protect`, so a plain <a href> would open an unauthenticated request and 401. Failure is shown
   * inline and never blocks — the registration itself has already succeeded by this point, and the
   * invoice stays available from the dashboard.
   */
  const downloadInvoice = async (invoice) => {
    if (!invoice?._id || invoiceBusy) return;
    setInvoiceBusy(true);
    try {
      const { data } = await api.get(`/invoices/${invoice._id}/pdf`, {
        params: { download: 1 },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice.invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setServerError("Could not download the invoice just now. It stays available from your dashboard.");
    } finally {
      setInvoiceBusy(false);
    }
  };
  const [copied, setCopied] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  useEffect(() => {
    const existingScript = document.querySelector('script[data-razorpay-sdk="true"]');
    if (existingScript) {
      setRazorpayReady(true);
      return;
    }
    const sdkScript = document.createElement("script");
    sdkScript.src = "https://checkout.razorpay.com/v1/checkout.js";
    sdkScript.setAttribute("data-razorpay-sdk", "true");
    sdkScript.async = true;
    sdkScript.onload = () => setRazorpayReady(true);
    sdkScript.onerror = () => {
      setServerError("Payment SDK failed to load. Disable ad blocker for checkout.razorpay.com and try again.");
    };
    document.body.appendChild(sdkScript);
  }, []);

  // Registration only makes sense in one phase, and only once. `created` keeps the success panel up
  // right after registering, before the redirect guard would bounce us to the dashboard.
  useEffect(() => {
    if (loading || created) return;
    if (!competition) navigate("/challenge", { replace: true });
    else if (entry) navigate(dashboardPath, { replace: true });
    else if (phase !== "registration_open") navigate("/challenge", { replace: true });
  }, [loading, competition, entry, phase, created, navigate, dashboardPath]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    // Membership, not just presence — the field is a <select> now, so anything else came from a
    // hand-crafted request rather than the form.
    if (!COUNTRIES.includes(form.country)) next.country = "Select your country.";
    if (!form.language) next.language = "Choose your preferred language.";
    if (!form.genres.length) next.genres = "Choose at least one genre.";
    if (form.genres.length > 3) next.genres = "Choose no more than three genres.";
    if (!form.experienceLevel) next.experienceLevel = "Select your experience level.";
    if (form.portfolioUrl.trim() && !/^https?:\/\//i.test(form.portfolioUrl.trim())) {
      next.portfolioUrl = "Portfolio link must start with http:// or https://";
    }
    setErrors(next);
    const firstKey = Object.keys(next)[0];
    if (firstKey) document.getElementById(`reg-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !firstKey;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setServerError("");
    if (!validate()) return;
    if (!window.Razorpay || !razorpayReady) {
      setServerError("Payment system is not ready. Please wait or disable your ad blocker.");
      return;
    }
    setShowCurrencyModal(true);
  };

  const initiatePayment = async (currency) => {
    setShowCurrencyModal(false);
    setSubmitting(true);
    setServerError("");
    try {
      const payload = {
        ...form,
        portfolioUrl: form.portfolioUrl.trim(),
        acceptRules,
        acceptCopyright,
        currency,
      };

      // 1. Create Order
      const { data: orderData } = await api.post(`/competitions/${competition._id}/create-registration-order`, payload);

      // 2. Open Razorpay Checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "CKRIPT",
        description: `Registration for ${competition.name}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          try {
            setSubmitting(true);
            // 3. Verify Payment
            const { data: verifyData } = await api.post(`/competitions/${competition._id}/verify-registration-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ...payload,
            });
            setCreated(verifyData);
          } catch (verifyErr) {
            setServerError(verifyErr?.response?.data?.message || "Payment verification failed. Please contact support.");
          } finally {
            setSubmitting(false);
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#E25822",
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setServerError(err?.response?.data?.message || "Failed to initialize payment. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading || !competition) {
    return (
      <div className="ckc" style={{ minHeight: "100vh" }}>
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <p className="ckc-meta">Loading…</p>
        </div>
      </div>
    );
  }

  if (created) {
    const eventId = created.entry?.eventId || "";
    const invoice = created.invoice || null;

    if (isMobile) {
      return (
        <div className="ckc" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div className="ckc-card text-center w-full max-w-sm" style={{ background: "var(--ckc-cream)", border: "1px solid var(--ckc-rule)", padding: "32px 24px" }}>
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="h-10 w-10" style={{ color: "var(--ckc-accent)" }} />
              <div>
                <h3 className="ckc-title ckc-h2" style={{ color: "var(--ckc-ink)" }}>Registration Complete!</h3>
                <p style={{ marginTop: 8, fontSize: 15, lineHeight: 1.6, color: "var(--ckc-muted)" }}>
                  You're officially in. Please switch to a laptop or desktop computer to view full details, access the challenge workflow, and write your script.
                </p>
              </div>
              {invoice?._id ? (
                <button
                  type="button"
                  className="ckc-btn-ghost w-full"
                  onClick={() => downloadInvoice(invoice)}
                  disabled={invoiceBusy}
                >
                  {invoiceBusy ? "Preparing invoice…" : "Download invoice"}
                </button>
              ) : null}
              <button className="ckc-btn w-full mt-4" onClick={() => navigate("/")}>
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="ckc" style={{ minHeight: "100vh" }}>
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="ckc-card ckc-card-pad text-center" style={{ padding: "40px 32px" }}>
            {/* The one coral mark on this panel: you are now in a competition that is running. */}
            <CheckCircle2 className="mx-auto h-12 w-12" style={{ color: "var(--ckc-accent)" }} aria-hidden="true" />
            <h1 className="ckc-title ckc-h2" style={{ marginTop: 18 }}>You're registered! 🚀</h1>
            <p className="ckc-lede" style={{ margin: "10px auto 0" }}>
              You're in for <strong style={{ fontWeight: 500, color: "var(--ckc-ink)" }}>{competition.name}</strong>. Keep your Event ID — it identifies your entry.
            </p>

            {/* The Event ID is an identifier, so it is set as one — mono, tracked, in a quiet inset. */}
            <div
              className="mx-auto mt-7 inline-flex items-center gap-3 px-5 py-3"
              style={{ background: "var(--ckc-cream)", border: "1px solid var(--ckc-rule)", borderRadius: 3 }}
            >
              <span style={{ fontFamily: "var(--ckc-mono)", fontSize: "1.25rem", letterSpacing: "0.14em", color: "var(--ckc-ink)" }}>
                {eventId}
              </span>
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(eventId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ color: copied ? "var(--ckc-accent-text)" : "var(--ckc-muted)" }}
                aria-label="Copy Event ID"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* The receipt for the entry fee. Offered at the moment of payment because that is when
                someone expecting one looks for it; it stays retrievable from the dashboard after. */}
            {invoice?._id ? (
              <p style={{ marginTop: 18, fontSize: 14, color: "var(--ckc-muted)" }}>
                Invoice{" "}
                <span style={{ fontFamily: "var(--ckc-mono)", color: "var(--ckc-ink)" }}>
                  {invoice.invoiceNumber}
                </span>{" "}
                ·{" "}
                <button
                  type="button"
                  onClick={() => downloadInvoice(invoice)}
                  disabled={invoiceBusy}
                  style={{
                    color: "var(--ckc-accent-text)",
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                    cursor: invoiceBusy ? "default" : "pointer",
                  }}
                >
                  {invoiceBusy ? "Preparing…" : "Download PDF"}
                </button>
              </p>
            ) : null}

            <p style={{ marginTop: 24, fontSize: 14, lineHeight: 1.6, color: "var(--ckc-muted)" }}>
              The theme is revealed when the competition starts. You'll have 48 hours to write.
            </p>

            <div className="mx-auto mt-8 max-w-sm text-left">
              <PhaseTimeline steps={created.timeline || timeline} serverNow={serverNow} compact />
            </div>

            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="ckc-btn mt-8"
            >
              Go to my dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ckc" style={{ minHeight: "100vh" }}>
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* The page only exists while registration is open — the effect above redirects otherwise —
            so the live chip is the truth, not decoration. */}
        <header className="ckc-masthead">
          <span className="ckc-chip ckc-chip-live" style={{ alignSelf: "flex-start" }}>
            <span className="ckc-dot" aria-hidden="true" /> Registration open
          </span>
          <h1 className="ckc-title ckc-h1">Register for {competition.name}</h1>
          <p className="ckc-lede">
            A few details so we can group entries and tailor your experience. This takes a minute.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mt-9 space-y-6">
          <div className="ckc-card ckc-card-pad">
            <h2 className="ckc-title ckc-h3">Your account</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="ckc-meta">Name</dt>
                <dd style={{ marginTop: 5, color: "var(--ckc-ink)" }}>{user?.name || "—"}</dd>
              </div>
              <div>
                <dt className="ckc-meta">Email</dt>
                <dd className="break-all" style={{ marginTop: 5, color: "var(--ckc-ink)" }}>{user?.email || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="ckc-card ckc-card-pad space-y-6">
            <Field label="Country" htmlFor="reg-country" required error={errors.country}>
              {/* A <select>, not the <input list> this used to be. A datalist only SUGGESTS — anything
                  typed was accepted, so "USA", "United States" and "usa" all counted as different
                  countries in the "N countries represented" figure the Hall of Fame publishes.
                  `colorScheme` makes the native option popup follow the app's theme; without it the
                  browser paints it from the OS setting and it appears white inside a dark page. */}
              <select
                id="reg-country"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
                aria-invalid={Boolean(errors.country)}
                style={{ ...control(Boolean(errors.country)), colorScheme: isDarkMode ? "dark" : "light" }}
                className="w-full"
              >
                <option value="">Select your country…</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label="Preferred language" htmlFor="reg-language" required error={errors.language}>
              <TagSelect
              dark={isDarkMode}
                id="reg-language"
                options={CP_FILM_LANGUAGE_OPTIONS}
                value={form.language}
                onChange={(v) => set("language", v)}
                ariaLabel="Preferred language"
              />
            </Field>

            <Field label="Preferred genres" htmlFor="reg-genres" required hint="Pick up to three." error={errors.genres}>
              <TagSelect
              dark={isDarkMode}
                id="reg-genres"
                options={GENRE_OPTIONS}
                value={form.genres}
                onChange={(v) => set("genres", v)}
                multiple
                max={3}
                ariaLabel="Preferred genres"
              />
            </Field>

            <Field label="Experience level" htmlFor="reg-experienceLevel" required error={errors.experienceLevel}>
              <TagSelect
              dark={isDarkMode}
                id="reg-experienceLevel"
                options={EXPERIENCE_LEVELS}
                value={form.experienceLevel}
                onChange={(v) => set("experienceLevel", v)}
                ariaLabel="Experience level"
              />
            </Field>

            <Field label="Portfolio link" htmlFor="reg-portfolioUrl" error={errors.portfolioUrl}>
              <input
                id="reg-portfolioUrl"
                type="url"
                value={form.portfolioUrl}
                onChange={(e) => set("portfolioUrl", e.target.value)}
                aria-invalid={Boolean(errors.portfolioUrl)}
                placeholder="https://"
                style={control(Boolean(errors.portfolioUrl))}
                className="w-full"
              />
            </Field>
          </div>

          <div className="ckc-card ckc-card-pad space-y-4">
            <label className="flex cursor-pointer gap-3">
              <input
                type="checkbox"
                checked={acceptRules}
                onChange={(e) => setAcceptRules(e.target.checked)}
                style={{ accentColor: "var(--ckc-accent)" }}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ckc-body)" }}>
                I accept the <Link to={competition?.slug ? `/challenge/c/${competition.slug}#rules` : "/challenge"} className="ckc-link">competition rules</Link>.
              </span>
            </label>
            <label className="flex cursor-pointer gap-3">
              <input
                type="checkbox"
                checked={acceptCopyright}
                onChange={(e) => setAcceptCopyright(e.target.checked)}
                style={{ accentColor: "var(--ckc-accent)" }}
                className="mt-1 h-4 w-4 shrink-0"
              />
              <span style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ckc-body)" }}>
                I accept the copyright policy — the work I submit will be my own original writing.
              </span>
            </label>
          </div>

          {serverError ? (
            <div
              className="px-4 py-3"
              style={{
                background: "var(--ckc-blush)",
                border: "1px solid var(--ckc-accent)",
                borderRadius: 3,
                fontSize: 14,
                color: "var(--ckc-accent-text)",
              }}
            >
              {serverError}
            </div>
          ) : null}

          <div className="flex items-center gap-5">
            <button
              type="submit"
              disabled={!acceptRules || !acceptCopyright || submitting || !razorpayReady}
              className="ckc-btn"
            >
              {submitting ? "Processing…" : (!razorpayReady ? "Loading checkout…" : "Pay to Register")}
            </button>
            <Link to={competition?.slug ? `/challenge/c/${competition.slug}` : "/challenge"} className="ckc-link" style={{ fontSize: 14 }}>
              Back to the competition
            </Link>
          </div>

        </form>

        {/* The other way in: somebody who already paid to enter on Luma, BookMyShow or FilmFreeway
            sends the details instead of paying twice, and an admin confirms it by hand.
            OUTSIDE the form above, deliberately. The panel carries its own <form>, and HTML forbids
            nesting one inside another: the browser closes the outer form at the inner tag, so a
            submit from in here never reached React at all — neither handler ran, the browser did a
            native GET, and the page reloaded with every field blank and the ?c=<slug> param gone.
            The claim was never sent. Rendering it as a sibling is what makes the button work. */}
        <ExternalRegistrationPanel
          competitionId={competition?._id}
          form={form}
          acceptRules={acceptRules}
          acceptCopyright={acceptCopyright}
          validateRegistration={validate}
        />
      </div>

      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="ckc-card p-8 max-w-sm w-full shadow-2xl relative" style={{ background: "var(--ckc-card)" }}>
            <button 
              onClick={() => setShowCurrencyModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            >
              ✕
            </button>
            <h3 className="ckc-h3 text-center mb-2">Select Currency</h3>
            <p className="text-center text-sm mb-6" style={{ color: "var(--ckc-muted)" }}>
              Please choose your preferred payment currency.
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => initiatePayment("INR")}
                className="ckc-btn py-3 text-lg flex items-center justify-center gap-2"
                style={{ width: "100%" }}
              >
                Pay in INR (₹98)
              </button>
              <button 
                onClick={() => initiatePayment("USD")}
                className="ckc-btn py-3 text-lg flex items-center justify-center gap-2"
                style={{ width: "100%", background: "var(--ckc-button-secondary)", color: "var(--ckc-button-secondary-text)", border: "1px solid var(--ckc-rule)" }}
              >
                Pay in USD ($2)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CompetitionRegister;

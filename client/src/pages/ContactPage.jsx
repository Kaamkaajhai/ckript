import { useState, useEffect, useLayoutEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthModal } from "../context/AuthModalContext";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";
import Footer from "./landing/sections/Footer/Footer";
import { ROUTES, LOGO_SRC } from "./landing/_shared/theme";
import "./landing/landing.css";
import "./ContactPage.css";

/* ── Contact reasons ───────────────────────────────────────────── */
const contactReasons = [
  { value: "doubt",   label: "Question or Clarification" },
  { value: "team",    label: "Work With Us" },
  { value: "general", label: "General Feedback" },
  { value: "email",   label: "Direct Email Request" },
  { value: "other",   label: "Other" },
];

/* ═══════════════════════════════════════════════════════════════
   ContactPage — restyled to the Ckript landing editorial theme.
   Uses the same design tokens, typography, and visual language as
   the home page (Baskervville headings, PT Serif body, Helvetica
   Neue labels, ink/red palette, diamond ornaments).
   ═══════════════════════════════════════════════════════════════ */
export default function ContactPage() {
  const [form, setForm] = useState({ reason: "", otherReason: "", name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { user } = useContext(AuthContext);
  const { openAuthModal, openProducerOnboarding, openWriterOnboarding, openPricingModal } =
    useAuthModal();

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Add the landing scrollbar class while this page is mounted
  useLayoutEffect(() => {
    const el = document.documentElement;
    el.classList.add("ckl-scroll");
    return () => el.classList.remove("ckl-scroll");
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (error) setError("");
    setForm((prev) => {
      if (name === "reason") {
        return { ...prev, reason: value, otherReason: value === "other" ? prev.otherReason : "" };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.reason === "other" && !String(form.otherReason || "").trim()) {
      setError("Please tell us what 'Other' means.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/contact", form);
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const primaryPath = user?.role === "reader" ? "/reader" : "/dashboard";
  const signInLabel = user ? (user.role === "reader" ? "Reader" : "Dashboard") : "Sign in";

  return (
    <div className="ckl ckl-contact">
      {/* ── Nav (matching the Hero nav style) ─────────────────────── */}
      <nav className="ckl-contact-nav">
        <Link to={ROUTES.home} className="ckl-contact-brand">
          <img src={LOGO_SRC} alt="Ckript" />
        </Link>

        <span className="ckl-contact-nav-divider desktop-only" />

        <div className="ckl-contact-nav-links desktop-only">
          <button type="button" onClick={() => openWriterOnboarding()} className="ckl-contact-navlink hov-red">
            Scripts
          </button>
          <button type="button" onClick={() => openProducerOnboarding()} className="ckl-contact-navlink hov-red">
            For Producers
          </button>
          <button type="button" onClick={() => openPricingModal()} className="ckl-contact-navlink hov-red">
            Pricing
          </button>
        </div>

        <div className="ckl-contact-nav-right">
          {user ? (
            <Link to={primaryPath} className="ckl-contact-navlink hov-red desktop-only">
              {signInLabel}
            </Link>
          ) : (
            <button type="button" onClick={() => openAuthModal()} className="ckl-contact-navlink hov-red desktop-only">
              {signInLabel}
            </button>
          )}
          <button
            type="button"
            className="ckl-contact-hamburger mobile-only"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <span className="msi" style={{ fontSize: 32 }}>menu</span>
          </button>
        </div>
      </nav>

      {/* ── Mobile menu overlay ───────────────────────────────────── */}
      {isMobileMenuOpen && (
        <div className="ckl-contact-mmenu">
          <div className="ckl-contact-mmenu-head">
            <Link to={ROUTES.home} onClick={() => setIsMobileMenuOpen(false)} className="ckl-contact-brand">
              <img src={LOGO_SRC} alt="Ckript" />
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="ckl-contact-hamburger"
              aria-label="Close menu"
            >
              <span className="msi" style={{ fontSize: 32 }}>close</span>
            </button>
          </div>
          <div className="ckl-contact-mmenu-links">
            <button type="button" className="ckl-contact-mmenu-item" onClick={() => { setIsMobileMenuOpen(false); openWriterOnboarding(); }}>
              Scripts
            </button>
            <button type="button" className="ckl-contact-mmenu-item" onClick={() => { setIsMobileMenuOpen(false); openProducerOnboarding(); }}>
              For Producers
            </button>
            <button type="button" className="ckl-contact-mmenu-item" onClick={() => { setIsMobileMenuOpen(false); openPricingModal("writer"); }}>
              Writer Plans
            </button>
            <button type="button" className="ckl-contact-mmenu-item" onClick={() => { setIsMobileMenuOpen(false); openPricingModal("industry"); }}>
              Film Industry Plan
            </button>
            {user ? (
              <Link to={primaryPath} onClick={() => setIsMobileMenuOpen(false)} className="ckl-contact-mmenu-item ckl-contact-mmenu-login">
                {signInLabel}
              </Link>
            ) : (
              <button type="button" className="ckl-contact-mmenu-item ckl-contact-mmenu-login" onClick={() => { setIsMobileMenuOpen(false); openAuthModal(); }}>
                {signInLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Page hero ─────────────────────────────────────────────── */}
      <header className="ckl-contact-hero">
        <span className="ckl-contact-line" />
        <span className="ckl-contact-diamond" />
        <p className="ckl-contact-kicker">Contact</p>
        <h1 className="ckl-contact-title">
          Let's <span className="ckl-contact-title-em">talk.</span>
        </h1>
        <p className="ckl-contact-lead">
          Have a question, want to work with us, or just want to say hello?
          <br />We'd love to hear from you.
        </p>
      </header>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="ckl-contact-main">
        {/* Sidebar — info cards */}
        <aside className="ckl-contact-sidebar">
          <div className="ckl-contact-card">
            <p className="ckl-contact-card-head">Direct Contact</p>
            <a href="mailto:contact@ckript.com" className="ckl-contact-card-row hov-red">
              <span className="msi" style={{ fontSize: 18 }}>mail</span>
              <span>contact@ckript.com</span>
            </a>
            <a href="tel:+917986950853" className="ckl-contact-card-row hov-red">
              <span className="msi" style={{ fontSize: 18 }}>call</span>
              <span>+91 7986950853</span>
            </a>
            <div className="ckl-contact-card-row ckl-contact-card-row--muted">
              <span className="msi" style={{ fontSize: 18 }}>schedule</span>
              <span>Mon – Sat, 10 AM – 7 PM IST</span>
            </div>
          </div>

          <div className="ckl-contact-card">
            <p className="ckl-contact-card-head">Ckript Headquarters</p>
            <div className="ckl-contact-card-row ckl-contact-card-row--address">
              <span className="msi" style={{ fontSize: 18, marginTop: 2 }}>location_on</span>
              <div>
                SUIT-D, 400-A, 4th Floor,<br />
                12 Ajit Singh House, Yusuf Sarai Commercial Complex,<br />
                New Delhi 110016, India<br />
                <span className="ckl-contact-near">Near Green Park Metro Station Exit-2</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Form panel */}
        <section className="ckl-contact-form-panel">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="contact-success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="ckl-contact-success"
              >
                <span className="msi ckl-contact-success-icon">check_circle</span>
                <h2 className="ckl-contact-success-h2">Message received.</h2>
                <p className="ckl-contact-success-body">
                  Thank you for reaching out. Our team will review your request
                  and get back to you shortly.
                </p>
                <button
                  type="button"
                  className="ckl-contact-btn-secondary"
                  onClick={() => { setSubmitted(false); setForm({ reason: "", otherReason: "", name: "", email: "", message: "" }); }}
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="contact-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="ckl-contact-form"
              >
                <div className="ckl-contact-form-header">
                  <h2 className="ckl-contact-form-h2">Send a Message</h2>
                  <p className="ckl-contact-form-sub">Secure contact form directly to our team.</p>
                </div>

                <div className="ckl-contact-form-row">
                  <label className="ckl-contact-field">
                    <span className="ckl-contact-label">Full name</span>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="ckl-contact-input"
                      placeholder="Jane Doe"
                    />
                  </label>
                  <label className="ckl-contact-field">
                    <span className="ckl-contact-label">Email address</span>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="ckl-contact-input"
                      placeholder="jane@example.com"
                    />
                  </label>
                </div>

                <label className="ckl-contact-field">
                  <span className="ckl-contact-label">Reason</span>
                  <div className="ckl-contact-select-wrap">
                    <select
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      required
                      className="ckl-contact-input ckl-contact-select"
                    >
                      <option value="" disabled>Select a reason</option>
                      {contactReasons.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <span className="msi ckl-contact-select-arrow">expand_more</span>
                  </div>
                </label>

                {form.reason === "other" && (
                  <label className="ckl-contact-field">
                    <span className="ckl-contact-label">Please Specify</span>
                    <input
                      name="otherReason"
                      value={form.otherReason}
                      onChange={handleChange}
                      required
                      className="ckl-contact-input"
                      placeholder="E.g., Partnership Inquiry"
                    />
                  </label>
                )}

                <label className="ckl-contact-field">
                  <span className="ckl-contact-label">Message</span>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="ckl-contact-input ckl-contact-textarea"
                    placeholder="Tell us your question, issue, or request..."
                  />
                </label>

                {error && (
                  <div className="ckl-contact-error">
                    <span className="msi" style={{ fontSize: 16 }}>error</span>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="ckl-contact-btn-primary hov-btn-lift">
                  {loading ? (
                    <>
                      <span className="ckl-contact-spinner" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send Message
                      <span className="msi" style={{ fontSize: 20 }}>send</span>
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* ── Footer (shared landing footer) ────────────────────────── */}
      <Footer />
    </div>
  );
}

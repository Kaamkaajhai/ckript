import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import {
  Film,
  Users,
  TrendingUp,
  Mail,
  Send,
  Briefcase,
  HelpCircle,
  MessageSquare,
  CheckCircle,
  PenLine,
  ArrowRight,
  Clock3,
  XCircle,
} from "lucide-react";
import api from "../services/api";
import BrandLogo from "../components/BrandLogo";
import MarketingHeader from "../components/MarketingHeader";
import heroImage from "../assets/image_2.png";
import "./landing-luxury.css";

const FeaturesShowcase = lazy(() => import("../components/FeaturesShowcase"));

/* ─────────────────────────────────────────────
   Fonts — Playfair Display (display) + Inter (body)
   ───────────────────────────────────────────── */
const FontInjection = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700;800&display=swap');

    .font-display { font-family: 'Playfair Display', Georgia, serif; font-optical-sizing: auto; }
    .font-body    { font-family: 'Inter', system-ui, sans-serif; }

    .grain::before {
      content: '';
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0.06;
      mix-blend-mode: overlay;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    }

    @keyframes marquee {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .marquee-track { animation: marquee 9s linear infinite; }

    @keyframes soft-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.7; transform: scale(1.05); }
    }
    .soft-pulse { animation: soft-pulse 2.5s ease-in-out infinite; }
  `}</style>
);

const contactReasons = [
  { value: "doubt", label: "I have a question", icon: HelpCircle },
  { value: "team", label: "I want to join the team", icon: Briefcase },
  { value: "general", label: "General feedback", icon: MessageSquare },
  { value: "email", label: "Just say hello", icon: Mail },
];

const heroSceneNotes = [
  { text: "INT. UNKNOWN - NIGHT", className: "luxury-hero-note luxury-hero-note--slug", style: { top: "18%", left: "8%" } },
  { text: "A wind.", className: "luxury-hero-note", style: { top: "4%", left: "28%" } },
  { text: "A silhouette.", className: "luxury-hero-note", style: { top: "30%", left: "34%" } },
  { text: "Darkness.", className: "luxury-hero-note", style: { top: "12%", right: "16%" } },
  { text: "Silence.", className: "luxury-hero-note", style: { top: "34%", right: "8%" } },
  { text: "The world holds its breath.", className: "luxury-hero-note", style: { top: "52%", left: "42%" } },
  { text: "Then-light.", className: "luxury-hero-note", style: { top: "52%", right: "4%" } },
  { text: "Somewhere,", className: "luxury-hero-note", style: { bottom: "20%", left: "14%" } },
  { text: "a story is born.", className: "luxury-hero-note", style: { bottom: "2%", left: "30%" } },
];

/* ─────────────────────────────────────────────
   Contact Section
   ───────────────────────────────────────────── */
const ContactSection = () => {
  const [form, setForm] = useState({ reason: "", name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e) => {
    if (submitError) setSubmitError("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");
    try {
      await api.post("/contact", form);
      setLoading(false);
      setSubmitted(true);
    } catch (error) {
      setLoading(false);
      setSubmitError(error?.response?.data?.message || "Failed to send message. Please try again.");
    }
  };

  return (
    <section className="luxury-section luxury-contact-section relative py-24 sm:py-32 px-4 sm:px-6 bg-[#F8FAFC] overflow-hidden">
      <div className="relative max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-14 sm:mb-16 max-w-2xl"
        >
          <p className="luxury-section-kicker font-body text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-5">
            Contact
          </p>
          <h2 className="luxury-section-title font-display text-4xl sm:text-5xl lg:text-6xl text-[#111827] leading-[1.05] tracking-tight">
            We'd love to hear<br />
            <em className="font-medium">from you.</em>
          </h2>
          <p className="luxury-body-copy font-body text-[#6B7280] text-base sm:text-lg mt-5 leading-relaxed">
            Got a question? An idea? A complaint? A coffee recommendation? Drop us a line —
            we read everything.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          {/* Left — reason cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2 flex flex-col gap-2.5"
          >
            {contactReasons.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, reason: value }))}
                data-selected={form.reason === value}
                className={`luxury-contact-option flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all duration-200
                  ${form.reason === value
                    ? "border-white/20 bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                    : "border-[#E5E7EB] bg-white text-black hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
                  }`}
              >
                <div className={`luxury-contact-option-icon w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${form.reason === value ? "bg-[#C9705F] text-white" : "bg-[#F3F4F6] text-black"
                  }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-body text-sm font-medium">{label}</span>
                {form.reason === value && (
                  <CheckCircle className="w-4 h-4 text-[#C9705F] ml-auto shrink-0" />
                )}
              </button>
            ))}

            <div className="luxury-inline-surface mt-4 px-5 py-4 rounded-2xl bg-white border border-[#E5E7EB]">
              <p className="luxury-body-copy font-body text-xs text-[#6B7280] mb-1">Or email us directly</p>
              <a
                href="mailto:info.ckript@gmail.com"
                className="luxury-inline-link font-display text-lg text-[#111827] hover:underline transition-colors break-all"
              >
                info.ckript@gmail.com
              </a>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="luxury-form-surface bg-white rounded-3xl p-6 sm:p-10 shadow-[0_20px_60px_rgba(17,24,39,0.08)] border border-[#E5E7EB]">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center py-12 gap-4"
                  >
                    <div className="luxury-icon-shell luxury-icon-shell--gold w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-[#111827]" />
                    </div>
                    <h3 className="luxury-modal-title font-display text-3xl text-[#111827]">
                      Message <em>sent.</em>
                    </h3>
                    <p className="luxury-body-copy font-body text-[#6B7280] text-sm max-w-xs">
                      Thanks for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setSubmitError("");
                        setForm({ reason: "", name: "", email: "", message: "" });
                      }}
                      className="luxury-inline-link mt-3 font-body text-sm font-medium text-[#111827] underline underline-offset-4 decoration-[#9CA3AF] hover:decoration-[#111827]"
                    >
                      Send another
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-2">
                        <label className="luxury-field-label font-body text-xs font-semibold text-[#111827]">
                          Your name
                        </label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                          placeholder="Jane Doe"
                          className="luxury-field-input bg-[#F3F4F6] border-2 border-transparent rounded-xl px-4 py-3 font-body text-[#111827] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111827] focus:bg-white transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="luxury-field-label font-body text-xs font-semibold text-[#111827]">
                          Your email
                        </label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          required
                          placeholder="jane@example.com"
                          className="luxury-field-input bg-[#F3F4F6] border-2 border-transparent rounded-xl px-4 py-3 font-body text-[#111827] text-sm placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#111827] focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="luxury-field-label font-body text-xs font-semibold text-[#111827]">
                        What's this about?
                      </label>
                      <select
                        name="reason"
                        value={form.reason}
                        onChange={handleChange}
                        required
                        className="luxury-field-input contact-reason-select bg-[#F3F4F6] border-2 border-transparent rounded-xl px-4 py-3 font-body text-black text-sm focus:outline-none focus:border-[#111827] focus:bg-white transition-all appearance-none cursor-pointer"
                        style={{ color: "#F5F2EB" }}
                      >
                        <option value="" disabled style={{ color: "#000000", backgroundColor: "#ffffff" }}>Pick a topic…</option>
                        {contactReasons.map(({ value, label }) => (
                          <option key={value} value={value} style={{ color: "#000000", backgroundColor: "#ffffff" }}>{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="luxury-field-label font-body text-xs font-semibold text-[#111827]">
                        Your message
                      </label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        placeholder="Tell us what's on your mind…"
                        className="luxury-field-input bg-[#F3F4F6] border-2 border-transparent rounded-xl px-4 py-3 font-body text-[#111827] text-sm placeholder:text-[#9CA3AF] resize-none focus:outline-none focus:border-[#111827] focus:bg-white transition-all"
                      />
                    </div>

                    {submitError && (
                      <div className="luxury-feedback-danger rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-body text-sm text-red-700">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="luxury-cta luxury-cta--gold luxury-cta--wide group flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#C9705F] hover:bg-[#B5604F] font-body font-semibold text-white text-sm transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Sending…
                        </>
                      ) : (
                        <>
                          Send message
                          <Send className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────
   Landing Page
   ───────────────────────────────────────────── */
const Landing = () => {
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showInvestorReviewPopup, setShowInvestorReviewPopup] = useState(false);
  const [activeProcessStep, setActiveProcessStep] = useState(0);

  const reviewStatus = useMemo(() => {
    const value = (searchParams.get("investorReview") || "").toLowerCase();
    if (value === "pending" || value === "rejected") return value;
    return "";
  }, [searchParams]);

  const rejectedNote = useMemo(() => {
    return searchParams.get("note") || "";
  }, [searchParams]);

  useEffect(() => {
    if (reviewStatus) {
      setShowInvestorReviewPopup(true);
    }
  }, [reviewStatus]);

  useEffect(() => {
    document.documentElement.classList.add("luxury-homepage-html");
    document.body.classList.add("luxury-homepage-body");

    return () => {
      document.documentElement.classList.remove("luxury-homepage-html");
      document.body.classList.remove("luxury-homepage-body");
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveProcessStep((prev) => (prev + 1) % 4);
    }, 2800);
    return () => clearInterval(intervalId);
  }, []);

  const closeInvestorReviewPopup = () => {
    setShowInvestorReviewPopup(false);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("investorReview");
    nextParams.delete("note");
    setSearchParams(nextParams, { replace: true });
  };

  const processSteps = [
    {
      step: "01",
      title: "Upload your script",
      desc: "Share your concept, your logline, your fire. A few clicks and you're in.",
      icon: PenLine,
    },
    {
      step: "02",
      title: "AI cuts your trailer",
      desc: "A 30-second visual taste of your story — tone, mood, world — rendered while you wait.",
      icon: Film,
    },
    {
      step: "03",
      title: "Get matched, not lost",
      desc: "Industry professionals and investors find you based on what they're actually looking for.",
      icon: Users,
    },
    {
      step: "04",
      title: "Unlock & earn",
      desc: "Buyers unlock your full script. You get paid. No middlemen, no waiting around.",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="luxury-homepage font-body bg-[#0F172A] text-[#F9FAFB] overflow-x-hidden">
      <FontInjection />

      {/* ══════════════════════════════════════
          INVESTOR REVIEW POPUP
          ══════════════════════════════════════ */}
      <AnimatePresence>
        {showInvestorReviewPopup && reviewStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="luxury-modal-backdrop fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center px-5"
            onClick={closeInvestorReviewPopup}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="luxury-modal relative w-full max-w-md bg-[#1F2937] rounded-3xl p-8 shadow-2xl border border-[#374151]"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeInvestorReviewPopup}
                className="luxury-modal-close absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[#CBD5E1] transition-colors"
              >
                <XCircle className="w-4 h-4" />
              </button>

              <div className="luxury-modal-icon w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-white/10">
                {reviewStatus === "pending" ? (
                  <Clock3 className="w-6 h-6 text-[#F9FAFB]" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-300" />
                )}
              </div>

              <h3 className="luxury-modal-title font-display text-2xl sm:text-3xl text-[#F9FAFB] leading-tight mb-3">
                {reviewStatus === "pending" ? (
                  <>Your profile is <em>under review</em></>
                ) : (
                  <>Profile not <em className="text-red-300">approved</em></>
                )}
              </h3>

              <p className="luxury-modal-copy font-body text-sm text-[#CBD5E1] leading-relaxed mb-6">
                {reviewStatus === "pending"
                  ? "Our team is reviewing your investor profile. Expect a decision within 2–3 days — we'll email you the moment it's approved."
                  : rejectedNote
                    ? `Your investor profile was not approved. Reason: ${rejectedNote}`
                    : "Your investor profile was not approved. Reach out and we'll walk you through next steps."}
              </p>

              <div className="luxury-modal-actions flex flex-col sm:flex-row gap-3 pt-5 border-t border-[#374151]">
                <a
                  href="mailto:info.ckript@gmail.com"
                  className="luxury-inline-link font-body text-xs font-medium text-[#CBD5E1] hover:text-white transition-colors break-all"
                >
                  info.ckript@gmail.com
                </a>
                <Link
                  to="/login"
                  onClick={closeInvestorReviewPopup}
                  className="luxury-cta luxury-cta--gold sm:ml-auto bg-[#C9705F] text-white font-body text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-[#B5604F] transition-colors text-center"
                >
                  Open Login →
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          NAVIGATION
          ══════════════════════════════════════ */}
      <MarketingHeader />

      {/* ══════════════════════════════════════
          HERO — simple, left-aligned, big headline
          ══════════════════════════════════════ */}
      <section className="luxury-hero relative min-h-[90vh] flex items-center overflow-hidden grain pt-28 pb-20">
        {/* Background */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            className="luxury-hero-image w-full h-full object-cover opacity-40"
            loading="eager"
          />
          <div className="luxury-hero-spotlight absolute inset-0" />
          <div className="luxury-hero-dust absolute inset-0" />
          <div className="luxury-hero-beam absolute inset-y-0 right-[12%] w-[34%]" />
          <div className="luxury-hero-overlay--primary absolute inset-0 bg-gradient-to-r from-[#0F172A] via-[#0F172A]/80 to-[#0F172A]/30" />
          <div className="luxury-hero-overlay--secondary absolute inset-0 bg-gradient-to-t from-[#0F172A]/70 via-transparent to-transparent" />
          <div className="luxury-hero-overlay--vignette absolute inset-0" />
        </div>

        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16">
          <div className="luxury-hero-layout max-w-[1480px] mx-auto">
            <div className="luxury-hero-copy">

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.08 }}
                className="luxury-hero-title font-display text-[#F9FAFB] mb-8"
                style={{
                  fontSize: "clamp(3.2rem, 7vw, 7.6rem)",
                  lineHeight: "0.93",
                  letterSpacing: "-0.04em",
                  fontWeight: 600,
                }}
              >
                <span className="whitespace-nowrap">From Script,</span><br />
                to Screen.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.22 }}
                className="luxury-hero-subtitle font-body text-[#CBD5E1] leading-relaxed mb-10"
                style={{ fontSize: "clamp(1rem, 1.25vw, 1.18rem)" }}
              >
                Ckript transforms raw story worlds into cinematic momentum.
                Upload your script, shape a trailer, and bring producers and investors into the same atmosphere as your idea.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.36 }}
                className="luxury-hero-actions flex flex-col sm:flex-row gap-4"
              >
                <Link
                  to="/writer-onboarding"
                  className="luxury-cta luxury-hero-primary-cta group flex items-center justify-center gap-2 bg-white text-black font-body text-sm font-semibold px-8 py-4 rounded-full hover:bg-gray-100 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(255,255,255,0.2)]"
                >
                  Start with your script
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/producer-director-onboarding"
                  className="luxury-hero-secondary-link group inline-flex items-center gap-2 font-body text-xs sm:text-sm font-semibold whitespace-nowrap"
                >
                  Start as Industry Professional
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
                </Link>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, delay: 0.18 }}
              className="luxury-hero-visual"
            >
              <div className="luxury-hero-constellation">
                <div className="luxury-hero-constellation-line luxury-hero-constellation-line--a" />
                <div className="luxury-hero-constellation-line luxury-hero-constellation-line--b" />
                <div className="luxury-hero-constellation-line luxury-hero-constellation-line--c" />
                <div className="luxury-hero-constellation-line luxury-hero-constellation-line--d" />
                <div className="luxury-hero-constellation-line luxury-hero-constellation-line--e" />
                <span className="luxury-hero-star" style={{ top: "6%", left: "30%", "--star-delay": "0s" }} />
                <span className="luxury-hero-star" style={{ top: "22%", left: "24%", "--star-delay": "0.8s" }} />
                <span className="luxury-hero-star" style={{ top: "46%", left: "18%", "--star-delay": "1.6s" }} />
                <span className="luxury-hero-star" style={{ top: "48%", left: "48%", "--star-delay": "2.3s" }} />
                <span className="luxury-hero-star" style={{ top: "33%", left: "76%", "--star-delay": "1.1s" }} />
                <span className="luxury-hero-star" style={{ top: "58%", left: "84%", "--star-delay": "2.8s" }} />
                <span className="luxury-hero-star" style={{ top: "78%", left: "22%", "--star-delay": "1.9s" }} />
                <span className="luxury-hero-star" style={{ top: "92%", left: "40%", "--star-delay": "3.2s" }} />

                {heroSceneNotes.map((note, index) => (
                  <span
                    key={note.text}
                    className={note.className}
                    style={{ ...note.style, "--note-delay": `${index * 0.45}s` }}
                  >
                    {note.text}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>


        </div>
      </section>
      {/* ══════════════════════════════════════
          MARQUEE — dark transition strip
          ══════════════════════════════════════ */}
      <div className="luxury-marquee relative bg-[#0F172A] text-[#CBD5E1] py-5 overflow-hidden border-t border-b border-white/10">
        <div className="flex whitespace-nowrap marquee-track">
          {Array.from({ length: 2 }).map((_, groupIdx) => (
            <div key={groupIdx} className="flex items-center gap-10 pr-10">
              {[
                "Now casting untold stories",
                "✦",
                "From the page to the screen",
                "✦",
                "Writers, industry professionals, investors",
                "✦",
                "Every great film began as a script",
                "✦",
                "Your story deserves an audience",
                "✦",
              ].map((item, i) => (
                <span
                  key={`${groupIdx}-${i}`}
                  className="luxury-marquee-item font-display text-xl italic font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          THE PROBLEM — light section
          ══════════════════════════════════════ */}
      <section className="luxury-section luxury-problem-section relative pt-24 pb-10 sm:pt-32 sm:pb-14 px-4 sm:px-8 bg-[#F8FAFC] overflow-hidden">
        <div className="relative max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 sm:mb-20 max-w-3xl"
          >
            <p className="luxury-section-kicker font-body text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-5">
              The problem
            </p>
            <h2 className="luxury-section-title font-display text-4xl sm:text-5xl lg:text-6xl text-[#111827] leading-[1.05] tracking-tight font-medium">
              The film industry is <em>broken</em><br />
              on both sides of the page.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Writers */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="luxury-surface-card luxury-problem-card bg-white rounded-3xl p-8 sm:p-10 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)] transition-all"
            >
              <div className="luxury-icon-shell luxury-icon-shell--gold w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-6">
                <PenLine className="w-5 h-5 text-[#111827]" />
              </div>

              <p className="luxury-section-kicker font-body text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">
                If you're a writer
              </p>
              <h3 className="luxury-section-title font-display text-3xl sm:text-4xl text-[#111827] mb-6 leading-tight font-medium">
                Brilliant pages,<br />
                <em className="text-[#6B7280]">no audience.</em>
              </h3>

              <ul className="space-y-3 mb-8">
                {[
                  "Your script sits in a drawer or an inbox nobody opens",
                  "Gatekeepers say \"pass\" without reading past page three",
                  "No real way to reach industry professionals who'd actually fund you",
                  "Your best story ages while you wait for permission",
                ].map((line, i) => (
                  <li key={i} className="luxury-body-copy flex gap-3 font-body text-sm sm:text-base text-[#6B7280] leading-relaxed">
                    <span className="text-[#9CA3AF] shrink-0 mt-0.5">→</span>
                    {line}
                  </li>
                ))}
              </ul>

              <Link
                to="/writer-onboarding"
                className="luxury-text-link group inline-flex items-center gap-2 font-body text-sm font-semibold text-[#111827] border-b border-[#111827] pb-1 hover:gap-3 transition-all"
              >
                Start as a writer
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Industry */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="luxury-surface-card luxury-problem-card bg-white rounded-3xl p-8 sm:p-10 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.10)] transition-all"
            >
              <div className="luxury-icon-shell w-12 h-12 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-6">
                <TrendingUp className="w-5 h-5 text-[#111827]" />
              </div>

              <p className="luxury-section-kicker font-body text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-3">
                If you're in the industry
              </p>
              <h3 className="luxury-section-title font-display text-3xl sm:text-4xl text-[#111827] mb-6 leading-tight font-medium">
                Too much noise,<br />
                <em className="text-[#6B7280]">too little signal.</em>
              </h3>

              <ul className="space-y-3 mb-8">
                {[
                  "Thousands of unfiltered submissions, no way to find the gems",
                  "No preview of tone or vision before reading 110 pages",
                  "Discovery is slow, expensive, and built on who-you-know",
                  "The next big film is out there and you're missing it",
                ].map((line, i) => (
                  <li key={i} className="luxury-body-copy flex gap-3 font-body text-sm sm:text-base text-[#6B7280] leading-relaxed">
                    <span className="text-[#9CA3AF] shrink-0 mt-0.5">→</span>
                    {line}
                  </li>
                ))}
              </ul>

              <Link
                to="/producer-director-onboarding"
                className="luxury-text-link group inline-flex items-center gap-2 font-body text-sm font-semibold text-[#111827] border-b border-[#111827] pb-1 hover:gap-3 transition-all"
              >
                Start as an Industry Professional
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="luxury-cinematic-panel relative mt-16 sm:mt-20 max-w-6xl mx-auto overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_28px_80px_rgba(0,0,0,0.30)]"
          >
            <img
              src="/enter-ckript-cover.png"
              alt="Illustrated Ckript workspace connecting writers, producers, and investors"
              className="luxury-cinematic-panel__image absolute inset-0 w-full h-full object-cover object-center"
              loading="eager"
            />
            <div className="luxury-cinematic-panel__glow absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,224,174,0.28),transparent_34%)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#120E09]/72 via-[#1B1611]/36 to-[#0F172A]/14" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#120E09]/68 via-transparent to-[#0F172A]/16" />

            <div className="relative z-10 min-h-[420px] sm:min-h-[500px] flex items-end">
              <div className="max-w-3xl px-6 py-10 text-left sm:px-10 sm:py-12 lg:px-14">
                <p className="luxury-badge luxury-badge--premium inline-flex items-center rounded-full border border-[#F6E4B8]/35 bg-[#120E09]/38 px-3 py-1.5 font-body text-xs font-semibold uppercase tracking-[0.22em] text-[#F8E7C2] backdrop-blur-sm">
                  Enter Ckript
                </p>
                <p className="luxury-cinematic-quote mt-5 max-w-2xl font-display text-2xl sm:text-3xl lg:text-[2.85rem] text-white italic leading-[1.18] font-medium [text-shadow:0_4px_22px_rgba(0,0,0,0.45)]">
                  "We cut the gatekeepers and the fog. Writers get seen. Industry professionals get clarity. Everyone gets back to making films."
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES SHOWCASE
          ══════════════════════════════════════ */}
      <Suspense
        fallback={
          <section className="luxury-section py-20 px-6 bg-[#F8FAFC]" aria-label="Loading features">
            <div className="max-w-7xl mx-auto">
              <div className="luxury-body-copy font-body text-sm text-[#6B7280]">Loading features…</div>
            </div>
          </section>
        }
      >
        <FeaturesShowcase />
      </Suspense>

      {/* ══════════════════════════════════════
          HOW IT WORKS — dark with cinematic background
          ══════════════════════════════════════ */}
      <section className="luxury-section luxury-process-section relative py-24 sm:py-32 px-4 sm:px-8 overflow-hidden bg-[#0D0B08]">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(229,160,75,0.06),transparent_50%),radial-gradient(ellipse_at_80%_100%,rgba(147,197,253,0.04),transparent_50%)]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 sm:mb-20 max-w-3xl mx-auto text-center"
          >
            <p className="luxury-section-kicker font-body text-xs font-semibold uppercase tracking-[0.28em] text-white/60 mb-5">
              How it works
            </p>
            <h2 className="luxury-section-title font-display text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.02] tracking-tight font-medium">
              Four steps. <em className="text-white/70">One story.</em>
            </h2>
            <p className="luxury-body-copy luxury-body-copy--light font-body text-base sm:text-lg text-[#CBD5E1] mt-5 max-w-2xl mx-auto leading-relaxed">
              From the first line on the page to the moment you get paid, here's how Ckript
              takes your script from idea to industry.
            </p>
          </motion.div>

          <div className="relative max-w-5xl mx-auto">
            <div className="luxury-process-line absolute left-5 top-0 bottom-0 w-px bg-white/10 md:left-1/2 md:-translate-x-1/2" />
            {processSteps.map((item, index) => {
              const isActive = index === activeProcessStep;
              const Icon = item.icon;
              const isLeft = index % 2 === 0;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative grid md:grid-cols-2 gap-6 md:gap-12 items-center ${index !== processSteps.length - 1 ? "mb-10 md:mb-7" : ""
                    }`}
                >
                  <div className={`hidden md:flex ${isLeft ? "justify-end pr-14" : "justify-start pl-14 md:order-3"}`}>
                    <div
                      data-active={isActive}
                      className={`luxury-process-orb relative flex h-16 w-16 items-center justify-center rounded-2xl border transition-all duration-500 ${isActive
                          ? "border-white/30 bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                          : "border-white/5 bg-transparent"
                        }`}
                    >
                      <Icon className={`relative z-10 w-7 h-7 transition-colors duration-500 ${isActive ? "text-white" : "text-white/40"}`} />
                    </div>
                  </div>

                  <div className="absolute left-5 top-1/2 -translate-x-1/2 -translate-y-1/2 md:left-1/2 md:z-20">
                    <button
                      type="button"
                      onClick={() => setActiveProcessStep(index)}
                      data-active={isActive}
                      className={`luxury-step-dot flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-semibold transition-all duration-500 ${isActive
                          ? "border-white bg-white text-black"
                          : "border-white/20 bg-[#0D0B08] text-white/50"
                        }`}
                      aria-label={`Highlight step ${item.step}`}
                    >
                      {item.step}
                    </button>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => setActiveProcessStep(index)}
                    data-active={isActive}
                    className={`luxury-process-card group relative ml-12 text-left p-5 sm:p-6 rounded-2xl border transition-all duration-500 md:ml-0 ${isLeft ? "md:order-2" : "md:order-1"
                      } ${isActive
                        ? "bg-white/[0.04] border-white/20"
                        : "bg-transparent border-white/5 hover:border-white/15 hover:bg-white/[0.02]"
                      }`}
                  >
                    <div className="relative z-10 flex items-start gap-4 sm:gap-5">
                      <div
                        className={`luxury-process-card-icon md:hidden shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-500 ${isActive
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-white/5 bg-transparent text-white/40"
                          }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <span
                            data-active={isActive}
                            className={`luxury-process-label font-body text-[11px] font-semibold uppercase tracking-[0.24em] transition-colors duration-500 ${isActive ? "text-white" : "text-white/40"
                              }`}
                          >
                            Step {item.step}
                          </span>
                          <div
                            data-active={isActive}
                            className={`luxury-process-mini-icon hidden sm:flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-500 ${isActive
                                ? "border-white/20 bg-white/10 text-white"
                                : "border-white/5 bg-transparent text-white/40"
                              }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                        </div>
                        <h3 className="luxury-section-title mt-3 font-display text-2xl sm:text-[2rem] text-[#F9FAFB] leading-tight font-medium">
                          {item.title}
                        </h3>
                        <p className="luxury-body-copy luxury-body-copy--light mt-3 font-body text-sm sm:text-[15px] text-[#CBD5E1] leading-relaxed max-w-md">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 sm:mt-20 text-center"
          >
            <Link
              to="/join"
              className="luxury-cta luxury-cta--gold luxury-cta--sheen group inline-flex items-center gap-2 bg-[#C9705F] text-white font-body text-sm font-semibold px-8 py-4 rounded-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(201,112,95,0.30)]"
            >
              Start your story
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CONTACT
          ══════════════════════════════════════ */}
      <ContactSection />

      {/* ══════════════════════════════════════
          FOOTER
          ══════════════════════════════════════ */}
      <footer className="luxury-footer relative bg-[#0F172A] border-t border-white/10 py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <BrandLogo className="luxury-brand-logo h-7 w-auto" />
              <span className="luxury-footer-copy font-body text-xs text-[#94A3B8]">
                &copy; 2026 Ckript. All rights reserved.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-7 font-body text-sm text-[#94A3B8]">
              <Link to="/about" className="luxury-footer-link hover:text-white transition-colors">
                About
              </Link>
              <Link to="/privacy-policy" className="luxury-footer-link hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="/terms-of-service" className="luxury-footer-link hover:text-white transition-colors">
                Terms
              </Link>
              <Link to="/contact" className="luxury-footer-link hover:text-white transition-colors">
                Contact
              </Link>
              <a
                href="https://www.linkedin.com/company/ckript/?viewAsMember=true"
                target="_blank"
                rel="noopener noreferrer"
                className="luxury-footer-link hover:text-white transition-colors"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

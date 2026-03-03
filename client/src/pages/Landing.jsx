import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, Zap, Users, TrendingUp, ChevronRight, Mail, Send, Briefcase, HelpCircle, MessageSquare, CheckCircle, PenLine, ArrowRight } from "lucide-react";
import FeaturesShowcase from "../components/FeaturesShowcase";
import SuccessStories from "../components/SuccessStories";
import api from "../services/api";
import BrandLogo from "../components/BrandLogo";

const contactReasons = [
  { value: "doubt", label: "I have a question / doubt", icon: HelpCircle },
  { value: "team", label: "I want to join the team", icon: Briefcase },
  { value: "general", label: "General enquiry / feedback", icon: MessageSquare },
  { value: "email", label: "Just send an email", icon: Mail },
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
    <section className="py-28 px-6 bg-[#080e18]">
      <div className="max-w-5xl mx-auto">
        {/* Header — left-aligned */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <p className="text-gray-400 text-sm font-semibold tracking-wide uppercase mb-3">Get in touch</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            We'd love to hear from you
          </h2>
          <p className="text-[#8896a7] text-base max-w-lg">
            Have a question, want to collaborate, or curious about joining the team? Drop us a message.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          {/* Left — reason cards */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2 flex flex-col gap-3"
          >
            {contactReasons.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, reason: value }))}
                className={`flex items-center gap-4 px-5 py-4 rounded-lg border text-left transition-colors duration-150
                  ${form.reason === value
                    ? "bg-gray-400/8 border-gray-400/25 text-white"
                    : "bg-[#0d1520] border-[#1c2a3a] text-[#8896a7] hover:border-[#2a3a4e]"
                  }`}
              >
                <Icon className={`w-[18px] h-[18px] shrink-0 ${form.reason === value ? "text-gray-400" : "text-[#4a5a6e]"}`} />
                <span className="text-sm font-medium">{label}</span>
                {form.reason === value && (
                  <CheckCircle className="w-4 h-4 text-gray-400 ml-auto shrink-0" />
                )}
              </button>
            ))}

            <div className="mt-3 px-5 py-4 rounded-lg bg-[#0d1520] border border-[#1c2a3a]">
              <p className="text-[11px] text-[#4a5a6e] uppercase tracking-widest mb-1">Or email us directly</p>
              <a href="mailto:info.ckript@gmail.com" className="text-gray-400 text-sm font-medium hover:underline">
                info.ckript@gmail.com
              </a>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-3"
          >
            <div className="bg-[#0d1520] border border-[#1c2a3a] rounded-xl p-7">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center py-14 gap-3"
                  >
                    <div className="w-14 h-14 rounded-full bg-gray-400/10 flex items-center justify-center mb-1">
                      <CheckCircle className="w-7 h-7 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Message Sent!</h3>
                    <p className="text-[#8896a7] text-sm max-w-xs">
                      Thanks for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setSubmitError("");
                        setForm({ reason: "", name: "", email: "", message: "" });
                      }}
                      className="mt-3 px-5 py-2 rounded-lg border border-[#1c2a3a] text-[#8896a7] text-sm hover:text-white hover:border-[#2a3a4e] transition-colors"
                    >
                      Send another message
                    </button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#6b7a8d]">Full Name</label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                          placeholder="Jane Doe"
                          className="bg-[#080e18] border border-[#1c2a3a] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#3a4a5e] focus:outline-none focus:border-gray-400/40 transition-colors"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-[#6b7a8d]">Email Address</label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          required
                          placeholder="jane@example.com"
                          className="bg-[#080e18] border border-[#1c2a3a] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#3a4a5e] focus:outline-none focus:border-gray-400/40 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[#6b7a8d]">Reason for Contact</label>
                      <select
                        name="reason"
                        value={form.reason}
                        onChange={handleChange}
                        required
                        className="bg-[#080e18] border border-[#1c2a3a] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-gray-400/40 transition-colors appearance-none"
                      >
                        <option value="" disabled className="text-[#3a4a5e]">Select a reason…</option>
                        {contactReasons.map(({ value, label }) => (
                          <option key={value} value={value} className="bg-[#0d1520]">{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-[#6b7a8d]">Your Message</label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        required
                        rows={4}
                        placeholder="Tell us what's on your mind…"
                        className="bg-[#080e18] border border-[#1c2a3a] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#3a4a5e] resize-none focus:outline-none focus:border-gray-400/40 transition-colors"
                      />
                    </div>

                    {submitError && (
                      <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-2.5 text-sm text-red-300">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-white hover:bg-gray-200 font-semibold text-[#080e18] text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
                          <Send className="w-4 h-4" /> Send Message
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
  return (
    <div className="bg-[#080e18] text-white">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#080e18]/90 backdrop-blur-sm border-b border-[#151f2e]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandLogo className="h-10 w-auto" />
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-5 py-2 text-sm font-medium text-[#8896a7] hover:text-white transition-colors">
              Sign In
            </Link>
            <Link to="/join" className="px-5 py-2 bg-white hover:bg-gray-200 text-[#080e18] rounded-lg text-sm font-semibold transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-3xl pt-16 md:pt-24">
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="text-gray-400 text-sm font-semibold tracking-wide uppercase mb-5"
            >
              The Future of Script Discovery
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 tracking-tight"
            >
              Your Ideas Deserve
              <br />
              <span className="text-gray-400">More Than Rejection</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-[#8896a7] leading-relaxed mb-10 max-w-xl"
            >
              Ckript connects brilliant creators with producers, directors, and investors who are actively searching for your next big idea. Publish, visualize, and monetize your scripts like never before.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex gap-4 flex-wrap"
            >
              <Link
                to="/writer-onboarding"
                className="px-7 py-3.5 bg-white hover:bg-gray-200 text-[#080e18] rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                Sign Up as Creator
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#platform-innovations"
                className="px-7 py-3.5 bg-transparent border border-[#1c2a3a] hover:border-[#2a3a4e] text-[#8896a7] hover:text-white rounded-lg font-semibold text-sm transition-colors"
              >
                Learn More
              </a>
            </motion.div>
          </div>

          {/* Lightweight stat strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-20 pt-8 border-t border-[#151f2e] grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { number: "1,000+", label: "Scripts Uploaded" },
              { number: "$500K+", label: "Creator Earnings" },
              { number: "500+", label: "Deals Matched" },
              { number: "95%", label: "Satisfaction Rate" },
            ].map((stat, i) => (
              <div key={i}>
                <p className="text-2xl font-bold text-white mb-0.5">{stat.number}</p>
                <p className="text-sm text-[#4a5a6e]">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Problem & Solution ── */}
      <section className="py-28 px-6 bg-[#0a1221]">
        <div className="max-w-6xl mx-auto">
          {/* heading — left aligned */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mb-16"
          >
            <p className="text-gray-400 text-sm font-semibold tracking-wide uppercase mb-3">Industry Friction</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
              The Problem We Solve
            </h2>
            <p className="text-[#8896a7] text-base leading-relaxed">
              A fractured industry kept apart by walls that shouldn't exist.
            </p>
          </motion.div>

          {/* Two problem cards */}
          <div className="grid md:grid-cols-2 gap-5 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-[#1c2a3a] bg-[#0d1520] p-7"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#151f2e] flex items-center justify-center shrink-0">
                  <PenLine className="w-[18px] h-[18px] text-[#8896a7]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4a5a6e] mb-0.5">Side A</p>
                  <h3 className="text-lg font-bold text-white">For Creators</h3>
                </div>
              </div>

              <ul className="space-y-3.5">
                {[
                  "Brilliant ideas stuck without capital or connections",
                  "No path to reach producers, directors, and investors",
                  "Endless rejection from traditional gatekeepers",
                  "Stories remain dormant and undiscovered forever",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#8896a7] leading-snug">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2a3a4e] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-xl border border-[#1c2a3a] bg-[#0d1520] p-7"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#151f2e] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-[18px] h-[18px] text-[#8896a7]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4a5a6e] mb-0.5">Side B</p>
                  <h3 className="text-lg font-bold text-white">For Industry Professionals</h3>
                </div>
              </div>

              <ul className="space-y-3.5">
                {[
                  "Drowning in unfiltered submissions with no smart search",
                  "Impossible to find fresh, genre-specific content fast",
                  "No way to preview talent before committing resources",
                  "Expensive, slow, and painfully manual discovery process",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#8896a7] leading-snug">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#2a3a4e] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Solution card — full width, different visual weight */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-xl border border-gray-400/15 bg-[#0d1520] p-8 sm:p-10"
          >
            <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="w-12 h-12 rounded-lg bg-gray-400/10 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">The Ckript Solution</h3>
                <p className="text-[#8896a7] text-base leading-relaxed mb-6 max-w-2xl">
                  A platform that instantly connects creators with decision-makers.
                  Scripts are visualized through{" "}
                  <span className="text-white font-medium">AI-generated trailers</span>, matched{" "}
                  <span className="text-white font-medium">algorithmically</span>, and packaged with
                  ready-to-cast talent.{" "}
                  <span className="text-white font-medium">Everyone wins.</span>
                </p>

                <div className="flex flex-wrap gap-2">
                  {[
                    { icon: <Zap className="w-3.5 h-3.5" />, label: "AI-Powered Matching" },
                    { icon: <Film className="w-3.5 h-3.5" />, label: "Visual Script Previews" },
                    { icon: <Users className="w-3.5 h-3.5" />, label: "Zero Gatekeepers" },
                    { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Real-time Analytics" },
                  ].map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#151f2e] text-xs font-medium text-[#8896a7]">
                      <span className="text-gray-400">{f.icon}</span>
                      {f.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features Showcase ── */}
      <FeaturesShowcase />

      {/* ── Success Stories ── */}
      <SuccessStories />

      {/* ── How it Works ── */}
      <section className="py-28 px-6 bg-[#0a1221]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mb-16"
          >
            <p className="text-gray-400 text-sm font-semibold tracking-wide uppercase mb-3">Process</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              How It Works in 4 Simple Steps
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-px bg-[#1c2a3a] rounded-xl overflow-hidden">
            {[
              { step: "01", title: "Upload Your Script", desc: "Present your concept with a compelling summary and let AI generate a visual preview." },
              { step: "02", title: "AI Creates Trailer", desc: "Our AI generates a 30-second visual trailer that helps viewers quickly understand your concept." },
              { step: "03", title: "Get Smart Matched", desc: "The platform's algorithm connects creators with producers and investors interested in their genre." },
              { step: "04", title: "Unlock & Earn", desc: "Producers pay to access the full script, and creators receive their earnings instantly." }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="bg-[#0d1520] p-7"
              >
                <span className="text-gray-400 text-2xl font-bold mb-4 block">{item.step}</span>
                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-[#8896a7] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For All User Types ── */}
      <section className="py-28 px-6 bg-[#080e18]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <p className="text-gray-400 text-sm font-semibold tracking-wide uppercase mb-3">Built for you</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              For Everyone on the Creative Spectrum
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: PenLine,
                role: "Writers & Creators",
                desc: "Publish, protect, and profit from your scripts.",
                benefits: ["Publish with AI-generated trailers", "Earn 100% on unlock fees", "Get Pro Analysis reports", "Smart matching with producers"]
              },
              {
                icon: Film,
                role: "Producers & Directors",
                desc: "Find production-ready scripts and talent fast.",
                benefits: ["Browse visual trailers", "Auto-matched content", "Pre-auditioned talent attached", "30-day script options"]
              },
              {
                icon: TrendingUp,
                role: "Investors",
                desc: "Access curated, pre-packaged investment opportunities.",
                benefits: ["Curated Domain Packages", "Invest in pre-packaged deals", "Discover emerging talent", "Market trends & analytics"]
              }
            ].map((user, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="bg-[#0d1520] border border-[#1c2a3a] rounded-xl p-7 hover:border-[#2a3a4e] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[#151f2e] flex items-center justify-center mb-5">
                  <user.icon className="w-[18px] h-[18px] text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{user.role}</h3>
                <p className="text-sm text-[#4a5a6e] mb-5">{user.desc}</p>
                <ul className="space-y-3">
                  {user.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex gap-2.5 text-sm text-[#8896a7]">
                      <CheckCircle className="w-4 h-4 text-gray-400/60 shrink-0 mt-0.5" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <ContactSection />

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-[#151f2e]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#4a5a6e]">&copy; 2026 Ckript. Connecting brilliant ideas with brilliant people.</p>
          <div className="flex gap-6 text-sm text-[#4a5a6e]">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
            <a href="mailto:info.ckript@gmail.com" className="hover:text-white transition-colors">Contact</a>
            <a href="https://www.linkedin.com/company/ckript/?viewAsMember=true" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

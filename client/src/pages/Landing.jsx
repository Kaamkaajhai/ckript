import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Film, Zap, Users, TrendingUp, ChevronRight, Mail, Send, Briefcase, HelpCircle, MessageSquare, CheckCircle, PenLine } from "lucide-react";
import FeaturesShowcase from "../components/FeaturesShowcase";
import SuccessStories from "../components/SuccessStories";
import api from "../services/api";

const contactReasons = [
  { value: "doubt", label: "I have a question / doubt", icon: HelpCircle, accent: "cyan" },
  { value: "team", label: "I want to join the team", icon: Briefcase, accent: "blue" },
  { value: "general", label: "General enquiry / feedback", icon: MessageSquare, accent: "violet" },
  { value: "email", label: "Just send an email", icon: Mail, accent: "teal" },
];

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } },
  };

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        className="relative max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {/* Heading */}
        <motion.div variants={itemVariants} className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-4">
            Get In Touch
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            We'd Love to{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Hear From You
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Have a question, want to collaborate, or curious about joining the team? Drop us a message.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-start">
          {/* Left — reason cards */}
          <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col gap-4">
            {contactReasons.map(({ value, label, icon: Icon, accent }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, reason: value }))}
                className={`flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all duration-200
                  ${form.reason === value
                    ? `bg-${accent}-500/10 border-${accent}-500/50 shadow-lg shadow-${accent}-500/10`
                    : "bg-slate-900/60 border-slate-700/50 hover:border-slate-600/70 hover:bg-slate-800/60"
                  }`}
              >
                <span className={`p-2 rounded-lg ${form.reason === value ? `bg-${accent}-500/20` : "bg-slate-800"}`}>
                  <Icon className={`w-5 h-5 ${form.reason === value ? `text-${accent}-400` : "text-gray-400"}`} />
                </span>
                <span className={`text-sm font-medium ${form.reason === value ? "text-white" : "text-gray-400"}`}>
                  {label}
                </span>
                {form.reason === value && (
                  <CheckCircle className="w-4 h-4 text-cyan-400 ml-auto shrink-0" />
                )}
              </button>
            ))}

            {/* Direct email */}
            <div className="mt-2 px-5 py-4 rounded-xl bg-slate-900/40 border border-slate-700/40">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Or reach us directly</p>
              <a href="mailto:info.ckript@gmail.com" className="text-cyan-400 text-sm font-medium hover:underline">
                info.ckript@gmail.com
              </a>
            </div>
          </motion.div>

          {/* Right — form */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm">
              <AnimatePresence mode="wait">
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center text-center py-12 gap-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-cyan-500/15 flex items-center justify-center mb-2">
                      <CheckCircle className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Message Sent!</h3>
                    <p className="text-gray-400 max-w-xs">
                      Thanks for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setSubmitError("");
                        setForm({ reason: "", name: "", email: "", message: "" });
                      }}
                      className="mt-4 px-6 py-2 rounded-lg border border-cyan-500/40 text-cyan-400 text-sm hover:bg-cyan-500/10 transition"
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
                    className="flex flex-col gap-5"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Name</label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          required
                          placeholder="Jane Doe"
                          className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address</label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleChange}
                          required
                          placeholder="jane@example.com"
                          className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Reason for Contact</label>
                      <select
                        name="reason"
                        value={form.reason}
                        onChange={handleChange}
                        required
                        className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition appearance-none"
                      >
                        <option value="" disabled className="text-gray-500">Select a reason…</option>
                        {contactReasons.map(({ value, label }) => (
                          <option key={value} value={value} className="bg-slate-800">{label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Message</label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleChange}
                        required
                        rows={5}
                        placeholder="Tell us what's on your mind…"
                        className="bg-slate-800/70 border border-slate-700/60 rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 resize-none focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition"
                      />
                    </div>

                    {submitError && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        {submitError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
      </motion.div>
    </section>
  );
};

const Landing = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" },
    },
  };

  return (
    <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Ckript</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="px-6 py-2 text-sm font-semibold text-gray-300 hover:text-white transition">
              Sign In
            </Link>
            <Link to="/join" className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 min-h-screen flex items-center">
        <motion.div
          className="max-w-5xl mx-auto w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="text-center mb-6">
            <span className="inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-semibold">
              The Future of Script Discovery
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8 text-center"
          >
            Your Ideas Deserve <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">More Than Rejection</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p variants={itemVariants} className="text-xl text-gray-500 text-center mb-10 max-w-3xl mx-auto leading-relaxed">
            Ckript connects brilliant creators with producers, directors, and investors who are actively searching for your next big idea. Publish, visualize, and monetize your scripts like never before.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div variants={itemVariants} className="flex gap-6 justify-center flex-wrap mb-16">
            <Link
              to="/writer-onboarding"
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/40 transition-all transform hover:scale-105 flex items-center gap-2"
            >
              Sign Up as Creator
              <ChevronRight className="w-5 h-5" />
            </Link>
            <a
              href="#platform-innovations"
              className="px-8 py-4 bg-slate-800 border-2 border-cyan-500/50 rounded-lg font-bold text-lg hover:bg-slate-700/50 transition-all"
            >
              Learn More
            </a>
          </motion.div>


        </motion.div>
      </section>

      {/* Problem & Solution Section */}
      <section className="relative py-28 px-6 overflow-hidden bg-slate-950">
        {/* subtle dot-grid bg */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        {/* ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-64 bg-cyan-500/5 blur-3xl pointer-events-none rounded-full" />

        <motion.div
          className="max-w-6xl mx-auto relative"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* eyebrow */}
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-cyan-400/70">Industry Friction</span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </motion.div>

          {/* heading */}
          <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl font-extrabold text-center mb-3 tracking-tight">
            The Problem{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              We Solve
            </span>
          </motion.h2>
          <motion.p variants={itemVariants} className="text-center text-slate-400 text-lg mb-16 max-w-xl mx-auto leading-relaxed">
            A fractured industry kept apart by walls that shouldn't exist.
          </motion.p>

          {/* Two problem cards */}
          <div className="grid md:grid-cols-2 gap-5 mb-5">
            {/* Creators card */}
            <motion.div
              variants={itemVariants}
              className="group relative rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-8 hover:border-cyan-500/30 hover:bg-slate-900 transition-all duration-300"
            >
              {/* top shimmer line */}
              <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-slate-500/30 to-transparent group-hover:via-cyan-500/40 transition-all duration-300" />

              <div className="flex items-center gap-3 mb-7">
                <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-cyan-500/30 transition-colors duration-300">
                  <Users className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors duration-300" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Side A</p>
                  <h3 className="text-xl font-bold text-white">For Creators</h3>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  "Brilliant ideas stuck without capital or connections",
                  "No path to reach producers, directors, and investors",
                  "Endless rejection from traditional gatekeepers",
                  "Stories remain dormant and undiscovered forever",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-slate-400 leading-snug">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-slate-800 border border-slate-600/80 flex items-center justify-center shrink-0">
                      <svg className="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Industry card */}
            <motion.div
              variants={itemVariants}
              className="group relative rounded-2xl border border-slate-700/60 bg-slate-900/60 backdrop-blur-sm p-8 hover:border-cyan-500/30 hover:bg-slate-900 transition-all duration-300"
            >
              <div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-slate-500/30 to-transparent group-hover:via-cyan-500/40 transition-all duration-300" />

              <div className="flex items-center gap-3 mb-7">
                <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-cyan-500/30 transition-colors duration-300">
                  <TrendingUp className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors duration-300" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Side B</p>
                  <h3 className="text-xl font-bold text-white">For Industry Professionals</h3>
                </div>
              </div>

              <ul className="space-y-4">
                {[
                  "Drowning in unfiltered submissions with no smart search",
                  "Impossible to find fresh, genre-specific content fast",
                  "No way to preview talent before committing resources",
                  "Expensive, slow, and painfully manual discovery process",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] text-slate-400 leading-snug">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-slate-800 border border-slate-600/80 flex items-center justify-center shrink-0">
                      <svg className="w-2.5 h-2.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* divider pill */}
          <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 mb-5">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-700/60" />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-slate-700 bg-slate-900">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-semibold text-slate-500 tracking-wide">Ckript closes the gap</span>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-700/60" />
          </motion.div>

          {/* Solution card */}
          <motion.div
            variants={itemVariants}
            className="relative rounded-2xl overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.07] via-blue-600/[0.05] to-slate-900 p-10 sm:p-12 text-center"
          >
            {/* corner glows */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-blue-600/8 rounded-full blur-3xl pointer-events-none" />
            {/* top shimmer */}
            <div className="absolute top-0 left-16 right-16 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

            <div className="relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 mb-6 mx-auto">
                <Zap className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight">The Ckript Solution</h3>
              <p className="text-slate-300 text-lg leading-relaxed max-w-2xl mx-auto mb-8">
                A platform that instantly connects creators with decision-makers.
                Scripts are visualized through{" "}
                <span className="text-cyan-400 font-semibold">AI-generated trailers</span>, matched{" "}
                <span className="text-cyan-400 font-semibold">algorithmically</span>, and packaged with
                ready-to-cast talent.{" "}
                <span className="text-white font-semibold">Everyone wins.</span>
              </p>

              {/* feature pills */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {[
                  { icon: <Zap className="w-3.5 h-3.5" />, label: "AI-Powered Matching" },
                  { icon: <Film className="w-3.5 h-3.5" />, label: "Visual Script Previews" },
                  { icon: <Users className="w-3.5 h-3.5" />, label: "Zero Gatekeepers" },
                  { icon: <TrendingUp className="w-3.5 h-3.5" />, label: "Real-time Analytics" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 text-[13px] font-semibold text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300 transition-colors duration-200">
                    <span className="text-cyan-400">{f.icon}</span>
                    {f.label}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Showcase Component */}
      <FeaturesShowcase />

      {/* Success Stories Component */}
      <SuccessStories />

      {/* How it Works */}
      <section className="py-20 px-6 bg-slate-800/50">
        <motion.div
          className="max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
            How It Works in 4 Simple Steps
          </motion.h2>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: "Upload Your Script", desc: "Present your concept with a compelling summary and let AI generate a visual preview." },
              { step: 2, title: "AI Creates Trailer", desc: "Our AI generates a 30-second visual trailer that helps viewers quickly understand your concept." },
              { step: 3, title: "Get Smart Matched", desc: "The platform’s algorithm connects creators with producers and investors interested in their genre." },
              { step: 4, title: "Unlock & Earn", desc: "Producers pay to access the full script, and creators receive their earnings instantly." }
            ].map((item, index) => (
              <motion.div key={index} variants={itemVariants} className="text-center">
                <div className="mb-4 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto font-bold text-2xl ring-4 ring-cyan-500/20">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                {index < 3 && <div className="hidden md:block absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 text-cyan-500/50">→</div>}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* For All User Types */}
      <section className="py-20 px-6">
        <motion.div
          className="max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={itemVariants} className="text-4xl font-bold text-center mb-16">
            For Everyone on the Creative Spectrum
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: PenLine,
                role: "Writers & Creators",
                benefits: ["Publish with AI-generated trailers", "Earn 100% on unlock fees", "Get Pro Analysis reports", "Smart matching with producers"]
              },
              {
                icon: Film,
                role: "Producers & Directors",
                benefits: ["Browse visual trailers", "Auto-matched content", "Pre-auditioned talent attached", "30-day script options"]
              },
              {
                icon: TrendingUp,
                role: "Investors",
                benefits: ["Curated Domain Packages", "Invest in pre-packaged deals", "Discover emerging talent", "Market trends & analytics"]
              }
            ].map((user, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-8 hover:border-cyan-500/50 transition-all group"
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="p-2 rounded-lg bg-slate-700/50 border border-slate-600/40 group-hover:bg-cyan-500/20 group-hover:border-cyan-500/20 transition">
                    <user.icon className="w-5 h-5 text-white " />
                  </span>
                  <h3 className="text-2xl font-bold ">{user.role}</h3>
                </div>
                <ul className="space-y-4">
                  {user.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex gap-3 text-gray-300">
                      <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Contact / Get In Touch Section */}
      <ContactSection />

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-slate-700/50 text-center text-gray-400">
        <div className="max-w-6xl mx-auto">
          <p className="mb-4 font-semibold">&copy; 2026 Ckript. Connecting brilliant ideas with brilliant people.</p>
          <div className="flex gap-8 justify-center text-sm flex-wrap">
            <Link to="/privacy-policy" className="hover:text-cyan-400 transition">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-cyan-400 transition">Terms of Service</Link>
            <a href="mailto:info.ckript@gmail.com" className="hover:text-cyan-400 transition">Contact Us</a>
            <a href="https://www.linkedin.com/company/ckript/?viewAsMember=true" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400 transition">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

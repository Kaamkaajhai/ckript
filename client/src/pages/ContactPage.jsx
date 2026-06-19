import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Send, CheckCircle2, MessageSquare, Briefcase, HelpCircle, PhoneCall, Clock3 } from "lucide-react";
import api from "../services/api";
import MarketingHeader from "../components/MarketingHeader";

const FontInjection = () => (
	<style>{`
		@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Inter:wght@300;400;500;600;700&display=swap');

		.font-display { font-family: 'Playfair Display', Georgia, serif; }
		.font-body { font-family: 'Inter', system-ui, sans-serif; }
	`}</style>
);

const contactReasons = [
  { value: "doubt", label: "Question or Clarification", icon: HelpCircle },
  { value: "team", label: "Work With Us", icon: Briefcase },
  { value: "general", label: "General Feedback", icon: MessageSquare },
  { value: "email", label: "Direct Email Request", icon: Mail },
  { value: "other", label: "Other", icon: MessageSquare },
];

const ContactPage = () => {
  const [form, setForm] = useState({ reason: "", otherReason: "", name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (error) setError("");
    setForm((prev) => {
      if (name === "reason") {
        return {
          ...prev,
          reason: value,
          otherReason: value === "other" ? prev.otherReason : "",
        };
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

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0A0B] text-white font-body">
      <FontInjection />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(255,255,255,0.03),transparent_28%),radial-gradient(circle_at_84%_22%,rgba(255,255,255,0.02),transparent_20%)]" />
      </div>

      <MarketingHeader />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-28 sm:pt-36 pb-16 sm:pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-10 sm:mb-14 text-center"
        >
          <p className="flex w-full justify-center text-center px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/60 mb-5">
            Contact
          </p>
          <h1 className="font-display text-4xl leading-[1.02] tracking-tight sm:text-5xl lg:text-6xl text-white font-medium">
            Talk to the <span className="text-[#BAE6FD]">Ckript</span> Team
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-8 sm:gap-12 lg:gap-16 items-start">
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold mb-4 text-white/50">Direct Contact</p>

              <div className="space-y-3">
                <a
                  href="mailto:info.ckript@gmail.com"
                  className="flex items-center gap-3 text-sm font-medium rounded-xl px-4 py-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition-colors"
                >
                  <Mail className="w-4 h-4 shrink-0 text-[#BAE6FD]" />
                  <span className="break-all">info.ckript@gmail.com</span>
                </a>

                <a
                  href="tel:+917986950853"
                  className="flex items-center gap-3 text-sm font-medium rounded-xl px-4 py-3 border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] transition-colors"
                >
                  <PhoneCall className="w-4 h-4 shrink-0 text-[#BAE6FD]" />
                  <span>+91 7986950853</span>
                </a>

                <div className="flex items-center gap-3 text-xs rounded-xl px-4 py-3 border border-white/5 bg-white/[0.01] text-white/60">
                  <Clock3 className="w-4 h-4 shrink-0" />
                  <span>Mon to Sat, 10:00 AM to 7:00 PM IST</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.14em] font-bold mb-4 text-white/50">Choose Topic</p>
              <div className="space-y-2">
                {contactReasons.map(({ value, label, icon: Icon }) => {
                  const active = form.reason === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm((prev) => ({
                        ...prev,
                        reason: value,
                        otherReason: value === "other" ? prev.otherReason : "",
                      }))}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition-all duration-300 flex items-center gap-3 ${active ? "bg-white/[0.08] border-white/20 text-white" : "bg-white/[0.01] border-white/5 text-white/70 hover:bg-white/[0.04]"}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-[#BAE6FD]" : ""}`} />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-3xl border border-white/10 bg-[#0F172A]/80 backdrop-blur-xl p-6 sm:p-10 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#BAE6FD] to-transparent opacity-30"></div>
            
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="contact-success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-h-[440px] flex flex-col items-center justify-center text-center"
                >
                  <div className="w-16 h-16 rounded-full mb-6 flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="font-display text-3xl font-medium mb-4 text-white">Message received.</h2>
                  <p className="text-base max-w-md text-white/60 mb-8 leading-relaxed">
                    Thank you for reaching out. Our team will review your request and get back to you shortly.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ reason: "", otherReason: "", name: "", email: "", message: "" });
                    }}
                    className="px-6 py-3 rounded-xl text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
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
                  className="space-y-6"
                >
                  <div className="pb-4 border-b border-white/10">
                    <h2 className="font-display text-2xl font-medium tracking-tight mb-2">Send a Message</h2>
                    <p className="text-sm text-white/50">Secure contact form directly to our team.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <label className="space-y-2 block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">Full name</span>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500/50 focus:bg-white/[0.02] transition-colors"
                        placeholder="Jane Doe"
                      />
                    </label>
                    <label className="space-y-2 block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">Email address</span>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500/50 focus:bg-white/[0.02] transition-colors"
                        placeholder="jane@example.com"
                      />
                    </label>
                  </div>

                  <label className="space-y-2 block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">Reason</span>
                    <select
                      name="reason"
                      value={form.reason}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-blue-500/50 focus:bg-white/[0.02] transition-colors appearance-none cursor-pointer"
                    >
                      <option value="" disabled className="bg-[#0F172A] text-white/50">
                        Select a reason
                      </option>
                      {contactReasons.map((reason) => (
                        <option key={reason.value} value={reason.value} className="bg-[#0F172A] text-white">
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {form.reason === "other" && (
                    <label className="space-y-2 block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">Please Specify</span>
                      <input
                        name="otherReason"
                        value={form.otherReason}
                        onChange={handleChange}
                        required
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500/50 focus:bg-white/[0.02] transition-colors"
                        placeholder="E.g., Partnership Inquiry"
                      />
                    </label>
                  )}

                  <label className="space-y-2 block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">Message</span>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white placeholder:text-white/30 outline-none resize-none focus:border-blue-500/50 focus:bg-white/[0.02] transition-colors"
                      placeholder="Tell us your question, issue, or request..."
                    />
                  </label>

                  {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(37,99,235,0.3)] mt-2"
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                          <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" />
                        </svg>
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.section>
        </div>
      </main>

      <footer className="relative z-10 py-10 border-t border-white/10 bg-[#0A0A0B]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs sm:text-sm text-white/40 text-center sm:text-left">&copy; 2026 Ckript. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-6 text-xs sm:text-sm text-white/40">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">T and C</Link>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;

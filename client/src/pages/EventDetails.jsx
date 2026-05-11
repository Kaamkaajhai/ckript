import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import MarketingHeader from "../components/MarketingHeader";
import BrandLogo from "../components/BrandLogo";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

const EVENT_SLUG = "ckript-global-scriptathon-2026";
const EVENT_START_DATE = new Date("2026-05-23T18:00:00+05:30");
const HERO_STATS = [
  { label: "Duration", value: "48 Hours" },
  { label: "Prize Pool", value: "INR 7,500+" },
  { label: "Writers", value: "Global" },
];

const loadRazorpaySdk = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Payment gateway is unavailable."));
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector('script[data-razorpay-sdk="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Razorpay SDK")), { once: true });
      return;
    }
    const sdkScript = document.createElement("script");
    sdkScript.src = "https://checkout.razorpay.com/v1/checkout.js";
    sdkScript.async = true;
    sdkScript.setAttribute("data-razorpay-sdk", "true");
    sdkScript.onload = () => resolve(true);
    sdkScript.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(sdkScript);
  });

const getTimeLeft = () => {
  const now = Date.now();
  const diff = Math.max(0, EVENT_START_DATE.getTime() - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
};

const EventDetails = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const [registered, setRegistered] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  const requireLogin = () => {
    if (!user) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}${location.hash}` } });
      return false;
    }
    return true;
  };

  useEffect(() => {
    let cancelled = false;

    const loadRegistration = async () => {
      if (!user || !slug || slug !== EVENT_SLUG) {
        if (!cancelled) {
          setRegistration(null);
          setRegistered(false);
        }
        return;
      }
      try {
        const { data } = await api.get(`/events/${slug}/registration`);
        if (!cancelled) {
          setRegistration(data?.registration || null);
          setRegistered(Boolean(data?.registration));
        }
      } catch {
        if (!cancelled) {
          setRegistration(null);
          setRegistered(false);
        }
      }
    };

    loadRegistration();

    return () => {
      cancelled = true;
    };
  }, [slug, user]);

  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(() => ([
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ]), [timeLeft]);

  const handlePaidRegister = async () => {
    if (!requireLogin() || registered) return;
    const normalizedCountry = String(user?.address?.country || "").trim().toLowerCase();
    const isIndia = !normalizedCountry || normalizedCountry === "india" || normalizedCountry === "in";
    setSubmitting(true);
    setSubmitError("");

    try {
      await loadRazorpaySdk();
      const { data } = await api.post(`/events/${EVENT_SLUG}/create-order`);

      if (data?.alreadyRegistered && data?.registration) {
        setRegistration(data.registration);
        setRegistered(true);
        return;
      }

      if (!window.Razorpay || !data?.orderId || !data?.keyId) {
        throw new Error("Payment gateway is not ready. Please try again.");
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency || (isIndia ? "INR" : "USD"),
        name: "Ckript",
        description: "Scriptathon 2026 registration",
        order_id: data.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        notes: {
          eventSlug: EVENT_SLUG,
        },
        theme: {
          color: "#0ea5e9",
        },
        handler: async (response) => {
          try {
            const { data: verifyData } = await api.post(`/events/${EVENT_SLUG}/verify-payment`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            const nextRegistration = verifyData?.registration || null;
            setRegistration(nextRegistration);
            setRegistered(Boolean(nextRegistration));
          } catch (err) {
            setSubmitError(err?.response?.data?.message || "Payment succeeded, but registration verification failed. Please contact support.");
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || err?.message || "Failed to start payment. Please try again.");
      setSubmitting(false);
    }
  };

  const handleRegister = () => {
    if (!requireLogin()) return;
    if (registered) {
      navigate(`/events/${EVENT_SLUG}/dashboard`);
      return;
    }
    const section = document.getElementById("event-registration");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const normalizedCountry = String(user?.address?.country || "").trim().toLowerCase();
  const isIndia = !normalizedCountry || normalizedCountry === "india" || normalizedCountry === "in";
  const paymentLabel = isIndia ? "INR 99" : "USD 5";

  if (slug && slug !== EVENT_SLUG) {
    return (
      <div className="min-h-screen bg-[#05070b] text-white">
        <MarketingHeader />
        <main className="mx-auto max-w-4xl px-6 pt-32 pb-20">
          <h1 className="text-2xl font-semibold">Event not found</h1>
          <p className="mt-4 text-sm text-[#9fb2cc]">Please return to the events page to view upcoming events.</p>
          <Link to="/events" className="mt-6 inline-flex items-center rounded-full bg-[#0ea5e9] px-6 py-3 text-sm font-semibold text-black">
            Back to events
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <MarketingHeader />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.22),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.18),transparent_70%)] blur-3xl" />
      </div>

      <main className="relative pt-28">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-6xl px-4 sm:px-8"
        >
          <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#05070b] to-[#0a1322] px-6 py-16 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:px-12">
            <p className="text-xs uppercase tracking-[0.35em] text-[#7dd3fc]">Ckript Global Scriptathon 2026</p>
            <h1 className="mt-5 text-3xl sm:text-5xl font-semibold leading-tight">
              The world&#39;s first AI-powered live script writing arena.
            </h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base text-[#b6c4d9]">
              Write it. Live it. Be seen. Compete with thousands of writers in a 48-hour global competition.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {!registered && (
                <button
                  type="button"
                  onClick={handleRegister}
                  className="rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] px-6 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(14,165,233,0.45)] active:scale-[0.98]"
                >
                  {user ? `Pay and register (${paymentLabel})` : "Login to register"}
                </button>
              )}
              <a
                href="#rules"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/5 active:scale-[0.98]"
              >
                View Rules
              </a>
              <a
                href="#prizes"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/5 active:scale-[0.98]"
              >
                Prize Pool
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {HERO_STATS.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-4 transition duration-200 ease-out hover:-translate-y-1 hover:border-[#38bdf8]/40">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7f96b7]">{stat.label}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {registered && registration && (
              <div className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">You are registered</p>
                <p className="mt-2 text-2xl font-semibold text-white">{registration.participantId}</p>
                <p className="mt-2 text-sm text-[#b6c4d9]">
                  Your event access is active. The payment button is hidden for registered participants.
                </p>
                <Link
                  to={`/events/${EVENT_SLUG}/dashboard`}
                  className="mt-5 inline-flex rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/5 active:scale-[0.98]"
                >
                  Open event dashboard
                </Link>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-8"
        >
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">The countdown has begun</h2>
              <p className="mt-3 text-sm text-[#9fb2cc]">48 hours. One story. Global competition. Thousands of writers. One winner.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {countdown.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-4 text-center">
                    <div className="text-2xl font-semibold text-white tabular-nums">{String(item.value).padStart(2, "0")}</div>
                    <div className="mt-1 text-xs uppercase tracking-wider text-[#7f96b7]">{item.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2 text-sm text-[#d5e2f4]">
                <p>Starts: 23 May 2026, 06:00 PM IST</p>
                <p>Ends: 25 May 2026, 06:00 PM IST</p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">What is Scriptathon?</h2>
              <p className="mt-3 text-sm text-[#9fb2cc]">
                Ckript Global Scriptathon is a 48-hour online screenplay writing competition where writers from around the world compete live by writing original scripts directly on Ckript.
              </p>
              <p className="mt-4 text-sm text-[#9fb2cc]">
                Track rankings, receive AI-powered story analysis, compete globally, and showcase your creativity in front of a growing entertainment ecosystem.
              </p>
              <p className="mt-4 text-sm text-[#9fb2cc]">
                Whether you write films, web series, anime, television stories, or cinematic universes, this is your stage.
              </p>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="prizes"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-8"
        >
          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Prizes and recognition</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                { title: "Winner", amount: "INR 5000", perks: ["Featured on Ckript homepage", "AI cinematic trailer", "Pitch opportunity to producers"] },
                { title: "Runner-Up", amount: "INR 2000", perks: ["Featured trailer", "Global visibility"] },
                { title: "Third Place", amount: "INR 500", perks: ["Special spotlight", "Community badge"] },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-[#070b12] p-5 transition hover:-translate-y-1 hover:border-[#38bdf8]/40">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#7dd3fc]">{item.title}</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{item.amount}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-[#9fb2cc]">
                    {item.perks.map((perk) => (
                      <li key={perk}>{perk}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-[#070b12] p-5">
              <h3 className="text-lg font-semibold">Special awards</h3>
              <div className="mt-4 grid gap-3 text-sm text-[#9fb2cc] sm:grid-cols-2">
                {["Best Dialogue", "Best Sci-Fi", "Best Thriller", "Best Anime Concept", "Most Cinematic Story", "Audience Choice Award"].map((award) => (
                  <span key={award} className="rounded-full border border-white/10 px-4 py-2">{award}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          id="rules"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-8"
        >
          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Competition rules</h2>
            <ul className="mt-6 grid gap-3 text-sm text-[#9fb2cc] sm:grid-cols-2">
              {[
                "Scripts must be completely original.",
                "Copy-paste is allowed.",
                "Minimum script length: 10 pages.",
                "Maximum script length: 150 pages.",
                "Participants must write during the event period.",
                "AI-generated bulk content is not allowed.",
                "Scripts must be written inside the Ckript editor.",
                "Plagiarism or cheating may result in disqualification.",
                "Submissions after the deadline will not be accepted.",
              ].map((rule) => (
                <li key={rule} className="rounded-2xl border border-white/10 bg-[#070b12] p-4 transition hover:-translate-y-1 hover:border-[#38bdf8]/40">
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-8"
        >
          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "AI story score",
                desc: "Get real-time AI evaluation on storytelling, dialogue, emotional impact, and cinematic potential.",
              },
              {
                title: "Live rankings",
                desc: "Track global rankings, genre rankings, and performance growth throughout the event.",
              },
              {
                title: "Anti-cheat protection",
                desc: "Advanced systems detect copy-paste abuse, plagiarism, and AI-generated spam.",
              },
            ].map((card) => (
              <div key={card.title} className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 transition hover:-translate-y-1 hover:border-[#38bdf8]/40">
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm text-[#9fb2cc]">{card.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-8"
        >
          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Why participate?</h2>
            <div className="mt-6 grid gap-3 text-sm text-[#9fb2cc] sm:grid-cols-2">
              {[
                "Gain global visibility.",
                "Compete with writers worldwide.",
                "Build your public writing profile.",
                "Receive AI-powered feedback.",
                "Get discovered by producers and creators.",
                "Win prizes and recognition.",
                "Become part of the Ckript storytelling ecosystem.",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-[#070b12] p-4 transition hover:-translate-y-1 hover:border-[#38bdf8]/40">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <h2 className="text-2xl font-semibold">Live competition dashboard</h2>
              <div className="mt-5 grid gap-3 text-sm text-[#9fb2cc]">
                {["Top writers", "Trending genres", "Highest story scores", "Most active participants"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-[#070b12] p-4 transition hover:-translate-y-1 hover:border-[#38bdf8]/40">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <h2 className="text-2xl font-semibold">How it works</h2>
              <ol className="mt-5 space-y-3 text-sm text-[#9fb2cc]">
                {[
                  "Register for the event.",
                  "Access the live writing dashboard on 12 May.",
                  "Write your script during the 48-hour challenge.",
                  "Track rankings and AI score in real time.",
                  "Submit before the deadline.",
                  "Winners announced live on Ckript.",
                ].map((step, index) => (
                  <li key={step} className="rounded-2xl border border-white/10 bg-[#070b12] p-4 transition hover:-translate-y-1 hover:border-[#38bdf8]/40">
                    <span className="font-semibold">Step {index + 1}:</span> {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-8"
        >
          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#7dd3fc]">Sponsorship Proposal</p>
                <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Ckript Global Scriptathon 2026</h2>
                <p className="mt-3 max-w-3xl text-sm text-[#9fb2cc]">
                  A 48-hour global online script writing competition connecting writers, storytellers, filmmakers, and
                  creators. Sponsors get direct access to a highly engaged creative audience and global visibility.
                </p>
                <div className="mt-5 flex flex-wrap gap-3 text-xs text-[#d5e2f4]">
                  <span className="rounded-full border border-white/10 px-4 py-2">Dates: 23 May, 06:00 PM IST - 25 May, 06:00 PM IST</span>
                  <span className="rounded-full border border-white/10 px-4 py-2">Format: Global Online Event</span>
                  <span className="rounded-full border border-white/10 px-4 py-2">Audience: Writers, filmmakers, creators</span>
                </div>
              </div>
              <a
                href="mailto:info.ckript@gmail.com?subject=Sponsorship%20Inquiry%20-%20Ckript%20Global%20Scriptathon%202026"
                className="inline-flex w-fit items-center justify-center rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] px-6 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(14,165,233,0.45)] active:scale-[0.98]"
              >
                Apply for sponsorship
              </a>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-[#070b12] p-5">
                <h3 className="text-lg font-semibold">Why sponsor this event?</h3>
                <ul className="mt-4 grid gap-3 text-sm text-[#9fb2cc] sm:grid-cols-2">
                  {[
                    "Brand visibility across event assets and social campaigns.",
                    "Digital reach via creator communities and event promotion.",
                    "Direct access to emerging creative talent.",
                    "Brand positioning with creativity, innovation, and storytelling.",
                  ].map((item) => (
                    <li key={item} className="rounded-2xl border border-white/10 bg-[#0a1220] p-4">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#070b12] p-5">
                <h3 className="text-lg font-semibold">Sponsorship categories</h3>
                <div className="mt-4 grid gap-3 text-sm text-[#9fb2cc]">
                  {[
                    { title: "Title Sponsor", desc: "Premium branding, powered-by placement, homepage visibility." },
                    { title: "Gold Sponsor", desc: "Featured logo placement, social promotions, sponsor mentions." },
                    { title: "Silver Sponsor", desc: "Logo placement, community visibility, sponsor mentions." },
                    { title: "Community Partner", desc: "Ideal for film schools, startups, and creator communities." },
                  ].map((tier) => (
                    <div key={tier.title} className="rounded-2xl border border-white/10 bg-[#0a1220] p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">{tier.title}</p>
                      <p className="mt-2 text-sm text-[#9fb2cc]">{tier.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#070b12] p-5">
                <h3 className="text-lg font-semibold">Sponsorship options</h3>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#9fb2cc]">
                  {[
                    "Prize sponsorship",
                    "Marketing support",
                    "Financial sponsorship",
                    "Technology partnership",
                    "Community promotion",
                    "Creator support initiatives",
                  ].map((item) => (
                    <span key={item} className="rounded-full border border-white/10 px-3 py-1">{item}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#070b12] p-5">
                <h3 className="text-lg font-semibold">Ideal sponsors</h3>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#9fb2cc]">
                  {[
                    "Entertainment companies",
                    "OTT and media brands",
                    "AI startups",
                    "Creator economy platforms",
                    "Film schools",
                    "EdTech platforms",
                    "Writing tools",
                    "Tech companies",
                    "Creative communities",
                    "Media publications",
                  ].map((item) => (
                    <span key={item} className="rounded-full border border-white/10 px-3 py-1">{item}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#070b12] p-5">
                <h3 className="text-lg font-semibold">Contact</h3>
                <p className="mt-3 text-sm text-[#9fb2cc]">Interested sponsors can reach us at:</p>
                <div className="mt-4 grid gap-2 text-sm text-[#d5e2f4]">
                  <a className="underline-offset-4 hover:underline" href="mailto:info.ckript@gmail.com">info.ckript@gmail.com</a>
                  <span>ckript.com</span>
                </div>
                <div className="mt-5 rounded-2xl border border-white/10 bg-[#0a1220] p-4 text-xs text-[#9fb2cc]">
                  1000+ participants target. Packages available for Title, Gold, Silver, and Community Partner tiers.
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-8"
        >
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div id="event-registration" className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">Register for Scriptathon 2026</h2>
              <p className="mt-2 text-sm text-[#9fb2cc]">
                Registration is tied to your Ckript account. Login first, then complete payment to secure your spot.
              </p>

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#070b12] p-5">
                {registered && registration ? (
                  <>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">You are registered</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{registration.participantId}</p>
                    <p className="mt-2 text-sm text-[#9fb2cc]">Your event access is active. The payment button is hidden for registered participants.</p>
                    <Link
                      to={`/events/${EVENT_SLUG}/dashboard`}
                      className="mt-5 inline-flex rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/5 active:scale-[0.98]"
                    >
                      Open event dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold">Complete your registration</h3>
                    <p className="mt-2 text-sm text-[#9fb2cc]">India: INR 99 | International: USD 5</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {!user ? (
                        <button
                          type="button"
                          onClick={requireLogin}
                          disabled={authLoading}
                          className="rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] px-6 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(14,165,233,0.3)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(14,165,233,0.4)] active:scale-[0.98] disabled:opacity-60"
                        >
                          Login to register
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePaidRegister}
                          disabled={submitting}
                          className="rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] px-6 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(14,165,233,0.3)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(14,165,233,0.4)] active:scale-[0.98] disabled:opacity-60"
                        >
                          {submitting ? "Registering..." : `Pay ${paymentLabel} and register`}
                        </button>
                      )}
                    </div>
                    {!user && (
                      <p className="mt-3 text-xs text-[#7f96b7]">Login is required before payment and registration.</p>
                    )}
                    {submitError && (
                      <p className="mt-3 text-xs text-red-300">{submitError}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
              <div className="rounded-2xl border border-white/10 bg-[#070b12] p-5">
                <h3 className="text-lg font-semibold">Live participant counter</h3>
                <p className="mt-2 text-3xl font-semibold text-[#38bdf8]">1,284 writers registered</p>
                <p className="mt-2 text-xs text-[#7f96b7]">Numbers update during the event.</p>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-[#070b12] p-5">
                <h3 className="text-lg font-semibold">Countries participating</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#9fb2cc]">
                  {["India", "USA", "UK", "Japan", "Canada", "Australia", "Germany", "Brazil"].map((country) => (
                    <span key={country} className="rounded-full border border-white/10 px-3 py-1">{country}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-16 max-w-6xl px-4 sm:px-8"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <h2 className="text-2xl font-semibold">Testimonials</h2>
              <div className="mt-4 space-y-3 text-sm text-[#9fb2cc]">
                <div className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
                  "Future streaming creators may begin here."
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
                  "A cinematic sprint that pushes writers to their limit."
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <h2 className="text-2xl font-semibold">FAQ</h2>
              <div className="mt-4 space-y-3 text-sm text-[#9fb2cc]">
                <div className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
                  <span className="font-semibold">Do I need prior experience?</span>
                  <p className="mt-2">No. All skill levels are welcome.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
                  <span className="font-semibold">Can I collaborate with a co-writer?</span>
                  <p className="mt-2">Teams can join, but one account must submit.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

      </main>

      <footer className="border-t border-white/10 bg-[#0a0f17] py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-6 w-auto" />
            <span className="text-xs text-[#7f96b7]">Copyright 2026 Ckript.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-[#9fb2cc]">
            <Link to="/events" className="hover:text-white">Events</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/privacy-policy" className="hover:text-white">Privacy</Link>
            <Link to="/terms-of-service" className="hover:text-white">Terms</Link>
            <Link to="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default EventDetails;

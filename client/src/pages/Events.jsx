import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import MarketingHeader from "../components/MarketingHeader";
import BrandLogo from "../components/BrandLogo";
import { AuthContext } from "../context/AuthContext";

const EVENT_SLUG = "ckript-global-scriptathon-2026";
const EVENT_PATH = `/events/${EVENT_SLUG}`;
const EVENT_BANNER = "/events/ckript-scriptathon-2026-banner.svg";

const startDate = new Date("2026-05-23T18:00:00+05:30");
const endDate = new Date("2026-05-25T18:00:00+05:30");

const getTimeLeft = () => {
  const now = Date.now();
  const diff = Math.max(0, startDate.getTime() - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
};

const Events = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleRegister = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate(EVENT_PATH);
  };

  const countdown = useMemo(() => ([
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Minutes", value: timeLeft.minutes },
    { label: "Seconds", value: timeLeft.seconds },
  ]), [timeLeft]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070b] text-white">
      <MarketingHeader />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.25),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.2),transparent_70%)] blur-3xl" />
      </div>

      <main className="relative pt-28 pb-20">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-6xl px-4 sm:px-8"
        >
          <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#05070b] to-[#0a1322] px-6 py-14 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:px-12">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#7dd3fc]">Ckript Events</p>
                <h1 className="mt-5 text-3xl sm:text-5xl font-semibold tracking-tight">
                  Upcoming events hosted by Ckript
                </h1>
                <p className="mt-4 max-w-2xl text-sm sm:text-base text-[#b6c4d9]">
                  A cinematic lineup of live competitions, creator meetups, and global writing challenges.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleRegister}
                  className="rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] px-6 py-3 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(14,165,233,0.35)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(14,165,233,0.45)] active:scale-[0.98]"
                >
                  Register Now
                </button>
                <Link
                  to={EVENT_PATH}
                  className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/5 active:scale-[0.98]"
                >
                  View Details
                </Link>
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Featured Event</p>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#9fb2cc]">Live Competition</span>
                </div>
                <h2 className="mt-4 text-2xl sm:text-3xl font-semibold">Ckript Global Scriptathon 2026</h2>
                <p className="mt-3 text-sm text-[#9fb2cc]">The world&#39;s first AI-powered live script writing arena.</p>

                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#05070b]">
                  <img src={EVENT_BANNER} alt="Ckript Global Scriptathon 2026" className="h-48 w-full object-cover" />
                </div>

                <div className="mt-6 flex flex-wrap gap-3 text-xs text-[#d5e2f4]">
                  <span className="rounded-full border border-white/10 px-4 py-2">Starts: 23 May 2026, 06:00 PM IST</span>
                  <span className="rounded-full border border-white/10 px-4 py-2">Ends: 25 May 2026, 06:00 PM IST</span>
                  <span className="rounded-full border border-white/10 px-4 py-2">Prize Pool: INR 7,500+</span>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Countdown</p>
                <h3 className="mt-3 text-xl font-semibold">The countdown has begun</h3>
                <p className="mt-2 text-sm text-[#9fb2cc]">48 hours. One story. Global competition.</p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {countdown.map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-4 text-center">
                      <div className="text-2xl font-semibold text-white tabular-nums">{String(item.value).padStart(2, "0")}</div>
                      <div className="mt-1 text-xs uppercase tracking-wider text-[#7f96b7]">{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 grid gap-3 text-sm text-[#9fb2cc]">
                  {[
                    "Thousands of writers competing worldwide.",
                    "AI scoring, live rankings, and cinematic exposure.",
                    "Winners announced live on Ckript.",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3">
                      {item}
                    </div>
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
            <Link
              to={EVENT_PATH}
              className="group rounded-3xl border border-white/10 bg-[#0a1220] p-6 transition duration-200 ease-out hover:-translate-y-1 hover:border-[#38bdf8]/40 hover:shadow-[0_20px_50px_rgba(14,165,233,0.2)]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Live Competition</span>
                <span className="text-xs text-[#7f96b7]">May 23-25, 2026</span>
              </div>
              <h3 className="mt-4 text-xl font-semibold">Ckript Global Scriptathon 2026</h3>
              <p className="mt-2 text-sm text-[#9fb2cc]">Write it. Live it. Be seen.</p>
              <p className="mt-4 text-sm text-[#d5e2f4]">Prize pool, AI scoring, live rankings, and cinematic exposure.</p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#38bdf8]">
                Explore event
                <span className="transition group-hover:translate-x-1">&rarr;</span>
              </div>
            </Link>
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 transition duration-200 ease-out hover:-translate-y-1 hover:border-[#38bdf8]/40">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">More events</p>
              <h3 className="mt-4 text-xl font-semibold">Creator showcases</h3>
              <p className="mt-2 text-sm text-[#9fb2cc]">Weekly drop-ins and portfolio reviews for writers, filmmakers, and studios.</p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-[#9fb2cc]">
                New events land here soon.
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

export default Events;

import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Award,
  BarChart3,
  Clock3,
  Download,
  Eye,
  Megaphone,
  PenLine,
  Rocket,
  Share2,
  Trophy,
  Zap,
} from "lucide-react";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

const EVENT_SLUG = "ckript-global-scriptathon-2026";

const getDurationParts = (targetMs, nowMs) => {
  const diff = Math.max(0, targetMs - nowMs);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
};

const formatShortDuration = ({ days, hours, minutes }) => {
  if (days > 0) return `${days}D ${hours}H`;
  return `${hours}H ${minutes}M`;
};

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
};

const EmptyState = ({ children }) => (
  <div className="rounded-2xl border border-white/10 bg-[#070b12] p-5 text-sm text-[#9fb2cc]">
    {children}
  </div>
);

const StatTile = ({ label, value, icon: Icon, accent = "text-[#38bdf8]" }) => (
  <div className="rounded-2xl border border-white/10 bg-[#070b12] p-4 transition hover:-translate-y-1 hover:border-[#38bdf8]/40">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs uppercase tracking-[0.18em] text-[#7f96b7]">{label}</p>
      {Icon && <Icon className={`h-4 w-4 ${accent}`} />}
    </div>
    <p className="mt-3 text-xl font-semibold text-white">{value || "Not available"}</p>
  </div>
);

const ActionButton = ({ icon, label, disabled = false }) => {
  const ActionIcon = icon;

  return (
    <button
      type="button"
      disabled={disabled}
      className="flex min-h-16 items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#070b12] px-5 py-4 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-1 hover:border-[#38bdf8]/60 hover:bg-[#0b1726] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ActionIcon className="h-5 w-5" />
      {label}
    </button>
  );
};

const EventDashboard = () => {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(Date.now());
  const [syncPoint, setSyncPoint] = useState({ serverMs: Date.now(), clientMs: Date.now() });

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      if (slug !== EVENT_SLUG) {
        setError("Event not found");
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/events/${slug}/dashboard`);
        if (!cancelled) {
          const serverMs = new Date(data?.serverTime || Date.now()).getTime();
          setPayload(data || null);
          setSyncPoint({
            serverMs: Number.isNaN(serverMs) ? Date.now() : serverMs,
            clientMs: Date.now(),
          });
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Unable to load event dashboard");
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const syncedNowMs = syncPoint.serverMs + (tick - syncPoint.clientMs);
  const event = payload?.event || {};
  const registration = payload?.registration || null;
  const competition = payload?.competition || {};
  const startMs = new Date(event.startAt || 0).getTime();
  const endMs = new Date(event.endAt || 0).getTime();
  const eventStatus = syncedNowMs < startMs ? "upcoming" : syncedNowMs <= endMs ? "live" : "completed";
  const timerTargetMs = eventStatus === "upcoming" ? startMs : eventStatus === "live" ? endMs : syncedNowMs;
  const timeLeft = useMemo(() => getDurationParts(timerTargetMs, syncedNowMs), [timerTargetMs, syncedNowMs]);
  const dashboardName = registration?.fullName || user?.name || "Writer";
  const statusBadge = eventStatus === "live"
    ? "LIVE NOW"
    : eventStatus === "completed"
      ? "Completed"
      : `Starts in ${timeLeft.days > 0 ? `${timeLeft.days} Days` : `${timeLeft.hours} Hours`}`;
  const submission = competition.submission;
  const ranking = competition.ranking;
  const aiInsights = competition.aiInsights;
  const leaderboard = Array.isArray(competition.leaderboard) ? competition.leaderboard : [];
  const announcements = Array.isArray(competition.announcements) ? competition.announcements : [];
  const achievements = Array.isArray(competition.achievements) ? competition.achievements : [];
  const globalActivity = Array.isArray(competition.globalActivity) ? competition.globalActivity : [];
  const pagesWritten = submission?.pagesWritten ?? null;
  const aiScore = aiInsights?.score ?? null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-400">Loading event dashboard...</div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-white">Registration required</h1>
        <p className="text-sm text-[#9fb2cc]">{error || "Please register for the event to access your dashboard."}</p>
        <Link
          to={`/events/${EVENT_SLUG}`}
          className="rounded-full bg-[#0ea5e9] px-6 py-3 text-sm font-semibold text-black"
        >
          Go to event page
        </Link>
      </div>
    );
  }

  return (
    <div className="relative -mx-4 -my-6 min-h-screen overflow-hidden bg-[#05070b] px-4 py-6 text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_30%_0%,rgba(14,165,233,0.22),transparent_36%),radial-gradient(circle_at_80%_8%,rgba(34,197,94,0.12),transparent_34%)]" />

      <div className="relative mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-white/10 bg-[#0a1220]/95 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] sm:p-8"
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#7dd3fc]">Event Dashboard</p>
                <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-5xl">Welcome Back, {dashboardName}</h1>
                <p className="mt-4 max-w-2xl text-sm text-[#b6c4d9] sm:text-base">
                  {event.subtitle || "You’re competing with writers across the world."}
                </p>
                <p className="mt-3 text-xs text-[#7f96b7]">
                  {event.title} · {formatDateTime(event.startAt)} to {formatDateTime(event.endAt)}
                </p>
              </div>
              <div className={`inline-flex w-fit items-center rounded-full border px-4 py-2 text-sm font-semibold ${
                eventStatus === "live" ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200 animate-pulse" : "border-sky-400/40 bg-sky-400/10 text-sky-200"
              }`}>
                {statusBadge}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
          >
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">
                {eventStatus === "upcoming" ? "Starts In" : eventStatus === "live" ? "Time Remaining" : "Event Complete"}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
                {[
                  ["Days", timeLeft.days],
                  ["Hours", timeLeft.hours],
                  ["Minutes", timeLeft.minutes],
                  ["Seconds", timeLeft.seconds],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-[#070b12] p-4 text-center">
                    <p className="text-3xl font-semibold tabular-nums text-white">{String(value).padStart(2, "0")}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#7f96b7]">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-[#9fb2cc]">
                Timer is synced from the server clock.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Your Competition Status</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatTile label="Participant ID" value={registration.participantId} icon={Award} />
                <StatTile label="Registration Status" value={registration.paymentStatus === "paid" ? "Registered" : registration.paymentStatus} icon={Trophy} accent="text-emerald-300" />
                <StatTile label="Submission Status" value={submission?.status || "No submission linked"} icon={PenLine} accent="text-amber-300" />
                <StatTile label="Pages Written" value={pagesWritten == null ? "Not tracked yet" : `${pagesWritten} Pages`} icon={BarChart3} />
                <StatTile label="Current Genre" value={registration.preferredGenre || "Not selected"} />
                <StatTile label="Registered Writers" value={String(event.participantCount ?? 0)} icon={Trophy} />
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-6 lg:grid-cols-2"
          >
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Your Current Rank</p>
              {ranking ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <StatTile label="Global Rank" value={ranking.globalRank ? `#${ranking.globalRank}` : "Not ranked"} icon={Trophy} />
                  <StatTile label="Genre Rank" value={ranking.genreRank ? `#${ranking.genreRank}` : "Not ranked"} icon={Trophy} />
                  <StatTile label="Rank Change" value={ranking.rankChange || "No change"} />
                </div>
              ) : (
                <EmptyState>Ranking will appear here after real submissions and scoring are available.</EmptyState>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Script Progress</p>
              {submission ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <StatTile label="Pages" value={submission.pagesWritten == null ? "Not tracked" : String(submission.pagesWritten)} />
                  <StatTile label="Words" value={submission.wordsWritten == null ? "Not tracked" : String(submission.wordsWritten)} />
                  <StatTile label="Reading Time" value={submission.readingTime || "Not tracked"} />
                  <StatTile label="Last Saved" value={submission.lastSavedAt ? formatDateTime(submission.lastSavedAt) : "Not tracked"} />
                </div>
              ) : (
                <EmptyState>No event script is linked to this registration yet.</EmptyState>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Link
              to={`/events/${EVENT_SLUG}/write`}
              className="flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] px-5 py-4 text-sm font-semibold text-black shadow-[0_12px_30px_rgba(14,165,233,0.3)] transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(14,165,233,0.4)] active:scale-[0.98]"
            >
              <PenLine className="h-5 w-5" />
              Continue Writing
            </Link>
            <ActionButton icon={Eye} label="Preview Script" disabled />
            <ActionButton icon={Download} label="Export Draft" disabled />
            <ActionButton icon={Rocket} label="Submit Script" disabled />
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-6 lg:grid-cols-[1fr_0.9fr]"
          >
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Top Writers Right Now</p>
                {eventStatus === "live" && <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">Live</span>}
              </div>
              {leaderboard.length > 0 ? (
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-[0.14em] text-[#7f96b7]">
                      <tr>
                        <th className="px-4 py-3">Rank</th>
                        <th className="px-4 py-3">Writer</th>
                        <th className="px-4 py-3">Genre</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {leaderboard.map((item) => (
                        <tr key={`${item.rank}-${item.writer}`} className="bg-[#070b12] transition duration-200 ease-out hover:bg-[#0b1726]">
                          <td className="px-4 py-4 font-semibold text-white">{item.rank}</td>
                          <td className="px-4 py-4 text-[#d5e2f4]">{item.writer}</td>
                          <td className="px-4 py-4 text-[#9fb2cc]">{item.genre}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState>No real leaderboard data is available yet.</EmptyState>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">AI Story Feedback</p>
              {aiInsights ? (
                <div className="mt-5 grid gap-3">
                  <StatTile label="Story Score" value={aiScore == null ? "Not scored" : `${aiScore}/10`} icon={Zap} accent="text-yellow-300" />
                  <EmptyState>{aiInsights.summary || "No AI feedback summary available."}</EmptyState>
                </div>
              ) : (
                <EmptyState>No AI story feedback is available for this event script yet.</EmptyState>
              )}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-6 lg:grid-cols-3"
          >
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Latest Updates</p>
              <div className="mt-5 space-y-3">
                {announcements.length > 0 ? announcements.map((item) => (
                  <div key={item.id || item.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#070b12] p-4 text-sm text-[#d5e2f4]">
                    <Megaphone className="h-4 w-4 text-[#38bdf8]" />
                    {item.title || item.message}
                  </div>
                )) : <EmptyState>No event announcements have been posted yet.</EmptyState>}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Your Achievements</p>
              <div className="mt-5 space-y-3">
                {achievements.length > 0 ? achievements.map((item) => (
                  <div key={item.id || item.title} className="rounded-2xl border border-white/10 bg-[#070b12] p-4 text-sm text-[#d5e2f4]">
                    {item.title || item}
                  </div>
                )) : <EmptyState>No achievements have been awarded yet.</EmptyState>}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Global Activity</p>
              <div className="mt-5 space-y-3">
                {globalActivity.length > 0 ? globalActivity.map((item) => (
                  <div key={item.id || item.message} className="rounded-2xl border border-white/10 bg-[#070b12] p-4 text-sm text-[#d5e2f4]">
                    {item.message || item}
                  </div>
                )) : <EmptyState>No real-time activity is available yet.</EmptyState>}
              </div>
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
          >
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Share Your Journey</p>
              <p className="mt-4 text-sm text-[#b6c4d9]">Registered for {event.title} on Ckript.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {["Share on LinkedIn", "Share on Instagram", "Share on X"].map((label) => (
                  <button key={label} type="button" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#38bdf8]/60 hover:bg-white/5 active:scale-[0.98]">
                    <Share2 className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Ready to Submit?</p>
              <EmptyState>Final submission will unlock when event script submission tracking is connected.</EmptyState>
              <button type="button" disabled className="mt-5 inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-[#0ea5e9] px-6 py-3 text-sm font-semibold text-black opacity-50">
                <Rocket className="h-4 w-4" />
                Submit Final Script
              </button>
            </div>
          </motion.section>

          <footer className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-4 text-sm text-[#9fb2cc]">
                <Link to={`/events/${EVENT_SLUG}#rules`} className="hover:text-white">Event Rules</Link>
                <Link to={`/events/${EVENT_SLUG}`} className="hover:text-white">FAQs</Link>
                <Link to="/contact" className="hover:text-white">Support</Link>
                <Link to="/contact" className="hover:text-white">Contact</Link>
              </div>
              <p className="text-sm text-[#9fb2cc]">Need help? <span className="text-white">{event.supportEmail || "support@ckript.com"}</span></p>
            </div>
          </footer>
        </main>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-3xl border border-white/10 bg-[#07111f]/95 p-5 shadow-[0_18px_70px_rgba(0,0,0,0.35)]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Event Panel</p>
            <div className="mt-5 grid gap-3">
              <StatTile label="Current Rank" value={ranking?.globalRank ? `#${ranking.globalRank}` : "Not ranked"} icon={Trophy} accent="text-yellow-300" />
              <StatTile label="Pages Written" value={pagesWritten == null ? "Not tracked" : String(pagesWritten)} icon={PenLine} />
              <StatTile label="Time Left" value={formatShortDuration(timeLeft)} icon={Clock3} accent="text-emerald-300" />
              <StatTile label="AI Score" value={aiScore == null ? "Not scored" : String(aiScore)} icon={Zap} accent="text-yellow-300" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EventDashboard;

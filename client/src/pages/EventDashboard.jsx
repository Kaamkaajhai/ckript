import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../services/api";

const EVENT_SLUG = "ckript-global-scriptathon-2026";

const EventDashboard = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRegistration = async () => {
      if (slug !== EVENT_SLUG) {
        setError("Event not found");
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get(`/events/${slug}/registration`);
        if (!cancelled) {
          setRegistration(data?.registration || null);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "No registration found");
          setRegistration(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRegistration();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-gray-500">Loading...</div>
    );
  }

  if (error || !registration) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-2xl font-semibold text-white">Registration required</h1>
        <p className="text-sm text-[#9fb2cc]">Please register for the event to access your dashboard.</p>
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
    <div className="text-white">
      <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Participant Dashboard</p>
        <h1 className="mt-4 text-2xl sm:text-3xl font-semibold">Welcome to Scriptathon 2026</h1>
        <p className="mt-3 text-sm text-[#9fb2cc]">
          You are officially registered for the world&#39;s biggest AI-powered live screenplay writing competition.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#070b12] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Participant ID</p>
          <p className="mt-2 text-2xl font-semibold text-white">{registration.participantId}</p>
          <p className="mt-2 text-sm text-[#9fb2cc]">Prepare your story. The countdown has begun.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Profile</p>
            <p className="mt-2 text-sm text-white">{registration.fullName}</p>
            <p className="text-xs text-[#9fb2cc]">{registration.email}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Preferred Genre</p>
            <p className="mt-2 text-sm text-white">{registration.preferredGenre}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={`/events/${EVENT_SLUG}`}
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-white/40"
          >
            View event page
          </Link>
          <Link
            to="/dashboard"
            className="rounded-full bg-[#0ea5e9] px-6 py-3 text-sm font-semibold text-black"
          >
            Go to main dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventDashboard;

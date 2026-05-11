import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import MarketingHeader from "../components/MarketingHeader";
import BrandLogo from "../components/BrandLogo";
import { AuthContext } from "../context/AuthContext";
import api from "../services/api";

const EVENT_SLUG = "ckript-global-scriptathon-2026";

const EventDetails = () => {
  const { slug } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [registered, setRegistered] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    country: "",
    city: "",
    bio: "",
    socialLinks: "",
    experienceLevel: "",
    preferredGenre: "",
    participationReason: "",
    storyPlan: "",
    agreedOriginal: false,
    agreedRules: false,
  });

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

  const requireLogin = () => {
    if (!user) {
      navigate("/login");
      return false;
    }
    return true;
  };

  useEffect(() => {
    let cancelled = false;

    const loadRegistration = async () => {
      if (!user || !slug || slug !== EVENT_SLUG) return;
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

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const submitRegistration = async ({ paymentStatus, paymentAmount, paymentCurrency }) => {
    if (!requireLogin()) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = {
        ...form,
        paymentStatus,
        paymentAmount,
        paymentCurrency,
        paymentProvider: "manual",
      };
      const { data } = await api.post(`/events/${EVENT_SLUG}/register`, payload);
      const nextRegistration = data?.registration || null;
      setRegistration(nextRegistration);
      setRegistered(Boolean(nextRegistration));
      if (nextRegistration) {
        navigate(`/events/${EVENT_SLUG}/dashboard`);
      }
    } catch (err) {
      setSubmitError(err?.response?.data?.message || "Failed to register. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaidRegister = () => {
    const normalizedCountry = form.country.trim().toLowerCase();
    const isIndia = normalizedCountry === "india";
    const paymentAmount = isIndia ? 99 : 5;
    const paymentCurrency = isIndia ? "INR" : "USD";
    submitRegistration({ paymentStatus: "paid", paymentAmount, paymentCurrency });
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

  return (
    <div className="min-h-screen bg-[#05070b] text-white">
      <MarketingHeader />

      <main className="pt-28">
        <section className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-[#0b1220] via-[#05070b] to-[#0a1322] px-6 py-16 sm:px-12">
            <p className="text-xs uppercase tracking-[0.3em] text-[#7dd3fc]">Ckript Global Scriptathon 2026</p>
            <h1 className="mt-5 text-3xl sm:text-5xl font-semibold leading-tight">
              The world&#39;s first AI-powered live script writing arena.
            </h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base text-[#b6c4d9]">
              Write it. Live it. Be seen. Compete with thousands of writers in a 48-hour global competition.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRegister}
                className="rounded-full bg-[#0ea5e9] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#38bdf8]"
              >
                Register Now
              </button>
              <a
                href="#rules"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-white/40"
              >
                View Rules
              </a>
              <a
                href="#prizes"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:border-white/40"
              >
                Prize Pool
              </a>
            </div>
          </div>
        </section>

        <section id="event-registration" className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">The countdown has begun</h2>
              <p className="mt-3 text-sm text-[#9fb2cc]">48 hours. One story. Global competition. Thousands of writers. One winner.</p>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["Days", "Hours", "Minutes", "Seconds"].map((label) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-4 text-center">
                    <div className="text-2xl font-semibold text-white">00</div>
                    <div className="mt-1 text-xs uppercase tracking-wider text-[#7f96b7]">{label}</div>
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
        </section>

        <section id="prizes" className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
          <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Prizes and recognition</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                { title: "Winner", amount: "INR 5000", perks: ["Featured on Ckript homepage", "AI cinematic trailer", "Pitch opportunity to producers"] },
                { title: "Runner-Up", amount: "INR 2000", perks: ["Featured trailer", "Global visibility"] },
                { title: "Third Place", amount: "INR 500", perks: ["Special spotlight", "Community badge"] },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-[#070b12] p-5">
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
        </section>

        <section id="rules" className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
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
                <li key={rule} className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
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
              <div key={card.title} className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm text-[#9fb2cc]">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
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
                <div key={item} className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6">
              <h2 className="text-2xl font-semibold">Live competition dashboard</h2>
              <div className="mt-5 grid gap-3 text-sm text-[#9fb2cc]">
                {["Top writers", "Trending genres", "Highest story scores", "Most active participants"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
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
                  <li key={step} className="rounded-2xl border border-white/10 bg-[#070b12] p-4">
                    <span className="font-semibold">Step {index + 1}:</span> {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">Register for Scriptathon 2026</h2>
              <p className="mt-2 text-sm text-[#9fb2cc]">Join writers from around the world and write the next blockbuster.</p>

              <form className="mt-6 grid gap-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input name="fullName" value={form.fullName} onChange={handleInputChange} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white" placeholder="Full Name" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input name="email" value={form.email} onChange={handleInputChange} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white" placeholder="Email Address" />
                  <input name="phoneNumber" value={form.phoneNumber} onChange={handleInputChange} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white" placeholder="Phone Number" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <input name="country" value={form.country} onChange={handleInputChange} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white" placeholder="Country" />
                  <input name="city" value={form.city} onChange={handleInputChange} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white" placeholder="City" />
                </div>
                <textarea name="bio" value={form.bio} onChange={handleInputChange} className="min-h-[120px] rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white" placeholder="Short Bio" />
                <input name="socialLinks" value={form.socialLinks} onChange={handleInputChange} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white" placeholder="Instagram / Twitter / LinkedIn (optional)" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <select name="experienceLevel" value={form.experienceLevel} onChange={handleInputChange} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white">
                    <option value="">Previous Writing Experience</option>
                    <option>Beginner</option>
                    <option>Intermediate</option>
                    <option>Professional</option>
                  </select>
                  <select name="preferredGenre" value={form.preferredGenre} onChange={handleInputChange} className="rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white">
                    <option value="">Preferred Genre</option>
                    <option>Thriller</option>
                    <option>Sci-Fi</option>
                    <option>Drama</option>
                    <option>Romance</option>
                    <option>Anime</option>
                    <option>Action</option>
                    <option>Horror</option>
                    <option>Fantasy</option>
                    <option>Comedy</option>
                    <option>Other</option>
                  </select>
                </div>
                <textarea name="participationReason" value={form.participationReason} onChange={handleInputChange} className="min-h-[120px] rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white" placeholder="Why do you want to participate?" />
                <textarea name="storyPlan" value={form.storyPlan} onChange={handleInputChange} className="min-h-[120px] rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-white" placeholder="What kind of story are you planning to write?" />

                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-[#9fb2cc]">
                  <input name="agreedOriginal" type="checkbox" checked={form.agreedOriginal} onChange={handleCheckboxChange} className="mt-1" />
                  I confirm that all submitted work will be original and written during the event.
                </label>
                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#070b12] px-4 py-3 text-sm text-[#9fb2cc]">
                  <input name="agreedRules" type="checkbox" checked={form.agreedRules} onChange={handleCheckboxChange} className="mt-1" />
                  I agree to Ckript&#39;s competition rules and anti-cheat policies.
                </label>

                <div className="mt-2 rounded-2xl border border-white/10 bg-[#070b12] p-5">
                  <h3 className="text-lg font-semibold">Complete your registration</h3>
                  <p className="mt-2 text-sm text-[#9fb2cc]">India: INR 99 | International: USD 5</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handlePaidRegister}
                      disabled={submitting}
                      className="rounded-full bg-[#0ea5e9] px-6 py-3 text-sm font-semibold text-black disabled:opacity-60"
                    >
                      {submitting ? "Registering..." : "Pay and register"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!requireLogin()) return;
                        navigate("/dashboard");
                      }}
                      className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white"
                    >
                      Continue to dashboard
                    </button>
                  </div>
                  {!user && (
                    <p className="mt-3 text-xs text-[#7f96b7]">Login is required to complete registration.</p>
                  )}
                  {submitError && (
                    <p className="mt-3 text-xs text-red-300">{submitError}</p>
                  )}
                </div>
              </form>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">AI prompt</h2>
              <p className="mt-3 text-sm text-[#9fb2cc]">
                Use this prompt to kickstart your story. Modify to match your voice and genre.
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#070b12] p-5 text-sm text-[#d5e2f4]">
                Create a cinematic story about a protagonist who must solve a global crisis in 48 hours, balancing personal sacrifice with high-stakes consequences. Build strong dialogue, emotional arcs, and a finale that feels earned.
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-[#070b12] p-5">
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
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-8">
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
        </section>

        {registered && registration && (
          <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-8 pb-16">
            <div className="rounded-3xl border border-white/10 bg-[#0a1220] p-6 sm:p-8">
              <h2 className="text-2xl font-semibold">Welcome to Scriptathon 2026</h2>
              <p className="mt-3 text-sm text-[#9fb2cc]">
                You are officially registered for the world&#39;s biggest AI-powered live screenplay writing competition.
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-[#070b12] p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-[#7dd3fc]">Participant ID</p>
                <p className="mt-2 text-2xl font-semibold text-white">{registration.participantId}</p>
                <p className="mt-2 text-sm text-[#9fb2cc]">Prepare your story. The countdown has begun.</p>
              </div>
            </div>
          </section>
        )}
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

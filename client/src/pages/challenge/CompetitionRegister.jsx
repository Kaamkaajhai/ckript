import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Copy, Check } from "lucide-react";
import { AuthContext } from "../../context/AuthContext";
import { useDarkMode } from "../../context/DarkModeContext";
import api from "../../services/api";
import useCompetition from "../../components/competition/useCompetition";
import PhaseTimeline from "../../components/competition/PhaseTimeline";
import TagSelect from "../../components/TagSelect";
import { genres as GENRE_OPTIONS, CP_FILM_LANGUAGE_OPTIONS } from "../CreateProject/constants";
import { COUNTRIES, EXPERIENCE_LEVELS } from "./constants";

const Field = ({ label, htmlFor, required, hint, error, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-900 dark:text-white">
      {label} {required ? <span className="text-[#D14D37]">*</span> : <span className="text-gray-400">(optional)</span>}
    </label>
    {hint ? <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
    <div className="mt-2">{children}</div>
    {error ? <p className="mt-1.5 text-sm text-[#D14D37]">{error}</p> : null}
  </div>
);

const CompetitionRegister = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) || {};
  const { isDarkMode } = useDarkMode();
  const { competition, entry, phase, timeline, serverNow, loading } = useCompetition({ poll: false });

  const [form, setForm] = useState({ country: "", language: "", genres: [], experienceLevel: "", portfolioUrl: "" });
  const [acceptRules, setAcceptRules] = useState(false);
  const [acceptCopyright, setAcceptCopyright] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  // Registration only makes sense in one phase, and only once. `created` keeps the success panel up
  // right after registering, before the redirect guard would bounce us to the dashboard.
  useEffect(() => {
    if (loading || created) return;
    if (!competition) navigate("/challenge", { replace: true });
    else if (entry) navigate("/challenge/dashboard", { replace: true });
    else if (phase !== "registration_open") navigate("/challenge", { replace: true });
  }, [loading, competition, entry, phase, created, navigate]);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const next = {};
    // Membership, not just presence — the field is a <select> now, so anything else came from a
    // hand-crafted request rather than the form.
    if (!COUNTRIES.includes(form.country)) next.country = "Select your country.";
    if (!form.language) next.language = "Choose your preferred language.";
    if (!form.genres.length) next.genres = "Choose at least one genre.";
    if (form.genres.length > 3) next.genres = "Choose no more than three genres.";
    if (!form.experienceLevel) next.experienceLevel = "Select your experience level.";
    if (form.portfolioUrl.trim() && !/^https?:\/\//i.test(form.portfolioUrl.trim())) {
      next.portfolioUrl = "Portfolio link must start with http:// or https://";
    }
    setErrors(next);
    const firstKey = Object.keys(next)[0];
    if (firstKey) document.getElementById(`reg-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !firstKey;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { data } = await api.post(`/competitions/${competition._id}/register`, {
        ...form,
        portfolioUrl: form.portfolioUrl.trim(),
        acceptRules,
        acceptCopyright,
      });
      setCreated(data);
    } catch (err) {
      setServerError(err?.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !competition) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-gray-500 dark:text-gray-400">Loading…</div>;
  }

  if (created) {
    const eventId = created.entry?.eventId || "";
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">You're registered</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            You're in for <strong>{competition.name}</strong>. Keep your Event ID — it identifies your entry.
          </p>

          <div className="mx-auto mt-6 inline-flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-600 dark:bg-gray-700">
            <span className="font-mono text-xl font-bold tracking-wider text-gray-900 dark:text-white">{eventId}</span>
            <button
              type="button"
              onClick={() => { navigator.clipboard?.writeText(eventId); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="text-gray-500 hover:text-[#D14D37]"
              aria-label="Copy Event ID"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <p className="mt-6 text-sm text-gray-600 dark:text-gray-300">
            The theme is revealed when the competition starts. You'll have 48 hours to write.
          </p>

          <div className="mx-auto mt-8 max-w-sm text-left">
            <PhaseTimeline steps={created.timeline || timeline} serverNow={serverNow} compact />
          </div>

          <button
            type="button"
            onClick={() => navigate("/challenge/dashboard")}
            className="mt-8 rounded-lg bg-[#D14D37] px-6 py-3 font-semibold text-white hover:bg-[#b8402d]"
          >
            Go to my dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Register for {competition.name}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">
        A few details so we can group entries and tailor your experience. This takes a minute.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your account</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="mt-1 text-gray-900 dark:text-white">{user?.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="mt-1 break-all text-gray-900 dark:text-white">{user?.email || "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <Field label="Country" htmlFor="reg-country" required error={errors.country}>
            {/* A <select>, not the <input list> this used to be. A datalist only SUGGESTS — anything
                typed was accepted, so "USA", "United States" and "usa" all counted as different
                countries in the "N countries represented" figure the Hall of Fame publishes.
                `colorScheme` makes the native option popup follow the app's theme; without it the
                browser paints it from the OS setting and it appears white inside a dark page. */}
            <select
              id="reg-country"
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              aria-invalid={Boolean(errors.country)}
              style={{ colorScheme: isDarkMode ? "dark" : "light" }}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-[#D14D37] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Select your country…</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <Field label="Preferred language" htmlFor="reg-language" required error={errors.language}>
            <TagSelect
              id="reg-language"
              options={CP_FILM_LANGUAGE_OPTIONS}
              value={form.language}
              onChange={(v) => set("language", v)}
              ariaLabel="Preferred language"
            />
          </Field>

          <Field label="Preferred genres" htmlFor="reg-genres" required hint="Pick up to three." error={errors.genres}>
            <TagSelect
              id="reg-genres"
              options={GENRE_OPTIONS}
              value={form.genres}
              onChange={(v) => set("genres", v)}
              multiple
              max={3}
              ariaLabel="Preferred genres"
            />
          </Field>

          <Field label="Experience level" htmlFor="reg-experienceLevel" required error={errors.experienceLevel}>
            <TagSelect
              id="reg-experienceLevel"
              options={EXPERIENCE_LEVELS}
              value={form.experienceLevel}
              onChange={(v) => set("experienceLevel", v)}
              ariaLabel="Experience level"
            />
          </Field>

          <Field label="Portfolio link" htmlFor="reg-portfolioUrl" error={errors.portfolioUrl}>
            <input
              id="reg-portfolioUrl"
              type="url"
              value={form.portfolioUrl}
              onChange={(e) => set("portfolioUrl", e.target.value)}
              aria-invalid={Boolean(errors.portfolioUrl)}
              placeholder="https://"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-[#D14D37] dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </Field>
        </div>

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={acceptRules}
              onChange={(e) => setAcceptRules(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#D14D37]"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              I accept the <Link to={competition?.slug ? `/challenge/c/${competition.slug}#rules` : "/challenge"} className="font-medium text-[#D14D37] hover:underline">competition rules</Link>.
            </span>
          </label>
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={acceptCopyright}
              onChange={(e) => setAcceptCopyright(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[#D14D37]"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              I accept the copyright policy — the work I submit will be my own original writing.
            </span>
          </label>
        </div>

        {serverError ? (
          <div className="rounded-lg border border-[#D14D37]/30 bg-[#D14D37]/5 px-4 py-3 text-sm text-[#D14D37]">{serverError}</div>
        ) : null}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={!acceptRules || !acceptCopyright || submitting}
            className="rounded-lg bg-[#D14D37] px-6 py-3 font-semibold text-white transition hover:bg-[#b8402d] disabled:cursor-not-allowed disabled:bg-gray-400 dark:disabled:bg-gray-600"
          >
            {submitting ? "Registering…" : "Complete registration"}
          </button>
          <Link to={competition?.slug ? `/challenge/c/${competition.slug}` : "/challenge"} className="text-sm font-medium text-gray-600 hover:text-[#D14D37] dark:text-gray-300">
            Back to the competition
          </Link>
        </div>
      </form>
    </div>
  );
};

export default CompetitionRegister;

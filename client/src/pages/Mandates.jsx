import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { FileText, CheckCircle, Save, RefreshCw, RotateCcw } from "lucide-react";
import { useDarkMode } from "../context/DarkModeContext";

const getDefaultMandates = () => ({
  formats: [],
  genres: [],
  excludeGenres: [],
  specificHooks: [],
});

const FORMAT_OPTIONS = [
  { value: "feature", label: "Feature Film" },
  { value: "movie", label: "Movie" },
  { value: "tv_1hour", label: "TV Pilot (1-Hour)" },
  { value: "tv_halfhour", label: "TV Pilot (Half-Hour)" },
  { value: "limited_series", label: "Limited Series" },
  { value: "tv_serial", label: "TV Serial" },
  { value: "short", label: "Short Film" },
  { value: "web_series", label: "Web Series" },
  { value: "documentary", label: "Documentary" },
  { value: "anime", label: "Anime" },
  { value: "cartoon", label: "Cartoon" },
  { value: "drama_school", label: "Drama School" },
  { value: "songs", label: "Songs" },
  { value: "standup_comedy", label: "Standup Comedy" },
  { value: "dialogues", label: "Dialogues" },
  { value: "poet", label: "Poet" },
  { value: "other", label: "Other" },
];

const FORMAT_LABEL_BY_VALUE = Object.fromEntries(FORMAT_OPTIONS.map((opt) => [opt.value, opt.label]));

const normalizeMandateFormat = (value = "") => {
  const raw = String(value || "").toLowerCase().trim();
  if (!raw) return "";

  const aliases = {
    feature_film: "feature",
    "feature film": "feature",
    "tv pilot": "tv_1hour",
    "tv series": "tv_serial",
    "short film": "short",
    "web series": "web_series",
    "limited series": "limited_series",
    "drama school": "drama_school",
    "standup comedy": "standup_comedy",
  };

  if (aliases[raw]) return aliases[raw];
  if (raw.includes("tv pilot") && (raw.includes("30") || raw.includes("half"))) return "tv_halfhour";
  if (raw.includes("tv pilot") || raw.includes("tv 1-hour")) return "tv_1hour";
  if (raw.includes("standup") || raw.includes("stand-up")) return "standup_comedy";
  if (raw.includes("dialogue")) return "dialogues";
  if (raw.includes("poet") || raw.includes("poetry")) return "poet";

  return raw.replace(/[\s-]+/g, "_");
};

const Mandates = () => {
  const navigate = useNavigate();
  const { isDarkMode: dark } = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [mandates, setMandates] = useState(getDefaultMandates);

  const genres = [
    "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
    "Documentary", "Drama", "Family", "Fantasy", "Film Noir", "History",
    "Horror", "Music", "Musical", "Mystery", "Romance", "Sci-Fi",
    "Short", "Sport", "Superhero", "Thriller", "War", "Western"
  ];
  const hooks = [
    "Diverse Voices",
    "Female Lead",
    "LGBTQ+ Themes",
    "True Story",
    "Book Adaptation",
    "International Setting",
    "Period Piece",
    "Franchise Potential"
  ];

  useEffect(() => {
    fetchMandates();
  }, []);

  const fetchMandates = async () => {
    try {
      const { data } = await api.get("/users/me");
      if (data.industryProfile?.mandates) {
        const normalizedFormats = Array.isArray(data.industryProfile.mandates.formats)
          ? [...new Set(data.industryProfile.mandates.formats
            .map(normalizeMandateFormat)
            .filter((fmt) => FORMAT_LABEL_BY_VALUE[fmt]))]
          : [];

        setMandates({
          ...getDefaultMandates(),
          ...data.industryProfile.mandates,
          formats: normalizedFormats,
        });
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching mandates:", error);
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { budgetTiers, ...safeMandates } = mandates;
      await api.put("/onboarding/mandates", { mandates: safeMandates });
      navigate("/home", { replace: true });
    } catch (error) {
      console.error("Error saving mandates:", error);
      setMessage("Error saving mandates. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetMandates = () => {
    setMandates(getDefaultMandates());
    setMessage("Mandates reset. Click Save Mandates to apply changes.");
  };

  const toggleFormat = (formatValue) => {
    setMandates(prev => ({
      ...prev,
      formats: prev.formats.includes(formatValue)
        ? prev.formats.filter(f => f !== formatValue)
        : [...prev.formats, formatValue]
    }));
  };

  const toggleGenre = (genre) => {
    setMandates(prev => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter(g => g !== genre)
        : [...prev.genres, genre]
    }));
  };

  const toggleExcludeGenre = (genre) => {
    setMandates(prev => ({
      ...prev,
      excludeGenres: prev.excludeGenres.includes(genre)
        ? prev.excludeGenres.filter(g => g !== genre)
        : [...prev.excludeGenres, genre]
    }));
  };

  const toggleHook = (hook) => {
    setMandates(prev => ({
      ...prev,
      specificHooks: prev.specificHooks.includes(hook)
        ? prev.specificHooks.filter(h => h !== hook)
        : [...prev.specificHooks, hook]
    }));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? '' : 'bg-gradient-to-br from-[#f0f4f8] to-[#e8eff5]'}`}>
        <div className="text-center">
          <RefreshCw className={`w-8 h-8 animate-spin mx-auto mb-3 ${dark ? 'text-blue-400' : 'text-[#0f2544]'}`} />
          <p className={dark ? 'text-gray-400' : 'text-gray-600'}>Loading your mandates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 px-4 ${dark ? '' : 'bg-gradient-to-br from-[#f0f4f8] to-[#e8eff5]'}`}>
      <div className="max-w-4xl mx-auto">
        <div className={`rounded-2xl shadow-lg p-8 ${dark ? 'bg-[#101e30]' : 'bg-white'}`}>
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-[#0f2544]" />
            <div>
              <h1 className={`text-3xl font-extrabold tracking-tight ${dark ? 'text-gray-100' : 'text-[#0a1628]'}`}>My Mandates</h1>
              <p className={`text-sm mt-1 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>Define your project search criteria and automatically receive matching scripts</p>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.includes("Error") ? "bg-red-50 text-red-700" : "bg-[#111111]/[0.06] text-[#111111]"} flex items-center gap-2`}>
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">{message}</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-8">
            {/* Formats */}
            <div>
              <label className={`block text-sm font-bold mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                Formats (Select all that apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FORMAT_OPTIONS.map((format) => (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => toggleFormat(format.value)}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                      mandates.formats.includes(format.value)
                        ? "bg-[#0f2544] !text-white shadow-md"
                        : dark ? "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Include Genres */}
            <div>
              <label className={`block text-sm font-bold mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                Genres I'm Looking For
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      mandates.genres.includes(genre)
                        ? "bg-[#111111] !text-white shadow-md"
                        : dark ? "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Exclude Genres */}
            <div>
              <label className={`block text-sm font-bold mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                Genres to Exclude
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleExcludeGenre(genre)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      mandates.excludeGenres.includes(genre)
                        ? "bg-red-600 !text-white shadow-md"
                        : dark ? "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Specific Hooks */}
            <div>
              <label className={`block text-sm font-bold mb-3 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
                Specific Hooks & Preferences
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {hooks.map((hook) => (
                  <button
                    key={hook}
                    type="button"
                    onClick={() => toggleHook(hook)}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                      mandates.specificHooks.includes(hook)
                        ? "bg-[#0f2544] !text-white shadow-md"
                        : dark ? "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {hook}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className={`pt-6 border-t ${dark ? 'border-[#182840]' : 'border-gray-200'}`}>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleResetMandates}
                  disabled={saving}
                  className={`sm:w-52 py-4 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border ${dark ? 'bg-white/[0.04] text-gray-200 border-white/[0.08] hover:bg-white/[0.08]' : 'bg-white text-[#1e3a5f] border-gray-200 hover:bg-gray-50'}`}
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-4 bg-gradient-to-r from-[#0f2544] to-[#1a365d] !text-white font-bold rounded-xl hover:from-[#0a1628] hover:to-[#0f2544] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin !text-white" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 !text-white" />
                      Save Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className={`mt-6 border rounded-lg p-4 ${dark ? 'bg-white/[0.03] border-[#182840]' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
            <strong> How it works:</strong> Based on these mandates, our AI will automatically recommend scripts that match your criteria. 
            You'll receive notifications when new matching scripts are uploaded.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Mandates;

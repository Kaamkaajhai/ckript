import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, CheckCircle, Save, RefreshCw, RotateCcw } from "lucide-react";
import { useDarkMode } from "../../context/DarkModeContext";
import { AuthContext } from "../../context/AuthContext";
import { isFilmIndustryProfessionalRole } from "../../utils/industryAccess";
import useMandates from "./useMandates";
import { FORMAT_OPTIONS, MANDATE_GENRES, MANDATE_HOOKS, MANDATES_STATUS } from "./mandatesData";

const MandatesPage = () => {
  const navigate = useNavigate();
  const { isDarkMode: dark } = useDarkMode();
  const { user } = useContext(AuthContext) || {};
  const authorized = isFilmIndustryProfessionalRole(user);
  const mandatesState = useMandates({ enabled: authorized });
  const [message, setMessage] = useState("");
  const { mandates } = mandatesState;
  const loading = mandatesState.status === MANDATES_STATUS.IDLE || mandatesState.status === MANDATES_STATUS.LOADING;
  const saving = mandatesState.status === MANDATES_STATUS.SAVING;

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      await mandatesState.save();
      navigate("/home", { replace: true });
    } catch (error) {
      console.error("Error saving mandates:", error);
    }
  };

  const handleResetMandates = () => {
    mandatesState.reset();
    setMessage("Mandates reset. Click Save Mandates to apply changes.");
  };

  const toggleFormat = (value) => mandatesState.toggle("formats", value);
  const toggleGenre = (value) => mandatesState.toggle("genres", value);
  const toggleExcludeGenre = (value) => mandatesState.toggle("excludeGenres", value);
  const toggleHook = (value) => mandatesState.toggle("specificHooks", value);

  if (!authorized) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${dark ? '' : 'bg-gradient-to-br from-[#f0f4f8] to-[#e8eff5]'}`}>
        <div className={`max-w-lg rounded-2xl p-8 text-center ${dark ? 'bg-[#101e30]' : 'bg-white shadow-lg'}`}>
          <FileText className="w-8 h-8 mx-auto mb-3 text-[#0f2544]" />
          <h1 className={`text-2xl font-extrabold ${dark ? 'text-gray-100' : 'text-[#0a1628]'}`}>Mandates are not available for this account</h1>
          <p className={`mt-3 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>This workspace is reserved for film industry professional roles.</p>
          <button type="button" onClick={() => navigate("/home", { replace: true })} className="mt-5 px-5 py-3 rounded-lg bg-[#0f2544] !text-white font-bold">Return home</button>
        </div>
      </div>
    );
  }

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

  if (mandatesState.status === MANDATES_STATUS.FAILED) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? '' : 'bg-gradient-to-br from-[#f0f4f8] to-[#e8eff5]'}`}>
        <div className="text-center">
          <p className={dark ? 'text-gray-300' : 'text-gray-700'}>Your mandates could not be loaded.</p>
          <button type="button" onClick={mandatesState.retry} className="mt-4 px-5 py-3 rounded-lg bg-[#0f2544] !text-white font-bold">Try again</button>
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

          {(message || mandatesState.saveFailure) && (
            <div className={`mb-6 p-4 rounded-lg ${mandatesState.saveFailure ? "bg-red-50 text-red-700" : "bg-[#111111]/[0.06] text-[#111111]"} flex items-center gap-2`}>
              <CheckCircle className="w-5 h-5" />
              <p className="font-medium">{mandatesState.saveFailure ? "Error saving mandates. Please try again." : message}</p>
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
                {MANDATE_GENRES.map((genre) => (
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
                {MANDATE_GENRES.map((genre) => (
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
                {MANDATE_HOOKS.map((hook) => (
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

export default MandatesPage;

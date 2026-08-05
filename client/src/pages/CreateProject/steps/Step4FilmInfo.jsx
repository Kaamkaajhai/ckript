import { useCreateProject } from "../CreateProjectContext";
import { CP_FILM_LANGUAGE_OPTIONS } from "../constants";

const Step4FilmInfo = () => {
  const {
    cardCls, chipCls, dark, filmDetails, inputCls, setFilmDetails,
  } = useCreateProject();

  return (
    <>
            <div className={`${cardCls} p-6 sm:p-8 space-y-6`}>
              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Film Production Details</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Help industry professionals understand your vision and involvement. Film language is required.</p>
              </div>

              {/* Creative Role */}
              <div>
                <h3 className={`text-sm font-semibold mb-3 ${dark ? "text-gray-300" : "text-gray-700"}`}>Your Creative Role</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: "wantToDirect", label: "Want to Direct", sub: "I want to direct this script myself", color: dark ? "border-white bg-white/10" : "border-black bg-gray-50", textColor: dark ? "text-white" : "text-black" },
                    { key: "wantToProduce", label: "Want to Produce", sub: "I am also the producer of this project", color: dark ? "border-white bg-white/10" : "border-black bg-gray-50", textColor: dark ? "text-white" : "text-black" },
                  ].map(({ key, label, sub, color, textColor }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilmDetails((fd) => ({ ...fd, [key]: !fd[key] }))}
                      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${filmDetails[key]
                        ? color
                        : dark ? "border-[#1d3350] bg-[#080f1a] hover:border-[#2a4a6a]" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-bold ${filmDetails[key] ? textColor : dark ? "text-gray-200" : "text-gray-800"}`}>{label}</p>
                        <p className={`text-[11px] mt-0.5 ${dark ? "text-gray-500" : "text-gray-500"}`}>{sub}</p>
                      </div>
                      {filmDetails[key] && (
                        <svg className={`w-4 h-4 ml-auto shrink-0 ${textColor}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Film Language */}
              <div>
                <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Film Language <span className="text-red-500">*</span></h3>
                <div className="flex flex-wrap gap-2">
                  {CP_FILM_LANGUAGE_OPTIONS.map((lang) => (
                    <button key={lang} type="button"
                      onClick={() => setFilmDetails((fd) => ({ ...fd, filmLanguage: fd.filmLanguage === lang ? "" : lang }))}
                      className={chipCls(filmDetails.filmLanguage === lang)}>
                      {lang}
                    </button>
                  ))}
                </div>
                {filmDetails.filmLanguage === "Other" && (
                  <input type="text" placeholder="Specify language..." value={filmDetails.filmLanguageCustom || ""}
                    onChange={(e) => setFilmDetails((fd) => ({ ...fd, filmLanguageCustom: e.target.value }))}
                    className={`${inputCls} mt-3`} maxLength={80} />
                )}
              </div>

              {/* Dialogues */}
              <div>
                <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Dialogues</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "yes", label: "Yes — Full Dialogues" },
                    { value: "partial", label: "Partial — Some Dialogues" },
                    { value: "no", label: "No — Action/Direction Only" },
                  ].map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setFilmDetails((fd) => ({ ...fd, dialoguesPresent: opt.value }))}
                      className={chipCls(filmDetails.dialoguesPresent === opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
    </>
  );
};

export default Step4FilmInfo;

import { useCreateProject } from "../CreateProjectContext";
import { genres, toneOptions, themeOptions, settingOptions } from "../constants";

const Step3Classify = () => {
  const {
    cardCls, chipCls, classification, dark, formData, inputCls, setFormData, toggleChip,
  } = useCreateProject();

  return (
    <>
            <div className={`${cardCls} p-6 sm:p-8 space-y-6`}>
              <div>
                <h2 className={`text-lg font-bold mb-1 ${dark ? "text-gray-100" : "text-gray-900"}`}>Deep Classification</h2>
                <p className={`text-xs ${dark ? "text-gray-500" : "text-gray-400"}`}>Help readers discover your script by specifying its genre and tone.</p>
              </div>

              <div>
                <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>Primary Genre *</h3>
                <select
                  name="primaryGenre"
                  value={formData.primaryGenre}
                  onChange={(e) => setFormData(fd => ({ ...fd, primaryGenre: e.target.value }))}
                  className={inputCls}
                >
                  <option value="" disabled>Select a Primary Genre...</option>
                  {genres.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              {[{ label: "Tones", key: "tones", opts: toneOptions }, { label: "Themes", key: "themes", opts: themeOptions }, { label: "Settings", key: "settings", opts: settingOptions }].map(({ label, key, opts }) => (
                <div key={key}>
                  <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>{label} <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>({classification[key].length}/3)</span></h3>
                  <select
                    className={inputCls}
                    value=""
                    onChange={(e) => {
                      if (e.target.value && classification[key].length < 3 && !classification[key].includes(e.target.value)) {
                        toggleChip(key, e.target.value);
                      }
                    }}
                    disabled={classification[key].length >= 3}
                  >
                    <option value="" disabled>Select {label.toLowerCase().slice(0, -1)}...</option>
                    {opts.filter(v => !classification[key].includes(v)).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  {classification[key].length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {classification[key].map(v => (
                        <button key={v} type="button" onClick={() => toggleChip(key, v)} className={chipCls(true)}>
                          {v} <span className="ml-1 opacity-60">×</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
    </>
  );
};

export default Step3Classify;

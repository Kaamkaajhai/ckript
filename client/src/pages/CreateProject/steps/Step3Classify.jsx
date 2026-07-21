import { useCreateProject } from "../CreateProjectContext";
import { genres, toneOptions, themeOptions, settingOptions } from "../constants";
import TagSelect from "../../../components/TagSelect";

const Step3Classify = () => {
  const {
    cardCls, classification, dark, formData, setFormData, toggleChip,
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
                <TagSelect
                  ariaLabel="Primary genre"
                  options={genres}
                  value={formData.primaryGenre}
                  onChange={(v) => setFormData((fd) => ({ ...fd, primaryGenre: v }))}
                  dark={dark}
                />
              </div>

              {/* Tones / Themes / Settings — the same tag surface, capped at 3 each. Selecting and
                  de-selecting both happen in place, so there's no separate "chosen" row to reconcile. */}
              {[{ label: "Tones", key: "tones", opts: toneOptions }, { label: "Themes", key: "themes", opts: themeOptions }, { label: "Settings", key: "settings", opts: settingOptions }].map(({ label, key, opts }) => (
                <div key={key}>
                  <h3 className={`text-sm font-semibold mb-2.5 ${dark ? "text-gray-300" : "text-gray-700"}`}>
                    {label} <span className={`text-xs font-normal ${dark ? "text-gray-600" : "text-gray-400"}`}>({classification[key].length}/3)</span>
                  </h3>
                  <TagSelect
                    ariaLabel={label}
                    options={opts}
                    value={classification[key]}
                    // toggleChip already owns the add/remove + 3-item cap, so drive it per changed tag
                    // rather than replacing the array wholesale.
                    onChange={(next) => {
                      const before = classification[key];
                      const changed = next.length > before.length
                        ? next.find((v) => !before.includes(v))
                        : before.find((v) => !next.includes(v));
                      if (changed) toggleChip(key, changed);
                    }}
                    multiple
                    max={3}
                    dark={dark}
                  />
                </div>
              ))}
            </div>
    </>
  );
};

export default Step3Classify;

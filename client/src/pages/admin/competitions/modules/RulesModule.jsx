import React from "react";
import { Plus, Trash2, AlertCircle } from "lucide-react";

/**
 * Rules, eligibility and FAQ — the fields the writer-facing pages render and the new console
 * had no editor for.
 *
 * `rules` is not cosmetic: adminPublishCompetition refuses to publish a competition without at
 * least one non-blank rule, and the new-competition seed is `[""]`. With no editor for it, every
 * competition created here was permanently unpublishable, which meant nothing new could ever reach
 * /challenge, the Hall of Fame or the landing strip — all of which filter on lifecycle "published".
 *
 * `eligibility` and `faq` are rendered by CompetitionLanding and were in the same position: live on
 * the public page, editable nowhere.
 */
export default function RulesModule({ data, onChange }) {
  const rules = data.rules || [];
  const faq = data.faq || [];

  const setRule = (index, value) => {
    const next = [...rules];
    next[index] = value;
    onChange("rules", next);
  };
  const addRule = () => onChange("rules", [...rules, ""]);
  const removeRule = (index) => onChange("rules", rules.filter((_, i) => i !== index));

  const setFaq = (index, key, value) => {
    const next = [...faq];
    next[index] = { ...next[index], [key]: value };
    onChange("faq", next);
  };
  const addFaq = () => onChange("faq", [...faq, { q: "", a: "" }]);
  const removeFaq = (index) => onChange("faq", faq.filter((_, i) => i !== index));

  const publishable = rules.some((r) => String(r || "").trim());

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Rules</h2>
            <p className="text-sm text-[#666] mt-1">
              Shown on the competition page. At least one is required before you can publish.
            </p>
          </div>
          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Rule
          </button>
        </div>

        {/* States the publish precondition where the admin can act on it, rather than letting them
            discover it as a 400 from the Publish button. */}
        {!publishable ? (
          <div className="flex items-start gap-2 mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              Add at least one rule — a competition cannot be published without one.
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          {rules.length === 0 ? (
            <p className="text-sm text-[#888] italic">No rules yet.</p>
          ) : rules.map((rule, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="mt-2.5 text-xs font-mono text-[#999] w-6 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <textarea
                value={rule}
                onChange={(e) => setRule(i, e.target.value)}
                rows={2}
                placeholder="e.g. The script must be written entirely within the 48-hour window."
                className="flex-1 px-3 py-2 border border-[#eaeaea] rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#111]/10"
              />
              <button
                type="button"
                onClick={() => removeRule(i)}
                aria-label={`Remove rule ${i + 1}`}
                className="mt-1.5 p-2 text-[#999] hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <h2 className="text-xl font-serif font-bold text-[#111]">Who can enter</h2>
        <p className="text-sm text-[#666] mt-1 mb-4">
          Rendered on the competition page beneath the eligibility examples.
        </p>
        <textarea
          value={data.eligibility || ""}
          onChange={(e) => onChange("eligibility", e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Open to anyone who writes, anywhere in the world."
          className="w-full px-3 py-2 border border-[#eaeaea] rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#111]/10"
        />

        {/* Sits with eligibility because it answers the same question — what may I submit. It is
            rendered beside Eligibility in the About grid and on the entrant dashboard, and had no
            editor at all, so every competition was stuck on the schema default. */}
        <label className="block mt-6">
          <span className="block text-sm font-semibold text-[#111]">Format</span>
          <span className="block text-xs text-[#666] mt-0.5 mb-2">
            What may be submitted. Shown beside Eligibility on the competition page.
          </span>
          <input
            value={data.format || ""}
            onChange={(e) => onChange("format", e.target.value)}
            placeholder="e.g. Short film, 5-10 pages"
            className="w-full px-3 py-2 border border-[#eaeaea] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#111]/10"
          />
        </label>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">FAQ</h2>
            <p className="text-sm text-[#666] mt-1">Answers shown at the foot of the competition page.</p>
          </div>
          <button
            type="button"
            onClick={addFaq}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Question
          </button>
        </div>

        <div className="space-y-4">
          {faq.length === 0 ? (
            <p className="text-sm text-[#888] italic">No questions yet.</p>
          ) : faq.map((item, i) => (
            <div key={i} className="p-4 border border-[#eaeaea] rounded-xl space-y-2">
              <div className="flex items-start gap-3">
                <input
                  value={item?.q || ""}
                  onChange={(e) => setFaq(i, "q", e.target.value)}
                  placeholder="Question"
                  className="flex-1 px-3 py-2 border border-[#eaeaea] rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#111]/10"
                />
                <button
                  type="button"
                  onClick={() => removeFaq(i)}
                  aria-label={`Remove question ${i + 1}`}
                  className="p-2 text-[#999] hover:text-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <textarea
                value={item?.a || ""}
                onChange={(e) => setFaq(i, "a", e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Answer"
                className="w-full px-3 py-2 border border-[#eaeaea] rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#111]/10"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

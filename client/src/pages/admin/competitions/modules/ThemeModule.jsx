import React from "react";

export default function ThemeModule({ data, onChange }) {
  const theme = data.theme || {};

  const handleThemeChange = (e) => {
    onChange("theme", { ...theme, [e.target.name]: e.target.value });
  };

  const handleArrayChange = (name, value) => {
    const array = value.split(',').map(item => item.trim()).filter(Boolean);
    onChange("theme", { ...theme, [name]: array });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Theme Reveal */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm relative overflow-hidden">
        {/* Subtle Lock overlay if theme hasn't dropped yet */}
        {!data.dates?.startsAt || new Date(data.dates.startsAt) > new Date() ? (
          <div className="absolute top-4 right-4 bg-[#fff4e5] text-[#c97b3a] px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Hidden from public until start
          </div>
        ) : null}

        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold text-[#111]">The Theme & Prompt</h2>
          <p className="text-sm text-[#666] mt-1">This is strictly hidden from the API until the competition officially starts.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Theme Title</label>
            <input
              type="text"
              name="title"
              value={theme.title || ""}
              onChange={handleThemeChange}
              placeholder="e.g. A Lie Told Often"
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
            />
          </div>

          {/* theme.guidelines, not writingPrompt. The prompt field was rendered by nothing, while
              guidelines renders on the competition page and on every entrant's dashboard and had no
              editor at all — so that block could never appear for anything built here. */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Guidelines</label>
            <textarea
              name="guidelines"
              value={theme.guidelines || ""}
              onChange={handleThemeChange}
              placeholder="What the theme asks for, and how literally to take it."
              rows={3}
              className="w-full px-4 py-3 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] font-serif text-lg resize-y"
            />
            <p className="text-xs text-[#888]">Shown on the competition page and on each entrant's dashboard.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Extended Brief / Guidelines</label>
            <textarea
              name="brief"
              value={theme.brief || ""}
              onChange={handleThemeChange}
              placeholder="Provide more context, tone, or specific requirements..."
              rows={6}
              className="w-full px-4 py-3 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] resize-y"
            />
          </div>
        </div>
      </div>

      {/* Constraints */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold text-[#111]">Requirements</h2>
          {/* Allowed Genres only. Allowed Languages, Required Length and Restricted Topics were
              published to writers as hard rules but rendered by nothing and enforced nowhere —
              submitCompetitionEntry's only content check is a minimum length. Schema fields stay. */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Allowed Genres (Comma separated)</label>
            <input
              type="text"
              value={(theme.allowedGenres || []).join(", ")}
              onChange={(e) => handleArrayChange("allowedGenres", e.target.value)}
              placeholder="e.g. Sci-Fi, Thriller, Drama"
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
            />
          </div>
        </div>
      </div>
      
    </div>
  );
}

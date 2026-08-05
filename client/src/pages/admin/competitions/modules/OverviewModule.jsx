import React from "react";

/**
 * Basics — the fields that identify the competition, and nothing else.
 *
 * This module also carried a "Copywriting" card (shortName, tagline, shortDescription) and a
 * "Classification" card (eventType, difficulty, host, language). Not one of those seven is read by
 * any competition page, Hall of Fame view or card component — they were built for an Explore page
 * that no longer exists, so an admin filling them in was writing to nothing. The schema fields
 * remain; dropping columns from a live collection is a migration, not a UI change.
 *
 * `overview` lives here too: it is rendered on the competition page AND it is a publish
 * precondition, so it belongs with the identity fields rather than in a copywriting section.
 */
export default function OverviewModule({ data, onChange }) {
  const handleChange = (e) => {
    onChange(e.target.name, e.target.value);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold text-[#111]">Basics</h2>
          <p className="text-sm text-[#666] mt-1">The fundamental details that identify your event.</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Competition Name *</label>
              <input
                type="text"
                name="name"
                value={data.name || ""}
                onChange={handleChange}
                placeholder="e.g. Ckript Global Script Challenge"
                className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] focus:border-transparent transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">URL Slug (Auto-generated)</label>
              <input
                type="text"
                name="slug"
                value={data.slug || ""}
                readOnly
                placeholder="ckript-global-challenge"
                className="w-full px-4 py-2.5 bg-[#f4f2f0] border border-[#e4e2e0] rounded-xl text-[#888] cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Visibility</label>
            <select
              name="visibility"
              value={data.visibility || "public"}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] transition-all"
            >
              <option value="public">Public — listed everywhere</option>
              <option value="hidden">Hidden — not listed, reachable by direct link</option>
              <option value="private">Private — not listed, reachable by direct link</option>
            </select>
            {/* Visibility controls DISCOVERY, never access: hidden and private both stay fully
                usable for anyone holding the link. To make a competition unreachable, keep its
                lifecycle at draft. The old labels implied private was the most restrictive
                setting, which is what let a "private" competition sit in the Hall of Fame. */}
            <p className="text-xs text-[#888]">
              Hidden and private both mean &ldquo;not listed&rdquo;. Neither blocks the direct link
              &mdash; use Draft for that.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Overview *</label>
            <textarea
              name="overview"
              value={data.overview || ""}
              onChange={handleChange}
              rows={5}
              maxLength={5000}
              placeholder="What this competition is, in a paragraph."
              className="w-full px-4 py-3 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] resize-y transition-all"
            />
            <p className="text-xs text-[#888]">Opens the competition page. Required before publishing.</p>
          </div>
        </div>
      </div>

    </div>
  );
}

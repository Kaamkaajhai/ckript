import React from "react";

export default function OverviewModule({ data, onChange }) {
  const handleChange = (e) => {
    onChange(e.target.name, e.target.value);
  };

  const handleNestedChange = (e, objectKey) => {
    onChange(objectKey, { ...data[objectKey], [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Basics Section */}
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
              <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Short Name</label>
              <input
                type="text"
                name="shortName"
                value={data.shortName || ""}
                onChange={handleChange}
                placeholder="e.g. Challenge 04"
                className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Visibility</label>
              <select
                name="visibility"
                value={data.visibility || "public"}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] transition-all"
              >
                <option value="public">Public (Visible in Hall of Fame)</option>
                <option value="hidden">Hidden (Anyone with link can join)</option>
                <option value="private">Private (Invite only)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Copywriting Section */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold text-[#111]">Copywriting</h2>
          <p className="text-sm text-[#666] mt-1">Taglines and descriptions used across the platform and marketing.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Tagline</label>
            <input
              type="text"
              name="tagline"
              value={data.tagline || ""}
              onChange={handleChange}
              placeholder="e.g. Write. Compete. Get Discovered."
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Short Description (For Event Cards)</label>
            <textarea
              name="shortDescription"
              value={data.shortDescription || ""}
              onChange={handleChange}
              placeholder="A brief 1-2 sentence description..."
              rows={2}
              className="w-full px-4 py-3 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] transition-all resize-y"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Full Overview (Markdown Supported)</label>
            <textarea
              name="overview"
              value={data.overview || ""}
              onChange={handleChange}
              placeholder="Detailed description of the event..."
              rows={8}
              className="w-full px-4 py-3 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#111] transition-all resize-y"
            />
          </div>
        </div>
      </div>

      {/* Classification Section */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold text-[#111]">Classification</h2>
          <p className="text-sm text-[#666] mt-1">Categorize the event for the Explore page.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Event Type</label>
            <select
              name="eventType"
              value={data.eventType || "Global Challenge"}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
            >
              <option value="Global Challenge">Global Challenge</option>
              <option value="Workshop">Workshop</option>
              <option value="Mentorship Program">Mentorship Program</option>
              <option value="Fellowship">Fellowship</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Difficulty</label>
            <select
              name="difficulty"
              value={data.difficulty || "All Levels"}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
            >
              <option value="All Levels">All Levels</option>
              <option value="Beginner Friendly">Beginner Friendly</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced / Pro">Advanced / Pro</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Host / Organizer</label>
            <input
              type="text"
              name="host"
              value={data.host || ""}
              onChange={handleChange}
              placeholder="e.g. Ckript Studios"
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Language</label>
            <input
              type="text"
              name="language"
              value={data.language || "English"}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
            />
          </div>
        </div>
      </div>
      
    </div>
  );
}

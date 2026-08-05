import React from "react";
import { UploadCloud, Image as ImageIcon, Smartphone, Layout, Monitor } from "lucide-react";

/* The hero banner, and nothing else.
 *
 * Also here, until now: a Mobile Banner and Official Logo pair, and an entire "Event Card Details"
 * card (cardThumbnailUrl, cardConfig.badge / cardAccent / buttonText). Nothing renders any of them —
 * the card that actually gets drawn is components/competition/CompetitionCard.jsx, which reads
 * bannerUrl, phase, name, theme, dates and prizePool and none of the cardConfig fields. They were
 * built for the explore page that has since been removed. Schema fields stay; this is a UI change. */
export default function BrandingModule({ data, onChange }) {
  const handleChange = (e) => {
    onChange(e.target.name, e.target.value);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Uploads Section */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Branding & Media</h2>
            <p className="text-sm text-[#666] mt-1">Manage the visual identity of your competition.</p>
          </div>
          <button className="px-4 py-2 bg-[#f4f2f0] hover:bg-[#e4e2e0] text-[#111] text-sm font-semibold rounded-lg transition-colors">
            Open Media Library
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8">
          
          {/* Main Hero Banner */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-[#555] uppercase tracking-wide">
              <Monitor size={14} /> Desktop Hero Banner (1920x1080)
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  name="bannerUrl"
                  value={data.bannerUrl || ""}
                  onChange={handleChange}
                  placeholder="https://res.cloudinary.com/.../banner.jpg"
                  className="w-full px-4 py-3 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] transition-all"
                />
              </div>
              <button className="px-6 bg-white border border-[#eaeaea] hover:border-[#111] rounded-xl flex flex-col items-center justify-center gap-1 text-[#555] hover:text-[#111] transition-all shrink-0">
                <UploadCloud size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
              </button>
            </div>
            {data.bannerUrl && (
              <div className="w-full h-40 mt-3 rounded-xl overflow-hidden border border-[#eaeaea] bg-[#f4f2f0]">
                <img src={data.bannerUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

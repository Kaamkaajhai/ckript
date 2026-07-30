import React from "react";
import { Link2, Search, Settings } from "lucide-react";

export default function SeoModule({ data, onChange }) {
  const seo = data.seo || {};

  const handleSeoChange = (e) => {
    onChange("seo", { ...seo, [e.target.name]: e.target.value });
  };

  const handleKeywordsChange = (e) => {
    const array = e.target.value.split(',').map(item => item.trim()).filter(Boolean);
    onChange("seo", { ...seo, keywords: array });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-2 bg-[#f4f2f0] text-[#111] rounded-lg"><Search size={18} /></div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Search Engine Optimization</h2>
            <p className="text-sm text-[#666] mt-1">Control how this competition appears on Google and social media shares.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wide">SEO Meta Title</label>
            <input
              type="text"
              name="metaTitle"
              value={seo.metaTitle || ""}
              onChange={handleSeoChange}
              placeholder="e.g. Ckript Global Challenge | Screenwriting Competition"
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] transition-all"
            />
            <p className="text-xs text-[#888]">Keep under 60 characters for best display on search engines.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wide">Meta Description</label>
            <textarea
              name="metaDescription"
              value={seo.metaDescription || ""}
              onChange={handleSeoChange}
              placeholder="Join the world's most prestigious screenwriting challenge..."
              rows={3}
              className="w-full px-4 py-3 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] transition-all resize-y"
            />
            <p className="text-xs text-[#888]">Keep under 160 characters. This appears below the title in search results.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wide">Keywords (Comma Separated)</label>
            <input
              type="text"
              value={(seo.keywords || []).join(", ")}
              onChange={handleKeywordsChange}
              placeholder="screenwriting, contest, scripts, ckript"
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111] transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wide">Canonical URL (Optional)</label>
            <input
              type="text"
              name="canonicalUrl"
              value={seo.canonicalUrl || ""}
              onChange={handleSeoChange}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#111] transition-all"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

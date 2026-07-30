import React from "react";
import { UploadCloud, Image as ImageIcon, Smartphone, Layout, Monitor } from "lucide-react";

export default function BrandingModule({ data, onChange }) {
  const handleChange = (e) => {
    onChange(e.target.name, e.target.value);
  };

  const handleCardConfigChange = (e) => {
    onChange("cardConfig", { ...data.cardConfig, [e.target.name]: e.target.value });
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

          {/* Mobile Banner & Logo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-[#f4f2f0]">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-[#555] uppercase tracking-wide">
                <Smartphone size={14} /> Mobile Banner (1080x1350)
              </label>
              <input
                type="text"
                name="mobileBannerUrl"
                value={data.mobileBannerUrl || ""}
                onChange={handleChange}
                placeholder="Image URL"
                className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
              />
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs font-bold text-[#555] uppercase tracking-wide">
                <ImageIcon size={14} /> Official Logo (Square/Transparent)
              </label>
              <input
                type="text"
                name="logoUrl"
                value={data.logoUrl || ""}
                onChange={handleChange}
                placeholder="Image URL"
                className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
              />
            </div>
          </div>
          
        </div>
      </div>

      {/* Event Card Configuration */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold text-[#111]">Event Card Details</h2>
          <p className="text-sm text-[#666] mt-1">Configure how the competition appears on the explore and landing pages.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-bold text-[#555] uppercase tracking-wide">
              <Layout size={14} /> Card Thumbnail (1200x630)
            </label>
            <input
              type="text"
              name="cardThumbnailUrl"
              value={data.cardThumbnailUrl || ""}
              onChange={handleChange}
              placeholder="If blank, uses Desktop Hero Banner"
              className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Card Accent Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  name="cardAccent"
                  value={data.cardConfig?.cardAccent || "#c94b3a"}
                  onChange={handleCardConfigChange}
                  className="w-12 h-12 p-1 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl cursor-pointer"
                />
                <input
                  type="text"
                  name="cardAccent"
                  value={data.cardConfig?.cardAccent || "#c94b3a"}
                  onChange={handleCardConfigChange}
                  className="flex-1 px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none font-mono text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#555] uppercase tracking-wide">Button Text</label>
              <input
                type="text"
                name="buttonText"
                value={data.cardConfig?.buttonText || "Reserve Your Spot"}
                onChange={handleCardConfigChange}
                placeholder="Reserve Your Spot"
                className="w-full px-4 py-2.5 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#111]"
              />
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  );
}

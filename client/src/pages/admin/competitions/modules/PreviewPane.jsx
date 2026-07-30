import React from "react";
import { ArrowRight, Trophy, Users, Clock, MapPin } from "lucide-react";

const getSafeUrl = (urlStr) => {
  if (!urlStr || typeof urlStr !== 'string') return "";
  const trimmed = urlStr.trim();
  if (trimmed.startsWith("/")) return trimmed; // allow relative paths
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:" || parsed.protocol === "data:") {
      return parsed.href;
    }
  } catch {
    // ignore invalid URLs
  }
  return "";
};

export default function PreviewPane({ data, isVisible, onClose }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white border-l border-[#eaeaea] shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
      
      {/* Header */}
      <div className="h-16 px-6 border-b border-[#eaeaea] flex items-center justify-between shrink-0 bg-[#fbfbfa]">
        <h2 className="text-base font-bold font-serif text-[#111]">Live Preview</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-[#e4e2e0] rounded-lg text-[#555] transition-colors"
        >
          Close
        </button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto bg-[#f4f2f0] p-8">
        
        <div className="mb-8">
          <p className="text-xs font-bold text-[#888] uppercase tracking-wider mb-2">Event Card Preview</p>
          <p className="text-xs text-[#666] mb-4">This is how your event will look on the explore page.</p>
          
          {/* Card Mockup */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all border border-[#eaeaea] group max-w-sm mx-auto">
            {/* Banner */}
            <div className="h-48 relative overflow-hidden bg-[#111]">
              {(data.cardThumbnailUrl || data.bannerUrl) ? (
                <img 
                  src={getSafeUrl(data.cardThumbnailUrl || data.bannerUrl)} 
                  alt={data.name}
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700" 
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#333] to-[#111] opacity-90" />
              )}
              
              {data.cardConfig?.badge && (
                <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full">
                  <span className="text-xs font-bold tracking-wide" style={{ color: data.cardConfig?.cardAccent || '#c94b3a' }}>
                    {data.cardConfig.badge}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: data.cardConfig?.cardAccent || '#c94b3a' }} />
                <span className="text-xs font-bold tracking-widest text-[#555] uppercase">{data.lifecycle}</span>
              </div>
              
              <h3 className="text-2xl font-bold font-serif text-[#111] leading-tight mb-2">
                {data.name || "Untitled Competition"}
              </h3>
              
              <p className="text-[#666] text-sm mb-6 line-clamp-2">
                {data.shortDescription || data.overview?.substring(0, 100) || "Add a description to see it here..."}
              </p>
              
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1">Prize Pool</span>
                  <span className="text-sm font-semibold text-[#111] flex items-center gap-1.5">
                    <Trophy size={14} style={{ color: data.cardConfig?.cardAccent || '#c94b3a' }} />
                    {data.prizePool || "TBA"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1">Deadline</span>
                  <span className="text-sm font-semibold text-[#111] flex items-center gap-1.5">
                    <Clock size={14} className="text-[#666]" />
                    {data.dates?.regClosesAt ? new Date(data.dates.regClosesAt).toLocaleDateString() : "TBA"}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                style={{ backgroundColor: data.cardConfig?.cardAccent || '#c94b3a', boxShadow: `0 4px 14px 0 ${data.cardConfig?.cardAccent || '#c94b3a'}40` }}
              >
                {data.cardConfig?.buttonText || "Reserve Your Spot"}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

import React from "react";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import { adminApi } from "../../dashboardShared";

export default function SponsorsModule({ data, onChange }) {
  const sponsors = data.sponsors || [];

  const addSponsor = () => {
    onChange("sponsors", [
      ...sponsors,
      { name: "", logoUrl: "", url: "", tier: "Gold", description: "", visibility: "public" }
    ]);
  };

  const updateSponsor = (index, key, value) => {
    const updated = [...sponsors];
    updated[index] = { ...updated[index], [key]: value };
    onChange("sponsors", updated);
  };

  const removeSponsor = (index) => {
    const updated = sponsors.filter((_, i) => i !== index);
    onChange("sponsors", updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Sponsors & Partners</h2>
            <p className="text-sm text-[#666] mt-1">Add organizations supporting this competition.</p>
          </div>
          <button 
            onClick={addSponsor}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Sponsor
          </button>
        </div>

        <div className="space-y-6">
          {sponsors.length === 0 ? (
            <div className="text-center py-12 bg-[#f9f8f6] border border-dashed border-[#ccc] rounded-xl">
              <p className="text-[#888]">No sponsors added yet. Click "Add Sponsor" to create one.</p>
            </div>
          ) : (
            sponsors.map((sponsor, idx) => (
              <div key={idx} className="flex gap-6 p-6 bg-[#fbfbfa] border border-[#eaeaea] rounded-2xl group hover:border-[#ccc] transition-colors relative">
                
                
                {/* Logo Area */}
                <div className="ml-6 w-32 shrink-0 space-y-3">
                  <div className="w-32 h-32 rounded-xl border border-[#e4e2e0] overflow-hidden bg-white flex relative items-center justify-center p-4 group">
                    {sponsor.logoUrl ? (
                      <img src={sponsor.logoUrl} alt={sponsor.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#aaa]">
                        <ImageIcon size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-center">Logo<br/>(Transparent)</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-opacity">
                      Upload
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            try {
                              const formData = new FormData();
                              formData.append("image", file);
                              const { data: resData } = await adminApi.post("/admin/competitions/upload", formData, {
                                headers: { "Content-Type": "multipart/form-data" }
                              });
                              updateSponsor(idx, "logoUrl", resData.url);
                            } catch (err) {
                              alert("Failed to upload image.");
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={sponsor.logoUrl}
                    onChange={(e) => updateSponsor(idx, "logoUrl", e.target.value)}
                    placeholder="Image URL"
                    className="w-full px-2 py-1.5 bg-white border border-[#e4e2e0] rounded-lg text-xs focus:outline-none focus:border-[#111]"
                  />
                </div>

                {/* Details Area */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">Organization Name</label>
                    <input
                      type="text"
                      value={sponsor.name}
                      onChange={(e) => updateSponsor(idx, "name", e.target.value)}
                      placeholder="e.g. Final Draft"
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm font-bold focus:outline-none focus:border-[#111]"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">Tier / Category</label>
                    <select
                      value={sponsor.tier}
                      onChange={(e) => updateSponsor(idx, "tier", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
                    >
                      <option value="Headline">Headline Partner</option>
                      <option value="Gold">Gold Sponsor</option>
                      <option value="Silver">Silver Sponsor</option>
                      <option value="Bronze">Bronze Sponsor</option>
                      <option value="Community">Community Partner</option>
                      <option value="Media">Media Partner</option>
                    </select>
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">Website URL</label>
                    <input
                      type="text"
                      value={sponsor.url}
                      onChange={(e) => updateSponsor(idx, "url", e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-xs text-[#666] focus:outline-none focus:border-[#111]"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">Company Bio / Description</label>
                    <textarea
                      value={sponsor.description || ""}
                      onChange={(e) => updateSponsor(idx, "description", e.target.value)}
                      placeholder="Short bio about the sponsor..."
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111] resize-y"
                    />
                  </div>

                </div>

                <button 
                  onClick={() => removeSponsor(idx)}
                  className="absolute right-4 top-4 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

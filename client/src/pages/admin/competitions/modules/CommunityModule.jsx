import React from "react";
import { Plus, GripVertical, Trash2 } from "lucide-react";

export default function CommunityModule({ data, onChange }) {
  const links = data.communityLinks || [];

  const addLink = () => {
    onChange("communityLinks", [
      ...links,
      { label: "", url: "", icon: "Link" }
    ]);
  };

  const updateLink = (index, key, value) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [key]: value };
    onChange("communityLinks", updated);
  };

  const removeLink = (index) => {
    const updated = links.filter((_, i) => i !== index);
    onChange("communityLinks", updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Community & Social</h2>
            <p className="text-sm text-[#666] mt-1">Add Discord, WhatsApp, or Social links for participants to connect.</p>
          </div>
          <button 
            onClick={addLink}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Link
          </button>
        </div>

        <div className="space-y-4">
          {links.length === 0 ? (
            <div className="text-center py-12 bg-[#f9f8f6] border border-dashed border-[#ccc] rounded-xl">
              <p className="text-[#888]">No community links added yet.</p>
            </div>
          ) : (
            links.map((link, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-[#fbfbfa] border border-[#eaeaea] rounded-xl group hover:border-[#ccc] transition-colors items-center">
                
                <div className="cursor-grab text-[#ccc] group-hover:text-[#888]">
                  <GripVertical size={20} />
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  <div className="col-span-12 md:col-span-3">
                    <input
                      type="text"
                      value={link.label}
                      onChange={(e) => updateLink(idx, "label", e.target.value)}
                      placeholder="e.g. Official Discord"
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm font-bold focus:outline-none focus:border-[#111]"
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-6">
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateLink(idx, "url", e.target.value)}
                      placeholder="https://discord.gg/..."
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-3">
                    <select
                      value={link.icon}
                      onChange={(e) => updateLink(idx, "icon", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
                    >
                      <option value="Discord">Discord</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telegram">Telegram</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Twitter">Twitter/X</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Link">Generic Link</option>
                    </select>
                  </div>

                </div>

                <button 
                  onClick={() => removeLink(idx)}
                  className="p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
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

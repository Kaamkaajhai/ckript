import React, { useState } from "react";
import { Plus, GripVertical, Trash2 } from "lucide-react";

export default function PrizesModule({ data, onChange }) {
  const prizes = data.detailedPrizes || [];

  const addPrize = () => {
    onChange("detailedPrizes", [
      ...prizes,
      { title: "", description: "", cash: 0, currency: "USD", type: "Cash", visibility: "public" }
    ]);
  };

  const updatePrize = (index, key, value) => {
    const updated = [...prizes];
    updated[index] = { ...updated[index], [key]: value };
    onChange("detailedPrizes", updated);
  };

  const removePrize = (index) => {
    const updated = prizes.filter((_, i) => i !== index);
    onChange("detailedPrizes", updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Global Prize Pool */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold text-[#111]">Global Prize Pool</h2>
          <p className="text-sm text-[#666] mt-1">The headline prize pool displayed on the event card (e.g. "$50k + Industry Features").</p>
        </div>
        <input
          type="text"
          value={data.prizePool || ""}
          onChange={(e) => onChange("prizePool", e.target.value)}
          placeholder="e.g. $50,000 + Producer Meetings"
          className="w-full px-4 py-3 bg-[#fbfbfa] border border-[#e4e2e0] rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#111]"
        />
      </div>

      {/* Dynamic Prize Builder */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Dynamic Prize Builder</h2>
            <p className="text-sm text-[#666] mt-1">Create individual prizes and awards.</p>
          </div>
          <button 
            onClick={addPrize}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Prize
          </button>
        </div>

        <div className="space-y-4">
          {prizes.length === 0 ? (
            <div className="text-center py-12 bg-[#f9f8f6] border border-dashed border-[#ccc] rounded-xl">
              <p className="text-[#888]">No prizes added yet. Click "Add Prize" to create one.</p>
            </div>
          ) : (
            prizes.map((prize, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-[#fbfbfa] border border-[#eaeaea] rounded-xl group hover:border-[#ccc] transition-colors">
                <div className="mt-3 cursor-grab text-[#ccc] group-hover:text-[#888]">
                  <GripVertical size={20} />
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  <div className="col-span-12 md:col-span-4">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide mb-1">Title</label>
                    <input
                      type="text"
                      value={prize.title}
                      onChange={(e) => updatePrize(idx, "title", e.target.value)}
                      placeholder="e.g. Grand Prize Winner"
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm font-bold focus:outline-none focus:border-[#111]"
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-5">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide mb-1">Description / Perks</label>
                    <input
                      type="text"
                      value={prize.description}
                      onChange={(e) => updatePrize(idx, "description", e.target.value)}
                      placeholder="e.g. $10,000 Cash + Lifetime Membership"
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-3">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide mb-1">Prize Type</label>
                    <select
                      value={prize.type}
                      onChange={(e) => updatePrize(idx, "type", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Membership">Membership</option>
                      <option value="Feature">Platform Feature</option>
                      <option value="Meeting">Producer Meeting</option>
                      <option value="Physical">Physical Award</option>
                    </select>
                  </div>

                </div>
                <button 
                  onClick={() => removePrize(idx)}
                  className="mt-6 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg h-fit transition-colors"
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

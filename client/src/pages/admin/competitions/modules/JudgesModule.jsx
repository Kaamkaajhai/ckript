import React from "react";
import { Plus, Trash2, ImageIcon } from "lucide-react";

export default function JudgesModule({ data, onChange }) {
  const judges = data.judges || [];

  const addJudge = () => {
    onChange("judges", [
      ...judges,
      { name: "", title: "", company: "", bio: "", photoUrl: "", imdb: "", linkedin: "", featured: false }
    ]);
  };

  const updateJudge = (index, key, value) => {
    const updated = [...judges];
    updated[index] = { ...updated[index], [key]: value };
    onChange("judges", updated);
  };

  const removeJudge = (index) => {
    const updated = judges.filter((_, i) => i !== index);
    onChange("judges", updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Judging Panel</h2>
            <p className="text-sm text-[#666] mt-1">Add industry professionals evaluating the entries.</p>
          </div>
          <button 
            onClick={addJudge}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Judge
          </button>
        </div>

        <div className="space-y-6">
          {judges.length === 0 ? (
            <div className="text-center py-12 bg-[#f9f8f6] border border-dashed border-[#ccc] rounded-xl">
              <p className="text-[#888]">No judges added yet. Click "Add Judge" to create one.</p>
            </div>
          ) : (
            judges.map((judge, idx) => (
              <div key={idx} className="flex gap-6 p-6 bg-[#fbfbfa] border border-[#eaeaea] rounded-2xl group hover:border-[#ccc] transition-colors relative">
                
                
                {/* Photo Upload Area */}
                <div className="ml-6 w-32 shrink-0 space-y-3">
                  <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#ccc] overflow-hidden bg-white flex relative items-center justify-center group">
                    {judge.photoUrl ? (
                      <img src={judge.photoUrl} alt={judge.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#aaa]">
                        <ImageIcon size={24} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Photo</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-opacity">
                      Upload
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              updateJudge(idx, "photoUrl", reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={judge.photoUrl}
                      onChange={(e) => updateJudge(idx, "photoUrl", e.target.value)}
                      placeholder="Image URL"
                      className="w-full px-2 py-1.5 bg-white border border-[#e4e2e0] rounded-lg text-xs focus:outline-none focus:border-[#111]"
                    />
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        id={`judge-upload-${idx}`}
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              updateJudge(idx, "photoUrl", reader.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label 
                        htmlFor={`judge-upload-${idx}`}
                        className="flex items-center justify-center w-full px-2 py-1.5 bg-[#f5f5f5] hover:bg-[#eaeaea] text-[#333] border border-[#e4e2e0] rounded-lg text-xs font-medium cursor-pointer transition-colors"
                      >
                        Upload Photo
                      </label>
                    </div>
                  </div>
                </div>

                {/* Details Area */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">Full Name</label>
                    <input
                      type="text"
                      value={judge.name}
                      onChange={(e) => updateJudge(idx, "name", e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm font-bold focus:outline-none focus:border-[#111]"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">Role / Title</label>
                    <input
                      type="text"
                      value={judge.title}
                      onChange={(e) => updateJudge(idx, "title", e.target.value)}
                      placeholder="e.g. Senior Creative Executive"
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">Short Bio</label>
                    <textarea
                      value={judge.bio}
                      onChange={(e) => updateJudge(idx, "bio", e.target.value)}
                      placeholder="Bio will appear in the judge modal..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111] resize-y"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">Brand / Company Name</label>
                    <input
                      type="text"
                      value={judge.company || ""}
                      onChange={(e) => updateJudge(idx, "company", e.target.value)}
                      placeholder="e.g. Netflix, Universal Pictures"
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">Company Bio</label>
                    <textarea
                      value={judge.companyBio || ""}
                      onChange={(e) => updateJudge(idx, "companyBio", e.target.value)}
                      placeholder="About the brand or company..."
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111] resize-y"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">IMDb Link (Optional)</label>
                    <input
                      type="text"
                      value={judge.imdb}
                      onChange={(e) => updateJudge(idx, "imdb", e.target.value)}
                      placeholder="https://imdb.com/name/..."
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-xs text-[#666] focus:outline-none focus:border-[#111]"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-[#888] uppercase tracking-wide">LinkedIn (Optional)</label>
                    <input
                      type="text"
                      value={judge.linkedin}
                      onChange={(e) => updateJudge(idx, "linkedin", e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-xs text-[#666] focus:outline-none focus:border-[#111]"
                    />
                  </div>

                </div>

                <button 
                  onClick={() => removeJudge(idx)}
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

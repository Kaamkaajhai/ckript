import React from "react";
import { Plus, Trash2, FileText, UploadCloud } from "lucide-react";

export default function ResourcesModule({ data, onChange }) {
  const resources = data.resources || [];

  const addResource = () => {
    onChange("resources", [
      ...resources,
      { label: "", url: "", type: "Document" }
    ]);
  };

  const updateResource = (index, key, value) => {
    const updated = [...resources];
    updated[index] = { ...updated[index], [key]: value };
    onChange("resources", updated);
  };

  const removeResource = (index) => {
    const updated = resources.filter((_, i) => i !== index);
    onChange("resources", updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Resources & Downloads</h2>
            <p className="text-sm text-[#666] mt-1">Provide templates, forms, or reading material.</p>
          </div>
          <button 
            onClick={addResource}
            className="flex items-center gap-2 px-4 py-2 bg-[#111] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={16} />
            Add Resource
          </button>
        </div>

        <div className="space-y-4">
          {resources.length === 0 ? (
            <div className="text-center py-12 bg-[#f9f8f6] border border-dashed border-[#ccc] rounded-xl">
              <p className="text-[#888]">No resources added yet.</p>
            </div>
          ) : (
            resources.map((resource, idx) => (
              <div key={idx} className="flex gap-4 p-4 bg-[#fbfbfa] border border-[#eaeaea] rounded-xl group hover:border-[#ccc] transition-colors items-center">
                
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
                  
                  <div className="col-span-12 md:col-span-4">
                    <input
                      type="text"
                      value={resource.label}
                      onChange={(e) => updateResource(idx, "label", e.target.value)}
                      placeholder="e.g. Title Page Template"
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm font-bold focus:outline-none focus:border-[#111]"
                    />
                  </div>
                  
                  <div className="col-span-12 md:col-span-5 flex gap-2">
                    <input
                      type="text"
                      value={resource.url}
                      onChange={(e) => updateResource(idx, "url", e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
                    />
                    <button className="px-3 bg-white border border-[#e4e2e0] hover:border-[#111] rounded-lg text-[#555] transition-colors">
                      <UploadCloud size={16} />
                    </button>
                  </div>
                  
                  <div className="col-span-12 md:col-span-3">
                    <select
                      value={resource.type}
                      onChange={(e) => updateResource(idx, "type", e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#e4e2e0] rounded-lg text-sm focus:outline-none focus:border-[#111]"
                    >
                      <option value="Document">PDF / DOC</option>
                      <option value="Spreadsheet">Spreadsheet</option>
                      <option value="Image">Image</option>
                      <option value="Video">Video</option>
                      <option value="Drive">Google Drive</option>
                      <option value="Link">External Link</option>
                    </select>
                  </div>

                </div>

                <button 
                  onClick={() => removeResource(idx)}
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

import React from "react";
import { Settings, ShieldAlert, Zap } from "lucide-react";

export default function SettingsModule({ data, onChange, onArchive, onDelete }) {
  const automation = data.automation || {};

  const handleAutomationChange = (e) => {
    onChange("automation", { ...automation, [e.target.name]: e.target.checked });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Automation Rules */}
      <div className="bg-white rounded-2xl p-8 border border-[#eaeaea] shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-2 bg-[#f4f2f0] text-[#111] rounded-lg"><Zap size={18} /></div>
          <div>
            <h2 className="text-xl font-serif font-bold text-[#111]">Automation Rules</h2>
            <p className="text-sm text-[#666] mt-1">Configure automated behaviors for this event.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-start gap-4 p-4 border border-[#eaeaea] rounded-xl cursor-pointer hover:bg-[#faf9f8] transition-colors">
            <input
              type="checkbox"
              name="autoPublishResults"
              checked={automation.autoPublishResults || false}
              onChange={handleAutomationChange}
              className="mt-1 w-4 h-4 text-[#111] rounded border-[#ccc] focus:ring-[#111]"
            />
            <div>
              <div className="font-bold text-[#111] text-sm">Auto-Publish Results</div>
              <div className="text-xs text-[#666] mt-1">Automatically reveal results to participants exactly at the Results Announcement date/time.</div>
            </div>
          </label>

          <label className="flex items-start gap-4 p-4 border border-[#eaeaea] rounded-xl cursor-pointer hover:bg-[#faf9f8] transition-colors">
            <input
              type="checkbox"
              name="autoGenerateCertificates"
              checked={automation.autoGenerateCertificates || false}
              onChange={handleAutomationChange}
              className="mt-1 w-4 h-4 text-[#111] rounded border-[#ccc] focus:ring-[#111]"
            />
            <div>
              <div className="font-bold text-[#111] text-sm">Auto-Generate Certificates</div>
              <div className="text-xs text-[#666] mt-1">Automatically issue digital certificates to all participants when results are declared.</div>
            </div>
          </label>

          <label className="flex items-start gap-4 p-4 border border-[#eaeaea] rounded-xl cursor-pointer hover:bg-[#faf9f8] transition-colors">
            <input
              type="checkbox"
              name="autoSendReminders"
              checked={automation.autoSendReminders || false}
              onChange={handleAutomationChange}
              className="mt-1 w-4 h-4 text-[#111] rounded border-[#ccc] focus:ring-[#111]"
            />
            <div>
              <div className="font-bold text-[#111] text-sm">Automated Reminders</div>
              <div className="text-xs text-[#666] mt-1">Send a 24-hour and 1-hour email reminder before the deadline to registered writers who haven't submitted.</div>
            </div>
          </label>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[#fff0ed] rounded-2xl p-8 border border-[#fad4cd] shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-2 bg-[#ffded9] text-red-600 rounded-lg"><ShieldAlert size={18} /></div>
          <div>
            <h2 className="text-xl font-serif font-bold text-red-700">Danger Zone</h2>
            <p className="text-sm text-red-600 mt-1">Irreversible actions for this competition.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white border border-[#fad4cd] rounded-xl">
            <div>
              <div className="font-bold text-[#111] text-sm">Archive Competition</div>
              <div className="text-xs text-[#666] mt-1">Hide from active lists. Data is preserved.</div>
            </div>
            <button type="button" onClick={onArchive} className="px-4 py-2 bg-white border border-[#eaeaea] hover:bg-gray-50 text-[#111] text-sm font-semibold rounded-lg transition-colors">
              Archive
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-white border border-red-200 rounded-xl">
            <div>
              <div className="font-bold text-red-600 text-sm">Delete Competition</div>
              <div className="text-xs text-red-500 mt-1">Permanently remove this event and all its configuration. Entries will be orphaned.</div>
            </div>
            <button type="button" onClick={onDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Delete Forever
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

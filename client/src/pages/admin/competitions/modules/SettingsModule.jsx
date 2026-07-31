import React from "react";
import { ShieldAlert } from "lucide-react";

/* No "Automation Rules" panel here on purpose. Three toggles used to sit above the Danger Zone —
   auto-publish results, auto-generate certificates, auto-send reminders — that were stored and read
   by nothing: no scheduler exists anywhere in this codebase, by design. The phase is derived from
   dates at read time, and `results` happens only when an admin explicitly declares it. A control
   that promises automation the system does not perform is worse than no control; if a scheduler is
   ever built, the toggles belong back here WITH the machinery, not ahead of it. The schema fields
   remain (removing them is a migration), so nothing already stored is lost. */
export default function SettingsModule({ onArchive, onDelete }) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

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
              {/* The old copy said entries would be "orphaned". They were deleted. The server now
                  refuses the delete once anyone has entered or results are declared, so this states
                  what actually happens. */}
              <div className="text-xs text-red-500 mt-1">
                Permanently remove this event and its configuration. Only possible while no one has
                entered and no results are declared — otherwise archive it.
              </div>
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

import { createPortal } from "react-dom";
import CollaboratorsPanel from "./CollaboratorsPanel";

export default function CollaboratorsModal({ scriptId, currentUserId, onClose, dark = false }) {
  const card = dark ? "bg-[#0b1320] border border-[#1d3350]" : "bg-[#f8f9fb] border border-gray-200";

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4" style={{ background: "rgba(3,10,19,0.6)", backdropFilter: "blur(6px)" }} onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[95vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden ${card}`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${dark ? "border-[#182840]" : "border-gray-200 bg-white"}`}>
          <h2 className={`text-lg font-bold ${dark ? "text-white" : "text-gray-900"}`}>Share Project</h2>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center transition ${dark ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto p-4 md:p-6 flex-1">
          <CollaboratorsPanel scriptId={scriptId} currentUserId={currentUserId} />
        </div>
      </div>
    </div>,
    document.body
  );
}

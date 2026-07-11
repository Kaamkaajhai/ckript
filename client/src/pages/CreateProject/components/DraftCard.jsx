import { motion } from "framer-motion";

/* -- Draft Card -------------------------------------- */
const DraftCard = ({ draft, onClick, onDelete, dark, isActive }) => {
  const wc = draft.textContent ? draft.textContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length : 0;
  const updated = new Date(draft.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`group rounded-xl border p-3.5 cursor-pointer transition-all duration-200 ${isActive
        ? dark ? "bg-[#1e3a5f]/20 border-[#1e3a5f]/60 ring-1 ring-[#1e3a5f]/30" : "bg-[#1e3a5f]/[0.06] border-[#1e3a5f]/30 ring-1 ring-[#1e3a5f]/10"
        : dark ? "bg-[#0d1520] border-[#182840] hover:border-[#1d3350]" : "bg-white border-gray-100 hover:border-gray-200"
        }`} onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className={`font-semibold text-sm truncate ${dark ? "text-gray-100" : "text-gray-900"}`}>{draft.title || "Untitled"}</h4>
          <p className={`text-[11px] mt-1 ${dark ? "text-gray-500" : "text-gray-400"}`}>{wc} words -+ {updated}</p>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(draft._id); }}
          className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition ${dark ? "hover:bg-red-500/10 text-gray-600 hover:text-red-400" : "hover:bg-red-50 text-gray-300 hover:text-red-500"}`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
};

export default DraftCard;

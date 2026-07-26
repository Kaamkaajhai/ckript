export const Icon = ({ d, className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

// One line, but StatCard is the repeating unit of every admin card grid — the old navy
// surface/border tinted the whole console cool against the warm shell.
export const StatCard = ({ label, value, icon, color, isDark }) => (
    <div className={`rounded-2xl p-5 border transition-all hover:scale-[1.02] ${isDark ? "bg-[#141414] border-[#242424]" : "bg-white border-gray-200/60 shadow-sm"}`}>
        <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon d={icon} className="w-5 h-5" />
            </div>
        </div>
        <p className={`text-2xl font-extrabold ${isDark ? "text-white" : "text-gray-900"}`}>{value}</p>
        <p className={`text-sm font-medium mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>{label}</p>
    </div>
);
